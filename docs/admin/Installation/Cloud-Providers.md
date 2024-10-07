# Cloud providers

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
          network: public.4
          network_adapter: vmxnet3
          resource_pool: esxi./Resources
          vc_url: https://ip_address/sdk
          vm_path: datastore1
```

The *vmware_vendor_name* can be any string.

| Key             | Description                                                                                 |
|-----------------|---------------------------------------------------------------------------------------------|
| dc              | The name of the data center                                                                 | 
| iso             | The path to the Ubuntu ISO image with the information in which datastore the ISO is stored. |
| network         | The network to which the new VMs will be attached                                           |
| network_adapter | The network adapter type                                                                    |
| resource_pool   | The resource pool name                                                                      |
| vc_url          | The ESXi URL address                                                                        |
| vc_path         | The name of the datastore                                                                   |

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

```yaml
» kubectl get secret vmware-s3 -o yaml                                                                                                                                                                                                                                                              130 ↵
apiVersion: v1
data:
  VMWARE_S3_ACCESSKEY: <base64_access_key>
  VMWARE_S3_BUCKETNAME: <base64_bucket_name>
  VMWARE_S3_ENDPOINT: <base64_endpoint>
  VMWARE_S3_SECRETKEY: <base64_secret_key>
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
