# Troubleshooting
This page describes troubleshooting scenarios.

# CCX Troubleshooting Guide
This guide helps you troubleshoot and resolve common issues in CCX. Follow the steps outlined below to diagnose problems and apply fixes.

## CCX Error Report
To generate an error report of CCX services and components within a Kubernetes environment, follow these steps:
```bash

# Ensure your current Kubernetes context is set to the CCX namespace as example below.
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
Run `ccxctl` by executing inside the stores pod. Note that `ccxctl` is available from version 1.50+.
```bash
# Step 1: Check the datastore state and get the job-id in field `Active Job:`
ccxctl datastore state <datastore-id>

# Output Example:
# Active Job: 2e3fe81b-2fd9-40f0-b561-a40f9fded92

# Step 2: Check the job state using the job-id from the output
ccxctl job state <job-id>

# Step 3: Mark the job as failed if it is stuck
ccxctl job kill <job-id>

# Step 4: Unlock the datastore after resolving the job
ccxctl datastore unlock <datastore-id>
```

## Inconsistent Hosts
If a `create datastore` or `add node` job terminates unexpectedly, some hosts might become inconsistent. This can leave dangling resources in the cloud or mismatches between CCX and controllers.

### Dangling Resources (on Cloud Provider Side)
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
> This actions are irreversible. Use caution when applying above commands.
:::

## Cluster in Readonly State
CCX will fix this issue automatically in version 1.51+.
For prior versions, navigate to the CC UI:
- **Clusters** -> **Select Datastore ID** -> **Nodes** -> **Actions** -> **Toggle Readonly to disable**
Disable readonly for the nodes that are labeled Readonly.

## Disk Autoscaling Issues
Disk autoscaling is enabled by default in CCX. It can be configured using the following setting in the Helm CCX values file:
```yaml
autoscaling.storage.enabled: true
```
Ensure that the observability stack is deployed in the same namespace as CCX.
```bash
# This will show if the monitoring stack is deployed
helm status ccx-monitoring
```
We recommend using our monitoring charts. If it is deployed in a different namespace, update the `webhook_config_url` in the values file to include the CCX deployed namespace:
```bash
http://ccx-stores-listener-svc.<namespace>.svc:18097/alert-manager
```

## Troubleshooting Datastore Backups Failing
To debug failed datastore backups:
#### Method 1: Using CC UI
1. Log in to the CC UI at the URL specified in the `ccFQDN` field of your Helm values.
2. Navigate to:
    - **Clusters** -> **Select Datastore ID** -> **Backups** -> **Actions** -> **Logs**
#### Method 2: Using CLI Commands
Use the following commands inside the `cmon-master` container:
```bash
# Access the cmon-master container
kubectl exec -it cmon-master-0 -- bash

# List all jobs
s9s job --list

# Get logs for a specific job
s9s job --job-id=NNN --log
```
The `s9s job` commands are useful for diagnosing why a backup failed.

## Troubleshooting CCX Database Logs Visibility
If database logs are not visible, ensure the following:
```bash
# Step 1: Update and Deploy ccxdeps charts in the same namespace
helm repo update
helm upgrade --install ccxdeps s9s/ccxdeps --debug

# Step 2: Verify ccxdeps-loki service is running
kubectl get svc -n <namespace> | grep ccxdeps-loki
```

## Troubleshooting Metrics Scraping in VictoriaMetrics
If metrics are not being scraped or targets are unreachable, ensure to deploy our embedded monitoring stack:
```bash
# Step 1: Update and deploy ccxdeps Helm chart
helm repo update
helm upgrade --install ccxdeps s9s/ccxdeps --debug

# Step 2: Verify metrics in the cmon-master container
kubectl exec -it cmon-master-0 -- bash

# Check for metrics with the "cmon_cluster" prefix
curl http://127.0.0.1:9954/metrics | grep -i cmon_cluster
```
Check exporters are running inside datastore nodes.
Navigate to CC UI:
    - **Clusters** -> **Select Datastore ID** -> **Nodes** -> **Actions** -> **SSH Console**
```bash
# Check if exporters are running for the respective DB
systemctl status mssql_exporter.service #for MSSQL DB
systemctl status node_exporter.service #for node exporter
systemctl status process_exporter.service #for process exporter
systemctl status redis_exporter.service #for Redis DB
systemctl status postgres_exporter.service #for Postgres DB
systemctl status mysqld_exporter.service #for MySQL DB
```
If no metrics are still returned, the issue may be due to exporters not running on the datastore servers.
```bash
# If exporters are not running, then deploy agents commands
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


### MySQL Operator InnoDB Cluster Pod NFS Mount Issue
When using NFS as a volume provisioner, NFS servers map requests from unprivileged users to the 'nobody' user on the server, which may result in specific directories being owned by 'nobody'. Containers cannot modify these permissions. Therefore, it's necessary to enable `root_squash` on the NFS server to allow proper access.

### DNS Records Are Not Updated/Synced
When a datastore is created, service records of the ExternalName type are created, for example:
`usr-a1b3aaec-0f58-4347-80ab-27e386af2208-primary-svc`
```bash
kubectl get svc usr-a1b3aaec-0f58-4347-80ab-27e386af2208-primary-svc -o jsonpath='{.metadata.annotations}'
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

