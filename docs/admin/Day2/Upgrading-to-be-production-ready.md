# Upgrading CCX to be production ready

:::danger
At this point, it's presumed that you have already installed CCX following the tutorial. In case that you wish to upgrade it to be production ready, instead of creating everything from scratch, this page will show you how to do so. Just before doing so, make sure you have adequate resources at your disposal to do so.
:::

:::note
Make sure that you have at least 350Gi of storage capacity for the upgrade — the MySQL and Postgres data volumes alone account for 300Gi (50Gi × 3 replicas each) with the sizing used below, plus NATS JetStream and CMON's own volumes on top of that. The actual size will depend on your need for the retention policy of metrics and logs.
:::

### Dependencies update

In order to move to production ready state, cmondb and ccxdb need to have backups enabled. In order to do so, set secrets for the backups with the following values:

```
apiVersion: v1
data:
  AWS_ACCESS_KEY_ID: 
  AWS_ENDPOINT: 
  AWS_REGION: 
  AWS_SECRET_ACCESS_KEY: 
  WALG_S3_PREFIX: 
kind: Secret
metadata:
  name: s3-backup-postgres
type: Opaque

apiVersion: v1
kind: Secret
metadata:
  name: s3-backup-innodb
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = 
    aws_secret_access_key = 
```

Originally the `ccxdeps` helm chart was installed in tutorial using the default values. Create a new file called `ccxdeps-values.yaml`. You can use the values below and modify them per your needs.

```
keycloak:
  enabled: false

ingressController:
  enabled: false

external-dns:
  enabled: false

ccx-monitoring:
  enabled: false

installOperators: true

oracle-mysql-operator:
  enabled: true

postgres-operator:
  configKubernetes:
    pod_environment_secret: "" #secret name from previous step
  configLogicalBackup:
    logical_backup_s3_bucket: "ccxdb" #change if you want to have it named different
    logical_backup_s3_bucket_prefix: "" #to do
    logical_backup_s3_endpoint: "" #to do
    logical_backup_s3_region: "" #to do
    logical_backup_s3_sse: ""  # leave empty
    logical_backup_schedule: "0 1 * * *"  #change to match what you want
    logical_backup_s3_access_key_id: ""  # leave empty
    logical_backup_s3_secret_access_key: "" # leave empty
    logical_backup_cronjob_environment_secret: ""  #secret name from previous steps
  configWalBackup:
    wal_s3_bucket: "ccxdb" #change if you want to have it named differently
    wal_bucket_scope_prefix: "wal-g"
    wal_s3_endpoint: "" #to do
    wal_s3_region: "" # leave empty
    wal_s3_sse: "" # leave empty
    wal_s3_access_key_id: "" # leave empty
    wal_s3_secret_access_key: "" # leave empty

postgresql:
  datadirVolumeClaimTemplate:
    resources:
      requests:
        storage: 50Gi
  enableLogicalBackup: true
  monitoring:
    enabled: false
  podAnnotations:
    prometheus.io/path: /metrics
    prometheus.io/port: "9187"
    prometheus.io/scrape: "true"
  replicas: 3
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi

mysql-innodbcluster:
  serverInstances: 3
  routerInstances: 2
  backupProfiles:
   - dumpInstance:
        dumpOptions:
          includeSchemas:
            - cmon
        storage:
          s3:
            bucketName: cmondb-backups #set as you see fit
            config: elastx-s3-mysql #secret name from previous step
            endpoint: "cmondb" #to be set
            prefix:  "" #to be set
     name: s3-cmondb-backup
  backupSchedules:
    - backupProfileName: s3-cmondb-backup #must match name from two lines above
      deleteBackupData: false
      enabled: true
      name: s3-cmondb-daily-backup
      schedule: "0 1 * * *" #to be set
  datadirVolumeClaimTemplate:
    resources:
      requests:
        storage: 50Gi
  serverVersion: 8.4.7
  baseServerId: 2000
  serverConfig:
    mycnf: |-
      [mysqld]
      binlog_expire_logs_seconds=259200
      slow_query_log=ON
      long_query_time=2
      innodb_buffer_pool_size=1024M
      loose_group_replication_message_cache_size=512M
      innodb_redo_log_capacity=256M
      performance_schema=ON
      performance_schema_digests_size=10000
      loose_group_replication_member_expel_timeout=30
      loose_group_replication_autorejoin_tries=5
nats:
  enabled: true
  nameOverride: "ccx-nats"
  exporter:
    enabled: true
  config:
    cluster:
      enabled: true
      replicas: 3
    jetstream:
      enabled: true
      fileStorage:
        enabled: true
        storageClassName: # REQUIRED: fast SSD storage class (e.g. "premium-rwo", "gp3")
        size: 10Gi
    logging:
      debug: false
      trace: false
  podDisruptionBudget:
    enabled: true
    minAvailable: 2
  container:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/name: nats
          topologyKey: kubernetes.io/hostname
```
Please take a look at all [values](https://github.com/severalnines/helm-charts/blob/main/charts/ccxdeps/values.yaml), as you might be interested in some of the additional flags.

To upgrade the chart, use the following command:
```
helm upgrade --install ccxdeps s9s/ccxdeps --debug --wait -n ccx -f ccxdeps-values.yaml
```

:::note
The steps below aren't normal steady-state behavior — they work around real limitations we've hit in the postgres-operator and mysql-operator's reconcile logic on an already-running cluster (as opposed to a fresh install). A config change that should apply cleanly sometimes doesn't get propagated to already-running pods, and Patroni's own Kubernetes-native config store can get stuck with stale state. None of this is expected to be necessary indefinitely — treat it as a known-issue workaround, not the intended long-term procedure, and re-check whether it's still needed on future operator versions.
:::

There are some fields which will not be upgraded properly, so they have to be updated manually.

:::note
The `mycnf` block above uses the `loose_` prefix on every `group_replication_*` variable (e.g. `loose_group_replication_message_cache_size`). This is required — without it, mysqld will error out at startup on an unrecognized variable name, since the Group Replication plugin hasn't loaded yet when the config file is first parsed. If you add more Group Replication variables later, keep the `loose_` prefix on all of them.
:::

If the Postgres cluster gets stuck after the upgrade (`kubectl get postgresql -n ccx` shows a non-`Running` status, or `acid-ccx-*` pods sit logging `waiting for leader to bootstrap`), it's a sign of stale Patroni state left over in the cluster's Kubernetes-native config store. Clear it so Patroni starts clean and re-elects a leader:

```
kubectl delete endpoints acid-ccx acid-ccx-config acid-ccx-repl -n ccx
```

This isn't a step every upgrade needs — only run it if the cluster is actually stuck as described above.

The `serverConfig.mycnf` change above generally does not get propagated to an already-running InnoDB Cluster reliably (a known limitation with this operator version) — most of it can be applied directly and immediately via `SET PERSIST`, with no restart, on **each** of the 3 members. Set user/password in the following commands before running them:
```
kubectl exec -n ccx ccxdeps-0 -c mysql -- mysqlsh --no-wizard --uri=<user>:<pass>@localhost --sql -e "SET PERSIST binlog_expire_logs_seconds = 259200; SET PERSIST slow_query_log = ON; SET PERSIST long_query_time = 2; SET PERSIST innodb_buffer_pool_size = 1073741824; SET PERSIST group_replication_message_cache_size = 536870912; SET PERSIST innodb_redo_log_capacity = 268435456; SET PERSIST group_replication_member_expel_timeout = 30; SET PERSIST group_replication_autorejoin_tries = 5;"


kubectl exec -n ccx ccxdeps-1 -c mysql -- mysqlsh --no-wizard --uri=<user>:<pass>@localhost --sql -e "SET PERSIST binlog_expire_logs_seconds = 259200; SET PERSIST slow_query_log = ON; SET PERSIST long_query_time = 2; SET PERSIST innodb_buffer_pool_size = 1073741824; SET PERSIST group_replication_message_cache_size = 536870912; SET PERSIST innodb_redo_log_capacity = 268435456; SET PERSIST group_replication_member_expel_timeout = 30; SET PERSIST group_replication_autorejoin_tries = 5;"


kubectl exec -n ccx ccxdeps-2 -c mysql -- mysqlsh --no-wizard --uri=<user>:<pass>@localhost --sql -e "SET PERSIST binlog_expire_logs_seconds = 259200; SET PERSIST slow_query_log = ON; SET PERSIST long_query_time = 2; SET PERSIST innodb_buffer_pool_size = 1073741824; SET PERSIST group_replication_message_cache_size = 536870912; SET PERSIST innodb_redo_log_capacity = 268435456; SET PERSIST group_replication_member_expel_timeout = 30; SET PERSIST group_replication_autorejoin_tries = 5;"

```

One more manual step for this section: `datadirVolumeClaimTemplate` only controls the size of *newly created* PVCs. If `postgresql`/`mysql-innodbcluster` already existed before this upgrade, their existing PVCs will **not** be resized just because the values above changed — StatefulSet volume claim templates are effectively create-time-only in Kubernetes. Patch the existing PVCs directly to match:

:::note
This requires the underlying StorageClass to support online expansion. Check with `kubectl get storageclass <name> -o jsonpath='{.allowVolumeExpansion}'` — if it doesn't return `true`, these patches will have no effect and a different migration approach is needed.
:::

```
# MySQL — bring the actual disks up to match what the CRD says (50Gi)
kubectl patch pvc datadir-ccxdeps-0 -n ccx -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
kubectl patch pvc datadir-ccxdeps-1 -n ccx -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
kubectl patch pvc datadir-ccxdeps-2 -n ccx -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'

# Postgres — same story, bring the disks up to match the 50Gi set above
kubectl patch pvc pgdata-acid-ccx-0 -n ccx -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
kubectl patch pvc pgdata-acid-ccx-1 -n ccx -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
kubectl patch pvc pgdata-acid-ccx-2 -n ccx -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
```

Confirm the resize actually took with `kubectl get pvc -n ccx` — some CSI drivers apply the new capacity online immediately, others only pick it up after the pod restarts.

### Configuring Cloud Credentials in K8s Secrets

Configure the credentials to use your project you made for production. If the previously created ones are fine, you can proceed to next step. 

## Add the email configuration

In order to setup the emailing for the ccx, create the secret in accordance to the following template:
```
apiVersion: v1
data:
  SMTP_FROM:  #email adress from which emails will be sent
  SMTP_FROM_NAME: CCX
  SMTP_HOST: #sender host
  SMTP_PASSWORD: #email password
  SMTP_PORT: #port
  SMTP_USERNAME: #username
kind: Secret
metadata:
  name: smtp
  namespace: ccx
type: Opaque
```

Use `kubectl apply -f smtp.yaml` to apply the secret.

More documentation can be found [here.](../Day2/Notifications.md)


### Security Group ccx-common

`ccx-common` must allow all TCP traffic from all k8s nodes where CCX is running. 

The Egress must also be allowed. Below is a screenshot showing the `ccx-common`. The EXTERNAL-IP is specified for the port range 1-65535.

:::important
If you have three worker nodes, and they have different IP addresses then you must add three entries to the security group, allowing 1-65535 for each IP address as egress.
:::

### OpenStack CCX Value File


:::note
A number of identifiers are case sensitive: `ccx.config.clouds[].regions[].code`, `ccx.config.clouds[].regions[].availability_zones[].code`, `ccx.services.deployer.config.openstack_vendors[].regions[].identifier`, and also the codes for `instance_types`, `flavors`, `volumes`, and `network_types` are case-sensitive. Be consistent!
:::

At this point, ccx should be deployed with minimal values yaml. The following values.yaml is minimal for production environment:

:::

```yaml
cc:
  cidr: 203.0.113.0/24 # ClusterControl admin portal — restrict to your admin network
ccFQDN: cc.ccx.somedomain.com # dns name for ccx
ccxFQDN: ccx.somedomain.com # dns name for cc
ccx:
  cidr: 0.0.0.0/0 #setup according to your network
  cloudSecrets: # List of Kubernetes secrets containing cloud credentials.
  - openstack # This secret must exist in Kubernetes. See 'secrets-template.yaml' for reference.
  - openstack-s3
  - smtp #secret made from email step
  config:
    clouds:
    - code: mycloud # Unique code for your cloud provider
      name: MyCloudName # Human-readable name
      instance_types: #Type of instances that will be used 
      - code: large-1 #code must match the one used on cloud
        cpu: 2           #must match the instance template 
        disk_size: 64
        name: Small
        ram: 8  #must match the instance template 
        type: large-1
      - code: large-2
        cpu: 4
        disk_size: 64
        name: Medium
        ram: 16
        type: large-2
      network_types:
      - code: public
        in_vpc: false
        info: |
          All instances will be deployed with public IPs. Access to the public IPs is controlled by a firewall.
        name: Public
      regions:
      - availability_zones:
        - code: nova # Case-sensitive 
          name: az1 # Human-readable name
        city: Stockholm
        code: my-region1 # this is your region code. Case-sensitive.
        continent_code: EU
        country_code: SE
        display_code: my-region1
        name: my-region1
      volume_types:
      - code: ssd
        has_iops: false
        info: Optimized for performance
        name: SSD network attached
        size:
          default: 60
          max: 1000
          min: 30
    databases: #database variations
    - code: mariadb
      enabled: true
      info: Deploy MariaDB with either multi-master (MariaDB Cluster) or master/replicas.
      name: MariaDB
      num_nodes:
      - 1
      - 2
      - 3
      ports:
      - 3306
      types:
      - code: galera
        name: Multi-Master
        size_hints:
          "1": 1 master node
          "3": 3 multi-master nodes
      - code: replication
        name: Master / Replicas
        size_hints:
          "1": 1 master node
          "2": 1 master, 1 replica
          "3": 1 master, 2 replicas
      versions:
      - "10.11"
      - "11.4"
    - code: percona
      enabled: true
      info: Deploy MySQL with either multi-master (PXC) or master/replicas.
      name: MySQL
      num_nodes:
      - 1
      - 2
      - 3
      ports:
      - 3306
      types:
      - code: galera
        name: Multi-Master
        size_hints:
          "1": 1 master node
          "3": 3 multi-master nodes
      - code: replication
        name: Master / Replicas
        size_hints:
          "1": 1 master node
          "2": 1 master, 1 replica
          "3": 1 master, 2 replicas
      versions:
      - "8.4"
    - code: postgres
      enabled: true
      info: Deploy PostgreSQL using asynchronous replication for high-availability.
      name: PostgreSQL
      num_nodes:
      - 1
      - 2
      - 3
      ports:
      - 5432
      types:
      - code: postgres_streaming
        name: Streaming Replication
        size_hints:
          "1": 1 master node
          "2": 1 master, 1 replica
          "3": 1 master, 2 replicas
      versions:
      - "15"
      - "16"
      - "17"
      - "18"
    - code: valkey_sentinel
      enabled: true
      info: Deploy Valkey Sentinel.
      name: Valkey
      num_nodes:
      - 1
      - 3
      ports:
      - 6379
      types:
      - code: valkey_sentinel
        name: Sentinel
        size_hints:
          "1": 1 master node
          "3": 1 master, 2 replicas
      versions:
      - "8"
    - code: microsoft
      enabled: true
      info: Deploy Microsoft SQL Server.
      name: Microsoft SQL Server
      num_nodes:
      - 1
      - 2
      ports:
      - 1433
      types:
      - code: mssql_single
        name: Single server
        size_hints:
          "1": 1 node
      - code: mssql_ao_async
        name: Always On (async commit mode)
        size_hints:
          "2": 1 primary, 1 secondary
      versions:
      - "2022"
  env:
    DISABLE_ROLLBACK: "false" #when "true", a datastore that fails to deploy is kept instead of deleted, which helps with debugging. Set to "false" for prod so failed deployments are cleaned up automatically.
  ingress:
    annotations:
      external-dns.alpha.kubernetes.io/hostname: somedomain.com # domain used for databases. It has to match with ExternalDNS used one.
    ssl:
      clusterIssuer: letsencrypt-prod # Make sure it's the one you created in cert-manager step
  services:
    deployer:
      config:
        openstack_vendors:
          mycloud:
            compute_api_microversion: "2.79"
            floating_network_id: some_id  # Replace with actual ID
            network_api_version: NetworkNeutron
            network_id: some_network_id # Replace with actual network ID
            project_id: project_id # Replace with your OpenStack project ID
            regions: 
              sto1: # region id, must be consistently set/named. Case-sensitive.
                image_id: 936c8ba7-343a-4172-8eab-86dda97f12c5  # Replace with image ID for the region
                # secgrp_name refers to the security group name used by CCX to access datastore VMs.
                # It must be created manually and allow all TCP traffic from all Kubernetes nodes where CCX is running.
                secgrp_name: ccx-common  # Recommended to use a dedicated security group
    uiapp:
      env:
        FE_REACT_APP_FAVICON_URL: your_icon_link #link to your company icon
        FE_REACT_APP_LOGO_URL: your_link #link to your company logo
        FE_EXTERNAL_CSS_URL: your.css.url #url to the css you will be using
        FE_NODE_ENV: "production"
        FE_VPC_DISABLED: true #turn this off unless using AWS
      replicas: 3
    runner:
      replicas: 5 # Minimum is 3 that should be used in production. Preferable is to have 5 or more
    admin:
      replicas: 3
    auth:
      replicas: 3
    billingupdater:
      replicas: 3
    dispatcher:
      replicas: 3
    hook:
      replicas: 3
    notify_worker:
      replicas: 3
    rest_service:
      replicas: 3
    stores_listener:
      replicas: 3
    stores_service:
      replicas: 3
      serviceType: LoadBalancer
    state-worker:
      replicas: 1
    user:
      replicas: 3
    uiauth:
      replicas: 3
      env:
        FE_NODE_ENV: "production"  
  userDomain: somedomain.com # domain used for databases. It has to match with ExternalDNS used one.
cmon:
  license: xxx # Base64-encoded licence key. The chart key is spelled `license` —
               # any other spelling is silently ignored and never applied.
```

There might be more things that needs to be added/changed, but that will depend on your infrastructure.

To upgrade ccx helm chart, run the following command:
```
helm upgrade --install ccx s9s/ccx -n ccx --debug --wait -f openstack.yaml
```

Once done, open `https://ccx.somedomain.com/auth/register?from=ccx` in a web browser, register a new user and verify that datastore creation is working properly.

### IP Whitelisting for the CC Ingress

The CC interface (`ccFQDN`) can be restricted to specific IP ranges at the ingress level. This is useful for limiting access to the ClusterControl UI to trusted networks (e.g. a VPN or office IP range) without touching firewall rules.

#### How it works

The helm-ccx chart translates `ccx.ingress.whitelist` in your values file into the nginx annotation `nginx.ingress.kubernetes.io/whitelist-source-range` on the CC ingress. If the value is empty or not set, the ingress is publicly accessible.

#### Configuration

Add the `whitelist` field under `ccx.ingress` in your values file:

```yaml
ccx:
  ingress:
    whitelist: "203.0.113.0/24,198.51.100.42/32"
```

The value is a comma-separated list of CIDR ranges. Any request from an IP not matching the list will receive a `403 Forbidden` response from nginx.

:::note
Only the CC ingress (`ccFQDN`) supports whitelisting through this value. The CCX user-facing ingress and other internal ingresses are not affected.
:::

To apply the change, upgrade the helm release:

```bash
helm upgrade --install ccx s9s/ccx -n ccx --debug --wait -f your-values.yaml
```

To verify the annotation was applied:

```bash
kubectl get ingress -n ccx -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.nginx\.ingress\.kubernetes\.io/whitelist-source-range}{"\n"}{end}'
```

#### Removing the whitelist

To make the CC ingress publicly accessible again, set the value to an empty string or remove the field entirely and re-run the helm upgrade:

```yaml
ccx:
  ingress:
    whitelist: ""
```