# Troubleshooting

This page describes troubleshooting scenarios.


# CCX Troubleshooting Guide

This guide helps you troubleshoot and resolve common issues in CCX. Follow the steps outlined below to diagnose problems and apply fixes.

## CCX Services Error Report

To generate an error report of CCX services and components within a Kubernetes environment, follow these steps:

```bash
# Step 1: Download the error report script
wget https://raw.githubusercontent.com/severalnines/helm-charts/refs/heads/main/charts/ccx/scripts/gather-logs.sh

# Step 2: Make the script executable
chmod +x gather-logs.sh

# Step 3: Run the script to collect logs
./gather-logs.sh -n [namespace]
```

Attach the generated `.tar.gz` file to  CCX support ticket.



## Long-Running or Stuck Datastore 

Clusters may get stuck in a locked state if a job is interrupted unexpectedly. Use the following steps to resolve hanging jobs:

you can run ccxctl by exec inside the stores pod
ccxctl is available from 1.50+ versions.

```bash
# Step 1: Check the datastore state and get the job-id in field `Active Job:`
ccxctl datastore state <datastore-id>

# Step 2: Check the cluster state
ccxctl job state <job-id>

# Step 2: Mark the job as failed if it is stuck
ccxctl job kill <job-id>

# Step 3: Unlock the datastore after resolving the job
ccxctl datastore unlock <datastore-id>
```



## Inconsistent Hosts

If a `create datastore` or `add node` job terminates unexpectedly, some hosts might become inconsistent. This can leave dangling resources in the cloud or mismatches between CCX and controllers.

###  Dangling resources (on cloud provider side)
##### Inconsistent hosts

```bash
# Identify inconsistent hosts in the datastore
ccxctl datastore state <datastore-id>

# Delete the inconsistent host to resolve it
ccxctl host delete <host-id>
```

##### Inconsistent Datastore

If a datastore is stuck in a "deleting" state or needs to be forcefully removed, use the following command:

```bash
# Force delete the datastore and all associated resources
ccxctl datastore delete <datastore-id>
```

##### Warning

```text
This command deletes all associated resources, including:
- Cloud resources
- SSH keys
- Credentials
```

> **Note:** This action is irreversible. Use caution when applying this command.

## Cluster in readonly state
CCX will fix automatically in 1.51+ release.
For prior versions,
Navigate to:
    - **Clusters** -> **Select Datastore ID** -> **Nodes** -> **Actions** -> **Toggle Readonly to disable**
Disable readonly for the nodes that was labeled Readonly.

## Disk Autoscaling Issues

Disk autoscaling is enabled by default in CCX. It can be configured using the following setting in the Helm values file:

```yaml
autoscaling.storage.enabled: true
```

Ensure that the observability stack is deployed in the same namespace as CCX. We recommend to use our monitoring charts.
If it is deployed in a different namespace, update the `webhook_config_url` in the values file to include the CCX deployed namespace:

```bash
http://ccx-stores-listener-svc.<namespace>.svc:18097/alert-manager
```

## Troubleshooting Datastore Backups Failing

To debug failed datastore backups:

##### Method 1: Using CC UI

1. Log in to the CC UI at the URL specified in the `ccFQDN` field of your Helm values.
2. Navigate to:
    - **Clusters** -> **Select Datastore ID** -> **Backups** -> **Actions** -> **Logs**

#####  Method 2: Using CLI Commands

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

If no metrics are still returned, the issue may be due to exporters not running on the datastore servers.
```bash
# If exporters are not running, then deploy agents commands
s9s cluster --cluster-id=<cluster-id> --deploy-agents --log
```


### Mysql Operator Backup Configuration
Requirements:

- You must create an S3 bucket in your cloud environment.

Below is an example.

create `s3-secret.yaml` :

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: s3-secret
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = <YOUR-ACCESS-KEY-ID without encoding>
    aws_secret_access_key = <YOUR-SECRET-KEY without encoding>
  config: |
    [default]
    region=<YOUR-REGION>
```

Then, use kubectl to create the secret:

```
kubectl apply -f s3-secret.yaml
```

The following is an example of MySQL InnoDB Cluster and backup configuration for an S3 bucket.

Create a file called `ccxdeps-values.yaml`:

```yaml
mysql-innodbcluster:
  backupProfiles:
    - name: s3-backup
      dumpInstance:
        dumpOptions:
        storage:
          s3:
            bucketName: s9s-ccx-mysql-dev-bucket # Name of the S3 bucket where the dump is stored and must be an existing bucket
            prefix: /ccx-backup # Path in the bucket where the dump files are stored
            config: s3-secret # Name of a Secret with S3 configuration and credentials. Must be an existing secret
            profile: default # Profile being used in configuration files
            endpoint: https://s3.eu-north-1.amazonaws.com # Override endpoint URL
  backupSchedules:
    - name: ccx-s3-backup-schedule
      schedule: "0 0 23 * *" # schedule backup everyday
      backupProfileName: s3-backup # reference the desired backupProfiles's name
      enabled: true # backup schedules to be enabled or disabled
```

Next, add the following fields to your backup profile’s `storage.s3` section:

- `bucketName` – The name of the S3 bucket to upload your backups to.
- `prefix` – Set this to apply a prefix to your uploaded files, such as `/my-app/mysql`. The prefix allows you to create folder trees within your bucket.
- `endpoint` – Set this to your service provider’s URL when you’re using third-party S3-compatible storage. You can omit this field if you’re using Amazon S3.
- `config` – The name of the secret containing your credentials file.
- `profile` – The name of the config profile to use within the credentials file. This was set to default in the example above.

:::note
It is recommended to have backup enabled so that it can be restored on cluster failures.
:::

Once the `ccxdeps-values.yaml` is ready, then run:

```bash
helm install ccxdeps s9s/ccxdeps --debug -f ccxdeps-values.yaml
```

### Mysql Operator Restoring a backup for recovery

The MySQL operator can initialize new database clusters using previously created files from dumpInstance. This allows you to restore your backups straight into your Kubernetes cluster. It’s useful in recovery situations or when you’re migrating an existing database to Kubernetes.

Example configuration shown below:

```yaml
mysql-innodbcluster:
  initDB:
    dump:
      name: initdb-dump
      s3:
        prefix: /ccx-backup/ccxdeps-ccx-s3-backup-schedule240301085242 #indicate which dump folder path to recover
        config: s3-secret
        bucketName: s9s-ccx-mysql-dev-bucket
        profile: default
        endpoint: https://s3.eu-north-1.amazonaws.com
```

Backups created by the operator will automatically be stored in timestamped folders, you should be able to indicate which one to recover by setting the `prefix`.

## Mysql Operator Failover,  Adding Nodes and Scaling Mechanism
##### Failover
Failover Mechanism is fully managed by Operator.
The operator monitors MySQL instances for health and availability. If a primary pod fails, the operator promotes one of the replicas to primary.
##### Adding Nodes
Adding nodes can be done by updating the `mysql-innodbcluster.serverInstances` . The operator automatically provisions and configures the new node.
##### Scaling
The ability to scale storage depends on the underlying storage class and its capabilities of k8s environment.
The MySQL Operator itself will not automatically scale storage. Instead, you would need to specify values in
`mysql-innodbcluster.datadirVolumeClaimTemplate.resources.requests.storage` to a larger size and redeploy.

## Mysql Operator Innodb pod stuck in Terminating state
Sometimes the MySQL InnoDB Cluster pod is stuck due to some issues preventing graceful termination of pod such as node deletion. In such cases, the pod is stuck in terminating state. This can be overcome by removing the finalizer from pod's metadata and pod will be in ready state again.

Recovery:
```bash
kubectl patch pod <mysql-pod-name> -p '{"metadata":{"finalizers":[]}}' --type=merge
```
## Postgres operator Backup Configuration

You must create an S3 bucket in your cloud environment. 
Create a file called `ccxdeps-values.yaml`:

```yaml
postgres-operator:
  configKubernetes:
    # namespaced name of the ConfigMap with environment variables to populate on every pod
    pod_environment_configmap: "production/postgres-pod-config"

  # configure interaction with non-Kubernetes objects from AWS or GCP
  configAwsOrGcp:
    # AWS region used to store ESB volumes
    aws_region: eu-north-1
    # S3 bucket to use for shipping WAL segments with WAL-E
    wal_s3_bucket: "postgres-backup-s3-ccx"

  # configure K8s cron job managed by the operator
  configLogicalBackup:
    # S3 Access Key ID
    logical_backup_s3_access_key_id: "<YOUR-ACCESS-KEY-ID>"
    # S3 bucket to store backup results
    logical_backup_s3_bucket: "postgres-backup-s3-ccx"
    # S3 endpoint url when not using AWS
    logical_backup_s3_endpoint: ""
    # S3 Secret Access Key
    logical_backup_s3_secret_access_key: "<YOUR-SECRET-KEY>"
    # S3 server side encryption
    logical_backup_s3_sse: ""
    # backup schedule in the cron format
    logical_backup_schedule: "00 10 * * *"
```

- The parameter `pod_environment_configmap` specifies the name of a config map where we define some settings for the cluster to enable WAL archivation to object storage.
- If your Pod specific Configmap resides in a Namespace e.g, 'production' you need to specify the Namespace before the name of the Configmap (`production/postgres-pod-config` in this case).

Create a Kubernetes Configmap resource with the following variables which will be used by the database pods:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-pod-config
data:
  WAL_S3_BUCKET: postgres-backup-s3-ccx # The S3 bucket name where your Postgres backups should be stored.
  BACKUP_SCHEDULE: '00 10 * * *'
  AWS_ACCESS_KEY_ID: "<YOUR-ACCESS-KEY-ID>"
  AWS_SECRET_ACCESS_KEY: "<YOUR-SECRET-KEY-ID>"
  AWS_ENDPOINT: ""
  AWS_REGION: eu-north-1 # your aws region
  BACKUP_NUM_TO_RETAIN: "10"
  USE_WALG_RESTORE: "true"
```

Apply this configmap in Kubernetes.

Next Add parameter to `postgresql` values in `ccxdeps-values.yaml`:

```yaml
postgresql:
  enableLogicalBackup: true
```

Once configured and `ccxdeps-values.yaml` is ready, then run the command:

```bash
helm upgrade --install ccxdeps s9s/ccxdeps --debug -f ccxdeps-values.yaml
```

### Postgres Operator restoring a backup for recovery

Here is the list of variables you need to set in order to get the cloning to work for point in time recovery, Add this in addition to `postgres-pod-config` ConfigMap:

```yaml
  CLONE_USE_WALG_RESTORE: "true"
  CLONE_AWS_ACCESS_KEY_ID:  "<YOUR-ACCESS-KEY-ID>"
  CLONE_AWS_SECRET_ACCESS_KEY: "<YOUR-SECRET-KEY-ID>"
  CLONE_AWS_ENDPOINT: ""
  CLONE_AWS_REGION: eu-north-1
  CLONE_WAL_S3_BUCKET: postgres-backup-s3-ccx
```
Apply this configmap in k8s.
 
 You cannot overwrite a running cluster, so you first need to delete it if its running and then (re)create it newly with the clone configuration down below.
 Next Add parameter to postgresql values in ccxdeps-values.yaml
``` yaml
postgresql:
   clone:
    cluster: "acid-ccx"  # Source instance name; Instance name to clone from
    timestamp: "2024-03-13T19:50:00+00:00" # time in the WAL archive that we want to restore latest backup before the timestamp in UTC 
    uid: "71dd646c-fc72-426e-8746-7b2747e93b94" #uid of cluster to restore
```

Once configured, upgrade it to use values:

```bash
helm upgrade --install ccxdeps s9s/ccxdeps --debug -f ccxdeps-values.yaml
```



### Mysql Operator Innodb Cluster Pod NFS Mount issue
When using NFS as volume provisioner, NFS servers map requests from unprivileged users to the 'nobody' user on the server, which may result in specific directories being owned by 'nobody'. So Container cannot modify these permissions, therefore it's necessary to enable root_squash on the NFS server to allow proper access.

### DNS records are not updated/synced
When a datastore is created, service records of the ExternalName type are created as example:

`usr-a1b3aaec-0f58-4347-80ab-27e386af2208-primary-svc`

These ExternalName services are synced to external DNS. To verify if the DNS records are created or updated properly:

Check DNS Records Using a Dig Command: Run the following command to query the DNS:

```bash
dig +short primary.a1b3aaec-0f58-4347-80ab-27e386af2208.ccx.net
```
Replace the domain with the specific record you want to check.

Verify in the External DNS Provider:
Check the DNS management console of your external DNS provider.
Ensure that the records are listed as expected.

Inspect Logs for External-DNS: If you are using an external-dns controller, check its logs for errors or issues:

```bash
kubectl logs deployment/external-dns
```