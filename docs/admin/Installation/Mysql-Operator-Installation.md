# Installing MySQL Operator

## Quick install of CMON database using MySQL Operator for dev/test environments

```bash
helm install ccxdeps s9s/ccxdeps --debug
```

## Production ready HA CMON DB's using MySQL Operator

The MySQL Operator for Kubernetes is an operator focused on managing one or more MySQL InnoDB Clusters consisting of a group of MySQL Servers and MySQL Routers.

It manages the full lifecycle with set up and maintenance that includes automating upgrades and backup.

MySQL Operator and cluster charts are bundled inside the ccxdeps chart.

### Preparing MySQL Operator and MySQL InnoDB Cluster using ccxdeps

Requirements:

- You must create an S3 bucket in your cloud environment.
- You must create a Kubernetes secret that contains an aws CLI config file with your credentials so that MySQL operator can upload your backups straight to S3-compatible object storage providers. Below is an example.

Add the following content to `s3-secret.yaml` and replace with your credentials and region:

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

Potential values for creating a MySQL InnoDB Cluster is shown below:

```yaml
mysql-innodbcluster:
  credentials:
    root:
      user: cmon
      password: Super$3cr3t
      host: "%"
  serverInstances: 3 # number of server instances and this is highly recommended to specify
  tls:
    useSelfSigned: true # use of self-signed TLS certificates
  datadirVolumeClaimTemplate:
    resources:
      requests:
        storage: 20Gi #storage size
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
helm install ccxdeps ccxdeps/ccxdeps --debug -f ccxdeps-values.yaml
```

You should see running Pods such as one MySQL router instance, MySQL Operator and MySQL servers.

### Restoring a backup for recovery

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

:::note
Sometimes the MySQL InnoDB Cluster pod is stuck due to some issues preventing graceful termination of pod such as node deletion. In such cases, the pod is stuck in terminating state. This can be overcome by removing the finalizer from pod's metadata and pod will be in ready state again.
:::

#### Recovery

Get the finalizer:

```
kubectl patch pod <mysql-pod-name> -p '{"metadata":{"finalizers":[]}}' --type=merge
```

For example:

```
kubectl patch pod ccxdeps-0 -p '{"metadata":{"finalizers":[]}}' --type=merge
```

For other customizations of Helm values, see [MySQL Operator Properties](https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-properties.html).
