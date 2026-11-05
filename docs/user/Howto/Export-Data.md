# Export data or copy it to another datastore

CCX backups cannot be downloaded, and [Create datastore from backup](Create-Datastore-From-Backup.md) only works for the user who created the source datastore. To keep your own copy of the data, or to move it into a datastore owned by another user, make a logical dump with the database's own tools and the `ccxadmin` credentials.

The procedures below cover MySQL, MariaDB, PostgreSQL and Microsoft SQL Server. Valkey is not covered.

## Before you start

- Add the IP address of the host that runs the dump as a Trusted Source in the [firewall](Firewall.md) of the source datastore, and of the target datastore if you load the dump from the same host.
- Copy the host and the `ccxadmin` password of each datastore from **Nodes > Connection Information**.
- Create the target datastore with the same database type and the same or a newer major version.
- Stop writes to the source before you start. Changes made after the dump starts are not copied.

What is copied and what is not:

- The dump contains your application databases: tables, data, views, routines, triggers and events.
- The target's `ccxadmin` password does not change. Data from the source's `ccxdb` is loaded into the target's `ccxdb`.
- Database users are not copied, except on SQL Server (see below). Create them again on the target, in the CCX UI or with SQL.
- System databases (`mysql`, `sys`, `postgres`, `master` and others) are never part of the dump. Do not add them.

## MySQL

Dump the application databases from the source. List every database you want to copy after `--databases`:

```bash
mysqldump -h <SOURCE_HOST> -uccxadmin -p --set-gtid-purged=OFF --single-transaction \
  --triggers --routines --events --databases ccxdb app1 app2 > dump.sql
```

Load it into the target:

```bash
mysql -h <TARGET_HOST> -uccxadmin -p < dump.sql
```

Leave out `--master-data` and `--source-data`. They add a replication statement to the dump, which then runs on the target.

Routines, views, triggers and events keep their `DEFINER` account. If that account is not `ccxadmin`, create it on the target before loading. Alternatively, remove the `DEFINER` clauses so the objects are owned by the account that loads the dump. This command changes only the lines that start a `CREATE` statement, so data values are not touched:

```bash
sed -E '/^(CREATE|\/\*![0-9]+ CREATE\*\/|\/\*![0-9]+ DEFINER=)/ s/ DEFINER=`[^`]*`@`[^`]*`//' -i dump.sql
```

## MariaDB

On MariaDB, `ccxadmin` only has privileges on `ccxdb` and on databases created from CCX. Before loading, create each database other than `ccxdb` on the target from the CCX UI (**Databases > Create Database**). Otherwise the load fails with `ERROR 1044`.

Dump from the source and load into the target:

```bash
mariadb-dump -h <SOURCE_HOST> -uccxadmin -p --single-transaction \
  --triggers --routines --events --databases ccxdb app1 app2 > dump.sql

mariadb -h <TARGET_HOST> -uccxadmin -p < dump.sql
```

The `mysqldump` and `mysql` commands also work. The notes on `--master-data` and `DEFINER` from the MySQL section apply here too.

## PostgreSQL

Dump each database separately. Use `--no-owner --no-privileges`, because roles from the source do not exist on the target:

```bash
pg_dump "host=<SOURCE_HOST> user=ccxadmin dbname=app1 sslmode=require" \
  --no-owner --no-privileges -f app1.sql
```

Create the database on the target, then load the dump into it. Skip `CREATE DATABASE` for `ccxdb`, which already exists:

```bash
psql "host=<TARGET_HOST> user=ccxadmin dbname=postgres sslmode=require" -c "CREATE DATABASE app1"
psql "host=<TARGET_HOST> user=ccxadmin dbname=app1 sslmode=require" -v ON_ERROR_STOP=1 -f app1.sql
```

All objects on the target are owned by `ccxadmin`. Create your application roles and grant them privileges again after the load. If the database has row-level security policies for specific roles (`CREATE POLICY ... TO <role>`), create those roles on the target before the load, or the load stops at the policy.

Trusted extensions such as `pgcrypto` are created by the load. An extension that needs a superuser fails to load. See [Extensions](../Reference/Products/PostgreSQL/extensions.md) for the list of supported extensions.

Use `pg_dump` and `psql` of the target's major version. The client must not be older than the source, and a dump from a newer client can contain settings an older target rejects.

## Microsoft SQL Server

Use [SqlPackage](https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage) to export each database to a `.bacpac` file and import it into the target.

Export from the source:

```bash
sqlpackage /Action:Export /SourceServerName:<SOURCE_HOST> /SourceDatabaseName:app1 \
  /SourceUser:ccxadmin /SourcePassword:<SOURCE_PASSWORD> /SourceTrustServerCertificate:True \
  /TargetFile:app1.bacpac
```

Create an empty database on the target first. SqlPackage cannot create the database itself and fails with `operating system error 5(Access is denied.)`. Skip this step for `ccxdb`, which already exists and is empty:

```bash
sqlcmd -S <TARGET_HOST> -U ccxadmin -C -Q "CREATE DATABASE app1"
```

Import into the target:

```bash
sqlpackage /Action:Import /TargetServerName:<TARGET_HOST> /TargetDatabaseName:app1 \
  /TargetUser:ccxadmin /TargetPassword:<TARGET_PASSWORD> /TargetTrustServerCertificate:True \
  /SourceFile:app1.bacpac
```

The import creates the server logins of the database users that are missing on the target, with a random password. Set a new password for each one:

```sql
ALTER LOGIN appuser WITH PASSWORD = '<NEW_PASSWORD>';
```

In an Always On datastore only `ccxdb` is replicated to the secondary node. See [Limitations](../Reference/Products/MSSQLServer/limitations.md).
