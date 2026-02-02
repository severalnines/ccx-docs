# Upgrading CCX to be production ready

:::danger
At this point, it's presumed that you have already installed CCX following the tutorial. In case that you wish to upgrade it to be production ready, instead of creating everything from scratch, this page will show you how to do so. Just before doing so, make sure you have adequate resources at your disposal to do so.
::::

:::note
Make sure that you have at least 300Gi of storage capacity for the upgrade. The actual size will depend on your need for the retention policy of metrics and logs.
:::

### Ingress Controller

At this point, it's presumed that ingress controller is properly deployed, as well as that you have externally facing load balancers.

To be production ready, we will need to add a couple of headers, as well as change a couple of configuration parameters. Depending on how you deployed the ingress controler, you will need to do the following:

If you installed ingress controller with the `helm chart` and you are in control of it's `values file`, you will need to add the follwing configuration to it and redeploy the helm cart:

```
  controller:
    addHeaders:
      Referrer-Policy: no-referrer
      X-Content-Type-Options: nosniff
      X-Frame-Options: DENY
      X-XSS-Protection: 1; mode=block
    config:
      allow-backend-server-header: "true"
      use-forwarded-headers: "true"
      hide-headers: "Server,X-Powered-By"
```

If you don't have control over the ingress controller values (e.x. controller comes up installed in cluster upon boot), do the following:

Create new ConfigMap that contains the following:
```
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-custom-add-headers
  namespace: ingress-nginx
data:
  X-Frame-Options: "DENY"
  X-Content-Type-Options: "nosniff"
  X-XSS-Protection: "1; mode=block"
  Referrer-Policy: "no-referrer"
  Content-Security-Policy: "default-src 'self';"
```
Once applied, find the configuration map that contains configuration for the ingress controller. 
`kubectl get configmap -n nginx-ingress-controller`
Edit the ConfigMap so that in contains the following configurations:

```
allow-backend-server-header: "true"
use-forwarded-headers: "true"
hide-headers: "Server,X-Powered-By"
add-headers: "nginx-ingress-controller/ingress-nginx-custom-add-headers"
```
:::note
Make sure that add-headers field matches the path of the previously generated configuration map for headers. First part is namespace, second is the ConfigMap name.
:::

Once this is done, restart all of the nginx pods in order for them to pick up new configurations.

### Cert Manager

When setting up production version of cert-manager, there are a few configuration parameter that needs to be addressed:
`replicaCount` - by default it's set to 1. To make sure it's production ready, make sure it has 2 or 3 replicas to provide high availability.
`podDisruptionBudget.enabled` - by default this is set to `false`. Make sure to change it to `true` if you changed `replicaCount` to be different than 1. 
`crds.enabled` - set to `true`. This will make sure to install all of the CRD's needed for optimal work. 
`crds.keep` - make sure it's set to `true`. This will prevent Helm from uninstalling the CRD when the Helm release is uninstalled.

Depending on how you wish to use this instance of `cert-manager`, make sure that `Issuer` or `ClusterIssuer` exists and is configured properly.


### Dependencies update

Originally the `ccxdeps` helm chart was installed in tutorial using the default values. Create a new file called `ccxdeps.yaml`. You can use the values below and modify them per your needs.

```
mysql-innodbcluster:
  serverInstances: 3 # This is something you can chose, but it can only be 1,3,5,7 or 9.
  podSpec: #whatever is set under podSpec can't be changed in future, so take care in using correct settings
    containers:
    - name: mysql
      resources:
        requests:
          memory: "2048Mi" #make sure this is set properly
victoria-metrics-alert:
  enabled: true
victoria-metrics-single:
  enabled: true
ccx-monitoring:
  alertmanager:
    enabled: false
  enabled: true
  loki:
    gateway:
      ingress:
        hosts:
        - host: some-loki-domain.com
          paths:
          - path: /loki
            pathType: Prefix
        tls:
        - hosts:
          - some-loki-domain.com
          secretName: loki-gateway-tls
    loki_host_url: some-loki-domain.com
oracle-mysql-operator:
  enabled: true
installOperators: true
```
Please take a look at all [values](https://github.com/severalnines/helm-charts/blob/main/charts/ccxdeps/values.yaml), as you might be interested in some of the additional flags.

To upgrade the chart, use the following command:
```
helm upgrade --install ccxdeps s9s/ccxdeps --debug --wait -n ccx -f ccxdeps.yaml
```

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
A number of identifiers are case sensitive: `ccx.config.clouds[].regions[].code`, `ccx.config.clouds[].regions[].availabiliity_zones[].code`, `ccx.services.deployer.config.openstack_vendors[].regions[].identifier` and also the codes for the `instance_types`, `flavors`, `volumes` are `network_types` case-sensitive. Be consistent!
:::

At this point, ccx should be deployed with minimal values yaml. The following values.yaml is minimal for production environment:

:::

```yaml
cc:
  cidr: 0.0.0.0/0 #setup according to your network
ccFQDN: cc.ccx.somedomain.com # dns name for ccx
ccxFQDN: ccx.somedomain.com # dns name for cc
ccx:
  cidr: 0.0.0.0/0 #setup according to your network
  cloudSecrets: ccx # List of Kubernetes secrets containing cloud credentials.
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
      - "8"
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
      - "14"
      - "15"
      - "16"
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
    DISABLE_ROLLBACK: "false" #if a datastore fails to deploy, then it will not be deleted. Helps with debugging. Set to "false" for prod.
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
        FE_EXTERNAL_CSS_URL: your.css.url #ult to the ccss you will be using 
        FE_NODE_ENV: "production"
        FE_VPC_DISABLED: true #turn off this unless using AWS
      replicas: 3
    runner:
      replicas: 5 # Minimum is 3 that should be used in prduction. Prefferable is to have 5 or more
  userDomain: somedomain.com # domain used for databases. It has to match with ExternalDNS used one.
cmon:
  licence: xxx # insert licence here
```

There might be more stuff that needs to be added/changed, but that will depend on your infrastructure.

To upgrade ccx helm chart, run the following command:
```
helm upgrade --install ccx s9s/ccx -n ccx --debug --wait -f openstack.yaml
```

Once done, `https://ccx.somedomain.com/auth/register?from=ccx` in a web browser, register a new user and verify that datastore creatin is working properly.