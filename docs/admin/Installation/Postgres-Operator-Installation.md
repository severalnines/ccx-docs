# Installing PostgreSQL Operator

Install, backup, restore CCX database using Postgres operator.

## Quick Install CCX database using Postgres operator for dev/test environments

```bash
helm install ccxdeps s9s/ccxdeps --debug
```

## Preparing a Postgres operator and cluster using ccxdeps

You must create an S3 bucket in your cloud environment. Create a file called `ccxdeps-values.yaml`:

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
helm upgrade --install ccxdeps ccxdeps/ccxdeps --debug -f ccxdeps-values.yaml
```

### Restoring a backup for recovery

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
helm upgrade --install ccxdeps ccxdeps/ccxdeps --debug -f ccxdeps-values.yaml
```

### Postgres cluster options

```yaml
postgresql:
  replicas: #num of instances. Default is 1
  volumeSize: #Size in GB
```

For other customizations, see [Postgres Operator](https://github.com/zalando/postgres-operator/blob/master/charts/postgres-operator/values.yaml).
