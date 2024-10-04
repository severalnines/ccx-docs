# Cloud providers

## Cloudstack
###  Overview
By supporting CloudStack cloud providers, CCX provides a robust platform to facilitate the deployment and management of database instances as part of DBaaS offerings. 
This integration leverages CloudStack's infrastructure management capabilities, enabling users to automate database provisioning, scaling, and maintenance, all while 
benefiting from the agility and flexibility that cloud environments offer.

CCX allows users to leverage CloudStack’s API to automate the creation, configuration, and deployment of databases, reducing manual effort and minimizing the risk of configuration errors.

### Requirements 
To enable full DBaaS functionality and seamless integration with CloudStack, CCX requires specific resources and access via the CloudStack API. Below are the detailed requirements for deploying and managing database services using CCX within a CloudStack environment.


### Prerequisites
#### API Access:
CCX requires access to the CloudStack API to interact with the cloud infrastructure programmatically. This enables automated provisioning, management, and scaling of database instances.

#### Required Resources

For the proper functioning of CCX with CloudStack, the following resources must be available:

##### Compute Resources (Virtual Machines):
CCX needs the ability to create and manage virtual machines (VMs) within CloudStack. These VMs serve as the foundation for hosting database instances and must be provisioned dynamically based on workload requirements.

##### Public IP Addresses:
CCX must be able to acquire and assign public IP addresses to the deployed VMs. This ensures proper network connectivity and allows external clients to access the database services hosted on these VMs.

##### Firewall Configuration:
CCX requires the ability to create and manage firewall rules for the VMs. This is essential for securing database instances by controlling traffic and defining which ports and protocols are allowed for communication.

##### Volume Management:
CCX must be able to acquire and attach storage volumes to the VMs for database storage. Only volumes with configurable size are supported, allowing users to define storage capacity according to their specific database needs.
The CCX requirements from Cloudstack:

### Configuration
#### CCX Cloudstack configuration
To add a cloudstack providers we need to add new section under `clouds:` in the `ccx-values-config.yaml` config file.
```yaml
      - code: mycloud 
        type: cloudstack
        name: mycloud
        logo: https://cdnblog.filecloud.com/blog/wp-content/uploads/2014/02/cloudstack1.png
        has_vpcs: false
        instance_types:
          - type: 00000000-0000-0000-0000-000000000000 # The uuid of the service offering
            cpu: 2 # This value will be displayed to inform user about the CPU, it has to match the service offering
            ram: 2 # This value will be displayed to inform user about the CPU, it has to match the service offering
            disk_size: 0
            name: Small
          - type: 00000000-0000-0000-0000-000000000000 # The uuid of the service offering 
            cpu: 16 # This value will be displayed to inform user about the CPU, it has to match the service offering
            ram: 16 # This value will be displayed to inform user about the CPU, it has to match the service offering
            disk_size: 0
            name: Big
        volume_types:
          - code: 00000000-0000-0000-0000-000000000000 # the uuid of the disk offering
            has_iops: false
            info: Custom Disk # It will be displayed in the Volume Type button in the UI
            name: custom # It will be displayed in the Volume Type button in the UI
            size:
              default: 40 # Default size in GiB
              max: 1000 # Max size in GiB
              min: 20 # Min size in GiB
          - code: 00000000-0000-0000-0000-000000000000
            has_iops: false
            info: Local Custom Disk # It will be displayed in the Volume Type button in the UI
            name: local_custom # It will be displayed in the Volume Type button in the UI
            size:
              default: 40
              max: 1000
              min: 20
        network_types:
          - code: public
            in_vpc: false
            info:
              All instances will be deployed with public IPs. Access to the public IPs is controlled by a firewall
            name: Public
        regions:
          - code: UK
            city: UK
            continent_code: UK
            country_code: UK
            display_code: UK # it will be displayed in the UI
            name: UK Region
            preferred_display_code: UK Region
            availability_zones:
              - code: 00000000-0000-0000-0000-000000000000 # The uuid of the zone
                name: zone1 # zone name, it will be displayed in the UI
                network_id: 00000000-0000-0000-0000-000000000000 # The uuid of the network that will be used within the zoneiu
```

- *Zone Support:*
At present, CCX supports a single zone per region, ensuring streamlined resource management and deployment consistency within each designated region. 

- *Disk Support:*
CCX supports only disks with configurable, custom sizes. This flexibility allows users to specify disk capacities according to the specific needs of their database workloads, ensuring efficient storage allocation and scaling based on demand.

#### Deployer configuration file ccx-values-deployer
The cloudstack provides has to defined under the `cloudstack_vendors`, here is an example
```yaml
        cloudstack_vendors:
          mycloud:
            url: "http://192.168.50.147:12345/client/api"
            verify_ssl: false
            no_expunge: false
            template_id: "00000000-0000-0000-0000-000000000000"
            network_id: "00000000-0000-0000-0000-000000000000"
            zone: "00000000-0000-0000-0000-000000000000"
            database_vendors:
              - name: mariadb
                security_groups:
                  - cidr: x.x.x.x/32
                    from_port: 22
                    ip_protocol: tcp
                    to_port: 22
                  - cidr: x.x.x.x/32
                    from_port: 1000
                    ip_protocol: tcp
                    to_port: 65535
              - name: microsoft
                security_groups:
                  - cidr: x.x.x.x/32
                    from_port: 22
                    ip_protocol: tcp
                    to_port: 22
                  - cidr: x.x.x.x/32
                    from_port: 1000
                    ip_protocol: tcp
                    to_port: 65535
              - name: percona
                security_groups:
                  - cidr: x.x.x.x/32
                    from_port: 22
                    ip_protocol: tcp
                    to_port: 22
                  - cidr: x.x.x.x/32
                    from_port: 1000
                    ip_protocol: tcp
                    to_port: 65535
              - name: postgres
                security_groups:
                  - cidr: x.x.x.x/32
                    from_port: 22
                    ip_protocol: tcp
                    to_port: 22
                  - cidr: 37.30.16.41/32
                    from_port: 1000
                    ip_protocol: tcp
                    to_port: 65535
              - name: redis
                security_groups:
                  - cidr: x.x.x.x/32
                    from_port: 22
                    ip_protocol: tcp
                    to_port: 22
                  - cidr: x.x.x.x/32
                    from_port: 1000
                    ip_protocol: tcp
                    to_port: 65535
```

The `no_expunge` set to false means that the VM, along with all its details, will be destroyed. The `cidr: x.x.x.x/32` in the database_vendors refers to the IP address of the CCX, which connects to and manages the database nodes.
This will create security rules for every node in the datastore.

- *Network and Zone Configuration:*
The `network_id` and zone will act as the default values for regions, ensuring consistent configuration across deployments.

- *Database Vendor Settings:*
The `database_vendors` section defines the default rules required for CMON to connect to the database nodes. The x.x.x.x must be updated to reflect the actual CMON IP address of the current deployment for proper connectivity.

#### Cloudstack credentials
We store Cloudstack credentials in the Kubernetes secrets.
In the Kubernetes secret we will have two values for API_KEY and API_SECRET_KEY

The name of this variables should as follows &lt;name_of_the_cloudstack_vendor&gt;_CLOUDSTACK_API_KEY and &lt;name_of_the_cloudstack_vendor&gt;_CLOUDSTACK_API_SECRET_KEY.

In our case the cloudstack vendor is called `mycloud` so we need to create secret named `mycloud`
```yaml
apiVersion: v1
data:
  MYCLOUD_CLOUDSTACK_API_KEY: base64_encoed_api_key
  MYCLOUD_CLOUDSTACK_API_SECRET_KEY: base64_encoded_secret_api_key
kind: Secret
metadata:
  annotations:
  name: mycloud 
type: Opaque
```

The secret has to be included in the ccx-values under the cloudSecrets.

```yaml
  cloudSecrets:
    - cloudstack
```

#### S3 backup storage
For the Cloudstack S3 backup, we need to create a Kubernetes secret with S3 storage informations and credentials.
`CLOUDSTACK_S3_INSECURE_SSL` can be set to true if you don't have a valid TLS cert for your s3 endpoint.

```yaml
apiVersion: v1
data:
  MYCLOUD_S3_ACCESSKEY: <base64_access_key>
  MYCLOUD_S3_BUCKETNAME: <base64_bucket_name>
  MYCLOUD_S3_ENDPOINT: <base64_endpoint>
  MYCLOUD_S3_SECRETKEY: <base64_secret_key>
  MYCLOUD_S3_INSECURE_SSL: <base64_true_or_false>
kind: Secret
metadata:
  name: cloudstack-s3
type: Opaque
```

The secret has to be included in the ccx-values under the cloudSecrets.

```yaml
  cloudSecrets:
    - cloudstack-s3
```

## VMware
### Overview
VMware's support for CCX is available for ESXi versions that adhere to the [VMware Product Lifecycle Matrix](https://lifecycle.vmware.com/).

CCX requires the following things enabled on the ESXi side

- We require a network with a pool of IP addresses with access to the internet and cmon. We need this to install the necessary software, databases, etc.
- IP addresses must be assigned automatically for the VM and must not change.
- We are installing the operating system using Ubuntu ISO image. The image needs to install  
  
  We require Ubuntu 22.04 with automated installation. After the successfully installation we will inject our cloud-init data via userdata.
  
  We can provide Ubuntu 22.04 ISO if needed.
- The CCX uses flavors/instance types so that the user can choose the number of CPUs and Memory the database nodes will have. VMware does not have a concept of flavors/instance types, but we can define one in the CCX configuration file.
  In the `instances_types` for other cloud vendors we are also defining CPU and RAM but they are only to inform the user about the flavor/instance type.
  In case of VMWare this will actually define the resources for the new Virtual Machines.

### Configuration
#### Deployer configuration
In the deployer configuration (`ccx-values-deployer.yaml`) we configure how CCX will access the ESXi APIs.
The VMware configuration is under the deployer section in the VMware_vendors sections.

Here is an example configuration
```yaml
vmware_vendors:
        vmware_vendor_name:
          dc: ha-datacenter
          iso: '[datastore1] iso/ccx.iso'
          data_network: public.4
          management_network: client.1
          network_adapter: vmxnet3
          resource_pool: esxi./Resources
          vc_url: https://ip_address/sdk
          vm_path: datastore1
```

The *vmware_vendor_name* can be any string.

| Key                | Description                                                                                                                                                                                                           |
|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| dc                 | The name of the data center                                                                                                                                                                                           | 
| iso                | The path to the Ubuntu ISO image with the information in which datastore the ISO is stored.                                                                                                                           |
| data_network       | The data network option is mandatory. It will be used for the clients to connect to the database and for communication with the control plane (if management_network and use_private_ip options will not be provided) | 
| management_network | The management network will be used for internal communication with the control plane. It is optinal and requires `use_private_ip: true` in the cloud settings configuration.                                         |
| network_adapter    | The network adapter type                                                                                                                                                                                              |
| resource_pool      | The resource pool name                                                                                                                                                                                                |
| vc_url             | The ESXi URL address                                                                                                                                                                                                  |
| vc_path            | The name of the datastore                                                                                                                                                                                             |
 

To set up the username and password we need to create a Kubernetes secret.
For example, if the *vmware_vendor_name* is *vmware* then we need to create a secret *VMWARE_ESX_PASSWORD* for password and 
*VMWARE_ESX_USERNAME* for the username.
Example secret:
```yaml
» kubectl get secret vmware -o yaml
apiVersion: v1
data:
  VMWARE_ESX_PASSWORD: <base64_esx_password>
  VMWARE_ESX_USERNAME: <base64_esx_username>
kind: Secret
metadata:
  name: vmware
type: Opaque
```

The secret has to be included in the ccx-values under the cloudSecrets.

```yaml
  cloudSecrets:
    - vmware
```

#### S3 backup storage
For the VMWare S3 backup, we need to create a Kubernetes secret with S3 storage informations and credentials.
`VMWARE_S3_INSECURE_SSL` can be set to true if you don't have a valid TLS cert for your s3 endpoint.

```yaml
» kubectl get secret vmware-s3 -o yaml                                                                                                                                                                                                                                                              130 ↵
apiVersion: v1
data:
  VMWARE_S3_ACCESSKEY: <base64_access_key>
  VMWARE_S3_BUCKETNAME: <base64_bucket_name>
  VMWARE_S3_ENDPOINT: <base64_endpoint>
  VMWARE_S3_SECRETKEY: <base64_secret_key>
  VMWARE_S3_INSECURE_SSL: <base64_true_or_false>
kind: Secret
metadata:
  name: vmware-s3
type: Opaque
```

The secret has to be included in the ccx-values under the cloudSecrets.

```yaml
  cloudSecrets:
    - vmware-s3
```

#### Cloud configuration
To configure the cloud details like volumes, instance types, the cloud name we will define the new section in
`ccx-values-config.yaml`

For example
```yaml
- code: vmware 
  type: vmware
  name: VMware 
  logo: https://cultofthepartyparrot.com/parrots/hd/parrot.gif
  has_vpcs: false
  instance_types:
  - code: regular
    cpu: 4
    ram: 4
    name: regular
    type: regular
  - code: big
    cpu: 8
    ram: 4
    name: big
    type: big
  volume_types:
  - code: scsi
    has_iops: false
    info: SCSI default
    name: scsi
    size:
      default: 80
      max: 10000
      min: 80
  network_types:
  - code: public
    in_vpc: false
    info: All instances will be deployed with public IPs. Access to the public IPs
      is controlled by a firewall.
    name: Public
  regions:
  - availability_zones:
    - code: default
      name: default
    city: Default
    code: Default
    continent_code: NA
    country_code: NA
    display_code: NA
    name: default
    preferred_display_code: default
```

Above is an example of a VMware config.

The one difference between the OpenStack and AWS ones is that here, we specify the CPU (number of CPUs) and memory (in GiB), for instance, types. They are purely artificial. VMware does not have a concept of instance types.

### VMWare custom values
VMWare deployments has the ability to overwrite some of the configuration options in the CreateClusterRequestV2 request.
We can overwrite options that we defined in deployer vmware_vendors
```yaml
vmware_vendors:
        vmware_vendor_name:
          dc: ha-datacenter
          iso: '[datastore1] iso/ccx.iso'
          network: public.4
          network_adapter: vmxnet3
          resource_pool: esxi./Resources
          vc_url: https://ip_address/sdk
          vm_path: datastore1
```

The CreateClusterRequestV2 body without the custom_values looks like the one below.
```json
{
  "general": {
    "cluster_name": "test_cluster",
    "cluster_size": 1,
    "cluster_type": "postgres_streaming",
    "db_vendor": "postgres"
  },
  "cloud": {
    "cloud_provider": "vmware",
    "cloud_region": "Default"
  },
  "instance": {
    "instance_size": "medium",
    "volume_type": "scsi",
    "volume_size": 80
  },
  "network": {
    "network_type": "public",
    "ha_enabled": false
  },
  "notifications": {
    "enabled": false,
    "emails": []
  }
}

```

This will create a 1 node postgres cluster with default VMWare values defined in the deployer configuration.

If we want to overwrite some of the vmware properties we can use `custom_values` property fields which is a map
of key/value pairs. The key and the value have to be a string.

For example, if we want to overwrite `network` the request will look like this.
```json
{
  "general": {
    "cluster_name": "test_cluster",
    "cluster_size": 1,
    "cluster_type": "postgres_streaming",
    "db_vendor": "postgres"
  },
  "cloud": {
    "cloud_provider": "vmware",
    "cloud_region": "Default"
  },
  "instance": {
    "instance_size": "medium",
    "volume_type": "scsi",
    "volume_size": 80
  },
  "network": {
    "network_type": "public",
    "ha_enabled": false
  },
  "notifications": {
    "enabled": false,
    "emails": []
  },
  "custom_values": {
    "network": "public.5"
  }
}
```

This will create a 1 node postgres cluster which will be attached to network public.5.

Apart from vmware deployer configuration options we can provide two additional ones `cpu` and `memory`. 

This options will provide custom values for compute resources.

Below is the full list of the fields that we can put inside `custom_values`
- dc
- iso
- resource_pool
- datastore
- network
- network_adapter
- network_proto

Below is the example of a request that will overwrite datacenter, cpu and network

```json
{
  "general": {
    "cluster_name": "test_cluster",
    "cluster_size": 1,
    "cluster_type": "postgres_streaming",
    "db_vendor": "postgres"
  },
  "cloud": {
    "cloud_provider": "vmware",
    "cloud_region": "Default"
  },
  "instance": {
    "instance_size": "medium",
    "volume_type": "scsi",
    "volume_size": 80
  },
  "network": {
    "network_type": "public",
    "ha_enabled": false
  },
  "notifications": {
    "enabled": false,
    "emails": []
  },
  "custom_values": {
    "network": "public.5",
    "dc": "ha-datacenter2",
    "cpu": "24"
  }
}
```

The request above will create a 1 node postgres cluster in network `public.5` inside datacenter `ha-datacenter2` with 24 CPUs.

## Google Cloud Platform
### Overview 
CCX supports Google Cloud Platform (GCP) as a cloud provider.

It requires the following things enabled on the GCP side:
- A GCP project must be created.
- A service account must be created with the necessary permissions. The list of permissions is as follows:
```
compute.disks.create
compute.disks.delete
compute.disks.get
compute.disks.list
compute.disks.use
compute.instances.create
compute.instances.delete
compute.instances.get
compute.instances.list
compute.networks.create
compute.networks.delete
compute.networks.get
compute.networks.list
compute.networks.use
compute.zones.get
compute.zones.list
compute.operations.get
compute.operations.list
```
- A VPC network may be created for CCX, where CCX will create necessary rules. If no VPC network is created, CCX will use `default`.
- Cloud Storage Service account HMAC key must be created in `Cloud Storage > Settings > Interoperability`.

 > This **Access key** and **Secret** pair will be used to create a Kubernetes secret that will be used for backups.

- A valid image id must be provided. This is typically a public image id of ubuntu 22.04.

### Configuration
#### Deployer configuration

In the deployer configuration (ccx-values-deployer.yaml) we configure how CCX will access the GCP APIs.

```yaml
gcp_vendor:
  project: gcp-project # replace with created project name
  image_id: projects/ubuntu-os-cloud/global/images/ubuntu-2204-jammy-v20240614 # replace with the image id
  network: default # replace with the network name if created
  s3:
    enabled: true # needed for backups
  regions:
    europe-west1:
      azs:
      - europe-west1-b
      - europe-west1-c
      - europe-west1-d
  database_vendors:
    - name: mariadb
      security_groups:
        - cidr: x.x.x.x/x
          from_port: 22
          ip_protocol: tcp
          to_port: 22
        - cidr: x.x.x.x/x
          from_port: 1000
          ip_protocol: tcp
          self: true
          to_port: 65535
    - name: microsoft
      security_groups:
        - cidr: x.x.x.x/x
          from_port: 22
          ip_protocol: tcp
          to_port: 22
        - cidr: x.x.x.x/x
          from_port: 1000
          ip_protocol: tcp
          self: true
          to_port: 65535
    - name: percona
      security_groups:
        - cidr: x.x.x.x/x
          from_port: 22
          ip_protocol: tcp
          to_port: 22
        - cidr: x.x.x.x/x
          from_port: 1000
          ip_protocol: tcp
          self: true
          to_port: 65535
    - name: postgres
      security_groups:
        - cidr: x.x.x.x/x
          from_port: 22
          ip_protocol: tcp
          to_port: 22
        - cidr: x.x.x.x/x
          from_port: 1000
          ip_protocol: tcp
          self: true
          to_port: 65535
    - name: redis
      security_groups:
        - cidr: x.x.x.x/x
          from_port: 22
          ip_protocol: tcp
          to_port: 22
        - cidr: x.x.x.x/x
          from_port: 1000
          ip_protocol: tcp
          self: true
          to_port: 65535
```

> `europe-west1` is the region name and `europe-west1-b`, `europe-west1-c`, `europe-west1-d` are the availability zones.
>
> Replace `x.x.x.x/x` with the CIDR of the IP address that the CCX cluster will use to access the database nodes.

### Cloud configuration
To configure the cloud details like volumes, instance types, the cloud name we will define the new section in
`ccx-values-config.yaml`.

```yaml
code: gcp
name: Google Cloud
logo: https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg
regions:
  - code: europe-west1
    display_code: EU West 1
    name: Belgium
    country_code: BE
    continent_code: EU
    city: St. Ghislain
    availability_zones:
      - name: europe-west1-b
        code: europe-west1-b
      - name: europe-west1-c
        code: europe-west1-c
      - name: europe-west1-d
        code: europe-west1-d
network_types:
  - name: Public
    code: public
    info: All instances will be deployed with public IPs. Access to the public IPs is controlled by a firewall.
    in_vpc: false
instance_types:
  - name: Standard-2
    code: e2-standard-2
    type: e2-standard-2
    cpu: 2
    ram: 8
    disk_size: 0
  - name: Standard-4
    code: e2-standard-4
    type: e2-standard-4
    cpu: 4
    ram: 16
    disk_size: 0
volume_types:
  - name: Performance SSD
    code: pd-ssd
    has_iops: false
    info: Persistent Disk SSD
    size:
      min: 10
      max: 65536
      default: 10
  - name: Standard SSD
    code: pd-standard
    has_iops: false
    info: Persistent Disk Standard
    size:
      min: 10
      max: 65536
      default: 10
```

### Secrets 
For the GCP S3 backup, we need to create a Kubernetes secret that will be used for backups.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gcp-s3
type: Opaque
data:
  GCP_S3_ACCESSKEY: BASE64_ENCODED_CLOUD_STORAGE_ACCESS_KEY
  GCP_S3_SECRETKEY: BASE64_ENCODED_CLOUD_STORAGE_HMAC_SECRET_KEY
  ```

> Replace `BASE64_ENCODED_CLOUD_STORAGE_ACCESS_KEY` and `BASE64_ENCODED_CLOUD_STORAGE_HMAC_SECRET_KEY` with the base64 encoded values of the access key and secret key from the Cloud Storage Service account HMAC key.
>
> For example, using the output of: `echo -n "MY_VALUE" | base64`
