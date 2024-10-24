
# Google Cloud Platform
## Overview 
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

## Configuration
### Deployer configuration

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

## Secrets 
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
