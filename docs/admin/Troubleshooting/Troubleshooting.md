# CCX Troubleshooting Guide
This guide helps you troubleshoot and resolve common issues in CCX. Follow the steps outlined below to diagnose problems and apply fixes.

## CCX Error Report
To generate an error report of CCX services and components within a Kubernetes environment, follow these steps:
```bash
# Ensure your current Kubernetes context is set to the CCX namespace as shown below
kubectl config set-context --current --namespace=ccx

# Step 1: Download the error report script
wget https://raw.githubusercontent.com/severalnines/helm-charts/refs/heads/main/charts/ccx/scripts/gather-logs.sh

# Step 2: Make the script executable
chmod +x gather-logs.sh

# Step 3: Run the script to collect logs
./gather-logs.sh
```
Attach the generated `.tar.gz` file to the CCX support ticket.

## Long-Running or Stuck Datastore
Clusters may get stuck in a locked state if a job is interrupted unexpectedly. Use the following steps to resolve hanging jobs:
Note that `ccxctl` is available from version 1.50+.

```bash
# Step 1: Run `ccxctl` by executing inside the stores pod
kubectl exec -it deployment/ccx-stores-service -- sh

# Step 2: Check the datastore state and get the job-id in field `Active Job:`
ccxctl datastore state <datastore-id>

# Output Example:
# Active Job: 2e3fe81b-2fd9-40f0-b561-a40f9fded92

# Step 3: Check the job state using the job-id from the output
ccxctl job state <job-id>

# Step 4: Mark the job as failed if it is stuck
ccxctl job kill <job-id>

# Step 5: Unlock the datastore after resolving the job
ccxctl datastore unlock <datastore-id>
```

## Inconsistent Hosts
If a `create datastore` or `add node` job terminates unexpectedly, some hosts might become inconsistent. This can leave dangling resources in the cloud or mismatches between CCX and controllers.

### Orphaned Resources (on Cloud Provider Side)
#### Inconsistent Hosts
```bash
# Identify inconsistent hosts in the datastore
ccxctl datastore state <datastore-id>

# Delete the inconsistent host to resolve it
ccxctl host delete <host-id>
```
#### Inconsistent Datastore
If a datastore is stuck in a "deleting" state or needs to be forcefully removed, use the following command:
```bash
# Force delete the datastore and all associated resources
ccxctl datastore delete <datastore-id>
```
#### Warning
```text
This command deletes all associated resources, including:
- Cloud resources
- SSH keys
- Credentials
```
:::danger
> These actions are irreversible. Use caution when applying the above commands.
:::

## Cluster in Readonly State

CCX will fix this issue automatically in version 1.51+.

For prior versions, navigate to the CC UI:

- **Clusters** -> **Select Datastore ID** -> **Nodes** -> **Actions** -> **Toggle Readonly to disable**

Disable readonly for the nodes that are labeled Readonly.

## Disk Autoscaling Issues

Disk autoscaling is enabled by default in CCX. The system will automatically increase the storage size by 20% when the used space exceeds 75% of the allocated storage

### CCX UI Configuration:

Navigate to Datastore UUID -> Settings -> Auto scaling storage size and ensure the toggle is set to ON.

### Monitoring Alert:

To check alerts for disk space scaling, run the following command:

```bash
kubectl port-forward alertmanager-0 19093:9093
```
Then, open your browser and go to http://localhost:19093.

Search for the alert alertname="HostAutoScaleDiskSpaceReached" by choosing the receiver as `Receiver: webhook-alerts`.

## Troubleshooting Datastore Backups Failing

Fires as the `Backup Failed` alert when cmon reports a new backup failure alarm. This alert is controller-wide — it tells you that at least one datastore's backup failed somewhere, but not which one, so identifying the specific datastore requires the steps below.

To debug failed datastore backups:

### Method 1: Using CC UI

1. Log in to the CC UI at the URL specified in the `ccFQDN` field of your Helm values.
2. Navigate to:
    - **Clusters** -> **Select Datastore ID** -> **Backups** -> **Actions** -> **Logs**

### Method 2: Using CLI Commands
Use the following commands inside the `cmon` container:
```bash
# Access the cmon container
kubectl exec -it cmon-0 -- bash

# List all jobs
s9s job --list

# Get logs for a specific job
s9s job --job-id=NNN --log
```
The `s9s job` commands are useful for diagnosing why a backup failed.

## Troubleshooting CCX Database Logs Visibility
If database logs are not visible, ensure the following to upgrade the ccxdeps:
```bash
# Step 1: Verify ccxdeps-loki service exist and pod is running.
kubectl get svc | grep ccxdeps-loki
kubectl get pods | grep ccxdeps-loki-gateway

# If the above service is not running, then update the ccxdeps
# Step 2: Update and Deploy ccxdeps charts
helm repo update
helm upgrade --install ccxdeps s9s/ccxdeps --debug
```

## Troubleshooting Metrics Scraping in VictoriaMetrics
If metrics are not being scraped or targets are unreachable, ensure to deploy our embedded monitoring stack:
```bash
# Step 1: Update and deploy ccxdeps Helm chart
helm repo update
helm upgrade --install ccxdeps s9s/ccxdeps --debug

# Step 2: Verify Metrics in VictoriaMetrics Targets
#Forward the port for the VictoriaMetrics deployment:

kubectl port-forward deployments/victoria-metrics 18428:8428
```
Open your browser and navigate to `http://localhost:18428/`.
Click on Targets and ensure the cmon-sd active targets are in the Up state.


If no scrape targets are not found, the issue may be due to exporters not running on the datastore servers.
```bash
# If exporters are not running inside datastores, then deploy agents commands
kubectl exec -it cmon-0 -- bash
s9s cluster --cluster-id=<cluster-id> --deploy-agents --log
```

## MySQL Operator Failover, Adding Nodes, and Scaling Mechanism
#### Failover
Failover Mechanism is fully managed by the operator. The operator monitors MySQL instances for health and availability. If a primary pod fails, the operator promotes one of the replicas to primary.
#### Adding Nodes
Adding nodes can be done by updating the `mysql-innodbcluster.serverInstances`. The operator automatically provisions and configures the new node.
#### Scaling
The ability to scale storage depends on the underlying storage class and its capabilities in the Kubernetes environment. The MySQL Operator itself will not automatically scale storage. Instead, you would need to specify values in `mysql-innodbcluster.datadirVolumeClaimTemplate.resources.requests.storage` to a larger size and redeploy.

## MySQL Operator InnoDB Pod Stuck in Terminating State
Sometimes the MySQL InnoDB Cluster pod is stuck due to issues preventing graceful termination of the pod, such as node deletion. In such cases, the pod is stuck in the terminating state. This can be overcome by removing the finalizer from the pod's metadata, and the pod will be in a ready state again.
Recovery:
```bash
kubectl patch pod <mysql-pod-name> -p '{"metadata":{"finalizers":[]}}' --type=merge
```
## MySQL and Postgres Operator Backup and Restore Validation

Fires as the `CCX Internal Backup Job Failed` alert when the Kubernetes Job backing up CCX's own control-plane database (the `logical-backup-acid-ccx-*` Job for the Postgres control-plane database, or the `ccxdeps-ccx-s3-backup-schedule*` Job for the MySQL control-plane database) fails — this is distinct from `Backup Failed` above, which is about *customer* datastore backups managed by cmon.

### Diagnose the issue

Check the failed Job directly and pull its logs:
```bash
kubectl get jobs -n ccx | grep -E "logical-backup-acid-ccx|ccxdeps-ccx-s3-backup-schedule"
kubectl logs -n ccx job/<failed-job-name>
```

### MySQL Operator Backup Validation
To ensure backup validation:
- Verify the backup pod status (e.g., `ccxdeps-ccx-s3-backup-schedule2412121705-dk6mt`) is `Succeeded`.
- Check that the CronJob (e.g., `ccxdeps-ccx-s3-backup-schedule-cb`) is enabled and active.

Command to check logs:
```bash
kubectl logs -l name=mysql-operator
```
Example logs:
```text
[2024-12-13 05:00:04,729] kopf.objects         [INFO    ] Initializing MySQL Backup job name=ccxdeps-ccx-s3-backup-schedule241213050004 namespace=ccx
```

Additionally, view objects stored on S3 storage for confirmation.

### MySQL Operator Restore Validation
Check the logs in the MySQL operator pod to validate restoration:
```bash
kubectl logs -l name=mysql-operator
```
Example logs:
```text
[2024-12-13 05:25:54,871] kopf.objects         [INFO    ] on_spec
[2024-12-13 05:25:54,876] kopf.objects         [INFO    ] old={'backupProfiles': [{'dumpInstance': {'storage': {'s3': {'bucketName': 'mysql-backup-s3-ccx', 'config': 's3-secret', 'endpoint': 'https://s3.eu-north-1.amazonaws.com', 'prefix': '/ccx-backup', 'profile': 'default'}}}, 'name': 's3-backup'}], 'backupSchedules': [{'backupProfileName': 's3-backup', 'deleteBackupData': False, 'enabled': True, 'name': 'ccx-s3-backup-schedule', 'schedule': '*/30 * * * *'}], 'baseServerId': 1000, 'datadirVolumeClaimTemplate': {'resources': {'requests': {'storage': '20Gi'}}}, 'imagePullPolicy': 'IfNotPresent', 'instances': 1, 'mycnf': '[mysqld]\nbinlog_expire_logs_seconds=604800\n', 'podSpec': {'containers': [{'name': 'mysql', 'resources': {'requests': {'memory': '2048Mi'}}}]}, 'router': {'instances': 1}, 'secretName': 'ccxdeps-cluster-secret', 'serviceAccountName': 'ccxdeps-sa', 'tlsUseSelfSigned': True, 'version': '9.1.0'}
[2024-12-13 05:25:54,877] kopf.objects         [INFO    ] new={'backupProfiles': [{'dumpInstance': {'storage': {'s3': {'bucketName': 'mysql-backup-s3-ccx', 'config': 's3-secret', 'endpoint': 'https://s3.eu-north-1.amazonaws.com', 'prefix': '/ccx-backup', 'profile': 'default'}}}, 'name': 's3-backup'}], 'backupSchedules': [{'backupProfileName': 's3-backup', 'deleteBackupData': False, 'enabled': True, 'name': 'ccx-s3-backup-schedule', 'schedule': '*/30 * * * *'}], 'baseServerId': 1000, 'datadirVolumeClaimTemplate': {'resources': {'requests': {'storage': '20Gi'}}}, 'imagePullPolicy': 'IfNotPresent', 'initDB': {'dump': {'name': 'initdb-dump', 'storage': {'s3': {'bucketName': 'mysql-backup-s3-ccx', 'config': 's3-secret', 'endpoint': 'https://s3.eu-north-1.amazonaws.com', 'prefix': '/ccx-backup/ccxdeps-ccx-s3-backup-schedule241212170005', 'profile': 'default'}}}}, 'instances': 1, 'mycnf': '[mysqld]\nbinlog_expire_logs_seconds=604800\n', 'podSpec': {'containers': [{'name': 'mysql', 'resources': {'requests': {'memory': '2048Mi'}}}]}, 'router': {'instances': 1}, 'secretName': 'ccxdeps-cluster-secret', 'serviceAccountName': 'ccxdeps-sa', 'tlsUseSelfSigned': True, 'version': '9.1.0'}
[2024-12-13 05:25:54,995] kopf.objects         [INFO    ] Fields handled. Time to submit the patches to K8s API!
[2024-12-13 05:25:55,001] kopf.objects         [INFO    ] Handler 'on_spec/spec' succeeded.
```

## MySQL Too Many Connections

Fires when `Threads_connected` has been above 80% of `max_connections` for more than 2 minutes (alert: `MysqlTooManyConnections(>80%)`). Once `max_connections` is reached, MySQL will reject new connections (`ERROR 1040: Too many connections`), which breaks both the application and CCX's own control-plane operations against that datastore.

### Diagnose the issue

Check which users/hosts are actually holding connections open. The following command will connect you to the MySQL pod running inside the Kubernetes cluster (`<mysql-pod-name>`), and will report a per-user/host connection breakdown:
```bash
kubectl exec -it <mysql-pod-name> -- mysql -uroot -p -e \
  "SELECT user, host, COUNT(*) FROM information_schema.processlist GROUP BY user, host ORDER BY COUNT(*) DESC;"
```
To see long-running transactions that are holding a connection open without committing (MySQL's equivalent of Postgres's `idle in transaction`), check `information_schema.innodb_trx`:
```bash
kubectl exec -it <mysql-pod-name> -- mysql -uroot -p -e \
  "SELECT trx_id, trx_mysql_thread_id, trx_started, TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS trx_age_seconds FROM information_schema.innodb_trx ORDER BY trx_started ASC;"
```

### Common causes

- Application-side connection leak (connections got opened but never closed or returned to a pool).
- No connection pooler (e.g. ProxySQL) in front of a high-concurrency application.
- Long-running transactions holding connections open (see `innodb_trx` query above).
- Legitimate sustained increase in application load.

### Resolving the issue

- Terminate leaked or stuck connections, if it is safe to do so, using the thread ID from the `innodb_trx` query above:
  ```sql
  KILL <trx_mysql_thread_id>;
  ```
- Fix the root cause at the application/pooler level so connections get closed and reused properly.
- If the load increase is legitimate and sustained, raise `max_connections` — this can be set dynamically without a restart (`SET GLOBAL max_connections = <value>;`), but to persist across pod restarts also add it to the `mysql-innodbcluster.serverConfig.mycnf` field on the Helm values (rendered into the InnoDB Cluster CR's `mycnf` field).

## MySQL Down

Fires when `mysql_up` is 0 for 5 minutes (alert: `MysqlDown`, severity critical). This means the `mysqld_exporter` can reach the host but MySQL itself is not responding — more severe than an exporter/scrape failure, since the database process itself appears to be down.

### Diagnose the issue

```bash
kubectl exec -it <mysql-pod-name> -- mysqladmin ping -uroot -p
```
If this fails, check the container's own logs for the actual crash/failure:
```bash
kubectl logs <mysql-pod-name> --previous
```

### Common causes

- The process crashed or was OOM-killed — see "Kubernetes Container OOM Killer" below.
- The underlying host is down or unreachable — see the Host sections above.
- A corrupted InnoDB redo log or data file is preventing MySQL from starting cleanly.

### Resolving the issue

- If it was OOM-killed, follow "Kubernetes Container OOM Killer" above rather than just restarting — an unresolved memory issue will recur.
- If it's a clean crash with no resource pressure, check the error log for the specific startup failure before restarting.

## MySQL Slave Replication Stopped

Fires when the SQL replication thread is not running on a replica (alert: `MysqlSlaveReplicationStopped`, severity critical, metric: `mysql_slave_status_slave_sql_running`). Unlike "MySQL Slave Replication Lag" below, this means replication has fully halted — no new data is being applied at all, rather than merely falling behind.

### Diagnose the issue

```bash
kubectl exec -it <mysql-pod-name> -- mysql -uroot -p -e "SHOW REPLICA STATUS\G"
```
Check `Last_SQL_Error`/`Last_IO_Error` for the specific error that halted replication.

### Common causes

- A specific replicated statement failed on the replica (e.g. a duplicate key or other data drift between source and replica).
- Replication was stopped manually and not resumed.
- Corruption or a schema mismatch between source and replica.

### Resolving the issue

- Resolve the underlying error (or, if safe, skip the offending statement) and resume with `START REPLICA;`. If data drift is significant, re-provisioning the replica from the source may be safer than skipping errors — see the same guidance under "MySQL Slave Replication Lag" below.

## MySQL Slave Replication Lag

Fires when a replica's replication lag, minus any intentional `sql_delay`, has been above 30 seconds for more than a minute (alert: `MysqlSlaveReplicationLag`). This alert only evaluates on instances that are actually configured as an asynchronous replica of another server — it does not apply to the core members of an InnoDB Cluster's Group Replication group, which use a different replication mechanism; it's relevant when an InnoDB Cluster Read Replica is attached to the cluster.

### Diagnose the issue

Check the replica's status directly:
```bash
kubectl exec -it <mysql-pod-name> -- mysql -uroot -p -e "SHOW REPLICA STATUS\G"
```
The key fields to look at:
- `Seconds_Behind_Source` — how far behind the replica currently is.
- `Replica_IO_Running` / `Replica_SQL_Running` — whether both replication threads are actually running; if either shows `No`, replication has stopped rather than merely lagging.
- `Last_SQL_Error` / `Last_IO_Error` — populated if replication has stopped due to an error.

### Common causes

- The replica is under-resourced relative to the write rate on the source (slower disk/CPU can't keep up).
- Large or bulk transactions on the source take a while to apply on the replica.
- Read queries on the replica lock-contend with the replication applier thread.
- Network issues between source and replica.
- Replication has stopped outright due to an error (check `Last_SQL_Error`/`Last_IO_Error` above), rather than gradually falling behind.

### Resolving the issue

- If a replication thread has stopped due to an error, resolve the underlying issue (or, if safe, skip the offending statement) and resume with `START REPLICA;`. In cases of significant data drift, re-provisioning the replica from the source may be safer than skipping errors.
- If the replica is just falling behind under normal load, look at replica resourcing and consider tuning parallel replication (`replica_parallel_workers`), reducing the size of large transactions on the source, or moving conflicting read traffic off the lagging replica.
- Restarting the replica on its own does not resolve genuine lag — it only helps if replication had stopped due to a transient, already-resolved condition.

### Zalando Postgres Operator Backup Validation
Validate backups in PostgreSQL pods:
```bash
kubectl exec -it acid-ccx-0 -- bash
envdir "/run/etc/wal-e.d/env" wal-g backup-list
```

Also, confirm objects stored on S3 storage.

### Zalando Postgres Operator Restore Validation
Check restore logs:
```bash
kubectl logs -l cluster-name=acid-ccx
```
Example logs:
```text
2024-12-13 04:05:06,097 INFO: trying to bootstrap a new cluster
2024-12-13 04:05:06,098 INFO: Running custom bootstrap script: envdir "/run/etc/wal-e.d/env-clone-acid-ccx" python3 /scripts/clone_with_wale.py --recovery-target-time="2024-12-13T03:00:00+00:00"
2024-12-13 04:05:06,230 INFO: Trying s3://postgresql/spilo/acid-ccx/wal/14/ for clone
2024-12-13 04:05:06,290 INFO: cloning cluster acid-ccx using wal-g backup-fetch /home/postgres/pgdata/pgroot/data base_000000010000000000000002
```

## PostgreSQL Exporter Error

Fires when the `postgres-exporter` sidecar reports that its last scrape of a datastore's Postgres instance failed (alert: `PostgresqlExporterError`, metric: `pg_exporter_last_scrape_error`). This means metrics for that instance may be stale or missing, which can hide other real issues from monitoring/alerting until it's resolved.

### Diagnose the issue

Check the exporter's own logs to see which query failed and why:
```bash
kubectl logs <postgres-pod-name> -c postgres-exporter
```

### Common causes

- The exporter lost its connection to Postgres (instance restarting, credentials rotated/invalid, or a network interruption between the sidecar and `localhost:5432`).
- A built-in exporter query references a system view/column not available on this Postgres version (can happen after an exporter image upgrade).
- The exporter's scrape timed out because Postgres was under heavy load.
- Permission errors, if the exporter's database user no longer has access to a stats view it queries (unlikely by default, since it uses the operator-managed superuser credentials).

### Resolving the issue

- Confirm the datastore's Postgres instance is up and reachable: `kubectl exec -it <postgres-pod-name> -- pg_isready`.
- If credentials were rotated outside the operator, verify the `postgres.acid-ccx.credentials.postgresql.acid.zalan.do` secret still matches what the exporter sidecar is using, and restart the pod to pick up any secret changes.
- If the error points to a specific query failing after an exporter version bump, check the [postgres_exporter release notes](https://github.com/prometheus-community/postgres_exporter/releases) for breaking changes against this Postgres version, and consider pinning back to the previously working image tag.


## PostgreSQL Too Many Connections

Fires when a database's active connection count has been above 80% of `max_connections` for more than 2 minutes (alert: `PostgresqlTooManyConnections`). Once `max_connections` is reached, PostgreSQL will reject any new connections (`FATAL: too many connections`), which breaks both the application and CCX's own control-plane operations against that datastore.

### Diagnose the issue

Check which database and which connection states are actually holding connections. The following command will connect you to the Postgres pod running inside the Kubernetes cluster (`<postgres-pod-name>`), and will report how many connections are in which state for each database:
```bash
kubectl exec -it <postgres-pod-name> -- psql -U postgres -c \
  "SELECT datname, state, count(*) FROM pg_stat_activity GROUP BY datname, state ORDER BY count(*) DESC;"
```

Also check the "Active Connections" and "Connections by Database" panels on the `ccx-db-monitoring` Grafana dashboard to see whether the spike is isolated to one database or cluster-wide, and whether it climbed gradually which might indicate that there is a leak going on, or it jumped suddenly, meaning it could just be a sudden traffic spike.

### Common causes

- Application-side connection leak (connections got opened but never closed or returned to a pool).
- No connection pooler (e.g. PgBouncer) in front of a high-concurrency application.
- Long-running or stuck (`idle in transaction`) transactions holding connections open.
- Legitimate sustained increase in application load.

### Resolving the issue

- Terminate leaked or stuck connections, if it is safe to do so. The following command finds every Postgres connection that's been stuck "idle in transaction" (including the "idle in transaction (aborted)" variant) for more than 10 minutes and forcibly terminates those connections to free up the resources they're holding:
  ```sql
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE state LIKE 'idle in transaction%' AND now() - state_change > interval '10 minutes';
  ```
- Fix the root cause at the application/pooler level so connections get closed and reused properly.
- If the load increase is legitimate and sustained, raise `max_connections` via the `postgresql.parameters.max_connections` field on the Postgresql CR (`acid-ccx`) — this requires a restart to take effect.

## PostgreSQL Dead Locks

Fires when more than 5 deadlocks have been detected on a database within a 1-minute window (alert: `PostgresqlDeadLocks`, metric: `pg_stat_database_deadlocks`). A deadlock happens when two or more transactions each hold a lock the other one needs, so none of them can proceed.

Postgres detects this on its own (it checks every `deadlock_timeout`, 1 second by default) and automatically aborts one of the transactions to break the cycle — no manual intervention is needed to resolve an individual deadlock. A burst of deadlocks like this alert reports usually points to a recurring application-level issue worth investigating.

### Diagnose the issue

Postgres always logs deadlocks to its server log, regardless of the configured log level. Check the datastore's Postgres logs for the failing queries and tables:
```bash
kubectl logs <postgres-pod-name> | grep -i "deadlock detected" -A 20
```
Each log entry includes both transactions involved, the queries they were running, and which locks they held versus which they were waiting on — that detail is what points to the actual conflicting code paths.

### Common causes

- Different parts of the application acquiring locks on the same tables/rows in inconsistent order (e.g. one code path updates row A then row B, another updates B then A).
- Long-running transactions holding locks while a conflicting transaction starts and needs the same rows.
- High concurrency on a small set of frequently-updated rows.

### Resolving the issue

- Postgres has already rolled back the losing transaction by the time this alert fires, so there's nothing to terminate or revert manually.
- Fix the application to acquire locks in a consistent order across all code paths that touch the same tables/rows, and keep transactions short so locks are held for as little time as possible.
- Make sure the application catches `deadlock detected` errors and retries the aborted transaction — Postgres does not retry it automatically, so without retry logic the aborted transaction's work is simply lost.

## PostgreSQL High Rollback Rate

Fires when the ratio of rolled-back to committed transactions on a database exceeds 2% (alert: `PostgresqlHighRollbackRate`, metric: ratio of `pg_stat_database_xact_rollback` to `pg_stat_database_xact_commit`). This alert only tells that an unusual share of transactions are failing to commit, not why, so identifying which error type is actually driving the ratio is the main goal here.

### Diagnose the issue

Check the datastore's Postgres logs for the errors preceding the rollbacks, and see which one dominates:
```bash
kubectl logs <postgres-pod-name> | grep -i "^.*ERROR:" | sort | uniq -c | sort -rn | head -20
```
The error text tells you which cause applies:
- `deadlock detected` — see [PostgreSQL Dead Locks](#postgresql-dead-locks) above; a deadlock burst will also show up here since every deadlock victim is a rollback.
- Terminated `idle in transaction` sessions from the connections runbook also count as rollbacks — see [PostgreSQL Too Many Connections](#postgresql-too-many-connections) above.
- `could not serialize access due to concurrent update` — a serialization failure under `REPEATABLE READ`/`SERIALIZABLE` isolation, see below.
- `duplicate key value violates unique constraint`, `violates foreign key constraint`, `violates check constraint` — a constraint violation, see below.

### Common causes

- **Serialization failures**: the application uses `REPEATABLE READ` or `SERIALIZABLE` isolation under concurrent writes to the same rows, and Postgres aborts one side rather than let them commit inconsistently.
- **Constraint violations**: the application is sending input that violates a unique/foreign-key/check constraint. This can be expected behavior if the database is being used to enforce validation, rather than a sign of a database problem, so it could be an issue on the application side.
- **Deadlocks or terminated connections**: see the linked sections above.
- **Client disconnects mid-transaction**, which Postgres rolls back automatically.

### Resolving the issue

- If serialization failures dominate, make sure the application retries transactions that fail with a serialization error — this is expected behavior under those isolation levels and requires retry logic on the client side, not a database-side fix.
- If constraint violations dominate, confirm with the application team whether this is expected validation traffic; if not, fix the application logic generating invalid input before it reaches the database.
- If deadlocks or terminated connections dominate, follow the resolution steps in the linked sections above rather than treating this as a separate issue.

## PostgreSQL Down

Fires when `pg_up` is 0 for 5 minutes (alert: `PostgresqlDown`, severity critical). This means the `postgres_exporter` can reach the host but Postgres itself is not responding — more severe than an exporter/scrape failure, since the database process itself appears to be down.

### Diagnose the issue

```bash
kubectl exec -it <postgres-pod-name> -- pg_isready
```
If this fails, check the container's own logs for the actual crash/failure:
```bash
kubectl logs <postgres-pod-name> --previous
```

### Common causes

- The process crashed or was OOM-killed — see "Kubernetes Container OOM Killer" below.
- The underlying host is down or unreachable — see the Host sections above.
- The data directory is corrupted or the WAL is unreadable, preventing a clean start.

### Resolving the issue

- If it was OOM-killed, follow "Kubernetes Container OOM Killer" below rather than just restarting — an unresolved memory issue will recur.
- If it's a clean crash with no resource pressure, check the Postgres log for the specific startup failure before restarting.

## PostgreSQL Restarted

Fires immediately when a Postgres instance's postmaster process has been running for less than 60 seconds (alert: `PostgresqlRestarted`, severity warning, metric: `pg_postmaster_start_time_seconds`). An unexpected restart can indicate a crash, OOM kill, or manual intervention.

### Diagnose the issue

Check the Postgres logs around the restart time to confirm the cause:
```bash
kubectl logs <postgres-pod-name> --previous
```

### Common causes

- A crash or OOM kill — see "Kubernetes Container OOM Killer" below and "PostgreSQL Down" above.
- A manual restart or a failover promoting a different node to primary (expected, not an incident).
- A Kubernetes-initiated restart (node drain, rolling update).

### Resolving the issue

- If the logs show a crash or OOM kill, follow "Kubernetes Container OOM Killer" below.
- If it was an expected restart (failover, planned maintenance, rollout), no action is needed — this alert is informational in that case.

## Kubernetes Container OOM Killer

Fires when a container's restart count has increased in the last 10 minutes and its last termination reason was `OOMKilled` (alert: `KubernetesContainerOomKiller`). This means the container exceeded its own memory limit and the kernel killed it — distinct from the node running low on memory overall (see [Host Out Of Memory](#host-out-of-memory) below); a container can get OOM-killed on a machine with plenty of free memory if that container's individual limit is set too low.

### Diagnose the issue

Check the container's last termination details:
```bash
kubectl describe pod <pod-name> -n <namespace>
```
Look for `Last State: Terminated`, `Reason: OOMKilled`, `Exit Code: 137` under the affected container. To see how usage trended before the kill, compare `container_memory_working_set_bytes` against `kube_pod_container_resource_limits{resource="memory"}` for that container/pod in VictoriaMetrics/Grafana.

### Common causes

- The container's memory limit (`resources.limits.memory`) is set too low for its actual workload.
- A genuine memory leak in the application.
- A legitimate spike in load or data volume pushing usage above what was provisioned.

### Resolving the issue

- If the limit is simply undersized, raise `resources.limits.memory` for that container wherever it's defined (Helm values for CCX's own services, or the relevant operator CR's `podSpec` for MySQL/Postgres — see the `podSpec.containers` fields already referenced elsewhere in this doc for those).
- If it's a leak, raising the limit only delays the next kill — this needs an application-level investigation.

## Kubernetes Pod Crash Looping

Fires when a container has restarted more than once within a 10-minute window, sustained for 15 minutes (alert: `KubernetesPodCrashLooping`). This alert is deliberately cause-agnostic — it doesn't distinguish *why* the container is restarting, only that it's stuck in a restart cycle.

### Diagnose the issue

Check the last termination reason and exit code:
```bash
kubectl describe pod <pod-name> -n <namespace>
```
Then pull the logs from the crashed instance, not the new one (which may not have logged the failure yet):
```bash
kubectl logs <pod-name> -n <namespace> --previous
```

### Common causes

- Repeated OOM kills — see "Kubernetes Container OOM Killer" above, which would also trip this alert.
- The application is crashing on startup (bad config, missing dependency, failed migration).
- A failing liveness probe is causing Kubernetes to kill and restart a container that's otherwise fine but slow to respond.

### Resolving the issue

There's no generic fix here — the resolution depends entirely on what the logs from `--previous` show. If it's an OOM kill, follow the resolution steps in "Kubernetes Container OOM Killer" above rather than treating this as a separate issue.

## Kubernetes Pod Not Healthy

Fires when a pod has been stuck in a `Pending`, `Unknown`, or `Failed` phase for more than 15 minutes (alert: `KubernetesPodNotHealthy`). This is distinct from "Kubernetes Pod Crash Looping" above — it means the pod isn't reaching a running state at all, rather than repeatedly crashing once it does start.

### Diagnose the issue

```bash
kubectl describe pod <pod-name> -n <namespace>
```
Check the `Events` section for the actual blocker — this phase is almost always explained there directly (a scheduling failure, an image pull error, or a stuck init container).

### Common causes

- A scheduling failure — insufficient node resources, or an unsatisfied node affinity/taint/toleration.
- An image pull failure (bad tag, registry auth issue).
- A failed or hanging init container, which blocks the pod from ever starting its main containers.

### Resolving the issue

- Fix whatever the pod's `Events` point to — scale/free up node resources, correct the image reference, or fix the init container.
- Unlike crash-looping, this pod likely never ran, so `kubectl logs --previous` won't have anything useful — `Events` is the primary source of truth here.

## Unready Endpoints

Fires when a Service has one or more endpoint addresses that aren't ready for more than 15 minutes (alert: `UnreadyEndpoints`, metric: `kube_endpoint_address_not_ready`). This means traffic sent to the Service risks being routed to a backing pod that can't actually serve it yet — or, if every endpoint is unready, the Service has no working backend at all.

### Diagnose the issue

```bash
kubectl get endpoints <service-name> -n <namespace>
kubectl get pods -n <namespace> -l <service-selector-labels>
```
This shows which specific pods are behind the not-ready endpoints, so you can check their readiness state directly.

### Common causes

- Backing pods are failing readiness probes — see "Kubernetes Pod Crash Looping"/"Kubernetes Pod Not Healthy" above.
- A pod just started and hasn't passed its readiness probe yet — transient and usually self-resolving.
- A misconfigured readiness probe (wrong port/path) that never succeeds even though the application itself is healthy.

### Resolving the issue

- Follow whichever pod-health section above applies to the specific backing pods.
- If the probe itself is misconfigured, fix the probe's port/path rather than the application — the app may already be healthy.

## PVC Volume Usage

Fires when a PersistentVolumeClaim is using more than 90% of its provisioned capacity (alert: `PVCVolumeUsage`). This is the Kubernetes PVC abstraction over storage — distinct from the underlying host filesystem (see "Disk Autoscaling Issues" above) and applies to any PVC in the cluster, not just datastore data volumes.

### Diagnose the issue

```bash
kubectl get pvc -n <namespace>
kubectl describe pvc <pvc-name> -n <namespace>
```
`describe` shows which pod the PVC is mounted to and its StorageClass, which determines whether it can be expanded in place.

### Common causes

- Data growth on the volume (application data, logs, or backup staging files accumulating).
- No autoscaling configured for this particular volume.

### Resolving the issue

- If the StorageClass has `allowVolumeExpansion: true`, expand the PVC directly (`kubectl edit pvc <pvc-name>`, raising `spec.resources.requests.storage`); otherwise, free up space or migrate to a larger volume.
- If this PVC belongs to a datastore's data volume, check "Disk Autoscaling Issues" above first — CCX already auto-expands datastore storage once the underlying host disk crosses 75% usage, so this alert may just mean autoscaling hasn't caught up yet, rather than requiring manual expansion.

## Kubernetes Node Not Ready

Fires when a Kubernetes Node's `Ready` condition has been `false` for more than 5 minutes (alert: `KubeNodeNotReady`). This is Kubernetes' own top-level health verdict for the node — kubelet on that machine has stopped reporting a healthy heartbeat to the control plane.

### Diagnose the issue

```bash
kubectl describe node <node-name>
```
The `Conditions` section shows `Type`/`Status`/`Reason`/`Message` for `Ready` (and the related `DiskPressure`/`MemoryPressure`/`PIDPressure`/`NetworkUnavailable` conditions below) — the `Message` field usually explains why directly, e.g. `KubeletNotReady`, `container runtime is down`, or `PLEG is not healthy`.

### Common causes

- kubelet crashed or stopped heartbeating to the control plane.
- The container runtime (containerd) failed on that node.
- A network partition between the node and the control plane.
- The underlying machine itself is down (cloud provider issue, unexpected reboot).

### Resolving the issue

This often needs infrastructure-level investigation rather than a `kubectl`-only fix — check the cloud provider's console/node status alongside `kubectl describe node`. If the node doesn't self-heal, cordon and drain it (`kubectl cordon <node-name>`, `kubectl drain <node-name>`) so its pods reschedule elsewhere, then replace the underlying machine.

## Kubernetes Disk And Memory Pressure

Fires when a Node's `DiskPressure` or `MemoryPressure` condition is `true` for more than 2 minutes (alerts: `DiskPressure`, `MemoryPressure`). These come from kubelet's own hard-coded (but configurable) eviction thresholds — by default, things like root filesystem availability below 10% or available memory below 100Mi. Unlike the raw host-metric alerts elsewhere in this doc, these mean kubelet has already started **actively evicting pods** from the node to reclaim the resource — this isn't just an observability signal, it has an immediate effect on running workloads.

### Diagnose the issue

Same as above — `kubectl describe node <node-name>`, check the `DiskPressure`/`MemoryPressure` condition's `Message` for the specific threshold that was crossed. Also check `kubectl get events -n <namespace> --field-selector reason=Evicted` to see which pods have already been evicted as a result.

### Common causes

- `DiskPressure`: container image sprawl not garbage-collected in time, logs filling the node's root filesystem, or a pod writing excessively to `emptyDir`/`hostPath` without limits.
- `MemoryPressure`: too many pods scheduled on the node without proper memory requests/limits, causing overcommit, or a non-pod process consuming host memory.

### Resolving the issue

- These partially self-heal via kubelet's own eviction, but the underlying cause still needs fixing so it doesn't recur.
- For disk pressure, free up space on the node (clean up unused images/logs, or increase disk size).
- For memory pressure, review pod resource requests/limits across the node and consider node pool sizing — this is a Kubernetes-level scheduling concern, distinct from a single container's own memory limit (see "Kubernetes Container OOM Killer" above).

## Host Out Of Memory

Fires when less than 10% of a machine's total memory is available (alert: `HostOutOfMemory`). This is a raw, percentage-based host metric from node_exporter — distinct from Kubernetes' `MemoryPressure` node condition above, which uses kubelet's own absolute threshold and actively triggers pod eviction; this alert has no side effects of its own, it's purely observability.

### Diagnose the issue

```bash
kubectl debug node/<node-name> -it --image=busybox -- free -h
```
This prints a memory summary table with `total`/`used`/`free`/`buff/cache`/`available` columns — look at `available`, not `free`: `free` alone is usually low since Linux uses spare RAM as reclaimable disk cache (`buff/cache`), while `available` is what this alert's metric actually tracks, so a low `available` value confirms real pressure. High swap usage alongside it is a further sign the machine is genuinely out of room.

Or check `node_memory_MemAvailable_bytes` / `node_memory_MemTotal_bytes` directly in VictoriaMetrics/Grafana to see the trend leading up to the alert.

### Common causes

- Too many pods scheduled on the node without accurate memory requests, causing real overcommit.
- A workload's actual memory usage growing beyond what was originally provisioned for the node.

### Resolving the issue

- Review pod resource requests/limits scheduled onto the affected node, and consider node pool sizing if this is a recurring, cluster-wide pattern rather than a one-off spike.
- If this is accompanied by `HostMemoryUnderPressure` or `HostOomKillDetected` below, treat those as the more urgent signals — this alert alone just means memory is getting tight, not that anything has failed yet.

## Host Memory Under Pressure

Fires when the rate of major page faults exceeds 1000/s for more than 2 minutes (alert: `HostMemoryUnderPressure`). A major page fault happens when the kernel has to go all the way to disk (swap) to satisfy a memory access, as opposed to a minor fault satisfied from RAM already mapped elsewhere — a sustained high rate here means the machine is actively thrashing, swapping heavily because RAM is genuinely oversubscribed. This is often a stronger signal of real distress than `HostOutOfMemory` above, since "low available memory" by simple accounting can just mean reclaimable page cache, while a high major-fault rate means the system is actually struggling.

### Diagnose the issue

```bash
kubectl debug node/<node-name> -it --image=busybox -- sh -c "cat /proc/vmstat | grep pgmajfault"
```
This prints a single cumulative counter (total major faults since boot), not a rate, so one reading alone isn't meaningful — either run it twice a minute apart and compare, or just check `rate(node_vmstat_pgmajfault[1m])` directly in VictoriaMetrics/Grafana, which is the same number the alert itself already evaluates, alongside memory usage to confirm actual swapping is happening rather than a temporary spike.

### Common causes

- Same as `HostOutOfMemory` above (overcommitted scheduling, workload growth) — this alert just confirms the machine is actually thrashing as a result, rather than merely running low on paper.

### Resolving the issue

- Same remediation as `HostOutOfMemory` above — this is a more severe confirmation of the same underlying resource problem, not a separate issue to solve differently.

## Host OOM Kill Detected

Fires when the kernel's OOM killer fires anywhere on the machine (alert: `HostOomKillDetected`). This is distinct from [Kubernetes Container OOM Killer](#kubernetes-container-oom-killer) above, which only fires when a *container* hits its own cgroup memory limit while the rest of the host may have plenty of free memory — this alert means the *entire machine* ran out of memory and the kernel picked some process to kill, which could be any process on the box, not necessarily a well-behaved containerized one. That's why this is `critical` rather than `warning`.

### Diagnose the issue

The kernel logs which process was killed and why — check the node's kernel log:
```bash
kubectl debug node/<node-name> -it --image=busybox -- sh -c "dmesg | grep -i 'killed process'"
```
Each matching line names the killed process and its PID, plus its memory usage at the time (`anon-rss` is the actual resident memory it was holding) — use that to identify whether it was a legitimate workload that needs more room or an unexpected/runaway process.

### Common causes

- The combination of causes described in `HostOutOfMemory`/`HostMemoryUnderPressure` above finally exhausted all available memory (including swap) on the machine.
- A process outside of any pod's cgroup limits (a system daemon, or a process running with no memory limit at all) consumed enough memory to trigger a host-wide OOM condition.

### Resolving the issue

- Identify the killed process from the kernel log and determine whether it should have had a memory limit that would have contained it instead (redirecting this to a `KubernetesContainerOomKiller`-style contained failure rather than a host-wide one).
- Address the underlying memory pressure per `HostOutOfMemory`/`HostMemoryUnderPressure` above — this alert is usually the end result of those going unaddressed.

## Host Unusual Disk I/O Rate

Fires when a host's aggregate disk throughput exceeds 50 MB/s sustained for 10 minutes, in either direction (alerts: `HostUnusualDiskReadRate` for reads, `HostUnusualDiskWriteRate` for writes). This can be entirely legitimate (a backup, a large query, a bulk import/export) or a symptom of a problem (swap thrashing amplifying disk I/O — see "Host Memory Under Pressure" above — or a missing index causing excessive table scans).

### Diagnose the issue

```bash
kubectl debug node/<node-name> -it --image=busybox -- sh -c "cat /proc/diskstats"
```
This lists per-device read/write counters; to identify *which pod* is driving the I/O rather than just confirming the host-level rate, check `container_fs_reads_bytes_total`/`container_fs_writes_bytes_total` per pod in VictoriaMetrics/Grafana, then cross-reference against what's actually running on that node at the time (a backup job, a large query) via `kubectl get pods -o wide` and the relevant application/database logs.

### Common causes

- A legitimate, expected operation — a scheduled backup, restore, or large data import/export.
- Swap thrashing amplifying disk I/O as a side effect of memory pressure (see "Host Memory Under Pressure" above) — check whether this alert and that one are firing together.
- An unusually large or unindexed query causing excessive disk reads.

### Resolving the issue

- If it's a known, expected operation (a backup window, a planned migration), no action is needed — the alert clears once the operation finishes.
- If it's driven by memory pressure, fix that first per "Host Memory Under Pressure" above rather than treating this as a separate issue.
- If it's a recurring query pattern, investigate indexing/query optimization on the datastore involved, or consider scheduling heavy operations off-peak.

## Host Out Of Disk Space

Fires when less than 10% of space is free on any non-readonly filesystem on the host, for more than 5 minutes (alert: `HostOutOfDiskSpace`). This applies to *any* mountpoint on the machine — distinct from "Disk Autoscaling Issues" above, which watches specifically the datastore's `/data` mountpoint at a 70%-used threshold and has CCX's own autoscaling automation behind it. If this alert fires specifically on the `/data` mountpoint, that's a sign autoscaling failed or isn't keeping up, rather than a separate problem.

### Diagnose the issue

```bash
kubectl debug node/<node-name> -it --image=busybox -- df -h
```
This lists each mounted filesystem with its size/used/available/use% — check the `Mounted on` column to identify which filesystem is actually low, then narrow down what's consuming the space on it (e.g. `du -sh /path/* | sort -rh | head` for that mountpoint).

### Common causes

- Logs that aren't being rotated or cleaned up.
- Container image/layer buildup that garbage collection hasn't caught up with.
- Orphaned data (old snapshots, temp files) left behind by a previous operation.
- If it's the `/data` mountpoint specifically: CCX's disk autoscaling either isn't enabled for that datastore or isn't keeping pace with growth — see "Disk Autoscaling Issues" above.

### Resolving the issue

- Free up space directly (rotate/purge logs, clean up unused container images, remove orphaned data).
- If it's a non-`/data` mountpoint (e.g. the OS root partition), expand the underlying volume if the growth is legitimate and recurring.
- If it's the `/data` mountpoint, check the datastore's autoscaling configuration per "Disk Autoscaling Issues" above rather than only manually freeing space.

## Host Disk Will Fill In 24 Hours

Fires under the same condition as "Host Out Of Disk Space" above (less than 10% free), **plus** a linear projection (`predict_linear` over the last hour) predicting the filesystem will hit zero within 24 hours (alert: `HostDiskWillFillIn24Hours`). Despite the name, this is not an early-warning that fires *before* `HostOutOfDiskSpace` — it requires the same threshold to already be crossed, so it fires alongside or after that alert, adding "and it's still trending toward zero" as extra context rather than being a separate predictive system.

### Diagnose and resolve

Same as "Host Out Of Disk Space" above — treat this as a confirmation that the situation is actively worsening rather than plateauing at a low-but-stable usage level, not as a distinct problem needing separate steps.

## Host Out Of Inodes

Fires when less than 10% of a filesystem's inodes are free, for more than 5 minutes (alert: `HostOutOfInodes`). Inodes are filesystem metadata slots — one per file or directory — so a filesystem can run out of inodes while still having plenty of raw disk space free, if something is creating a huge number of small files. `df -h` (used for the disk-space alerts above) won't show this problem at all.

### Diagnose the issue

```bash
kubectl debug node/<node-name> -it --image=busybox -- df -i
```
This shows inode counts (`Inodes`/`IUsed`/`IFree`/`IUse%`) per filesystem instead of byte sizes — look for a high `IUse%` alongside a normal-looking `df -h` for the same mountpoint, which confirms it's an inode problem rather than a space problem. To find the culprit directory, count files per top-level directory on the affected mountpoint (e.g. `find <path> -xdev -printf '%h\n' | sort | uniq -c | sort -rn | head`).

### Common causes

- A large volume of small files accumulating — logs, cache files, or session files that aren't being cleaned up.
- A bug or runaway process creating files without ever removing them.

### Resolving the issue

- Clean up or rotate the files in the offending directory.
- If this is a systemic pattern rather than a one-off, add a cleanup/rotation job or reduce whatever is generating the files at that volume.

## Host High CPU Load

Fires when a host's CPUs are busy (non-idle) more than 80% of the time, averaged over 2 minutes (alert: `HostHighCpuLoad`). This alone only says the CPU is busy, not *why* — it could be legitimate load, or it could be inflated by steal time or iowait (both below) without any useful work actually happening.

### Diagnose the issue

```bash
kubectl debug node/<node-name> -it --image=busybox -- sh -c "top -bn1 | head -20"
```
The `%CPU` column per process combined with the summary line's breakdown by `us`/`sy`/`id`/`wa`/`st` (user/system/idle/iowait/steal) tells you whether this is real compute load or one of the other CPU alerts below masquerading as high load — a high `wa` or `st` percentage here means check "Host CPU High Iowait" or "Host CPU Steal Noisy Neighbor" instead of assuming a compute problem. To find which pod is responsible, cross-reference with `kubectl top pod -A --sort-by=cpu` for pods scheduled on that node.

### Common causes

- Legitimate heavy workload (a busy datastore, batch processing, backups running).
- A runaway or misbehaving process.
- Insufficient CPU allocated for the actual load on that node.
- Steal time or iowait inflating the "non-idle" percentage without real compute happening — see the two alerts below.

### Resolving the issue

- Identify the responsible pod/process and either scale up its CPU allocation or optimize the workload.
- If steal time or iowait dominates, address those specific causes (below) rather than treating this as a raw compute shortage.

## Host CPU Steal Noisy Neighbor

Fires when CPU "steal" time exceeds 10% for more than 5 minutes (alert: `HostCpuStealNoisyNeighbor`). Steal time is CPU cycles your VM wanted to run but the hypervisor gave to something else — another tenant sharing the same physical host, or your instance running out of burst credits on a burstable/spot instance type. This one is unusual among the alerts in this doc: there's genuinely nothing to fix *inside* the machine — it's an infrastructure-provider-side condition, not something the guest OS has visibility into beyond confirming it's happening.

### Diagnose the issue

```bash
kubectl debug node/<node-name> -it --image=busybox -- sh -c "top -bn1 | head -3"
```
The summary line's `st` (steal) percentage confirms and quantifies it — but there's nothing further to inspect from inside the guest; the cause lives on the hypervisor/cloud provider side.

### Common causes

- A noisy neighbor: another VM/tenant on the same physical host consuming excessive CPU.
- A burstable or spot instance type running out of allotted CPU credits.

### Resolving the issue

- This can't be resolved from inside the affected VM. Options are to resize/migrate to a non-burstable or dedicated instance type, or raise it with the cloud provider if it's a shared-host contention issue.

## Host CPU High Iowait

Fires when CPU iowait exceeds 5% for more than 5 minutes (alert: `HostCpuHighIowait`) — the CPU sitting idle specifically because it's waiting on outstanding disk I/O to complete, rather than genuinely having nothing to do. This connects directly to "Host Unusual Disk I/O Rate" and "Host Memory Under Pressure" (swap thrashing) above.

### Diagnose and resolve

Follow the diagnose/resolve steps in "Host Unusual Disk I/O Rate" and "Host Memory Under Pressure" above rather than treating this as a separate investigation — high iowait is usually the CPU-side symptom of the same disk or memory pressure those sections already cover.

## Host Context Switching

Fires when the rate of context switches per second, normalized per available CPU, exceeds 1000 (alert: `HostContextSwitching`). A high rate here means the scheduler is juggling far more runnable threads/processes than there are CPUs to run them on.

### Diagnose the issue

```bash
kubectl debug node/<node-name> -it --image=busybox -- sh -c "vmstat 1 5"
```
The `cs` column shows context switches per second per sample — a consistently high value confirms the scheduler churn. Cross-reference with `kubectl get pods -o wide` for that node and each pod's CPU requests/limits to see whether the node is simply overcommitted on scheduled work.

### Common causes

- Too many pods/threads scheduled per CPU on that node (overcommitted scheduling).
- An application with heavy lock contention, causing frequent thread hand-offs rather than sustained execution.
- A high interrupt rate from network or disk devices.

### Resolving the issue

- Review pod CPU requests/limits and scheduling density on the affected node; reduce pod density per node or increase CPU allocation if it's overcommitted.
- If it traces back to a specific application's threading/locking behavior, that needs application-level investigation rather than a node-level fix.

## Cluster Failed, Degraded, or Failed to Init

Fires when cmon reports at least one cluster entering a failed, degraded, or failed-to-initialize state (alerts: `Cluster Failed`, critical; `Cluster Degraded`, warning; `Cluster Failed to Init`, critical). Like `Backup Failed` above, these are controller-wide counters — they confirm *that* one of these states occurred somewhere, not *which* datastore.

### Diagnose the issue

Since the metric doesn't identify the specific cluster, find it via `s9s`:
```bash
s9s cluster --list --long
```
This lists every cluster with its current state in one of the columns — look for `FAILED`/`DEGRADED`, or a cluster stuck mid-creation for the failed-to-init case. Once you have the cluster ID, see "List jobs and view logs" above for drilling into its failed jobs.

### Common causes

- `Cluster Failed`: the datastore's underlying nodes are unreachable, or its primary/majority is down — a full outage.
- `Cluster Degraded`: some nodes are down or unhealthy, but the cluster is still serving (e.g. a replica missing, reduced but intact quorum).
- `Cluster Failed to Init`: the cluster never finished provisioning — see "Long-Running or Stuck Datastore" above, which covers recovering an interrupted create/add-node job.

### Resolving the issue

- For `Cluster Failed`/`Cluster Degraded`, check node status (`s9s node --list --long --cluster-id=NNN`) to identify which node(s) are down, then follow the relevant datastore-type recovery steps elsewhere in this doc (e.g. "MySQL Operator Failover, Adding Nodes, and Scaling Mechanism" for InnoDB Cluster, or the Zalando Postgres operator sections for Postgres).
- For `Cluster Failed to Init`, follow "Long-Running or Stuck Datastore" above to unstick or clean up the failed provisioning job.

## New Coredump Detected

Fires when a new coredump is detected on the `cmon-0` pod (alert: `NewCoredumpDetected`, severity critical, metric: `cmon_coredump_detected_total`). This means the cmon process itself crashed unexpectedly — distinct from a datastore-level failure, since cmon is CCX's own cluster-management engine.

### Diagnose the issue

Check `cmon-master`'s own logs immediately preceding the crash for what it was doing at the time:
```bash
kubectl logs cmon-0 -n <namespace> --previous
```
If a core file was captured, inspect it with `gdb` for a backtrace:
```bash
kubectl exec -it cmon-0 -n <namespace> -- gdb /usr/sbin/cmon <core-file-path> -ex bt -ex quit
```

### Common causes

- An unhandled exception or assertion failure triggered by a specific job or RPC request.
- Memory corruption, often only reproducible under a specific cluster state or job sequence.

### Resolving the issue

- Capture the backtrace and the preceding log lines, and file it against `clustercontrol-enterprise` so the crash can be reproduced and fixed at the source — this alert only tells you a crash happened, not why.
- If it's reproducible, note the exact job/action that preceded it; that's usually the fastest path to a fix.

## New User And Datastore Created

These fire as informational notifications, not incidents (alerts: `New User` when a new admin user signs up, `Datastore Created` when a new datastore is created). Both are severity `info` and need no action — they exist purely as an audit trail of account/datastore creation activity.

### What to check

No diagnosis is needed. To confirm the details of a specific event, check the CC UI's activity log, or query the underlying counters directly (`admin_users_total`, `admin_datastores_total{status="all"}`) to see current totals.

## Service Down

Fires when a Kubernetes Deployment or StatefulSet has zero available replicas for more than 5 minutes (alert: `service-down`, used identically by two separate rule groups — "Deployment status" and "Statefulset status"). Both are distinguished in Alertmanager only by their `namespace`/`name` labels, not by alert name. Nearly everything covered elsewhere in this doc — Postgres, MySQL, cmon, VictoriaMetrics itself — runs as a StatefulSet rather than a Deployment, so the Statefulset variant is the one most likely to matter in practice.

### Diagnose the issue

```bash
kubectl get deployment <name> -n <namespace>
# or
kubectl get statefulset <name> -n <namespace>
```
This shows the desired vs. available replica counts directly. To find out why replicas aren't coming up, check the pods it's supposed to manage:
```bash
kubectl describe pod -n <namespace> -l app=<name>
```
Look at each pod's `Events` section and last termination reason — the same categories covered in "Kubernetes Pod Crash Looping" above (crash on startup, image pull failure, failing probe) apply here too, since a service with zero available replicas is usually the sustained end-state of pods that keep failing to become ready.

### Common causes

- Pods crash-looping or failing readiness probes — see "Kubernetes Pod Crash Looping" above.
- An image pull failure (bad tag, registry auth issue).
- Insufficient cluster resources to schedule replacement pods (see the Host/Node resource sections above).
- A bad rollout — a recent change to the Deployment/StatefulSet spec broke every replica at once.

### Resolving the issue

- If it's a bad rollout, roll back to the previous working revision (`kubectl rollout undo`).
- Otherwise, follow whichever specific cause the pod events/logs point to — this alert itself is a symptom, not a diagnosis; the fix lives in whichever underlying issue (crash loop, resourcing, image) is actually responsible.

## Redis Down

Fires when `redis_up` is 0 for 5 minutes (alert: `RedisDown`, severity critical, metric from the `redis_exporter` sidecar — used for both Redis and Valkey instances). This means the exporter can reach the host but the Redis/Valkey process itself is not responding, which is more severe than an exporter/scrape failure.

### Diagnose the issue

```bash
kubectl exec -it <valkey-pod-name> -- redis-cli ping
```
If this doesn't return `PONG`, the process itself is down or unresponsive. Check the container's own logs for the actual failure:
```bash
kubectl logs <valkey-pod-name>
```

### Common causes

- The process crashed or was OOM-killed — check for a recent restart (`kubectl get pod <valkey-pod-name>`) and correlate with "Host Out Of Memory"/"Kubernetes Container OOM Killer" above.
- A persistence failure (RDB/AOF) caused the process to crash and fail to restart cleanly.
- The underlying host is down or unreachable — check the Host sections above.

### Resolving the issue

- If the container was OOM-killed, follow the resolution steps in "Kubernetes Container OOM Killer" above rather than just restarting — an unresolved memory issue will recur.
- If it's a clean crash with no resource pressure, restart the pod and inspect logs for the specific persistence/config error before it recurs.

## Endpoint Down

Fires when `probe_success{job="blackbox-exporter"}` is 0 for 10 minutes for a monitored external URL (alert: `EndpointDown`, severity critical). This means the blackbox exporter's HTTP probe against that URL has been failing continuously — distinct from a single flaky check.

### Diagnose the issue

Check the probe result and failure reason directly against the same URL the alert fired for:
```bash
curl -v <url>
```
Also check the blackbox exporter's own logs and config, since a probe can fail because of the exporter's own misconfiguration rather than the target itself:
```bash
kubectl logs -n victoriametrics deployment/ccx-monitoring-prometheus-blackbox-exporter
```

### Common causes

- The target service is genuinely down or returning a non-2xx status.
- DNS resolution for the URL is failing (see "DNS Records Are Not Updated/Synced" above if this is a CCX-managed hostname).
- A TLS/certificate problem is causing the probe to fail before it can even check the HTTP response — see "SSL Cert Expiring Soon" below.
- A network policy or firewall change is blocking the blackbox exporter from reaching the target.

### Resolving the issue

- Confirm the target service itself is healthy first — this alert is a symptom of whatever's actually wrong with the endpoint, not a standalone issue.
- If DNS is the cause, follow "DNS Records Are Not Updated/Synced" above.
- If it's a cert issue, follow "SSL Cert Expiring Soon" below.

## SSL Cert Expiring Soon

Fires when the earliest-expiring certificate in a monitored URL's chain expires in less than 10 days (alert: `SSLCertExpiringSoon`, severity critical, metric: `probe_ssl_earliest_cert_expiry`).

### Diagnose the issue

Check the certificate's actual expiry against the live endpoint:
```bash
echo | openssl s_client -connect <host>:443 -servername <host> 2>/dev/null | openssl x509 -noout -dates
```

### Common causes

- `cert-manager` failed to renew the certificate (ACME challenge failure, rate limiting, or a misconfigured `ClusterIssuer`).
- The certificate was issued/installed manually and isn't on any auto-renewal path.

### Resolving the issue

- If the certificate is `cert-manager`-issued, check its renewal status and events:
  ```bash
  kubectl get certificate -n <namespace>
  kubectl describe certificate <name> -n <namespace>
  ```
  and check `cert-manager`'s own logs for ACME errors if the renewal is stuck.
- If it's an externally/manually-managed certificate, renew and redeploy it before it expires.

## Datastore DNS Unreachable

Fires when `probe_success{job=~"datastore-dns-check-.*"}` is 0 for 5 minutes for a specific customer datastore (alert: `DatastoreDnsUnreachable`, severity critical). This means the datastore's main DNS record is not resolving or reachable on that environment — the alert's `DatastoreName`, `ClusterName`, `ClusterID`, and `environment` labels identify exactly which datastore.

### Diagnose the issue

```bash
dig +short <datastore-dns-record>
```
Compare the result against the expected target — if it doesn't resolve at all, or resolves to something unexpected, check whether external-dns has synced the record correctly per "DNS Records Are Not Updated/Synced" above.

### Common causes

- external-dns failed to sync or update the record — see "DNS Records Are Not Updated/Synced" above.
- The underlying host is down or unreachable — see the Host sections above.
- A recent failover moved the datastore's primary/service endpoint faster than DNS propagated the change.

### Resolving the issue

- Check "DNS Records Are Not Updated/Synced" above first — this is the most common cause.
- If a failover just occurred, confirm the new primary is healthy and give DNS propagation a few minutes before treating this as a standalone incident.
- If the host itself is down, follow the relevant Host section above rather than treating this as a DNS-specific problem.

## Metrics Stack Self-Monitoring

These three alerts watch the health of the monitoring stack itself, in increasing order of severity/specificity:

- **`MetricsJobMissing`** (`absent(up{job="victoriametrics"})`): fires if VictoriaMetrics' own self-monitoring scrape target disappears *entirely* — not failing, literally not configured or discovered anymore. If this fires, other alerts may not be trustworthy either, since the monitoring stack may not be evaluating rules or scraping properly.
- **`MetricsTargetMissing`** (`up == 0` for 10m): unfiltered — fires for *any single* scrape target going down anywhere in the system (any exporter, any instance).
- **`MetricsAllTargetsMissing`** (`sum by (job) (up) == 0` for 10m): distinguishes a single flaky target (already covered by the alert above) from *every* instance of an entire job disappearing at once (e.g. all `node_exporter` instances across every host going down simultaneously) — a much more systemic problem than one instance failing.

### Diagnose the issue

For `MetricsTargetMissing`/`MetricsAllTargetsMissing`, the `{{ $labels.instance }}`/`{{ $labels.job }}` values in the alert identify exactly which target/job is down — check that specific pod:
```bash
kubectl get pods -A | grep <exporter-or-job-name>
kubectl logs <pod-name> -n <namespace>
```
For `MetricsJobMissing`, check the VictoriaMetrics pod itself and its scrape configuration, since this means VM's own self-scrape target was removed or misconfigured, not that a single exporter crashed:
```bash
kubectl get pods -n monitoring
```

### Common causes

- The exporter's pod crashed, OOM'd, or lost network connectivity (see the relevant OOM/resource sections above if applicable).
- A DaemonSet-based exporter (like `node_exporter`) failed to schedule on some or all nodes.
- A scrape-config change accidentally removed or broke service discovery for that job — worth checking recent changes to `observability/values.yaml`/the onboarding override if this fires right after a deploy.

### Resolving the issue

- Restart or fix the specific crashed exporter/pod identified by the alert's labels.
- If it's a scrape-config regression, revert or correct the relevant scrape config in the Helm values.
- If `MetricsJobMissing` fires, treat it as more urgent than it might look (severity `warning`) — it means the observability stack's own self-check is failing, which can mask other real problems from being alerted on at all.

## Anomaly Detected

Fires when a monitored metric's current value has been outside its own automatically-computed "normal" range for more than 5 minutes (alert: `AnomalyDetected`, severity warning). Unlike every other alert in this doc, this isn't a fixed threshold — it compares each metric against what's typical for that specific node/pod based on its own recent history, so what counts as "abnormal" varies over time and between instances.

Four things are currently covered, identified by the alert's `anomaly_name` label:
- `node_cpu` — a node's overall CPU utilization
- `node_memory` — a node's overall memory utilization
- `pod_cpu` — a specific pod's CPU usage
- `pod_memory` — a specific pod's memory usage

### Diagnose the issue

Check the `anomaly_name` and `instance`/`pod`/`namespace` labels on the fired alert to see exactly what's abnormal and where:
- For `node_cpu`/`node_memory`, cross-reference "Host High CPU Load" or "Host Out Of Memory" above for further diagnosis on that same node.
- For `pod_cpu`/`pod_memory`, check the pod's current usage directly:
  ```bash
  kubectl top pod <pod-name> -n <namespace>
  ```
  This prints current CPU/memory usage for the pod — compare it against the pod's own recent history in Grafana/VictoriaMetrics to see whether this is a sudden spike or a new sustained level.

### Common causes

- A genuine change in load or workload behavior (more traffic, a bigger job, a new query pattern) that's simply new relative to recent history — not necessarily a problem on its own.
- The same underlying causes as the fixed-threshold CPU/memory alerts elsewhere in this doc, just caught against a dynamic baseline instead of a fixed number.
- A one-off spike shortly after a deploy or restart, when there isn't much history yet to compare against — the alert falls back to a wide margin band in that case, so it can be noisier early on.

### Resolving the issue

- If it correlates with a fixed-threshold alert elsewhere in this doc (`HostHighCpuLoad`, `HostOutOfMemory`), follow that alert's resolution steps — this one is a complementary, earlier-warning signal on the same underlying resource, not a separate problem to solve differently.
- If it doesn't correlate with anything else and the new level looks legitimate (e.g. expected growth), no action is needed — the alert's own baseline adapts to the new normal as more history accumulates.

### MySQL Operator InnoDB Cluster Pod NFS Mount Issue
When using NFS as a volume provisioner, NFS servers map requests from unprivileged users to the 'nobody' user on the server, which may result in specific directories being owned by 'nobody'. Containers cannot modify these permissions. Therefore, it's necessary to enable `root_squash` on the NFS server to allow proper access.

### DNS Records Are Not Updated/Synced
When a datastore is created, service records of the ExternalName type are created, for example:
`usr-a1b3aaec-0f58-4347-80ab-27e386af2208-primary-svc`
```bash
kubectl describe svc usr-a1b3aaec-0f58-4347-80ab-27e386af2208-primary-svc
```
Annotations `external-dns.alpha.kubernetes.io/hostname` specify the hostname managed by an external DNS provider. The DNS record for this service should point to the corresponding `external-dns.alpha.kubernetes.io/target`.
To verify if the DNS records are created or updated properly:

#### Check DNS Records Using a Dig Command
Run the following command to query the DNS:
```bash
dig +short primary.a1b3aaec-0f58-4347-80ab-27e386af2208.ccx.net
```
Replace the domain with the specific record you want to check.

#### Verify in the External DNS Provider
Check the DNS management console of your external DNS provider. Ensure that the records are listed as expected.

#### Inspect Logs for External-DNS
If you are using an external-dns controller, check its logs for errors or issues:
```bash
kubectl logs deployment/external-dns
```

### Access Exporter Metrics

To access metrics securely, you can inspect the automatically generated rules in the Ingress resource and access the metrics via HTTPS.


 **Inspect the Rules in the Ingress and access the metrics securely via HTTPS**:
   - Identify the ingress resource corresponding to your exporter. For example, the ingress name will follow the format `usr-<storeID>-ingress`.
   - Use the command to view the rules for the metrics ingress.
    ```
    kubectl get ingress -o json 2> /dev/null| jq -r '.items[] | .spec.rules[] | .host as $host | .http.paths[] | ( $host + .path)' | sort | grep metrics
    ```

This command will show the ingress url for accessing metrics.

## S9S CLI commands and CC UI commands

:::danger
Never use the S9S CLI nor the CCUIv2 to add or remove resources (nodes or datastores). ***This may lead to stray data***.
Do not use the following commands (and corresponding commands in the ClusterConrol UI):
- s9s cluster --[drop|remove-node|add-node|upgrade-cluster|reinstall-node|demote-node|reconfigure-node]
- s9s node --[stop|unregister]
::::
The 's9s job' commands can be used to debug why a datastore failed to create. Example:

```bash
# Check cluster status
s9s cluster --list --long
# Check node status
s9s node --list --long
# Check node status of particular cluster
s9s node --list --long --cluster-id=CLUSTERID
# Check status of replication links
s9s replication --list --long
## List jobs and view logs
s9s job --list
s9s job --job-id=NNN --log
```

### Creating an Error Report

The error report contains a lot of information about the system and is a very good help for support to understand the configuration, topology and states. From the ClusterControl Admin UI, you can create an error report by going the problematic datastore/cluster -> "Report" and then "Create Error Report". A error report in .tar.gz format will be generated and downloadable from the UI.

### Getting information of a failed job

Get details about the cluster, in case you know the CLUSTER_UUID (this can be obtained from logs, or from UI e.g).

```bash
s9s cluster --list | grep CLUSTER_UUID
```

List all the failed jobs of a cluster NNN. You get NNN from the `s9s cluster --list` above.

```bash
s9s job --list --cluster-id=NNN  |grep FAILED
```

If you dont know the cluster id, run:

```bash
s9s job --list  |grep FAILED
```

Locate the failed job you are interested in, and obtain the jobid (first column in the output).

```bash
s9s job --job-id=MMM --log
```

Additionally, an error report is needed in many cases as it contains detailed information about datastores. See [Creating an Error Report](#creating-an-error-report);

## Common Issues

### Monitoring is being setup/Charts/Dashboards are not loading up.

Launch the install agents job again on the controller:

```bash
s9s cluster --list --long | grep CLUSTER_UUID
# take the cluster id , NNN
s9s cluster --deploy-agents --cluster-id=NNN --log
```

Then check if it solved the issue. If not, contact the CCX Team.

### Recreating 'ccxadmin' user

Obtain the CLUSTER_UUID of the datastore and us it to get the cluster-id of the problematic datastore (`--cluster-id=NNN` below):

```bash
s9s cluster --list --long | grep CLUSTER_UUID
# or
s9s cluster --list --long --cluster-format="%I %N\n" | grep CLUSTER_UUID
```

#### MySQL/Percona

```bash
s9s account --cluster-id=NNN --create --account='ccxadmin:PASSWORD@%' --privileges='*.*:SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS, REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, REPLICATION SLAVE, REPLICATION CLIENT, CREATE VIEW, REPLICATION_SLAVE_ADMIN, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, CREATE USER, EVENT, TRIGGER, GRANT'

s9s account --revoke  --account='ccxadmin:PASSWORD@%' --privileges='mysql.*:INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, EVENT, TRIGGER;sys.*:INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, EVENT, TRIGGER'
```

#### MariaDB

```bash
s9s account --cluster-id=NNN --create --account='ccxadmin:PASSWORD@%' --privileges='ccxdb.*:ALL, GRANT;*.*:CREATE USER, REPLICATION SLAVE, REPLICATION SLAVE ADMIN, SLAVE MONITOR'
```

#### PostgreSQL

```bash
s9s account --cluster-id=NNN --create --account='ccxadmin:PASSWORD@%' --privileges='NOSUPERUSER, CREATEROLE, LOGIN, CREATEDB'
```

### Rebuilding a failed replica
In some cases it is wanted to rebuild a replica.
```bash
s9s replication --cluster-id=NNN --stage --master="PUBLIC_ADDRESSS_OF_MASTER" --slave="PUBLIC_ADDRESSS_OF_REPLICA_TO_BE_REBUILT
```
