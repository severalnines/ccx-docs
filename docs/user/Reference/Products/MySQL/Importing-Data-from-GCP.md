# Importing Data from Google Cloud SQL

This procedure describes how to import data from Google Cloud SQL to a MySQL datastore located in CCX.

- The MySQL Datastore on CCX is referred to as the 'CCX Primary'
- The GCP Source of the data is referred to as the 'GCP Primary'

Schematically, this is what we will set up:

![sd](../../../images/gcp-to-ccx-replication.png)

:::note

If you don't want to set up replication, you can choose to only apply the following sections:

- Create a database dump file of the GCP Primary
- Apply the dump file on the CCX replica
:::

Also, practice this a few times before you actually do the migration.

## Preparations

- Create a datastore on CCX. Note that you can also replicate from MySQL 8.0 to MySQL 8.4.
- Get the endpoint of the CCX Primary (under the Nodes section). ![sd](../../../images/ccx-primary.png) The endpoint in our case is `db-9bq15.471ed518-8524-4f37-a3b2-136c68ed3aa6.user-ccx.mydbservice.net`.
- The GCP Primary must have a Public IP.
- Get the endpoint of the GCP Primary. In this example, the endpoint is `34.51.xxx.xxx`
- Update the Security group on GCP to allow the IP address of the CCX Primary to connect. To get the IP address of the CCX Primary, run:
    ```
    dig db-9bq15.471ed518-8524-4f37-a3b2-136c68ed3aa6.user-ccx.mydbservice.net
    ```
- Ensure you can connect a MySQL client to both the CCX Primary and the GCP Primary.

## Create a Replication User on the GCP Primary Instance

Create a replication user with sufficient privileges on the GCP Primary.
In the steps below, we will use `repl` and `replpassword` as the credentials when setting up the replica on CCX.

```sql
CREATE USER 'repl'@'%' IDENTIFIED BY 'replpassword';
GRANT REPLICATION SLAVE ON *.* TO  'repluser'@'%'; #mysql 8.0
GRANT REPLICATION REPLICATION_SLAVE_ADMIN ON *.* TO  'repluser'@'%';
```

### Create the mysqldump

Be sure to specify the database you wish to replicate. You must omit any system databases. In this example, we will dump the databases `prod` and `crm`.

```bash
mysqldump -uroot -p -h34.51.xxx.xxx --databases prod crm --triggers --routines --events --set-gtid_purged=OFF --source-data --single-transaction > dump.sql
```

Wait for it to complete.

## Load the Dump on the Replica

### Create a Replication Filter on the Replica

The replica filter prevents corruption of the datastore, and we are not interested in changes logged by GCP to mysql.rds* tables anyway. Also add other databases that you do not wish to replicate to the filter.

:::note

If the CCX datastore's system tables are corrupted using replication, then the datastore must be recreated.

:::

```sql
CHANGE REPLICATION FILTER REPLICATE_IGNORE_DB=(mysql, sys, performance_schema);
```

Important! If your database dump contains stored procedures, triggers, or events, then you must replace DEFINER:

```bash
sed 's/\sDEFINER=`[^`]*`@`[^`]*`//g' -i dump.sql
```

### Apply the Dump File on the CCX Primary:

```bash
cat dump.sql | mysql -uccxadmin -p -hCCX_PRIMARY
```

## Connect the CCX Primary to the GCP Primary

Issue the following commands on the CCX Primary:

```
CHANGE REPLICATION SOURCE TO SOURCE_HOST='34.51.xxx.xxx', SOURCE_PORT=3306, SOURCE_USER='repl', SOURCE_PASSWORD='replpassword', SOURCE_SSL=1;
```

### Start the Replica

On the CCX Primary, run:

```
START REPLICA;
```

followed by:

```
SHOW REPLICA STATUS\G
```

And verify that:

```
             Replica_IO_State: Waiting for source to send event
	     ..
  	     Replica_IO_Running: Yes
             Replica_SQL_Running: Yes
```

### When the Migration is Ready

At some point, you will need to point your applications to the new datastore. Ensure:

- There are no application writes to the GCP Primary
- The CCX Primary has applied all data (use `SHOW REPLICA STATUS \G`, check the `Seconds_Behind_Master`)
- Connect the applications to the new datastore

Then you can clean up the replication link on the CCX Primary:

```
STOP REPLICA;
RESET REPLICA ALL;
CHANGE REPLICATION FILTER REPLICATE_IGNORE_DB=();
```

### Troubleshooting

If the replication fails to start, verify:

- All the steps above have been followed
- Ensure that the IP address of the CCX Primary is added to the security group used by the GCP Primary instance
- Ensure that you have the correct IP/FQDN of the GCP Primary instance
- Ensure that users are created correctly and using the correct password
- Ensure that the dump is fresh
