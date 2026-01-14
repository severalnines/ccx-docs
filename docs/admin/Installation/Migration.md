## CCX Migration
#### CMON database migration

Make sure that the second Mysql instance is able to communicate with the original one. 

One way is to create the following service in the namespace that the original cmon database is located:

```yaml
cmon:
  apiVersion: v1
kind: Service
metadata:
  annotations:
    cloud.google.com/neg: '{"ingress":true}'
  name: ccxdeps-migration
spec:
  ports:
  - name: mysql
    port: 3306
    protocol: TCP
    targetPort: 6446
  - name: mysqlx
    port: 33060
    protocol: TCP
    targetPort: 6448
  - name: mysql-alternate
    port: 6446
    protocol: TCP
    targetPort: 6446
  - name: mysqlx-alternate
    port: 6448
    protocol: TCP
    targetPort: 6448
  - name: mysql-ro
    port: 6447
    protocol: TCP
    targetPort: 6447
  - name: mysqlx-ro
    port: 6449
    protocol: TCP
    targetPort: 6449
  - name: mysql-rw-split
    port: 6450
    protocol: TCP
    targetPort: 6450
  - name: router-rest
    port: 8443
    protocol: TCP
    targetPort: 8443
  selector:
    component: mysqlrouter
    mysql.oracle.com/cluster: ccxdeps
    tier: mysql
  sessionAffinity: None
  type: LoadBalancer
```
Keep in mind this will make the database have the public IP, so be very warry in the security groups who can access it.

To verify and find the IP address, run the following command:
```
kubectl get svc -n ccx
NAME                        TYPE           CLUSTER-IP     EXTERNAL-IP     PORT(S)                                                                                                                    AGE
ccxdeps-migration           LoadBalancer   10.60.9.6      34.34.188.46    3306:30848/TCP,33060:30726/TCP,6446:32093/TCP,6448:30225/TCP,6447:32482/TCP,6449:32074/TCP,6450:31370/TCP,8443:31946/TCP   2m36s
```
On the original MySQL instance, log in with the cmon(or root) user and run the following commnads:
```
CREATE USER 'repl'@'%' IDENTIFIED BY 'DefinitelyNotStrongEnouphPassword';
GRANT REPLICATION SLAVE, BACKUP_ADMIN ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;
```
Keep in mind that `'repl'@'%';` can be limited to a CIRD, so if you can limit it to the one where future slave nodes will be located. 

Next, we need to create a dump of the currently used MySQL database. To do so, run the following command:
```
mysqldump -u cmon -p  --single-transaction --set-gtid-purged=OFF --source-data=1 cmon > /tmp/mydatabase_backup.sql
```
Then, create your new MySQL database on the new environment. When finished, log in on the primary node and run:
```
create database cmon;
```

After, copy the dump file to primary node and run the following command to restore data from dump:
```
 mysql -u cmon -h PRIMARY_HOST -p cmon < mydatabase_backup.sql
```
Once restore is done, log into the primary node. Rune the following commands (change to your spec):
```
CHANGE REPLICATION FILTER  REPLICATE_DO_DB = (cmon);

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='PRIMARY_HOST_ADDRESS',
  SOURCE_USER='repl',
  SOURCE_PASSWORD='DefinitelyNotStrongEnouphPassword',
  SOURCE_SSL=1,
  SOURCE_LOG_FILE='XXXXX',
  SOURCE_LOG_POS=XXXXX;

START REPLICA;

SHOW REPLICA STATUS\G

```

SOURCE_LOG_FILE and SOURCE_LOG_POS values can be found in line 22 of dump file. Look for something like this:
```
CHANGE REPLICATION SOURCE TO SOURCE_LOG_FILE='XXXXX', SOURCE_LOG_POS=XXXXX;
```
