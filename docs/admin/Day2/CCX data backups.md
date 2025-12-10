# Backups

This section describes the database backup feature for the CCX components. This feature allows the databases that the CCX is using to be backed-up and stored to S3 (or Minio).

:::danger
The bucket that will be used for storage needs to be manually created before any of those process set up.
:::

## CCXDeps-Mysql

First, create a secret that will contain the following:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id =
    aws_secret_access_key =

  config: |
    [default]
    region = 
```
Apply it with command:

```bash
kubectl apply -f aws-credentials.yaml -n ccx
```

When deploying the `ccxdeps helm chart`, the follwing configuration needs to be added to the values file:

```yaml
mysql-innodbcluster:
    backupProfiles:
    - name: s3-backup
        dumpInstance:
        storage:
            s3:
            bucketName:  # Name of the bucket that will be used for storage
            prefix: # folder name for storing in the s3 bucket
            config: # name of the secret that will be used 
            profile: default 
            endpoint: # s3 endpoint, e.x https://s3.eu-central-1.amazonaws.com or Minio address is used
    backupSchedules:
    - name: cmon-s3-backup-schedule # Name of the cronjob that will be created
        schedule: "0 23 * * *"  # When the backups will be done
        backupProfileName: s3-backup # Must match the name of the backupProfiles
        enabled: true 
```
Once done, run the following command to update the `ccxdeps helm chart`:

```bash
helm upgrade --install ccxdeps s9s/ccxdeps --debug --wait -n ccx -f ccxdeps-values.yaml
```
Once done, run the following command:
```bash
kubectl get cronjob -n ccx
```
You shoud see new cronjob with the name `cmon-s3-backup-schedule`.

## CCXDeps-Postgres

First, create a secret that will contain the following:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID:  # access key
  AWS_SECRET_ACCESS_KEY: # secret key
```

Apply it with command:

```bash
kubectl apply -f aws-credentials.yaml -n ccx
```

When deploying the `ccxdeps helm chart`, the follwing configuration needs to be added to the values file:

```yaml
postgres-operator:
  configLogicalBackup:
    logical_backup_provider: "s3" # change if the you wish to use gcp or azure
    logical_backup_schedule: "0 23 * * *" # Cronjob schedule for backup
    logical_backup_docker_image: "registry.opensource.zalan.do/acid/logical-backup:v1.15.0"
    logical_backup_s3_bucket: "" # Bucket name
    logical_backup_s3_region: "" # Region
    logical_backup_s3_bucket_prefix: "postgres" # folder name for storing in the s3 bucket
    logical_backup_cronjob_environment_secret: "aws-credentials"  # name of the secret that will be used 
    logical_backup_s3_access_key_id: "AWS_ACCESS_KEY_ID" # must match a data field in the previous secret
    logical_backup_s3_secret_access_key: "AWS_SECRET_ACCESS_KEY" # must match a data field in the previous secret
postgresql:
  enableLogicalBackup: true # this needs to be set in order for the backup to be enabled
```
Once done, run the following command to update the `ccxdeps helm chart`:

```bash
helm upgrade --install ccxdeps s9s/ccxdeps --debug --wait -n ccx -f ccxdeps-values.yaml
```
Once done, run the following command:
```bash
kubectl get cronjob -n ccx
```
You shoud see new cronjob with the name `logical-backup-*`.


### CRD Upgrade

In case that the postgress version was previously installed is lower than 1.14.0, the CRD will need to be updated manually. To do that, run the following commands:

```bash
kubectl apply -f https://https://raw.githubusercontent.com/zalando/postgres-operator/refs/heads/master/charts/postgres-operator/crds/operatorconfigurations.yaml
kubectl apply -f https://https://raw.githubusercontent.com/zalando/postgres-operator/refs/heads/master/charts/postgres-operator/crds/postgresqls.yaml
kubectl apply -f https://https://raw.githubusercontent.com/zalando/postgres-operator/refs/heads/master/charts/postgres-operator/crds/postgresteams.yaml
```

After that, upgrade the `ccxdeps helm chart` to version that is higher than 0.6.6 with the backup configurations provided in the pervious part. 