
# Cloudstack
##  Overview
By supporting CloudStack cloud providers, CCX provides a robust platform to facilitate the deployment and management of database instances as part of DBaaS offerings. 
This integration leverages CloudStack's infrastructure management capabilities, enabling users to automate database provisioning, scaling, and maintenance, all while 
benefiting from the agility and flexibility that cloud environments offer.

CCX allows users to leverage CloudStack’s API to automate the creation, configuration, and deployment of databases, reducing manual effort and minimizing the risk of configuration errors.

## Requirements 
To enable full DBaaS functionality and seamless integration with CloudStack, CCX requires specific resources and access via the CloudStack API. Below are the detailed requirements for deploying and managing database services using CCX within a CloudStack environment.


## Prerequisites
### API Access:
CCX requires access to the CloudStack API to interact with the cloud infrastructure programmatically. This enables automated provisioning, management, and scaling of database instances.

### Required Resources

For the proper functioning of CCX with CloudStack, the following resources must be available:

#### Compute Resources (Virtual Machines):
CCX needs the ability to create and manage virtual machines (VMs) within CloudStack. These VMs serve as the foundation for hosting database instances and must be provisioned dynamically based on workload requirements.

#### Public IP Addresses:
CCX must be able to acquire and assign public IP addresses to the deployed VMs. This ensures proper network connectivity and allows external clients to access the database services hosted on these VMs.

#### Firewall Configuration:
CCX requires the ability to create and manage firewall rules for the VMs. This is essential for securing database instances by controlling traffic and defining which ports and protocols are allowed for communication.

#### Volume Management:
CCX must be able to acquire and attach storage volumes to the VMs for database storage. Only volumes with configurable size are supported, allowing users to define storage capacity according to their specific database needs.
The CCX requirements from Cloudstack:

## Guest template requirements

:::danger
A stock Ubuntu 24.04 cloud image **cannot** deploy a CCX datastore on CloudStack.
Every deploy fails at host init, and nothing in the CCX output explains why. The
guest template needs a patched cloud-init before it will work.
:::

Affects Ubuntu 24.04 LTS with cloud-init `26.1-0ubuntu1~24.04.1` on Apache
CloudStack 4.22.1. AWS and OpenStack are unaffected — their datasources reach
metadata at the link-local address without a DHCP-lease probe.

### Why a stock image fails

cloud-init's `DataSourceCloudStackLocal` runs at `init-local`, obtains a DHCP
lease, kills the `dhcpcd` daemon it started, and then re-queries that dead daemon
for the lease. The resulting `NoDHCPLeaseError` escapes `get_vr_address()` past
its own `get_default_gateway()` fallback, because only `FileNotFoundError` is
suppressed there. One recoverable warning is logged, so the boot ends
`degraded done` and `cloud-init status` exits `2` for the life of that boot.

CCX then refuses the node. Exit 2 reports that warnings occurred but not which
module logged them or what it skipped, so what actually got installed cannot be
established — and a half-provisioned datastore is worse than a failed deploy.
That refusal is deliberate.

This is upstream cloud-init issue **#6653**. The proposed fix (PR **#6965**) was
still an unmerged draft as of 2026-08-17, so moving to a newer image does not
resolve it.

### 1. Patch cloud-init in the guest image

In `/usr/lib/python3/dist-packages/cloudinit/sources/DataSourceCloudStack.py`,
function `get_vr_address()` (line 341 on cloud-init `26.1-0ubuntu1~24.04.1`):

```diff
-    with suppress(FileNotFoundError):
+    with suppress(FileNotFoundError, dhcp.NoDHCPLeaseError):
         latest_lease = distro.dhcp_client.get_newest_lease(
             distro.fallback_interface
         )
```

That is the entire change. It restores the datasource's intended discovery chain
(DNS → networkd lease → dhclient lease → dhcpcd lease → **default gateway**) and
assumes nothing about the guest subnet. The identical call is already guarded
this way in the domain-name lookup earlier in the same file, so this is a missing
exception type rather than a design change.

:::warning
Do **not** work around this by making `data-server` resolvable via `/etc/hosts`.
It works, but it hardcodes a per-network virtual-router address into a reusable
image, so a second guest network with a different CIDR silently regresses.
:::

### 2. Verify the image boots clean

```
sudo cloud-init clean --logs && sudo reboot
# once it is back:
cloud-init status --long
cloud-init status >/dev/null 2>&1; echo "exit=$?"
```

This must report `status: done`, must **not** say `degraded`, and must exit `0`.

On a working image the log shows the fallback being taken, which is the positive
signal to look for:

```
DNS Entry data-server not found
dhcpcd exited with code: 1 'dhcpcd is not running'
No DHCP found, using default gateway
Found default route, gateway is 10.1.1.1
init-local/search-CloudStackLocal: SUCCESS: found local data
```

### 3. Reset the image before capturing it

**Required.** If you build the template by patching a running VM and capturing its
volume, skipping this clones the machine-id, the SSH host keys, and **the
authorized-keys of whatever account you used to patch it** into every datastore
node CCX subsequently deploys.

Run this immediately before capturing the volume. It truncates the
authorized-keys of the account you are connected as, so it must be the last thing
you do:

```
sudo rm -f /usr/lib/python3/dist-packages/cloudinit/sources/DataSourceCloudStack.py.orig
sudo cloud-init clean --logs --seed --machine-id --configs all
sudo rm -f /etc/ssh/ssh_host_*
sudo rm -f /var/lib/dhcpcd/*.lease /var/lib/dhcp/*
sudo truncate -s 0 /home/ubuntu/.ssh/authorized_keys
sudo rm -f /root/.ssh/authorized_keys
sudo find /var/log -type f -exec truncate -s 0 {} \;
sync
sudo poweroff
```

`cloud-init clean --configs all` covers ssh-config, network/netplan, datasource
and fstab.

### 4. Record the patch in the image

The patched file is distro-managed, so write a provenance note into the image —
`/etc/ccx-template-notes` — so whoever finds the image later knows what it carries
and why:

```
CCX CloudStack guest template
Base: Ubuntu 24.04 cloud image, cloud-init 26.1-0ubuntu1~24.04.1
Carries a downstream patch for upstream cloud-init issue #6653 in
/usr/lib/python3/dist-packages/cloudinit/sources/DataSourceCloudStack.py:
  get_vr_address(): suppress(FileNotFoundError, dhcp.NoDHCPLeaseError)
Without it, init-local's dhcpcd re-query raises NoDHCPLeaseError, skips the
get_default_gateway() fallback, and every boot ends 'degraded done' with
cloud-init status exiting 2 -- which fails CCX host init on every deploy.
NOTE: upgrading the cloud-init package reverts this patch.
```

:::warning
`apt upgrade cloud-init` inside a guest reverts the patch. Until the upstream fix
ships, an upgraded node that reboots will boot degraded again and fail host init.
:::

### 5. Register the template with the right properties

Do not accept `create template` defaults — mirror the source template's
properties:

```
cmk list volumes virtualmachineid=<vm-id> type=ROOT      # get the ROOT volume id
cmk create template \
  name=ubuntu-24.04-ccx \
  displaytext="Ubuntu 24.04 LTS (cloud image, cloud-init #6653 patched)" \
  ostypeid=<same-as-source-template> \
  volumeid=<root-volume-id> \
  passwordenabled=false \
  sshkeyenabled=true \
  isdynamicallyscalable=true \
  ispublic=false
```

`sshkeyenabled=true` matters in particular: CCX injects a per-cluster keypair, and
getting this wrong presents as a host-init SSH failure rather than anything that
points at the template.

### 6. Point CCX at the template

The template is set in the **deployer** config, not in the `clouds:` list:

```yaml
ccx:
  services:
    deployer:
      config:
        cloudstack_vendors:
          mycloud:
            template_id: "<template-id>"
```

Changing it requires a `helm upgrade`. Confirm the value actually landed by
checking the rendered `ccx.yaml` in the `ccx-config-core` configmap before
re-deploying:

```
kubectl get configmap ccx-config-core -n ccx -o jsonpath='{.data.ccx\.yaml}' | grep template_id
```

### Pre-flight check

Before deploying a datastore, verify the **registered template** — not the VM you
patched. Deploy a single VM from the registered template, on the target network,
and re-run the step 2 checks.

Verifying a hand-patched VM proves nothing about the artifact CCX will actually
deploy from. This takes two minutes and replaces an otherwise completely opaque
failure.

## Configuration
### CCX Cloudstack configuration
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

### Deployer configuration file ccx-values-deployer
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
                  - cidr: x.x.x.x/32
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

The `no_expunge` set to false means that the VM, along with all its details, will be destroyed. 

- *Network and Zone Configuration:*
The `network_id` and zone will act as the default values for regions, ensuring consistent configuration across deployments.

- *Database Vendor Settings:*
The `database_vendors` section defines the default rules required for CMON to connect to the database nodes. The cidr: x.x.x.x/32 in database_vendors represents the IP address of the CCX deployment within the Kubernetes cluster, or the NAT gateway IP. This is the source IP that connects to and manages the database nodes across different networks. This will create security rules for every node in the datastore. The x.x.x.x must be updated to reflect the actual IP address of the current deployment for proper connectivity.

### Cloudstack credentials
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

### S3 backup storage
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

:::note
  For the key MYCLOUD_S3_ENDPOINT: base64_endpoint, if you are using an AWS S3 bucket, the endpoint should be provided without the https details.
:::

The secret has to be included in the ccx-values under the cloudSecrets.

```yaml
  cloudSecrets:
    - cloudstack-s3
```