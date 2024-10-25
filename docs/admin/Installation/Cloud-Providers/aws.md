# AWS
## Overview
By supporting AWS cloud providers, CCX offers a comprehensive platform for deploying and managing database instances as part of a DBaaS (Database as a Service) solution. The integration with AWS allows users to leverage AWS's infrastructure management, enabling automated provisioning, scaling, and maintenance of databases with a high level of agility and flexibility.

CCX interacts with AWS APIs to automate the creation, configuration, and management of database instances, minimizing manual intervention and reducing potential for configuration errors.

## Requirements
To fully integrate CCX with AWS for DBaaS, the following resources and API access are necessary.

##  Prerequisites

### Required Resources
For proper functioning with AWS, CCX needs access to the following resources:

#### Compute Resources (EC2 Instances):
CCX requires permission to create and manage EC2 instances within AWS. These instances will host database instances and are provisioned dynamically based on workload demands.

#### Public and Private IP Addresses:
CCX should have the ability to allocate public and private IP addresses as needed for database instances. Public IPs allow external access, while private IPs ensure secure internal communication.

#### Security Groups:
CCX needs to create and manage security groups to define access control to the EC2 instances. This includes specifying allowed ports, protocols, and IP ranges for secure communication.

#### Volume Management (EBS):
CCX requires the ability to create and attach Elastic Block Storage (EBS) volumes to EC2 instances for database storage. Configurable volume sizes allow users to tailor storage capacity to their specific database needs.

## Configuration
#### AWS Provider Configuration
To add an AWS provider, you need to add a new section under `ccx.config` in the ccx-values-config.yaml file.

```
    clouds:
      - code: aws
        name: Amazon Web Services
        regions:
          - code: eu-north-1 # list of supported regions
            display_code: EU North 1
            name: EU (Stockholm)
            country_code: SE
            continent_code: EU
            city: Stockholm
            availability_zones: # list of supported AZ for that region
              - code: eu-north-1a
                name: eu-north-1a
              - code: eu-north-1b
                name: eu-north-1b
              - code: eu-north-1c
                name: eu-north-1c
        network_types:
          - name: Private
            code: private
            info: All instances will be deployed in a VPC with private IP addresses.
            in_vpc: true
          - name: Public
            code: public
            info: All instances will be deployed with public IPs. Access to the public IPs is controlled by a firewall.
            in_vpc: false
        instance_types:
          - name: Tiny
            code: tiny
            type: t3.medium  #instance type as defined by the cloud vendor
            cpu: 2
            ram: 4
            disk_size: 0
            verified_level: 0
          - name: Small
            code: small
            type: m5.large
            cpu: 2
            ram: 8
            disk_size: 0
            verified_level: 0
        volume_types:
          - name: GP2
            code: gp2  #list of volume type as defined by the cloud vendor
            has_iops: false
            info: General Purpose SSD volume 2.
            verified_level: 0
            size:
              min: 80
              max: 16000
              default: 80
          - name: IO1
            code: io1
            has_iops: true
            info: IO Optimized volume 1.
            verified_level: 1
            size:
              min: 80
              max: 16000
              default: 80
            iops:
              min: 100
              max: 64000
              ratio: 50
              default: 1000
```
### Deployer Configuration for AWS

you need to add a new section under `ccx.services.deployer.config` in the ccx-values-deployer.yaml file.
```
        aws_vendor:
          regions:
            eu-north-1: # specify aws region name
              image_id: ami-05baaef454dd96656 # image id of ubuntu 22.04
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


Database Vendor Settings: 
The database_vendors section configures default security rules for database instances, allowing CCX to manage connections from defined CIDR blocks.
The cidr: x.x.x.x/32 in database_vendors represents the IP address of the CCX deployment within the Kubernetes cluster, or the NAT gateway IP. This is the source IP that connects to and manages the database nodes across different networks. This will create security rules for every node in the datastore. The x.x.x.x must be updated to reflect the actual IP address of the current deployment for proper connectivity.

#### AWS Credentials in Kubernetes Secrets
AWS credentials need to be stored as Kubernetes secrets. Create secrets for the AWS provider, including access key and secret access key:

```
apiVersion: v1
kind: Secret
metadata:
  name: aws
type: Opaque
data:
  AWS_ACCESS_KEY_ID: base64_encoded_access_key
  AWS_SECRET_ACCESS_KEY: base64_encoded_secret_key
```
These secrets must be included in the ccx-values file under the `ccx.cloudSecrets` section

```
  cloudSecrets:
    - aws
```

#### S3 Backup Storage for AWS
To enable S3 backups in AWS, configure S3 storage credentials:

```
apiVersion: v1
data:
  AWS_S3_ACCESSKEY: <base64_access_key>
  AWS_S3_BUCKETNAME: <base64_bucket_name>
  AWS_S3_ENDPOINT: <base64_endpoint> #s3 endpoint without https
  AWS_S3_SECRETKEY: <base64_secret_key>
  AWS_S3_INSECURE_SSL: <base64_true_or_false>
kind: Secret
metadata:
  name: aws-s3
type: Opaque
```
Include the AWS S3 backup secret in the ccx-values file under the `ccx.cloudSecrets` section

```
  cloudSecrets:
    - aws-s3
```
This setup allows CCX to fully integrate with AWS, offering automated provisioning, management, and backup of database instances using AWS's powerful cloud services.
