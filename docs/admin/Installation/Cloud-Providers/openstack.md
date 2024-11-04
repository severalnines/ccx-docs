
# OpenStack
### Overview
OpenStack cloud providers are integrated with CCX to offer a scalable, flexible, and highly configurable platform for deploying and managing databases as part of DBaaS offerings. CCX leverages OpenStack’s robust infrastructure capabilities, allowing users to automate the provisioning, scaling, and maintenance of databases, all within an OpenStack environment.

CCX can interface with OpenStack's APIs to simplify database deployment, reduce manual configuration errors, and manage resources more effectively. This enables users to set up and manage cloud-based databases in a dynamic and flexible manner.

# Requirements
To ensure full DBaaS functionality and seamless integration with OpenStack, CCX requires specific resources and access via the OpenStack APIs. Below are the key requirements for deploying and managing database services using CCX in an OpenStack environment.


### Openstack Requirements

#### Flavors/images for datastores
CCX requires flavors built with Ubuntu 22.04 for the datastores.

For a test/evaluation the following flavors are recommended:
> 2vCPU, 4GB RAM, 80GB Disk
  4vCPU, 8GB RAM, 100GB Disk

#### Floating IPs
To Create a pool of floating IPs. Each VM requires a floating IP. CCX must be able to allocate and manage public IP addresses for database instances, ensuring network connectivity.

#### Storage Volumes
Storage can either be ephemeral or block storage to provide disk storage for database instances. Openstack services such as cinder manages storage volume.
CCX uses storage volumes for acquiring and attaching storage volumes to VMs.

####  Security group Configuration
CCX requires the ability to manage security group to create firewall rules to control traffic and secure access to the database VMs.
Create a security group named ccx-common manually and this name needs to be updated in overriden yaml file.
`ccx.services.deployer.config.openstack_vendors.MYCLOUD.regions.REGIONNAME.secgrp_name`
The Security group firewall rule should include a rule to allow CCX ip(CIDR address) to connect to it.

# Configuration
####  CCX OpenStack Configuration
To configure OpenStack as a cloud provider in CCX, we need to define the provider in the ccx-values-config.yaml file under the ccx.config.clouds section. Here’s an example configuration:

```
- code: openstack
  name: OpenStack Cloud
  logo: https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/OpenStack_Logo.svg/200px-OpenStack_Logo.svg.png
  instance_types:
    - code: b.2c4gb # instance type code (flavor).
      type: b.2c4gb # instance type as defined by the cloud vendor.
      cpu: 2 # number of CPUs
      ram: 4 # amount of RAM in GB
      disk_size: 50 # amount of disk space in GB
      name: Small-S # instance type name as shown to the user
    - code: b.4c16gb
      type: b.4c16gb
      cpu: 4
      ram: 16
      disk_size: 100 # optional, only set for flavors with ephemeral storage.
      name: Medium-S
  volume_types:
    - code: cinder # volume type code.
      has_iops: true # if set to true, the volume type supports IOPS
      info: Standard Block Storage # description of the volume type as shown to the user
      name: cinder_volume # volume type name as shown to the user
      size: 
        default: 50 # Default size in GiB
        max: 2000 # Max size in GiB
        min: 20 # Min size in GiB
  network_types:
    - code: public # network type code. eg. `public` or `private`
      in_vpc: false # if set to true, the instances will be deployed in a VPC
      info: Public IPs with firewall-controlled access #description of the network type as shown to the user
      name: Public Network # network type name as shown to the user
    - code: private
      in_vpc: true
      info: Private IPs for internal communication
      name: Private Network
  regions:
    - code: region1 # region code. must be a valid region code as defined by the cloud vendor.
      city: London # region city. used for displaying the flag.
      country_code: UK # region country code. used for displaying the flag.
      continent_code: EU # region continent code. used for displaying the flag.
      display_code: London-Region # region display code as shown to the user.
      name: London-Region # region name as shown to the user.
      availability_zones: # list of supported availability zones
        - code: zone1 # availability zone code. must be a valid availability zone code as defined by the cloud vendor.
          name: London-Zone1 # availability zone name as shown to the user.
```

## Deployer Configuration (ccx-values-deployer.yaml)
To deploy CCX using OpenStack, the OpenStack-specific configurations must be added to the ccx.services.deployer.config section. Here's an example for the openstack_vendors section:

```
openstack_vendors:
 MYCLOUD:
#    REQUIRED auth_url refers to an URL of the Identity service endpoint.
   auth_url: https://mycloud:5000/v3/
#    REQUIRED project_id refers to a unique identifier assigned to an Openstack project. All the resources (VMs, volumes, sec. groups, floating IPs, etc.) created by ccx will be created in this project. REQUIRED
   project_id: 00000000000000000000000000000000
#    The floating_network_id refers to a floating IP pool, which is a range of public IP addresses available for assignment to virtual machines.
   floating_network_id: 00000000-0000-0000-0000-000000000000
#    REQUIRED network_id refers to the unique identifier assigned to a default network within the OpenStack environment. REQUIRED
   network_id: 00000000-0000-0000-0000-000000000000 # severalnines-dbaas-network1
#    Option network_api_version and floating_ip_api_version should be only set if the Openstack uses old network APIs, otherwise we should not setthem at all and use the defaults.
#    The network_api_version and floating_ip_api_version options are optional and should be only set if we have old APIs for network deployed in the OpenStack deployment.
#    OPTIONAL network_api_version define which API use for network. We can choose between NetworkNeutron (default) or NetworkNova (old deprecated, but uses in some old Openstack deployments).
   network_api_version: NetworkNeutron
#    OPTIONAL floating_ip_api_version define which API use for floating IPs, you can choose FloatingIPV2 or FloatingIPV3 (default), if no set it will be choose based on network_api_version. FloatingIPV2 is the old one based on the Nova API. OPTIONAL
   floating_ip_api_version: FloatingIPV3
#    We can define mulitple regions and overwrite the above options in the specific region.
#    REQUIRED at least one region
   regions:
     se-sto:
       image_id: 00000000-0000-0000-0000-000000000000 # REQUIRED
#        # The secgrp_name refers to the security group name which will be used by ccx to access the datastore VMs. It should be created manually beforehand and allow all TCP traffic from all k8s nodes where ccx is running.
       secgrp_name: ccx-common # REQUIRED
#    OPTIONAL S3 configuration for backups.
   s3:
     endpoint: s3_endpoint
     access_key: access_key
     secret_key: secret_key
#    OPTIONAL root_volume section sets the size in GiB for the root volume.
   root_volume:
     enabled: true
     size: 30
#  The cidr: x.x.x.x/32 in database_vendors represents the IP address of the CCX deployment within the Kubernetes cluster, or the NAT gateway IP. This is the source IP that connects to and manages the database nodes across different networks     
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

####  OpenStack Credentials
The credentials required for OpenStack API access should be stored in Kubernetes secrets. The required values are 

>   MYCLOUD_USERNAME, 
    MYCLOUD_PASSWORD, 
    MYCLOUD_PROJECT_ID, 
    MYCLOUD_AUTH_URL, 
    MYCLOUD_USER_DOMAIN
    MYCLOUD_USER_DOMAIN_NAME

Here is an example of how to store OpenStack credentials in Kubernetes:

```
apiVersion: v1
kind: Secret
metadata:
  name: mycloud-openstack
type: Opaque
data:
  MYCLOUD_USERNAME: base64_encoded_username
  MYCLOUD_PASSWORD: base64_encoded_password
  MYCLOUD_PROJECT_ID: base64_encoded_project_name
  MYCLOUD_AUTH_URL: base64_encoded_auth_url
  MYCLOUD_USER_DOMAIN: base64_encoded_user_domain
  MYCLOUD_USER_DOMAIN_NAME: base64_encoded_user_domain # duplicates USER_DOMAIN
```
These credentials should be referenced in the ccx-values.yaml configuration under the ccx.cloudSecrets section:
```
cloudSecrets:
  - openstack
```

#### S3 Backup Storage
For OpenStack S3-compatible backup, create a Kubernetes secret with S3 credentials and configuration:

```
apiVersion: v1
kind: Secret
metadata:
  name: mycloud-s3
type: Opaque
data:
  MYCLOUD_S3_ENDPOINT: CHANGE_ME
  MYCLOUD_S3_ACCESSKEY: CHANGE_ME
  MYCLOUD_S3_SECRETKEY: CHANGE_ME
  MYCLOUD_S3_BUCKETNAME: CHANGE_ME
  MYCLOUD_S3_INSECURE_SSL: ZmFsc2U= # base64 encoded 'true' or 'false'
```
The secret must be included in the ccx-values.yaml under the ccx.cloudSecrets:

```
cloudSecrets:
  - openstack
  - openstack-s3
```

This configuration ensures that CCX integrates seamlessly with OpenStack, allowing users to leverage the full capabilities of the OpenStack cloud platform for database-as-a-service.
