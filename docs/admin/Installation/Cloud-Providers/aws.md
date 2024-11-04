# AWS
## Overview
By supporting AWS cloud providers, CCX offers a comprehensive platform for deploying and managing database instances as part of a DBaaS (Database as a Service) solution. The integration with AWS allows users to leverage AWS's infrastructure management, enabling automated provisioning, scaling, and maintenance of databases with a high level of agility and flexibility.

CCX interacts with AWS APIs to automate the creation, configuration, and management of database instances, minimizing manual intervention and reducing potential for configuration errors.

## Requirements
To fully integrate CCX with AWS for DBaaS, the following resources and Permissions are necessary.

##  Prerequisites

### Required Permission for Resources
For proper functioning with AWS, CCX needs access to the resources with permissions:

```
"ec2:RunInstances",
"ec2:TerminateInstances",
"ec2:DescribeInstances",
"ec2:DescribeInstanceStatus",
"ec2:StartInstances",
"ec2:StopInstances",
"ec2:RebootInstances",
"ec2:CreateVolume",
"ec2:DeleteVolume",
"ec2:AttachVolume",
"ec2:DetachVolume",
"ec2:DescribeVolumes",
"ec2:ModifyVolume",
"ec2:DescribeVolumeStatus",
"ec2:DescribeSnapshots",
"ec2:CreateSnapshot",
"ec2:DeleteSnapshot",
"ec2:CreateTags",
"ec2:CreateSecurityGroup",
"ec2:DeleteSecurityGroup",
"ec2:DescribeSecurityGroups",
"ec2:AuthorizeSecurityGroupIngress",
"ec2:RevokeSecurityGroupIngress",
"ec2:AuthorizeSecurityGroupEgress",
"ec2:RevokeSecurityGroupEgress",
"ec2:AllocateAddress",
"ec2:ReleaseAddress",
"ec2:AssociateAddress",
"ec2:DisassociateAddress",
"ec2:DescribeAddresses",
"ec2:CreateVpc",
"ec2:DeleteVpc",
"ec2:DescribeVpcs",
"ec2:CreateSubnet",
"ec2:DeleteSubnet",
"ec2:DescribeSubnets",
"ec2:CreateRouteTable",
"ec2:DeleteRouteTable",
"ec2:AssociateRouteTable",
"ec2:DisassociateRouteTable",
"ec2:CreateRoute",
"ec2:DeleteRoute",
"ec2:DescribeRouteTables",
"ec2:CreateInternetGateway",
"ec2:AttachInternetGateway",
"ec2:DetachInternetGateway",
"ec2:DeleteInternetGateway",
"ec2:DescribeInternetGateways",
"ec2:CreateKeyPair",
"ec2:DeleteKeyPair",
"ec2:CreateVpcPeeringConnection",
"ec2:ModifySubnetAttribute",
"route53:ChangeResourceRecordSets",
"route53:ListResourceRecordSets",
"route53:GetHostedZone",
"route53:ListHostedZones",
"s3:CreateBucket",
"ec2:DeleteVpcPeeringConnection",
"s3:ListAllMyBuckets",
"s3:DeleteBucket",
"s3:ListBucket",
"s3:GetBucketLocation",
"s3:PutBucketPolicy",
"s3:DeleteBucketPolicy",
"s3:PutBucketAcl",
"s3:PutObject",
"s3:GetObject",
"s3:DeleteObject"
```

## Configuration
#### AWS Provider Configuration
To add an AWS provider, you need to add a new section under `ccx.config` in the ccx-values-config.yaml file.
Below cloud config is by default in helm-ccx values. You don't need to add this configuration unless you want to change the region.
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
Below deployer config is by default in helm-ccx values. You don't need to add this configuration unless you want to change the region.
```
        aws_vendor:
          regions:
            eu-north-1: # specify aws region name
              image_id: ami-05baaef454dd96656 # image id of ubuntu 22.04
          database_vendors:
            - name: mariadb
              security_groups:
                - cidr: 0.0.0.0/32
                  from_port: 22
                  ip_protocol: tcp
                  to_port: 22
                - cidr: 0.0.0.0/32
                  from_port: 1000
                  ip_protocol: tcp
                  to_port: 65535
            - name: microsoft
              security_groups:
                - cidr: 0.0.0.0/32
                  from_port: 22
                  ip_protocol: tcp
                  to_port: 22
                - cidr: 0.0.0.0/32
                  from_port: 1000
                  ip_protocol: tcp
                  to_port: 65535
            - name: percona
              security_groups:
                - cidr: 0.0.0.0/32
                  from_port: 22
                  ip_protocol: tcp
                  to_port: 22
                - cidr: 0.0.0.0/32
                  from_port: 1000
                  ip_protocol: tcp
                  to_port: 65535
            - name: postgres
              security_groups:
                - cidr: 0.0.0.0/32
                  from_port: 22
                  ip_protocol: tcp
                  to_port: 22
                - cidr: 0.0.0.0/32
                  from_port: 1000
                  ip_protocol: tcp
                  to_port: 65535
            - name: redis
              security_groups:
                - cidr: 0.0.0.0/32
                  from_port: 22
                  ip_protocol: tcp
                  to_port: 22
                - cidr: 0.0.0.0/32
                  from_port: 1000
                  ip_protocol: tcp
                  to_port: 65535
```


Database Vendor Settings: 
The database_vendors section configures default security rules for database instances, allowing CCX to manage connections from defined CIDR blocks.
The cidr: x.x.x.x/32 in database_vendors represents the IP address of the CCX deployment within the Kubernetes cluster, or the NAT gateway IP. This is the source IP that connects to and manages the database nodes across different networks. This will create security rules for every node in the datastore. The x.x.x.x must be updated to reflect the actual IP address of the current deployment for proper connectivity.

#### AWS Credentials in Kubernetes Secrets
AWS credentials need to be stored as Kubernetes secrets. Create secrets for the AWS provider, including access key and secret access key.
you can create a aws secret from your existing aws credentials file ~/.aws/credentials.

```
kubectl create secret generic aws --from-literal=AWS_ACCESS_KEY_ID=$(awk '/aws_access_key_id/{print $NF}' ~/.aws/credentials) --from-literal=AWS_SECRET_ACCESS_KEY=$(awk '/aws_secret_access_key/{print $NF}' ~/.aws/credentials)
```
Or you can create secrets manually replacing your access_key and secret_key.

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
Backups are automatically stored in s3 buckets 


These setup allows CCX to fully integrate with AWS, offering automated provisioning, management, and backup of database instances using AWS's powerful cloud services.
