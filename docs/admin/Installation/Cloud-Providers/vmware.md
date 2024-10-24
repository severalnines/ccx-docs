
# VMware
## Overview
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

## Configuration
### Deployer configuration
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

### Cloud configuration
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

## VMWare custom values
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