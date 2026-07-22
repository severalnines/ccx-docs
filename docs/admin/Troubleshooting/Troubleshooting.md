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

- Terminate leaked or stuck connections, if it is safe to do so, the following command will find every Postgres connection that's been stuck "idle in transaction" (including the "idle in transaction (aborted)" variant) for more than 10 minutes and forcibly kills those connections to free up the resources they're holding:
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
