---
title: Cloudstack (Beta)
---

# Cloudstack <span className="badge badge--warning">Beta</span>

:::tip

Prefer a guided install? Use the [Claude prompt](claude-prompt.md) to have Claude Code walk you through this page step by step.

:::

##  Overview
By supporting CloudStack cloud providers, CCX provides a robust platform to facilitate the deployment and management of database instances as part of DBaaS offerings. 
This integration leverages CloudStack's infrastructure management capabilities, enabling users to automate database provisioning, scaling, and maintenance, all while 
benefiting from the agility and flexibility that cloud environments offer.

CCX allows users to leverage CloudStack’s API to automate the creation, configuration, and deployment of databases, reducing manual effort and minimizing the risk of configuration errors.

## Before you start

What your CloudStack must provide before a CCX datastore can deploy on it, with
a check for each. Every row links to the section that explains it. The values
in `<angle brackets>` are the ones you will later put into the CCX configuration.

Verified against Apache CloudStack **4.22.1** on KVM. The API calls CCX uses
have been stable since 4.11, but older releases have not been tested and lack
the non-strict anti-affinity type.

| Your CloudStack must have | Check with `cmk` | Details |
|---|---|---|
| An **Advanced** zone. Basic zones are not supported: CCX addresses nodes through static NAT and per-IP firewall rules, which only isolated networks offer. | `cmk list zones` shows `networktype: Advanced` and `securitygroupsenabled: false` | [Networking model](#networking-model) |
| One **isolated guest network** in that zone with the `SourceNat`, `StaticNat`, `Firewall`, `Dhcp` and `UserData` services. Its id becomes `network_id`. | `cmk list networks id=<network_id>` lists those under `service` | [Networking model](#networking-model) |
| **Egress from the guest network** to the internet. Nodes fetch packages and push backups to S3. If the network offering has `egressdefaultpolicy: false`, add an egress rule or nothing leaves the guest network. | `cmk list networkofferings id=<offering-id>`; if `false`, `cmk create egressfirewallrule networkid=<network_id> protocol=all cidrlist=<guest-cidr>` and confirm with `cmk list egressfirewallrules networkid=<network_id>` | [Guest egress](#guest-egress) |
| A **public IP range** with headroom: one address per node plus the virtual router, console proxy and secondary storage VM. | `cmk list publicipaddresses zoneid=<zone> state=Free listall=true` counts the free addresses | [Public IP capacity](#public-ip-capacity) |
| A **route from the CCX control plane** to that public range, and a known egress address for the control plane. The control plane reaches nodes only through static NAT, and its egress CIDR goes into every vendor's `security_groups`. | From a Kubernetes node: `ip route get <an address in the public range>`; for the egress address ask your network team or check what a test VM sees connecting in | [Which rules you need](#which-rules-you-need-and-why) |
| An **account with API keys** that owns the guest network. CCX deploys VMs, acquires IPs, sets static NAT, creates firewall rules, volumes, tags, SSH keypairs and affinity groups as that account. | `cmk list accounts name=<account>`; generate keys under the account's user | [Credentials](#cloudstack-credentials) |
| One **service offering per instance type** you want to sell, with an effective root disk of at least 20 GB. Its `cpunumber` and `memory` must match the display values in `instance_types`; CCX does not check. If it sets `rootdisksize`, that wins over the size CCX requests. | `cmk list serviceofferings filter=name,id,cpunumber,memory,rootdisksize` | [Root disk](#root-disk) |
| A **custom-size disk offering** for data volumes. Fixed-size offerings are not supported. Its id becomes `volume_types[].code`. | `cmk list diskofferings` shows `iscustomized: true` | [Configuration](#ccx-cloudstack-configuration) |
| A **guest template** built from Ubuntu 24.04 with the cloud-init patch, registered with `sshkeyenabled: true` and `passwordenabled: false`. A stock cloud image fails every deploy. | `cmk list templates templatefilter=executable id=<template_id>` shows `isready: true`, `sshkeyenabled: true` | [Guest template requirements](#guest-template-requirements) |
| The **`non-strict host anti-affinity`** group type, if you want the nodes of a datastore spread across hypervisors. Without it CCX deploys with a warning and no spreading. | `cmk list affinitygrouptypes` | [Node placement](#node-placement-and-anti-affinity) |
| **More than one hypervisor host**, if you rely on that spreading for HA. On one host every node lands on it and nothing warns you. | `cmk list hosts type=Routing` | [Node placement](#node-placement-and-anti-affinity) |
| A **DNS domain** on the zone, so nodes get stable names instead of raw IPs. | `cmk list zones` shows `domain` | [DNS](#dns) |
| **S3-compatible object storage** for backups, reachable from the guest network and from the control plane, with credentials for the Kubernetes secret. | From a test VM in the guest network: `curl -sI https://<s3-endpoint>` | [S3 backup storage](#s3-backup-storage) |

The lab this page was written against runs the API as Root Admin. A plain
`User` role has not been tested; if you run CCX under one, verify the first
deploy end to end before handing it to customers.

:::tip
Deploy one throwaway VM on the guest network from the CloudStack template you
will give CCX as `template_id` (the patched Ubuntu image from
[Guest template requirements](#guest-template-requirements)), acquire a public
IP, enable static NAT to it, and confirm you can SSH in from the control plane
and run `apt-get update` from inside. That single exercise walks every row
above except the offerings.
:::

### Root disk

We recommend a root disk of at least **20 GB** for every datastore node. Database data lives on the separate data volume, but the root disk holds the OS, packages, logs and tooling.

CCX requests a 20 GB root disk when it deploys a node, but the service offering decides the size:

- If the service offering sets `rootdisksize`, **the offering's value wins**. On Apache CloudStack 4.22.1, an offering with `rootdisksize=20` gave a 20 GB root disk for a 30 GB request.
- If the offering leaves `rootdisksize` unset, the node gets the size CCX requests.
- The resulting root disk must be at least as large as the template's root disk.

Before adding a service offering to `instance_types`, check its root disk size:

```
cmk list serviceofferings filter=name,id,cpunumber,memory,rootdisksize
```

Use offerings whose effective root disk (their `rootdisksize`, or 20 GB when empty) is 20 GB or more.

## Networking model

CloudStack is not a special case in CCX — it is the same shape as OpenStack with
different names:

| OpenStack | CloudStack | CCX field |
|---|---|---|
| Tenant network | Isolated guest network | `node.IPAddr` (private) |
| Floating IP | Static NAT public IP | `node.PublicIP` |
| Security group (+ shared `ccx-common`) | Per-public-IP firewall rules | `database_vendors[].security_groups` |
| `USE_PUBLIC_IPS=true` | identical | cmon `hostname` = public, `hostname_internal` = private |

### Every node has two addresses

Both matter, and they are not interchangeable.

| Address | Where it lives | What uses it | If it is wrong |
|---|---|---|---|
| **Public** (static NAT) | On the virtual router — **never** on the guest interface | End users connecting to the database; the CCX control plane and cmon reaching the node to manage and monitor it | The control plane cannot reach the node: deploys fail at host init and metric scraping breaks |
| **Private** (guest network) | The node's `ens3` | Node-to-node traffic, which is what replication uses | Replication between nodes fails |

The single most useful fact for a CloudStack admin: **static NAT lives on the
virtual router, so the public address is never configured on the guest
interface.** A node's `ens3` only ever holds the private address.

This is also why a node needs both rather than one. The control plane sits
outside the zone and can only reach nodes through static NAT, while nodes reach
each other directly on the guest network. Using the public address for both roles
breaks replication, because CloudStack static NAT does not route back into the
guest network it came from.

The symptom when that is wrong is a replica that cannot reach its primary — on
postgres it looks like this:

```
pg_basebackup: error: connection to server at "<public-ip>", port 5432 failed: Connection timed out
```

A node timing out against another node's **public** address is the signature of
this misconfiguration. Node-to-node traffic should be using the private address.

### `USE_PUBLIC_IPS`

This switch says "my control plane and my end users address nodes publicly". It
is provider-agnostic, not a CloudStack quirk — OpenStack uses the same flag the
same way.

| | `USE_PUBLIC_IPS=true` | `USE_PUBLIC_IPS=false` |
|---|---|---|
| Address CCX manages the node by | node's **public** IP | node's **private** IP |
| Address nodes use to reach each other | node's private IP | node's private IP |
| Control plane → node | Works, via static NAT | Only if the control plane can route to the guest network directly |
| End users → database | Works, over the public IP | Only for users already on the guest network |
| Replication (node → node) | Private address | Private address |
| Monitoring / metric scraping | Works | **Fails** when the control plane is outside the zone — monitoring uses the same address as management |
| Deploy | Succeeds | **Fails at host init** when the control plane is outside the zone |

Only the management address changes. The address nodes use to reach each other is
always the private one, which is why replication works the same either way.

:::important
**`USE_PUBLIC_IPS=true` is required whenever the CCX control plane runs outside
the CloudStack zone**, which is the normal case. It is the chart default, set
under `ccx.env`:

```yaml
ccx:
  env:
    USE_PUBLIC_IPS: "true"
```

Set there, it reaches every service that reads it — `ccx-stores` stamps it onto
the datastore at create time, and `ccx-runner-service` uses it when building the
cmon job. If you instead set it per service under
`ccx.services.<service>.env`, you must set it on **both**: if the two disagree,
the datastore is recorded with one addressing mode and managed with the other.

Set it to `false` only when the control plane sits inside the guest network and
your end users do too.
:::

### What CCX creates on your behalf

So that nothing appears to happen by magic, per datastore CCX creates:

- one keypair per cluster;
- one host anti-affinity group per cluster, named `ccx-<cluster-uuid>`;
- one VM plus a data volume per node;
- one public IP with static NAT per node;
- firewall rules from `security_groups`, plus one rule per node allowing
  `TCP 1000-65535` from that node's own public `/32`.

### Node placement and anti-affinity

CCX creates one **host anti-affinity group per cluster**, named
`ccx-<cluster-uuid>`, and deploys every node of that cluster into it. The point
is that a three-node HA datastore should not end up on a single hypervisor,
where one host failure takes out all three replicas.

There is nothing to configure. The group is created before the first node,
every node joins it at deploy time, and it is removed when the datastore is
deleted.

#### It is non-strict, and that is deliberate

CloudStack offers both a strict `host anti-affinity` type and a
`non-strict host anti-affinity` type. CCX uses the **non-strict** one.

The difference only shows up when the cloud cannot honour the request:

| Hosts available | Cluster size | Strict | Non-strict (what CCX uses) |
|---|---|---|---|
| 3 or more | 3 | spread across hosts | spread across hosts |
| 2 | 3 | **deploy fails** | spread as far as possible, deploy succeeds |
| 1 | 2 | **deploy fails** | both on that host, deploy succeeds |

Strict would give a hard guarantee at the cost of refusing to deploy on any
install with fewer hosts than the datastore has nodes. CCX prefers the deploy to
succeed with reduced spreading over failing outright, so a small or temporarily
degraded cloud stays usable.

The practical consequence: **anti-affinity only does something if you have more
than one host.** On a single-host install the group is still created and the
nodes still join it, but they will all land on that host and nothing warns you —
there is no other host to use. If you are relying on CCX for HA, size the cluster
for at least as many hypervisors as you want replicas separated.

#### Older CloudStack

The non-strict type is newer than the oldest CloudStack releases CCX supports. If
your install does not offer it, CCX logs a warning of the form

```
cloudstack does not support non-strict host anti-affinity; deploying without it,
so this cluster's nodes may share a hypervisor
```

and deploys without a group. Deploys keep working; you simply do not get the
spreading. CCX deliberately does **not** fall back to the strict type, because
that would start failing deploys on exactly the installs least able to satisfy it.

To check what your install offers:

```bash
cmk list affinitygrouptypes
```

#### Zones and existing datastores

Affinity groups in CloudStack are **account-scoped, not zone-scoped**, so one
group per cluster is correct even in a multi-zone region where a cluster's nodes
are spread across availability zones.

Datastores created before this feature existed have no group. They are not
migrated; the group is created the next time a node is added to them, so newly
added nodes get anti-affinity while the original nodes keep whatever placement
they already had.

Changing the group type for an existing datastore is not something CCX does. The
group is matched by name, so an existing `ccx-<cluster-uuid>` is reused as-is
regardless of its type.

### Public IP capacity

One public IP per node via static NAT — the same arithmetic as one floating IP
per instance on OpenStack — plus one for the virtual router's source NAT. A
3-node datastore consumes 3.

Worked example: a `192.168.1.246-254` pool is 9 addresses. The console proxy, the
secondary storage VM and the virtual router hold 3 of them, leaving about 6 for
datastore nodes.

Undersizing shows up as a deploy failing partway through, so size the pool for
peak concurrent nodes rather than for one datastore.

### Guest egress

Nodes need to reach the internet from the guest network: `apt` mirrors during
host init, the S3 endpoint for backups, and anything else your cloud-init or
monitoring path pulls. Traffic leaves through the virtual router's source NAT,
but whether it is **allowed** to leave is decided by the network offering's
`egressdefaultpolicy`.

The stock `DefaultIsolatedNetworkOfferingWithSourceNatService` offering sets it
to `false`, which means deny. On such a network nothing works until an egress
rule exists:

```bash
cmk create egressfirewallrule networkid=<network_id> protocol=all cidrlist=<guest-cidr>
cmk list egressfirewallrules networkid=<network_id>
```

The symptom without it is a host init that times out while cloud-init waits on
package downloads, and backups that never reach S3. Neither error mentions
egress.

### DNS

Configure a DNS domain for the zone. Without one, `host_fqdn` and
`host_fqdn_private` stay empty and cmon addresses nodes by raw IP, so an end
user's connection string breaks whenever a node is replaced. With a domain, users
get stable names — the same way OpenStack deployments are run.

### Guest template

The one genuinely CloudStack-specific prerequisite: a stock Ubuntu cloud image
**cannot deploy a datastore**. See
[Guest template requirements](#guest-template-requirements) below for the patch
and the pre-flight check before you configure anything else.


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
The cloudstack provider has to be defined under `cloudstack_vendors`, here is an example
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

#### Which rules you need, and why

`security_groups` is the **only** node access you control, and it is defined
**per database vendor** — a vendor with no rules is a hard failure, not an open
default:

```
no rules defined for database <vendor>
```

On top of whatever you list, CCX adds one rule per node allowing
`TCP 1000-65535` from that node's own public `/32`.

At minimum you need:

| Source CIDR | Port | Why |
|---|---|---|
| Your end users' networks | The database port (e.g. `5432` for postgres) | End users connect to the datastore over its public IP |
| The CCX control plane's egress | `22` | Host init, and cmon reaching the node |
| The CCX control plane's egress | The database port | Monitoring |

```yaml
            database_vendors:
              - name: postgres
                security_groups:
                  - { cidr: <end-user CIDR>,   ip_protocol: tcp, from_port: 5432, to_port: 5432 }
                  - { cidr: <ccx egress CIDR>, ip_protocol: tcp, from_port: 22,   to_port: 22 }
                  - { cidr: <ccx egress CIDR>, ip_protocol: tcp, from_port: 5432, to_port: 5432 }
```

:::note
If you scrape metrics over a path that uses dedicated exporter ports, confirm
which ports that path needs and add them — the list above covers database access
and management, not every possible monitoring topology.
:::

### Cloudstack credentials
We store Cloudstack credentials in the Kubernetes secrets.
In the Kubernetes secret we will have two values for API_KEY and API_SECRET_KEY

The name of this variables should be as follows &lt;name_of_the_cloudstack_vendor&gt;_CLOUDSTACK_API_KEY and &lt;name_of_the_cloudstack_vendor&gt;_CLOUDSTACK_API_SECRET_KEY.

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
## Known limitations

What is specific to CCX on CloudStack, and what to expect instead. Items marked
*by design* are deliberate; the rest are gaps. Limitations that apply to every
provider, such as how vertical and storage scaling work, are listed in
[Limitations in CCX](../../../Limitations.md).

### The service offering's root disk size wins

If a service offering declares `rootdisksize`, CloudStack applies it and ignores
the root volume size CCX requests. Requesting a 30 GB root disk under an
offering that declares 20 yields 20 GB. Only offerings that leave `rootdisksize`
unset honour the size CCX sends. If a root-size change appears to do nothing,
check the offering before anything else. See [Root disk](#root-disk) for the
minimum size and the check command.

### Offerings and IDs are not validated before a deploy starts

The UUIDs in `instance_types`, `volume_types`, `zone`, `network_id` and
`template_id` are taken from config as-is. A retired offering, a wrong network
or a missing template is only discovered when CloudStack rejects the call,
partway through a deploy, after other resources already exist. The failed
deploy is rolled back, but the error arrives late and is CloudStack's, not
CCX's.

The `cpu` and `ram` values under `instance_types` are display values shown to
end users. CCX does not check them against the offering, so keep them in sync
by hand.

### VPC deployments are not supported

Set `has_vpcs: false`. The VPC operations exist on the CloudStack deployer but
are not implemented; a request that reaches them fails with an internal error.

### One zone per region, one guest network per zone

Each region maps to a single zone and each zone to a single `network_id`, as
shown under [Configuration](#configuration). Multi-zone regions are not
supported.

### Deleting a large datastore can outrun the job deadline

Nodes are torn down one at a time, and each VM destroy waits for CloudStack to
finish expunging it, which took 2-3 minutes per VM on the KVM lab. The delete
job has a 15-minute budget that also covers cmon removal, DNS and backup
cleanup, so a datastore of roughly six or more nodes can exceed it.

When that happens the job reports a failure while the deployer keeps deleting
in the background. Retry the delete once the nodes are gone; it finds nothing
left to remove and completes the remaining steps. Nothing is left behind in the
cloud. Two- and three-node datastores are well inside the budget.

### A failed teardown is retried, not reconciled

CCX tags every VM, volume and public IP it creates with `ccx-cluster` and
`ccx-node`, but it does not yet scan the cloud for resources it has lost track
of. If a delete fails, retry it; teardown is idempotent. To audit by hand:

```bash
cmk list virtualmachines listall=true tags[0].key=ccx-cluster tags[0].value=<cluster-uuid>
cmk list volumes         listall=true tags[0].key=ccx-cluster tags[0].value=<cluster-uuid>
cmk list publicipaddresses listall=true tags[0].key=ccx-cluster tags[0].value=<cluster-uuid>
```

Anything returned for a datastore CCX no longer lists is an orphan.

### The guest template patch does not survive a cloud-init upgrade

See [Guest template requirements](#guest-template-requirements). Until the
upstream fix ships, `apt upgrade cloud-init` inside a node reverts the patch, and
that node will fail host init on its next boot. Pin the package in the template
or re-apply the patch after upgrades.

### Any cloud-init warning fails host init (by design)

CCX refuses a node whose `cloud-init status` exits non-zero, including exit `2`
(completed with recoverable warnings). It cannot tell from the exit code what
was skipped, and a half-provisioned node is worse than a failed deploy. A
template must boot with `recoverable_errors: {}`; see the pre-flight check
above.
