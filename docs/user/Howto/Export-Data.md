# Export data or copy it to another datastore

You cannot download CCX backups, and [Create datastore from backup](Create-Datastore-From-Backup.md) only works for the user who created the source datastore. To keep your own copy of the data, or to move it into a datastore owned by another user, make a logical dump with the database's own tools and the `ccxadmin` credentials.

The procedures below cover MySQL, MariaDB, PostgreSQL and Microsoft SQL Server. Valkey is not covered.

## Before you start

- Add the IP address of the host that runs the dump as a Trusted Source in the [firewall](Firewall.md) of the source datastore, and of the target datastore if you load the dump from the same host.
- Copy the host and the `ccxadmin` password of each datastore from **Nodes > Connection Information**.
- Create the target datastore with the same database type and the same or a newer major version.
- Stop writes to the source before you start. Changes made after the dump starts are not copied.
- Load the dump into the target's primary (writer) host. Replicas accept only reads.

The dump copies your application databases: tables, data, views, routines, triggers and events. Keep in mind:

- The target's `ccxadmin` password does not change. The load puts the data from the source's `ccxdb` into the target's `ccxdb`.
- Database users are not copied, except on SQL Server (see below). Create them again on the target, in the CCX UI or with SQL.
- System databases (`mysql`, `sys`, `postgres`, `master` and others) are never part of the dump. Do not add them.

:::danger CRITICAL: never dump the MySQL and MariaDB system databases
You **MUST NOT** include `mysql`, `sys`, `performance_schema` or `information_schema` in the dump, and you **MUST NOT** use `--all-databases` (`-A`).

The `mysql` database holds the datastore's users and passwords, including the accounts CCX uses to manage the datastore. Loading it into the target overwrites them: CCX loses access to the target datastore, replication breaks and the target's `ccxadmin` password changes to the source's. The target datastore stops working.

To list the databases you can copy, run this on the source:

```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name NOT IN ('mysql', 'sys', 'performance_schema', 'information_schema');
```
:::

## MySQL

Dump the application databases from the source. List every database you want to copy after `--databases`, and never a system database (see the CRITICAL warning above):

```bash
mysqldump -h <SOURCE_HOST> -uccxadmin -p --set-gtid-purged=OFF --single-transaction \
  --triggers --routines --events --databases ccxdb app1 app2 > dump.sql
```

Load it into the target:

```bash
mysql -h <TARGET_HOST> -uccxadmin -p < dump.sql
```

Always keep `--set-gtid-purged=OFF`. Without it, the dump turns off binary logging during the load (`SET @@SESSION.SQL_LOG_BIN= 0`). The data then never reaches the target's replicas. The dump also writes the source's GTID state into the target (`SET @@GLOBAL.GTID_PURGED`).

Leave out `--master-data`, `--source-data`, `--dump-slave` and `--dump-replica`. They add a replication statement to the dump, which then runs on the target.

Routines, views, triggers and events keep their `DEFINER` account. `ccxadmin` cannot create objects with another account as definer, even if that account exists on the target. If any definer is not `ccxadmin`, remove the `DEFINER` clauses before loading, so `ccxadmin` becomes the definer. This command changes only the lines that start a `CREATE` statement, so data values are not touched. It writes a new file and works with both GNU and macOS `sed`:

```bash
sed -E '/^(CREATE|\/\*![0-9]+ CREATE\*\/|\/\*![0-9]+ DEFINER=)/ s/ DEFINER=`[^`]*`@`[^`]*`//' dump.sql > dump-nodefiner.sql
```

Then load `dump-nodefiner.sql` instead of `dump.sql`.

## MariaDB

On MariaDB, `ccxadmin` only has privileges on `ccxdb` and on databases created from CCX. Before loading, create each database other than `ccxdb` on the target from the CCX UI (**Databases > Create Database**). Otherwise the load fails with `ERROR 1044`.

Dump from the source and load into the target:

```bash
mariadb-dump -h <SOURCE_HOST> -uccxadmin -p --single-transaction \
  --triggers --routines --events --databases ccxdb app1 app2 > dump.sql

mariadb -h <TARGET_HOST> -uccxadmin -p < dump.sql
```

MariaDB's own `mysqldump` and `mysql` commands also work. Oracle's MySQL `mysqldump` fails against MariaDB with `Unknown table 'COLUMN_STATISTICS'` unless you add `--column-statistics=0`. The CRITICAL warning about system databases and the notes on `--master-data` and `DEFINER` from the MySQL section apply here too.

## PostgreSQL

`ccxadmin` is not a superuser. It can only dump objects whose owner is `ccxadmin` or that grant it access. If the owner is another user, such as a user created in the CCX UI, `pg_dump` as `ccxadmin` fails with `permission denied for schema <name>`. In that case, run `pg_dump` as the owner of the objects, or as a user created with the **Superuser** privilege in the CCX UI. Load into the target as `ccxadmin` either way.

Dump each database separately. Use `--no-owner --no-privileges`, because roles from the source do not exist on the target, and `--no-publications --no-subscriptions`. These two flags keep logical replication setup out of the dump. Do not use `pg_dumpall`. It copies roles with their passwords, including `ccxadmin`'s. Loading it changes the target's `ccxadmin` password.

```bash
pg_dump "host=<SOURCE_HOST> user=ccxadmin dbname=app1 sslmode=require" \
  --no-owner --no-privileges --no-publications --no-subscriptions -f app1.sql
```

Create the database on the target, then load the dump into it. Skip `CREATE DATABASE` for `ccxdb`, which already exists:

```bash
psql "host=<TARGET_HOST> user=ccxadmin dbname=postgres sslmode=require" -c "CREATE DATABASE app1"
psql "host=<TARGET_HOST> user=ccxadmin dbname=app1 sslmode=require" -v ON_ERROR_STOP=1 -f app1.sql
```

`ccxadmin` owns all objects on the target. Create your application roles and grant them privileges again after the load. If the database has row-level security policies for specific roles (`CREATE POLICY ... TO <role>`), create those roles on the target before the load, or the load stops at the policy.

The load creates trusted extensions such as `pgcrypto`. An extension that needs a superuser fails to load. See [Extensions](../Reference/Products/PostgreSQL/extensions.md) for the list of supported extensions.

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

The import never changes a server login that already exists on the target. A database user whose login exists on the target, such as `mssql_exporter`, which CCX uses for monitoring, keeps its login: the import maps the user to it, and the login keeps its password. `ccxadmin` and `sa` are not changed either. For a database user whose login is missing, the import creates the login with a random password. Set a new password for each one:

```sql
ALTER LOGIN appuser WITH PASSWORD = '<NEW_PASSWORD>';
```

An Always On datastore replicates only `ccxdb` to the secondary node. See [Limitations](../Reference/Products/MSSQLServer/limitations.md).
