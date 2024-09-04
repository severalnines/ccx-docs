# Installation

# What is CCX?
### [This page is deprecated. Please visit the following link instead: installation guide](Installation-V2).

CCX is a comprehensive data management and storage solution that offers a range of features including flexible node configurations, scalable storage options, secure networking, and robust monitoring tools. It supports various deployment types to cater to different scalability and redundancy needs, alongside comprehensive management functions for users, databases, nodes, and firewalls. The CCX project provides a versatile platform for efficient data handling, security, and operational management, making it suitable for a wide array of applications and workloads.

# Overview

The CCX control plane consists of two layers:
* a K8s Control plane responsible for the life-cycle of the datastores
* backend databases and tools external to K8s responsible for metadata such as users, datastores, and other resources. There are multiple databases for this purpose:
  * CCX Databases - postgres databases for CCX Services running in k8s.
  * CMON DB - backend database storing datastore metadata.
  * CC - ClusterControl, which manages the databases above.
  * Vault - stores dynamic secrets that are used by CCX Services. :information_source: Vault can be a part of the same k8s cluster actually.

This document describes the requirements and how to proceed with the installation.

The steps to install are:
1. Make sure the control plane meets the requirements.
2. Install the backend databases.
3. Setup and deploy the CCX K8s services.

![img](https://user-images.githubusercontent.com/168628/191235972-7f361e9e-7268-4327-aa36-1532c97992b5.png)

# K8s Control Plane Requirements
The control plane requires the following resources:
* 3 worker nodes 
* 4vCPU
* 8GB of RAM
* 60 GB of Disk (for PVCs)

## Kubernetes version
CCX requires 1.22 or later is required

## Openstack
### Flavors/images for datastores
CCX requires flavors built with Ubuntu 22.04 for the datastores.
For a test/evaluation the following flavors are recommended:
* 2vCPU, 4GB RAM, 80GB Disk
* 4vCPU, 8GB RAM, 100GB Disk
### Floating IPs
Create a pool of floating IPs. Each VM requires a floating IP. 


Disk space can either be ephemeral or block storage.

# Backend Databases & Tools External To K8s

This step installs the backend databases used by CCX. These backend databases are managed using ClusterControl.

## Requirements for ClusterControl and Backend databases
The first step is to install ClusterControl, and then use ClusterControl to set up the CCX DB and CMON DB.
* For a production setup we recommend one VM for ClusterControl, and 2 VMs for CCX DB and 3 VMs for CMON DB.
* For a non-production setup it is possible to colocate CCX DB and CMON DB on one VM, but then it should have 8GB of RAM and 4-8 vCPUs.

### ClusterControl
* 1 VM for ClusterControl
* 4 vCPU
* 2-4 GB of RAM 60GB Disk
* Ubuntu 22.04

### PostgreSQL (CCX DB)
* 1-2 VMs for primary/secondary postgres (2 node are recommended to have a secondary  production)
  * In a production system, one database node for each Availability Zone.
* 4GB of RAM 60-80GB Disk
* 4 vCPU
* Ubuntu 22.04

### MySQL (CMON DB)
* 1-3 VMs for Percona XtraDb Cluster 8.0. Three nodes recommended for production system. 
  * In a production system, one database node for each Availability Zone.
* 4GB of RAM, 60-80GB Disk 
* 4 vCPU
* Ubuntu 22.04

### Monitoring
Currently no monitoring is automatically installed on the CMON DB or CCX DB nodes. This must be configured manually.
We recommend Prometheus/VictoriaMetrics and setup the following exporters on the CMON DB and CCX DB nodes:
CMON DB nodes: mysqld_exporter, node_exporter
CCX DB nodes: postgres_exporter, node_exporter

We also recommend to monitor CMON using the cmon_exporter. For download and instructions please see: https://github.com/severalnines/cmon_exporter.


## ClusterControl Installation

ClusterControl is installed outside of the K8s cluster to monitor and manage database resources used by the control plane:
* MySQL Database, aka CMON DB, is used by the CMON container to store metadata about managed/monitored data stores
* PostgresSQL Database, aka CCX DB, is used to store CCX (Control Plane) metadata.

[Download ClusterControl](https://severalnines.com/get-started/#clustercontrol) - Register, download, and run the install-cc script on the ClusterControl VM. Ensure you can SSH from this VM to the other VMs (for CCX DB, and CMON DB) using key-based authentication (passwordless).
The script installs the controller, apache (for web), and one mariadb/mysql database for metadata.

```
# HOST=192.168.1.10 <-- the IP/HOST on which the web UI is accessible
# S9S_CMON_PASSWORD  <--  the password for the cmon database user (used for monitoring) of the mariadb/mysql database
# S9S_ROOT_PASSWORD <-- the password for the root  database user of the mariadb/mysql database

$ S9S_CMON_PASSWORD=oSGrcmeR S9S_ROOT_PASSWORD=FHiXPNye HOST=192.168.1.10 ./install-cc # as root or sudo user
```

Below is more extended documentation about the ClusterControl installation process.
[ClusterControl Installation Instructions](https://docs.severalnines.com/docs/clustercontrol/installation/automatic-installation/installer-script-install-cc/)
It's strongly recommended to use the script based installation method.

### Deploy CCX DB and CMON DB

Login to the ClusterControl frontend and select "Deploy Cluster". You need to deploy one Postgres cluster and one MySQL/MariaDb Galera Cluster.
Below are links to extended documentation for this step:
* [Deploy PostgreSQL - CCX DB](https://docs.severalnines.com/docs/clustercontrol/user-guide-gui/dashboard/deploy-a-database-cluster/postgresql/)
* [Deploy Galera Cluster - CMON DB](https://docs.severalnines.com/docs/clustercontrol/user-guide-gui/dashboard/deploy-a-database-cluster/galera-cluster/)

### Monitoring
ClusterControl may be integrated with Prometheus using the cmon_exporter. The cmon_exporter can be installed in several ways (docker, systemd) . Detailed instructions are located here:
https://github.com/severalnines/cmon_exporter


## CCXDB User and Databases

### Databases
The following database must be created on CCXDB (Postgres):
```
CREATE DATABASE ccx ENCODING UTF8;
CREATE DATABASE ccx_projects ENCODING UTF8;
CREATE DATABASE ccx_backup ENCODING UTF8;
CREATE DATABASE ccx_deployer ENCODING UTF8;
CREATE DATABASE ccx_notification ENCODING UTF8;
CREATE DATABASE ccx_rbac ENCODING UTF8;
CREATE DATABASE ccx_vpc ENCODING UTF8;
CREATE DATABASE ccx_stores ENCODING UTF8;
CREATE DATABASE ccx_cloud ENCODING UTF8;
```

### User
Replace `<PGPASSWORD>` with the password.
This user is
These placeholders are also present in a number of secret files and must be set there too.
```
CREATE USER ccx WITH encrypted PASSWORD '<PGPASSWORD>';
GRANT ALL PRIVILEGES ON DATABASE ccx TO ccx;
GRANT ALL PRIVILEGES ON DATABASE ccx_projects TO ccx;
GRANT ALL PRIVILEGES ON DATABASE ccx_backup TO ccx;
GRANT ALL PRIVILEGES ON DATABASE ccx_deployer TO ccx;
GRANT ALL PRIVILEGES ON DATABASE ccx_notification TO ccx;
GRANT ALL PRIVILEGES ON DATABASE ccx_rbac TO ccx;
GRANT ALL PRIVILEGES ON DATABASE ccx_vpc TO ccx;
GRANT ALL PRIVILEGES ON DATABASE ccx_stores TO ccx;
GRANT ALL PRIVILEGES ON DATABASE ccx_cloud TO ccx;

ALTER DATABASE ccx OWNER TO ccx;
ALTER DATABASE ccx_projects OWNER TO ccx;
ALTER DATABASE ccx_backup OWNER TO ccx;
ALTER DATABASE ccx_deployer OWNER TO ccx;
ALTER DATABASE ccx_notification OWNER TO ccx;
ALTER DATABASE ccx_rbac OWNER TO ccx;
ALTER DATABASE ccx_vpc OWNER TO ccx;
ALTER DATABASE ccx_stores OWNER TO ccx;
ALTER DATABASE ccx_cloud OWNER TO ccx;
```


### Create user and database in CMON DB (mysql) database
![img](https://user-images.githubusercontent.com/168628/194004611-c275fe43-ff79-411c-bd99-1fae4f8d62e9.png)


The K8s CMON container (in K8s and installed at a later step) must be allowed to connect to the CMON DB.
We must know the Pod IP range of the CMON container k8s cluster.

If the CMON container is running on the 10.0.0.0 network, then allow '10.%' to connect. This mitigates issues if the IP address change.

Create a database and user in the CMON DB.
Open a terminal to the ClusterControl VM (labeled EXT CMON CCUI above):

```
# List the cluster, and get the CLUSTERID (first column) of the CMON DB:
$ s9s cluster --list --long

ID  STATE   TYPE              OWNER GROUP  NAME     COMMENT
1 STARTED postgresql_single johan admins CCXDB    All nodes are operational.
2 STARTED galera.           johan admins CMONDB   All nodes are operational.
```
Use the CLUSTERID from the previous step and create the database:
```
# Create a database called 'cmon'
$ s9s cluster --cluster-id=CLUSTERID  --create-database --db-name=cmon 
Database 'cmon' created.
Created.
```
Create the database user:
```
# Create a database user called 'cmon', set `<CMON_SECRET>` and IP. IP is the address of the K8s CMON Container.
# If the CMON container is running on the 10.0.0.0 network, then allow IP '10.%' to connect.
# This mitigates issues if the IP address change.
$ s9s account --cluster-id=CLUSTERID  --create --privileges="*.*:ALL,GRANT" --account="cmon:`<CMON_SECRET>`@<IP>"

Account 'cmon' created.
Grant processed: GRANT ALL PRIVILEGES ON *.* TO 'cmon'@'nnn.nnn.nnn.nnn' WITH GRANT OPTION
Created.
```


## Kubernetes

### Kubernetes cluster requirements

Prerequisites:
* nginx ingress controller
* vault
* nats
* external-dns

This prequisite can be installed using ccxdeps. Dependencies required for CCX are created as child charts inside ccxdeps.
By default only ingress-nginx controller and external-dns is not enabled in ccxdeps.
you can enable by setting it to true by using below command.
```
  helm install ccxdeps ccxdeps/ccxdeps --debug --set ingressController.enabled=true --set external-dns.enabled=true
```

#### Namespace
A namespace must be configured for the CCX K8s services to operate. 
example: `production`

### Setup registry credentials
Get your docker registry credential from s9s representative and set them up in your k8s cluster.
Incase if you have a GCP account, please provide your service account email to us to assign roles to pull the ccx images.

*NOTE*
You might need to transform your service account json credentials provided by s9s representative into docker credentials. 
To do so run
```
cat YOUR_SERVICE_ACCOUNT.json | docker login -u _json_key --password-stdin https://eu.gcr.io
```
You will endup with `~/.docker/config.json` which should be ready to use!

Put you docker config.json into k8s.

*Example:*
```
kubectl create secret generic regcred \
    --from-file=.dockerconfigjson=$HOME/.docker/config.json \
    --type=kubernetes.io/dockerconfigjson
```
And don't forget to apply it to service account

*Example:*

```
kubectl patch serviceaccount default -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

### Setup helm repositories
Ask your s9s representative for access to helm repository https://github.com/severalnines/helm-ccx and https://github.com/severalnines/helm-ccxdeps (optional) and https://github.com/severalnines/observability/ (optional).

*NOTE* Please make sure to use your github username (not email) and token (not password).

```
helm repo add ccx https://severalnines.github.io/helm-ccx/ --pass-credentials --username YOUR_GITHUB_NAME --password YOUR_GITHUB_TOKEN
helm repo update
```

and optionally
```
helm repo add ccxdeps https://severalnines.github.io/helm-ccxdeps/ --pass-credentials --username YOUR_GITHUB_NAME --password YOUR_GITHUB_TOKEN
helm repo add ccx-monitoring https://severalnines.github.io/observability/ --pass-credentials --username YOUR_GITHUB_NAME --password YOUR_GITHUB_TOKEN
helm repo update
```

# QuickStart with AWS
If you wish to quickly install CCX in dev environment, you can use provided `ccxdeps` helm chart to install and configure dependencies.
There are certain limitations - ephemeral vault, in k8s databases using operators, etc.
By default CCX will install with the cloud vendor AWS - only thing you need to provide is cloud secrets!
If you want to customize your installation, please see the `values.yaml` and follow the guide :-)

**This is recommendend only for development environment.**

#### Install CCX along with dependencies
```
helm install ccxdeps ccxdeps/ccxdeps --wait --debug
helm install ccx ccx/ccx --wait --debug
```

### Create secrets
For a super quick start you can create a `aws` secret from your existing aws credentials file `~/.aws/credentials`.

```
kubectl create secret generic aws --from-literal=AWS_ACCESS_KEY_ID=$(awk '/aws_access_key_id/{print $NF}' ~/.aws/credentials) --from-literal=AWS_SECRET_ACCESS_KEY=$(awk '/aws_secret_access_key/{print $NF}' ~/.aws/credentials)
```

Otherwise you can create secrets manually or by copying a [`secrets-template.yaml`](https://github.com/severalnines/helm-ccx/blob/main/secrets-template.yaml) and putting your secrets in.

For AWS cloud make sure to setup `aws` secret.
For Openstack make sure to setup `mycloud-openstack` secret replacing `mycloud` with your cloud code.

Apply secrets by running (or whatever the way you setup these secrets :-))
```
kubectl apply -f secrets-template.yaml
```

### Customize your CCX values
Have a look at `values.yaml` and create your own values file to customize your CCX instance.

The very minimal `values.yaml` could be
```
sessionDomain: mycloud.com
ccxFQDN: ccx.mycloud.com
ccFQDN: cc.mycloud.com
cmon:
  license: ZHVwYQ== #YOUR CMON LICENSE SHOULD BE BASE64 ENCODED HERE
# this section is for configuring specifics of the CCX system
ccx:
  # list of k8s secrets containing cloud credentials
  cloudSecrets:
   - aws
```

**NOTE**
Use `helm-ccxdeps` charts for your development environment. 
For production, we recommend you to create HA external DB, Vault, Nats.

Get in touch with our s9s representative in case of issues or clarifications.

## Customization of ccx config and deployer config


- `ccFQDN` - The domain name for the CCX installation
- `ccx`
    - `affiliation` - name of CCX owner
    - `config`
      - `clouds` - cloud config per provider
        - `code` - cloud provider identifier
        - `name` - cloud provider name
          - `instance_types` - array of instances available
            - `code` - instance name
            - `cpu` - cores available per instance
            - `disk_size` - disk size (GB)
            - `ram` - RAM available (GB)
            - `name` - instance name
            - `type` - instance type
        - `network_types`- 
          - `code` - network type identifier
          - `in_vpc` - if network is within a VPC
          - `info` - comment on network type
          - `name` - name of network type
        - `regions` - array of regions available
          - `availability_zones` -
            - `code` - AZ identifier
            - `name` - AZ name
          - `city` - city name
          - `code` - region identifier
          - `continent_code` - continent code
          - `country_code` - country code
          - `display_code` - user facing code
          - `name` - name of region
        - `volume_types` - array of volumes available
          - `code` - volume type code
          - `has_iops`
          - `info` - comment on volume type
          - `name` - name of volume type
          - `size`
            - `default` - default size of volume type
            - `max` - max size of volume type
            - `min` - min size of volume type
          - `verified_level`
      - `databases` - array of supported databases
        - `beta` - If the service is beta or not
        - `code`- database identifier
        - `enabled` - available to deploy (or not)
        - `info` - comment on database
        - `name` - database nane
        - `num_nodes` - array of nodes allowed
        - `ports` - array of opened ports
        - `types` - array of deployments supported
        - `versions` - array of supported versions

Below are the some example of ccx config for openstack
```
ccx:
  config:  
    databases: # the databases to create these are default values don't delete
    clouds: #The cloud provider to create
      - code: #The name of the customer
        name:  #The name of the customer
        logo: https://cultofthepartyparrot.com/parrots/hd/parrot.gif #The logo of the customer
        regions: #The regions to deploy the datastore
          - code: RegionOne  #The region from the openstack
            display_code: Teknopark #The region to display
            name: Jakarta  #The full name of region
            country_code: ID #Short form of country
            continent_code: AS #Short form of continent
            city: Jakarta #city
            availability_zones: #availability zones to deploy
              - code: nova 
                name: nova
        network_types: #type of network
          - name: Public
            code: public
            info: All instances will be deployed with public IPs. Access to the public IPs is controlled by a firewall.
            in_vpc: false
          - name: Private
            code: private
            info: All instances will be deployed in a VPC with private IP addresses.
            in_vpc: true
        instance_types: # instance list to deploy to
          - name: a2.medium_dbaas
            code: medium
            type: a2.medium_dbaas
            cpu: 2
            ram: 4
            disk_size: 0
            verified_level: 0
          - name: a2.large_dbaas
            code: large
            type: a2.large_dbaas
            cpu: 4
            ram: 8
            disk_size: 0
            verified_level: 0
        volume_types: # volume types to deploy to
          - name: Standard
            code: standard
            has_iops: false
            info: Standard volume type.
            verified_level: 0
            size:
              min: 80
              max: 5000
              default: 80
          - name: Premium
            code: premium
            has_iops: false
            info: Premium volume type.
            verified_level: 0
            size:
              min: 80
              max: 5000
              default: 80
      - code: mariadb
        name: MariaDB
        versions:
          - "10.6"
        num_nodes:
          - 1
          - 2
          - 3
        info: Deploy MariaDB with either multi-master (MariaDB Cluster) or master/replicas.
        enabled: true
        beta: false
        types:
          - name: Multi-Master
            code: galera
            size_hints:
              1: 1 master node
              3: 3 multi-master nodes
          - name: Master / Replicas
            code: replication
            size_hints:
              1: 1 master node
              2: 1 master, 1 replica
              3: 1 master, 2 replicas
        ports: [ 3306 ]
      - code: percona
        name: MySQL
        versions:
          - "8"
        num_nodes:
          - 1
          - 2
          - 3
        info: Deploy MySQL with either multi-master (PXC) or master/replicas.
        enabled: true
        beta: false
        types:
          - name: Multi-Master
            code: galera
            size_hints:
              1: 1 master node
              3: 3 multi-master nodes
          - name: Master / Replicas
            code: replication
            size_hints:
              1: 1 master node
              2: 1 master, 1 replica
              3: 1 master, 2 replicas
        ports: [ 3306 ]
      - code: postgres
        name: PostgreSQL
        versions:
          - "11"
          - "14"
          - "15"
        num_nodes:
          - 1
          - 2
          - 3
        info: Deploy PostgreSQL using asynchronous replication for high-availability.
        enabled: true
        beta: false
        types:
          - name: Streaming Replication
            code: postgres_streaming
            size_hints:
              1: 1 master node
              2: 1 master, 1 replica
              3: 1 master, 2 replicas
        ports: [ 5432 ]
      - code: redis
        name: Redis
        versions:
          - "7"
        num_nodes:
          - 1
          - 3
        info: Deploy Redis Sentinel.
        enabled: true
        beta: false
        types:
          - name: Sentinel
            code: redis
            size_hints:
              1: 1 master node
              3: 1 master, 2 replicas
        ports: [ 6379 ]
      - code: microsoft
        name: Microsoft SQL Server
        versions:
          - "2019"
        num_nodes:
          - 1
          - 2
        info: Deploy Microsoft SQL Server.
        enabled: true
        beta: false
        types:
          - name: Single server
            code: mssql_single
            size_hints:
              1: 1 node
          - name: Always On (async commit mode)
            code: mssql_ao_async
            size_hints:
              2: 1 primary, 1 secondary
        ports: [ 1433 ]
```

Below are the some example of deployer config for openstack

Each OpenStack vendor has options:

|          Option          |                                                                                                                                                     Description                                                                                                                                                    |
|:------------------------:|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| retries                  | When requesting resources from Openstack we need to check whether they are really provisioned. If the API call to create for example a compute node will return 200 it does not mean that the compute resource will be created or is created. We have to check it and retires define how many times we will check. |
| project_id               | Default project ID that will be used if no project ID will be provided in the request.                                                                                                                                                                                                                             |
| subnet_id                | Default network subnet id that will be used if no subnet will be provided in the request                                                                                                                                                                                                                           |
| auth_url                 | The Openstack endpoint                                                                                                                                                                                                                                                                                             |
| user_domain_name         | The domain name for the user - this plus username, project id, password will normally be set by secrets instead.                                                                                                                                                                                                   |
| vendor                   | The name of the client vendor.                                                                                                                                                                                                                                                                                     |
| network_api_version      | Default is NetworkNeutron and that is fine.                                                                                                                                                                                                                                                                        |
| floating_ip_api_version  | Openstack has different version of network APIs. We are supporting: compute/v2/extensions/floatingips - FloatingIPV2 networking/v2/extensions/layer3/floatingips- FloatingIPV3 (this is better)                                                                                                                    |
| compute_api_microversion | Microversion for compute service (nova).                                                                                                                                                                                                                                                                           |
```
ccx:
  services:
    deployer:
      config:
        openstack_vendors:
          customerOne: #customer
            url: #Replace it
            compute_api_microversion: "2.79"
            network_api_version: NetworkNeutron
            floating_ip_api_version: FloatingIPV3
            project_id: #Replace it
            floating_network_id: #Replace it
            network_id: #Replace it
            max_jobs: 5
            retries: 5
            regions:
              RegionOne: #region to overwrite
                image_id:  # ubuntu-22.04 image
                secgrp_name: ccx-common # security group name
            s3:
              nothing_here: 0
            root_volume: # for booting from persistent volume
              enabled: true
              size: 24
```


**IMPORTANT LIMITATION**
About cmon.user and cmon.password.
The cmon.user and the cmon.password is used to authenticate to:
* cmon db
* datastores
Extreme care must be taken to change the cmon.user and cmon.password at runtime/during the lifecycle to prevent access denied to either part.
The cmon user and the `<CMON_SECRET>` must also be set in values.yaml
```
cmon:
  user: cmon
  password: `<CMON_SECRET>`
...
  db:
    # overwrite the below if you are using external DB for cmon
    # defaults are set to match DB provided by ccxdeps helm chart
    host: #replace with hostname
    port: 3306 #port
    name: cmon #replace it
    user: cmon #replace it
    password: cmon #replace it
```
The ccx user and password must be set in the values.yaml file:
```
ccx:
  .....
  # postgresql server used by all backend components
  db:
    # overwrite the below if you are using external DB for CCX
    # defaults are set to match DB provided by ccxdeps helm chart
    address: acid-ccx #overwrite it
    port: 5432 #overwrite it
    username: ccx #overwrite it
    password: <PGPASSWORD>
```
change vault and nats configs.
```
ccx:
  vault: #CHANGE FOR YOUR VAULT
    addr: http://ccxdeps-vault:8200 #REPLACE FOR YOUR VAULT
    token: root #REPLACE TOKEN
  nats:
    server: ccxdeps-ccx-nats #CHANGE FOR YOUR NATS SERVER
    clusterID: test-cluster # Replace nats cluster ID
```
Ingress configuration
```
  ingress:
    ingressClassName: nginx # specify your ingressClassName here
    ssl:
      secretName: # use an existing k8s secret of type tls for CCX ingress
      clusterIssuer: # set this to your cert manager's cluster issuer or simply remove to not use one

```
If you are using your own databases, vault, etc, please be sure to go over the values file and modify it to your needs.


### On-premise Installation
Skip this step if installation is for cloud deployments.

*NOTE* 
For cloud deployments, dynamic provisioning is fairly easy, since Kubernetes comes bundled with ways to interact with all major cloud provider's volume backends, such as AWS EBS, so you just need to define the storage class. 
However for on-premise deployments,as there will no Dynamic Volume controller the primary solution is to have an external volume storage devices/backend created that is not handled by Kubernetes, and install a provisioner for it in your cluster. 
We recommend not to install local provisioner. In a production environment, you would typically use a more robust provisioner that integrates with your storage infrastructure. Make sure to check sufficient storage sizes are available on your cluster.

##### Things to consider:

* While installing vault, choose the storage backend to make it highly available to access the data.
* nats can be installed by following this link https://github.com/nats-io/k8s
  or it can be installed from  https://github.com/severalnines/helm-ccxdeps by providing this command and by replacing the place-holder of providing the storage class you created in your on-premise env. This command will install only nats.
    ```
      helm upgrade --install ccxdeps ccxdeps/ccxdeps --wait --debug --set installOperators=false --set createDatabases=false --set vault.enabled=false --set nats.nats.jetstream.fileStorage.storageClassName=<YOUR_STORAGE_CLASS>
    ```
* Make sure to configure firewall to allow all nodes in cluster to access the hosts.
* Ingress expects tls communication so certs needs to be for the required domains in case if you don't have ClusterIssuer to issue certificates. Create tls certs as a secret and provide the tls secret name in helm-ccx values `ccx.ingress.ssl.secretName`
    ```
    kubectl create secret tls ccx-ingress-tls \
        --key server.key \
        --cert server.crt
    ```

##### Setting up security groups

If using a common secgrp, this should be created manually. It must allow for CCX (all the k8s nodes) to access the hosts. Then its name should be passed as secgrp_name in the deployer config (for Openstack) or secgrp_id (for AWS).

### Configure DynamicDNS
Please see - [DynamicDNS.md](DynamicDNS.md)

### To Install CCXDEPS 
Simply run
```
helm install ccxdeps ccxdeps/ccxdeps --wait --debug
```

or if you want to use your own databases and vault - *Be sure to set it up in your `values.yaml`*. This will enable only Nats.
```
helm install ccxdeps ccxdeps/ccxdeps --wait --debug --set installOperators=false --set createDatabases=false --set vault.enabled=false
```
### Install CCX
To install ccx
```
helm install ccx ccx/ccx --wait --debug --values YOUR-values.yaml
```
Note: Ensure to check all pods, jobs are running without any errors
### Monitoring Datastores
To enable the monitoring metrics in datastore, after setting up the monitoring tool and installation. 
Provide the values for `prometheusHostname` in helm-ccx chart such as `<servicename>`.`<namespace>`
Example:
```
# host of your prometheus/victoria metrics instance
prometheusHostname: ccx-monitoring-victoria-metrics-single-server.victoriametrics
```
