---
title: Install CCX supporting OpenStack with Claude (Alpha)
sidebar_label: Claude prompt
sidebar_class_name: sidebar-badge-alpha
---

# Install CCX supporting OpenStack with Claude <span className="badge badge--danger">Alpha</span>

This page contains a ready-made prompt for [Claude Code](https://claude.com/claude-code) that gets a quick-start CCX install running with OpenStack as the cloud provider. It follows the [OpenStack guide](openstack.md) and the [OpenStack tutorial](../../Tutorial-openstack.md), reads your OpenStack credentials from the RC file variables you already have, looks up flavors, images, networks and zones with the `openstack` CLI, and waits for your approval before changing anything.

## What this installs

The Kubernetes side does not depend on the cloud, and the numbers below were
measured on a single-node quick-start install of these charts, not estimated.
It ends up with roughly **39 pods** and about **66 GiB of
PersistentVolumeClaims**, and pulls around a gigabyte of images.

**Inside the namespace**, `ccxdeps` brings ingress-nginx, cert-manager, NATS,
VictoriaMetrics with Alertmanager, Loki, a PostgreSQL cluster for CCX, a MySQL
InnoDB cluster for ClusterControl, and the Zalando PostgreSQL and Oracle MySQL
operators. The `ccx` chart then adds the CCX services, ClusterControl and cmon.

**Cluster-wide** - these are the ones that reach beyond the namespace and matter
on a shared cluster:

| Object | Count | Notes |
|---|---|---|
| CustomResourceDefinitions | 14 | 6 cert-manager, 5 `*.zalan.do` / `zalando.org`, 3 `*.mysql.oracle.com` |
| ClusterRoles and bindings | ~16 | cert-manager, ingress-nginx, both operators |
| Admission webhooks | 3 | cert-manager |
| ClusterIssuer | 1 | the one you name |
| IngressClass | 1 | `nginx` |

**In OpenStack.** The prompt creates the `ccx-common` security group if you do
not have one, and briefly boots one test server with a floating IP and a
keypair to prove the image, the network path and the S3 path, then removes
them. Each datastore you then deploy consumes **one server, one floating IP
and one Cinder data volume per node**, one keypair, one security group, a
server group when anti-affinity is requested, and one S3 bucket named
`ccx-<datastore uuid>`.

**What it does not do.** It never deletes a cluster-scoped object, never touches
an object it did not create, and deletes only the OpenStack IDs it recorded
during the run. Where something already exists and is in the way, it is written
to stop and hand you the evidence instead of acting.

:::danger Use a cluster dedicated to CCX

This prompt assumes the Kubernetes cluster is **for CCX and nothing else**. It
installs cluster-scoped things - CRDs, operators, cert-manager, a ClusterIssuer -
and on a cluster that already runs workloads those can collide with what is
there. Two collisions are damaging rather than merely annoying:

- A second `postgres-operator` or `mysql-operator` fighting the existing one over
  the same cluster-scoped CRDs.
- Deleting a CRD, which cascades to **every** custom resource of that type in the
  cluster. Removing `postgresqls.acid.zalan.do` deletes every Postgres cluster
  the Zalando operator manages, not just CCX's.

The prompt is written to stop and hand these to you rather than act on them, but
do not point it at a shared or production cluster.

:::

## Before you start

You need:

- `kubectl` and `helm` access to the Kubernetes cluster that will run CCX.
- An OpenStack project for the database VMs, with quota for servers, volumes, floating IPs and security groups, and a **dedicated user** with the member role on it. CCX authenticates with a username and password; application credentials are not supported.
- The project's **OpenStack RC file** (Horizon → API Access → Download OpenStack RC File), or a `clouds.yaml` entry for it.
- The [`openstack` CLI](https://docs.openstack.org/python-openstackclient/latest/) (`pipx install python-openstackclient`). It is not strictly required - the prompt can fall back to signed REST calls - but it makes every lookup a one-liner.
- An Ubuntu 22.04 or 24.04 cloud image in Glance. Stock images work on OpenStack; no patching is needed.
- S3-compatible object storage for datastore backups. On OpenStack this is **required**, not optional: the deployer refuses to start without S3 credentials for the cloud. Use whatever you already run - Ceph RADOS Gateway, Swift with the S3 API, MinIO, AWS S3. If you have nothing, [MinIO](https://min.io/) is the usual lab choice; see [S3 backup storage](openstack.md#s3-backup-storage) in the OpenStack guide for the secret it needs.
- The CCX Helm charts. The public `s9s` repository at `https://severalnines.github.io/helm-charts/` is the default and its images are public. If Severalnines gave you a chart tarball instead, it may use private images and ship a `gcr.yaml` pull secret; the prompt handles both.
- [Claude Code](https://claude.com/claude-code) installed on the same machine.

Source your RC file and export the rest in the shell you start Claude Code from. The prompt builds the Kubernetes secrets from these variables, so you never paste a secret into the chat:

```bash
# OpenStack - the RC file exports OS_AUTH_URL, OS_USERNAME, OS_USER_DOMAIN_NAME,
# OS_PROJECT_ID (or OS_PROJECT_NAME), OS_REGION_NAME, and prompts for the password
# into OS_PASSWORD. These are the same variables the openstack CLI uses.
source ~/ccx-tenant-openrc.sh

# S3 - required on OpenStack
export S3_ACCESS_KEY=...
export S3_SECRET_KEY=...
export S3_ENDPOINT=s3.example.com:9000   # host[:port], no http:// prefix
export S3_INSECURE=false                 # true only for a self-signed cert - see the caution below

# CCX
export CMON_LICENSE=...                  # base64-encoded license
export CCX_ADMIN_PASSWORD=...            # optional, generated if unset
export CCX_ADMIN_EMAIL=you@example.com   # optional, the prompt asks if unset
```

If you use `clouds.yaml` instead of an RC file, export `OS_CLOUD=<name>` and the prompt reads the entry from `~/.config/openstack/clouds.yaml` or `./clouds.yaml`. If neither is set, the prompt asks for the path to your RC file, takes the **non-secret** values from it, and asks you to export `OS_PASSWORD` yourself - it does not source the file, because a Horizon-generated RC file prompts for the password interactively.

To keep the S3 and CCX lines out of your shell history, put them in a `0600` file and `source` it.

:::warning

The OpenStack password and the S3 keys end up in Kubernetes secrets that CCX
uses for the lifetime of the install, so they should belong to a **dedicated
service user**, not to you. Anything that can read the shell they were exported
from - including Claude Code - can reach your project and your object storage
with them. Rotate the S3 keys when the install is finished, and do not reuse
your personal OpenStack account.

:::

:::note

The two endpoints have different formats. `OS_AUTH_URL` is a full Keystone URL
such as `https://keystone.example.com:5000/v3`, while `S3_ENDPOINT` is a bare
`host[:port]` with no scheme, because that is what CCX writes into
`MYCLOUD_S3_ENDPOINT`. The prompt strips a leading `http://` or `https://` from
`S3_ENDPOINT` for you and tells you it did.

:::

:::caution S3 must answer over HTTPS

CCX always reaches S3 over HTTPS, so a plain-HTTP endpoint does not work. The
prompt checks this in Phase 0, before anything is built on it, because the
failure otherwise surfaces much later as broken backups.

`S3_INSECURE=true` is the right setting for a self-signed or otherwise untrusted
certificate. It covers CCX's bucket management and the credentials it registers
with ClusterControl, but not wal-g: if your chart enables wal-g
(`ccx.services.runner.env.USE_WALG`), PostgreSQL WAL archiving fails against a
self-signed endpoint with `x509: certificate signed by unknown authority`. The
prompt sets `USE_WALG: "false"` when `S3_INSECURE=true` and leaves the chart
default alone otherwise.

:::

Flavor, image, network, volume type and zone names are deliberately **not**
read from the environment. The prompt discovers them with the `openstack` CLI
and validates each one before use - that the flavor has enough root disk, that
the image is active and an Ubuntu LTS, that the network has a subnet and a
router to the external network. If you already know them, export `OS_FLAVOR`,
`OS_IMAGE`, `OS_NETWORK`, `OS_FLOATING_NETWORK`, `OS_VOLUME_TYPE` and `OS_AZ`:
the prompt treats them as hints, pre-selects them in its tables, and still runs
every check.

:::caution

The prompt tells Claude never to print secrets and to ask before running any command that changes your cluster or your OpenStack project. Still, review every command before you approve it.

:::

## Use the prompt

1. Start Claude Code in an empty working directory, from the shell with the variables exported: `claude`
2. Copy the prompt below with the copy button in the top-right corner of the block.
3. Paste it into Claude Code and answer the questions.

## The prompt

````text
Help me get a **quick-start CCX install** running on Kubernetes, with **OpenStack** as the cloud where database nodes are deployed. Fetch these docs first. They are the source of truth, so stop and tell me if this prompt disagrees with them:

- https://severalnines.github.io/ccx-docs/docs/admin/Installation/Cloud-Providers/openstack/
- https://severalnines.github.io/ccx-docs/docs/admin/Installation/Tutorial-openstack
- https://severalnines.github.io/ccx-docs/docs/admin/Installation/

## What I have

- **Helm charts.** Ask me first whether I have a **chart tarball from Severalnines** or should use the **public repository** `https://severalnines.github.io/helm-charts/` (`ccxdeps` and `ccx`). Do not search my disk for a tarball - guessing wastes a round trip and may pick up an old copy. Either way, unpack or `helm pull` the chart and check every values key against its files: the chart's own `minimal-values-openstack.yaml` beats any published example. The public chart's images are public and need no pull secret. A tarball may use private `eu.gcr.io` images; look **inside it** for a `gcr.yaml` Secret manifest (name `gcr-pull-secret`, type `kubernetes.io/dockerconfigjson`) ready to `kubectl apply -n <ns>`. If the tarball uses private images and has no `gcr.yaml`, ask me for a Google service account JSON key; if I don't have one either, tell me to ask johan@severalnines.com, then stop.
- **OpenStack credentials in the environment**, the way `source <project>-openrc.sh` leaves them. Never ask me for their values, and never print `OS_PASSWORD`:
  - Required: `OS_AUTH_URL`, `OS_USERNAME`, `OS_PASSWORD`, and one of `OS_PROJECT_ID` / `OS_PROJECT_NAME`.
  - Wanted: `OS_USER_DOMAIN_NAME` (if only `OS_USER_DOMAIN_ID` is set, ask me for the domain **name** - CCX authenticates with the name, and for the id `default` it is almost always `Default`), and `OS_REGION_NAME` (if unset, list the regions from the catalog and let me pick).
  - Check each with `printenv <NAME> >/dev/null && echo set || echo MISSING`. The non-secret ones are not secrets: show me their values and ask me to confirm rather than asking me to type them again.
  - If `OS_AUTH_TYPE` is `v3applicationcredential`, or `OS_APPLICATION_CREDENTIAL_ID` is set, **stop**: CCX's deployer authenticates with username, password, user domain and project only. Tell me to create a dedicated user with the member role on the project and give me its RC file instead.
  - If none of the `OS_*` variables are set but `OS_CLOUD` is, read that entry from `~/.config/openstack/clouds.yaml` or `./clouds.yaml`, take `auth_url`, `username`, `user_domain_name`, `project_id`/`project_name` and `region_name` from it, and read `password` from the file into the secret later without ever printing it.
  - If nothing is set, ask me for the path to my RC file. **Do not source it** - a Horizon-generated RC file prompts for the password interactively and would hang or leave `OS_PASSWORD` empty. Read the `export OS_*=` lines for the non-secret values, show them, and tell me to `export OS_PASSWORD` in this shell and restart you.
  - The `openstack` CLI uses the same variables. If it is not installed, offer to install it with `pipx install python-openstackclient` (or run it with `uvx --from python-openstackclient openstack`) after I confirm; if I decline, get a token from Keystone yourself (`POST $OS_AUTH_URL/auth/tokens`, read `X-Subject-Token`, never print it) and call the Nova, Neutron, Glance and Cinder endpoints from the catalog.
- **S3 credentials exported as environment variables**, and they are **required** on OpenStack: the deployer's config check rejects an OpenStack cloud without an S3 endpoint and keys, and the pod never becomes ready. Never ask me for their values, and never print them:
  - `S3_ACCESS_KEY`, `S3_SECRET_KEY`
  - `CMON_LICENSE` (base64)
  - `CCX_ADMIN_PASSWORD` (optional; generated if unset)

  Check each with `printenv`. If a required one is missing, tell me to exit, export it, and start you again. Report the **length** of each secret you found and flag any that looks implausibly short for what it is, without printing the value.
- **Endpoints, optionally exported** in the same shell. These are **not** secrets, so read them, show me the value, and ask me to confirm. If one is unset, ask for it in Phase 0:
  - `S3_ENDPOINT` - `host[:port]` with **no scheme**. If it starts with `http://` or `https://`, strip that, use the rest, and tell me you did. CCX always reaches S3 over **HTTPS**, so the scheme carries no information and a plain-HTTP endpoint will not work.
  - `S3_INSECURE` - `true` when the S3 certificate is self-signed or invalid. It maps **directly** to `MYCLOUD_S3_INSECURE_SSL`; do not invert it.
  - `CCX_ADMIN_EMAIL` - the admin portal login.
- `kubectl` and `helm` access to the cluster.

## Rules

1. Work **one phase at a time**, and wait for my OK before starting the next.
2. **Never guess** IDs, names, CIDRs, domains or sizes. Look them up, show a short table, and let me pick.
3. **Ask before changing anything**: `kubectl apply/create/run/delete/patch/replace/edit`, `helm install/upgrade/uninstall/rollback`, `openstack * create/set/unset/add/remove/delete`. Read-only commands (`list`, `show`) are fine.
4. **Never delete a cluster-scoped object.** CRDs, ClusterIssuers, ClusterRoles and their bindings, webhook configurations, PersistentVolumes, StorageClasses, namespaces. Deleting a CRD cascades to every custom resource of that type **cluster-wide**, so it can destroy databases that have nothing to do with CCX. If one is in the way, show me what it is, what it holds and what owns it, and stop. I will remove it myself.
5. **Never modify an object this install did not create.** Before touching anything that already exists, check `meta.helm.sh/release-name` and `app.kubernetes.io/managed-by`. If it belongs to another release, or to nothing, say so and stop rather than adopting or overwriting it. That includes a ClusterIssuer or a Secret whose name you were about to reuse: pick a different name or ask. The same goes for OpenStack: a security group, keypair or server you did not create is someone else's.
6. **Secrets only come from the environment variables above** (or the `clouds.yaml` password) and go into Kubernetes secrets or a `0600` values file. Never print them or ask me for them, and keep them out of command arguments: pipe generated manifests into `kubectl apply --server-side --force-conflicts -f -`. Only show key names or lengths. **`--server-side` is not optional**: a plain `kubectl apply` stores the whole submitted manifest, plaintext values and all, in the `kubectl.kubernetes.io/last-applied-configuration` annotation. For the same reason, never print a Secret's `.metadata.annotations` - checking ownership means selecting the one key you need, not dumping the map.
7. Use `-n <ns>` on every `kubectl` and `helm` command.
8. **Prove a check works before trusting it.** Any test that can fail for an uninteresting reason - a registry probe, a readiness check, a credential test - must be run against a case you know passes, so a broken method cannot read as a real result. Pair it with a case you know fails, too. The CCX UI makes this concrete: the SPA answers **`200` with `index.html` for every path it does not recognise**, so a `200` from something like `/swagger/index.html` proves nothing at all. Only `/api/*` status codes mean anything, and you can confirm that by checking a deliberately bogus `/api/...` path returns `404`.
9. **A pod is not ready because it is Running.** Judge readiness per container (`.status.containerStatuses[].ready`), never on `.status.phase`. A crashlooping container sits in `Running` between restarts.

## Must match

- **Use one cloud code everywhere** (e.g. `mycloud`): `ccx.config.clouds[].code`, the key under `openstack_vendors`, and the uppercase key prefix in the secrets (`MYCLOUD_AUTH_URL`, `MYCLOUD_S3_ENDPOINT`). The deployer reads every secret key by **suffix** and files the value under whatever prefix is left, lowercased, so a key with the wrong prefix configures a cloud nobody uses and nothing complains. The vendor lookup is by the cloud's own `code`, and a mismatch fails every deploy with `unknown vendor`. The secret **names** (`openstack`, `openstack-s3` in the tutorial) are free - only the prefixes matter - but each name must be listed in `ccx.cloudSecrets` and exist before the install, because the chart looks them up at render time and fails on a missing one.
- **The credential keys the deployer reads are exactly** `<CODE>_AUTH_URL`, `<CODE>_USERNAME`, `<CODE>_PASSWORD`, `<CODE>_USER_DOMAIN` and `<CODE>_PROJECT_ID`. `USER_DOMAIN` is the domain **name**. `PROJECT_ID` must be the project **id**, not its name - if I only have `OS_PROJECT_NAME`, look the id up with `openstack project show -f value -c id "$OS_PROJECT_NAME"` or from the token response. The chart's helper script also writes `<CODE>_USER_DOMAIN_NAME`; nothing reads it, so leave it out.
- **Region names are Keystone region names.** `clouds[].regions[].code` and the key under `openstack_vendors.<code>.regions` must both be the region as `openstack region list` shows it (`OS_REGION_NAME`, often `RegionOne`). The deployer picks catalog endpoints by that name and fails a deploy with `missing openstack region` when the key does not exist.
- `availability_zones[].code` must be a Nova availability zone name from `openstack availability zone list --compute`, often just `nova`.
- `instance_types[].type` is a **flavor name**, matched exactly against `openstack flavor list`; a typo fails at deploy with `flavor does not exist`. Take `cpu` from the flavor's `VCPUs`. `ram` is in GB, while flavors report `RAM` in MiB, so divide by 1024 (4096 → 4). `disk_size` is the size of the database's data disk, not the flavor's root disk.
- `volume_types[].code` is a **Cinder volume type name** from `openstack volume type list`, exact. Offer at least one: the data disk of every node is a Cinder volume of that type, and CCX sets up LVM on it so it can be grown later. Ask for default, minimum and maximum GiB.
- **Root disk.** A node boots from the flavor's root disk, so the flavor's `Disk` must be at least 20 GB and at least the image's `min_disk`. On a boot-from-volume cloud, where flavors report `Disk 0`, set `root_volume: { enabled: true, size: 30 }` under the vendor so CCX boots each node from a Cinder volume instead.
- **`secgrp_name` must name a security group that already exists in the project** (the docs use `ccx-common`); it is attached to every server CCX creates and is what lets the control plane in. It must allow **TCP 1-65535 ingress from every source IP the control plane presents** (Phase 1). CCX also creates one security group per datastore from `database_vendors`; a database without its own entry gets only a node-to-node rule, so give **every enabled database** an entry (the chart enables `mariadb`, `percona`, `postgres`, `valkey_sentinel` and `microsoft` by default; to offer fewer, copy the chart's full `databases` list into the values file - Helm replaces lists - and set `enabled: false` on the rest).
- **One floating IP per node**, allocated from `floating_network_id` (the external network) and attached to a port on `network_id` (the project network). The project network needs a subnet and a router whose external gateway is that external network, or the floating IPs never route. Leave `public_pool` unset unless the servers should be created directly on a provider network with public addresses and no floating IPs at all. Do not set `network_api_version` or `floating_ip_api_version`; the defaults (`NetworkNeutron`, `FloatingIPV3`) are right for any Neutron cloud.
- Keep `ccx.env.USE_PUBLIC_IPS: "true"`, and keep the image tags from the chart.
- If `S3_INSECURE` is `true`, set `ccx.services.runner.env.USE_WALG: "false"`: wal-g ignores `S3_INSECURE_SSL` and fails on a self-signed certificate. With a trusted certificate leave the chart's default alone. Do not ask me about this - just apply the rule.
- **`cmon.license` must be the licence blob base64-encoded *again*.** The chart puts it under `data:` in the `cmon-license` secret, so Kubernetes decodes it once on mount, and cmon wants the base64 text, not the decoded bytes. Pass `base64(<$CMON_LICENSE with whitespace stripped>)`. `CMON_LICENSE` usually arrives with newlines from base64 line-wrapping - strip them first.
- **`ccx.ingress.whitelist` must be a comma-separated string**, not a YAML list. The chart interpolates it directly into the nginx annotation, so a list renders as `[10.0.0.0/8]`, nginx rejects it with `AnnotationParsingFailed`, and the admin portal serves 503. Do not use `cc.cidr` or `ccx.cidr` for this: `ccx.cidr` is the control plane's outbound address and only feeds the default AWS security groups.

## Phase 0: Questions

Ask a few at a time:

- `ccxFQDN` (e.g. `ccx.example.com`) and `ccFQDN` (e.g. `cc.example.com`). DNS names for datastores (`ccx.userDomain`) are optional: only use them if external-dns is already running, or if I name an existing Kubernetes secret (or workload identity) for its DNS provider. Otherwise skip them for the quick start.
- TLS: a cert-manager ClusterIssuer (`ccx.ingress.ssl.clusterIssuer`), or existing certificates. Also ask whether the domains are public and reachable from the internet. With existing certificates, `ccxFQDN` uses the secret in `ccx.ingress.ssl.secretName`, and the admin portal uses a secret named exactly `<ccFQDN>`.
- Admin portal allowlist (`ccx.ingress.whitelist`, empty = public), and the admin email (`ccx.admin.email`) - skip this if `CCX_ADMIN_EMAIL` is set; show it and confirm. The password comes from `CCX_ADMIN_PASSWORD` or is generated.
- Kubernetes context, namespace (default `ccx`), storage class.
- Cloud code and display name, and the region's display details (name, city, country, continent). The region **code** is `OS_REGION_NAME` - show it and confirm, do not ask me to type it.
- Databases to offer (from the chart's `ccx.config.databases`), and the end-user CIDRs allowed to reach them.
- S3 for backups: endpoint `host[:port]` and whether its TLS certificate is valid. Skip whichever of these `S3_ENDPOINT` and `S3_INSECURE` already answer - show the values and confirm them in one go. Do not ask me for a bucket name; see below. If I have no S3-compatible storage yet, say that MinIO is the usual choice for a lab and point me at the **S3 Backup Storage** section of the OpenStack guide.

  Then check the endpoint before we build anything on it, because both failures below surface much later as broken backups:

  - `curl -sSI --max-time 10 https://<endpoint>` - it must answer over **HTTPS**. If only plain HTTP answers, stop and tell me: CCX always connects over HTTPS and bucket creation will fail at deploy time.
  - If the host part is a **bare IP address**, warn me that no public CA issues certificates for private IPs, so wal-g can never trust it and `USE_WALG` must stay off.
  - Confirm the credentials actually work before building on them, with a signed request (AWS SigV4) rather than an unauthenticated one: `curl -sk --aws-sigv4 "aws:amz:us-east-1:s3" -u <key>:<secret> https://<endpoint>/`. A `200` means valid. Do this even when a key looks implausibly short - length proves nothing either way.
  - **Do not ask me for a bucket, and do not create one.** CCX creates one bucket per datastore, named `ccx-<datastore uuid>`, when the datastore is deployed, and deletes it with the datastore. `MYCLOUD_S3_BUCKETNAME` is not needed for that, so leave it out of the secret unless I ask for it. A `404` on any bucket is not an error.
- Which chart source (tarball path, or the public repository) and, only for a tarball with private images and no `gcr.yaml`, the service account key path.

## Phase 1: Kubernetes

- `kubectl get nodes -L kubernetes.io/arch` must show `amd64` everywhere. Docs sizing: 3 × 4 vCPU / 8 GB and about 60 GB of PVCs. If the cluster is smaller or single-node, say so and what it costs (no HA, no headroom), then carry on if I accept.
- `kubectl get storageclass`: if there is no default class, or I picked a different one, find the storage class keys in both charts and set them in Phases 4 and 6.
- **Is there a LoadBalancer implementation?** `kubectl get svc -A | grep LoadBalancer` and `kubectl get ds -A`. Nothing in `ccxdeps` provides one, so on a cluster without it the ingress Service never gets an `EXTERNAL-IP` and every later check that depends on the FQDNs silently waits forever. On a cluster that itself runs on OpenStack, the usual answer is the cloud provider's Octavia integration (`openstack loadbalancer list` shows what it creates). k3s started with `--disable=servicelb,traefik` is the common lab case: no daemonsets at all and no `IngressClass`. On a single node, bind the ports on the host instead, and tell me the FQDNs must point at the node's own IP:

  ```yaml
  ingress-nginx:
    controller:
      hostPort:
        enabled: true
      service:
        type: ClusterIP
        externalTrafficPolicy: null   # invalid on ClusterIP; the apply is rejected if left set
      publishService:
        enabled: false                # there is no external IP to publish
      reportNodeInternalIp: true
  ```

  On a multi-node cluster, say that MetalLB (or the provider's own controller) is the real answer and let me decide.
- **What already runs on this cluster.** `ccxdeps` bundles ingress-nginx, cert-manager, nats, victoria-metrics, loki, a postgres-operator and a mysql-operator, and its defaults install the operators whether or not the cluster has them. Installing a second copy of an operator is not a duplicate - the two fight over the same cluster-scoped CRDs, and the damage lands on whatever the existing one manages.

  Check for each before installing anything: `kubectl get deploy -A | grep -Ei 'ingress-nginx|cert-manager|external-dns|nats|victoria|loki|postgres-operator|mysql-operator'`, and `kubectl get crd` for the operator CRDs.

  - Missing: enable that subchart (`ingressController.enabled=true`, `cert-manager.enabled=true`, and so on).
  - Already present, and it is a plain dependency (ingress-nginx, cert-manager, nats, victoria-metrics, loki): leave that subchart disabled and point CCX at what is there. Tell me which you reused.
  - Already present, and it is an **operator** (postgres-operator, mysql-operator): stop and ask me. Do not set `installOperators`, and do not assume the existing operator is CCX's - it may belong to someone else's workload.
- **Namespace:** check `kubectl get namespace <ns>`. If it's missing, create it after I confirm. If it already exists, list what is in it (`helm list -n <ns>`, `kubectl get all -n <ns>`) before going further. A `ccx` or `ccxdeps` release already there means this is not a fresh install: `helm upgrade --install` would rewrite that release with the values we are about to generate, so **stop and ask me** rather than continuing.
- **Pre-existing CRDs.** Helm never removes CRDs on uninstall, so a rebuilt cluster keeps them and the next `ccxdeps` install dies with `conflict ... with "postgres-operator" ... .spec.versions`. `--take-ownership` does not help - Helm's `crds/` path ignores it. Check with `kubectl get crd | grep -E 'acid.zalan.do|mysql.oracle.com|zalando.org'`.

  If any exist, **do not delete them** - see rule 4. Gather the evidence and hand it to me: for each CRD, `kubectl get <crd> -A` to count custom resources **across every namespace**, plus `helm list -A` and the CRD's `meta.helm.sh/release-name` annotation to find an owner. Then tell me plainly which of these two situations it is:

  - Every one holds zero resources and no release owns it: they are leftovers from a removed CCX install, and I can delete them. Give me the exact command and let me run it.
  - Any of them holds resources, or a release owns it: **something else on this cluster is using that operator.** Stop. Deleting the CRD would destroy those databases. This cluster is not a dedicated CCX cluster and the install should not continue here.
- **Source IP as OpenStack sees it:** the `ccx-common` rules must allow the address the cluster's traffic appears from **on the path to the floating IP range**. With my OK, run a short-lived pod on **each node** (`nodeName` override). If the floating range is routed privately (a static route, or the cluster sits on the same OpenStack), use the `src` from `ip route get <an IP in the floating subnet>`. Otherwise use `curl -s ifconfig.me`. Record every distinct IP. If the cluster's nodes are themselves OpenStack servers with floating IPs, expect those floating IPs, not the node's private address - Neutron NATs on the way out.

## Phase 2: OpenStack (read-only)

- **Prove the credentials first:** `openstack token issue -f value -c expires`. Then `openstack project show "$OS_PROJECT_ID"` (or the name) and confirm the id and domain with me; that id goes into the secret.
- `OS_FLAVOR`, `OS_IMAGE`, `OS_NETWORK`, `OS_FLOATING_NETWORK`, `OS_VOLUME_TYPE` and `OS_AZ` may be set. Treat them as **hints, not answers**: mark the matching row in each table below as pre-selected, run every check on it as if I had picked it, and say so. A hint that fails its check is reported and dropped, never used. Expect them to be **stale rather than merely unverified** - a hint naming an object that no longer exists usually means the lab was rebuilt under a shell that was never re-exported. Say so in the final summary so I fix my shell, instead of silently working around it.
- Region: `openstack region list`, and confirm `OS_REGION_NAME` is one of them.
- Compute API: `openstack versions show --service compute` and read the maximum microversion column. CCX asks for microversion `2.79` by default; if the maximum is lower, set `compute_api_microversion` under the vendor to that maximum and tell me.
- Availability zones: `openstack availability zone list --compute`.
- Networks: `openstack network list --external` for `floating_network_id`, and `openstack network list --internal` for `network_id`. For the candidate project network, `openstack subnet list --network <id>` must show a subnet, and `openstack router list` + `openstack router show <router>` must show a router with `external_gateway_info` on the external network and an interface on that subnet. Without that, floating IPs attach but never route, and nodes have no way out to package repositories or S3.
- Floating IPs: `openstack floating ip list` for what is already allocated, and `openstack quota show --usage` (or `openstack limits show --absolute`) for the floating IP, instance, core, RAM, volume, gigabyte and security group quotas. One floating IP, one server and one data volume per node; count what is free and say how many 3-node datastores fit.
- Flavors: `openstack flavor list --long`. Offer only flavors with **at least 2 vCPU and 4 GB RAM**, and a root `Disk` of at least 20 GB and at least the image's `min_disk` - or `Disk 0` on a boot-from-volume cloud, in which case note that `root_volume` is needed.
- Images: `openstack image list --status active --long`, and `openstack image show <id> -f value -c min_disk -c min_ram -c size` on the candidates. Ubuntu 24.04 LTS is the recommendation, 22.04 is supported. Stock cloud images are fine on OpenStack; if an image does not name its distribution, ask me rather than guessing from the size.
- Volume types: `openstack volume type list`. If there is exactly one, pre-select it; if the list is empty, stop - Cinder is required for the data volumes.
- Security groups: `openstack security group list` - is there already a `ccx-common` (or whatever I name)? If so, `openstack security group rule list <it>` and show me the rules; do not change it in this phase.
- S3 reachability from inside OpenStack is settled in Phase 3, from the test server.

## Phase 3: Security group and test server

- **`ccx-common`.** If it exists, compare its rules with the Phase 1 source IPs and tell me what is missing; add the missing rules only after I confirm, and only ingress `tcp` `1:65535` from each `<ip>/32`. If it does not exist, create it (`openstack security group create ccx-common`) with those rules, after I confirm. Record what you created.
- **Test server.** With my OK, create a temporary keypair (`openstack keypair create ccx-preflight > <0600 file>`), boot one server from the chosen image and flavor on `network_id` with `ccx-common` and the keypair, allocate a floating IP from `floating_network_id` and attach it, and wait for `ACTIVE`. If the flavor has `Disk 0`, boot it with `--boot-from-volume 30` to prove that path too. Then, from an ordinary (non-`hostNetwork`) pod on each node:

  - SSH in as `ubuntu` and run `cloud-init status --wait`; it must exit `0`. This is the same image, flavor and network CCX will use, so a failure here is a failure at host init later.
  - Read the peer address on the server (`who`, `ss -tn`, or the sshd log) and confirm it matches the Phase 1 answer for that node. This is the CIDR every `ccx-common` rule depends on; wrong, and every deploy fails at SSH host init.
  - From the server, `curl -k https://<s3 endpoint>` and `apt-get update`. Nodes reach S3 and package repositories through the router's SNAT, and this is the only realistic test of that path.

  Record the ID of every OpenStack object you create - server, floating IP, keypair, security group - and delete **only those IDs** when cleaning up. Never delete by name match or by listing what looks unused: this is someone's project, and other servers in it are not yours. Afterwards, show me the server, floating IP, volume and keypair counts so I can see they are back where they started.

## Phase 4: Pull secret and dependencies

- **Pull secret, only for a tarball with private images.** `ccx.imagePullSecret` is used by the chart templates even if `values.yaml` doesn't list it; check with `grep -rn imagePullSecret`, and set it to the **actual name of the secret you create** - if the tarball ships `gcr.yaml`, that name is `gcr-pull-secret`. Create it with `kubectl apply -n <ns> -f gcr.yaml` (it carries no namespace of its own), or from a service account key: write a `0600` `.dockerconfigjson` for `eu.gcr.io` (username `_json_key`, password = the key file's contents), `kubectl create secret generic <name> -n <ns> --type=kubernetes.io/dockerconfigjson --from-file=.dockerconfigjson=<file>`, and delete the file. Then **verify the credential before installing anything**: for each private image in the chart's values, fetch a registry token with the secret's `auth` and request the manifest; a `200` means pullable. Run the same check against a known-public image first - if that control does not return `200`, your method is broken and the private results mean nothing. With the public chart, skip all of this and say so.
- Install `ccxdeps`, enabling only the subcharts the Phase 1 survey found missing, and leaving the rest disabled so nothing already on the cluster gets a second copy. Add external-dns only if I gave its provider credentials secret (and set its provider values). Wait for all pods, judging readiness per container. `ccxdeps` also provides the `victoria-metrics` Service that the ccx chart looks up for `prometheusHostname`, so it must be running before Phase 6.
- ClusterIssuers are cluster-scoped and shared. If one with the name I gave already exists, do not modify or replace it - show me what it issues and let me choose between reusing it and picking a different name. If it doesn't exist, create it after I confirm. For public domains, use Let's Encrypt as the OpenStack tutorial shows. For private domains (e.g. `.local`, or a lab behind NAT), Let's Encrypt can't issue, so use a self-signed ClusterIssuer (`spec.selfSigned: {}`) or a CA ClusterIssuer from my own CA secret, and tell me browsers will warn until that CA is trusted. For existing certificates, both TLS secrets must exist in `<ns>`: the one in `ccx.ingress.ssl.secretName` (covering `ccxFQDN`) and one named `<ccFQDN>`.
- Show the A records for both FQDNs pointing at the ingress `EXTERNAL-IP`, and wait until they resolve.

## Phase 5: Cloud secrets

Generate these two secrets with a small script that reads the environment variables (or the `clouds.yaml` entry), and pipe them straight into `kubectl apply --server-side --force-conflicts -n <ns> -f -`, after I confirm. Nothing is written to disk or printed:

```
apiVersion: v1
kind: Secret
metadata:
  name: mycloud
  namespace: <ns>
type: Opaque
stringData:
  MYCLOUD_AUTH_URL: $OS_AUTH_URL
  MYCLOUD_USERNAME: $OS_USERNAME
  MYCLOUD_PASSWORD: $OS_PASSWORD
  MYCLOUD_USER_DOMAIN: $OS_USER_DOMAIN_NAME
  MYCLOUD_PROJECT_ID: <the project id confirmed in Phase 2>
---
apiVersion: v1
kind: Secret
metadata:
  name: mycloud-s3
  namespace: <ns>
type: Opaque
stringData:
  MYCLOUD_S3_ENDPOINT: <$S3_ENDPOINT, scheme stripped, or the host[:port] I gave you>
  MYCLOUD_S3_ACCESSKEY: $S3_ACCESS_KEY
  MYCLOUD_S3_SECRETKEY: $S3_SECRET_KEY
  MYCLOUD_S3_INSECURE_SSL: <$S3_INSECURE, or "true" if the S3 certificate is self-signed or invalid, else "false">
```

First check whether secrets of those names already exist in `<ns>`. If one does and this install did not create it, stop and ask rather than overwriting it - it may belong to another release.

Check the result with `kubectl get secret mycloud mycloud-s3 -n <ns> -o json | jq '.items[] | {name: .metadata.name, keys: (.data | map_values(length))}'`.

## Phase 6: Values and install

Write `ccx-openstack-values.yaml`:

- `ccxFQDN`, `ccFQDN`, TLS, `ccx.ingress.whitelist`, `ccx.admin.email`, storage class if needed. No secrets go in this file.
- `ccx.cloudSecrets: [mycloud, mycloud-s3]`, `ccx.imagePullSecret: <the pull secret's real name>` only for a tarball with private images, `ccx.userDomain` if used, and `ccx.config.databases` if I'm not offering all the defaults.
- `ccx.env`: `USE_PUBLIC_IPS: "true"`, `REQUIRE_EMAIL_VERIFICATION: "false"`, `REQUIRE_SUBSCRIPTION: "false"`. And `ccx.services.runner.env.USE_WALG: "false"` when `S3_INSECURE` is `true`.
- `ccx.config.clouds`: one cloud with `code: mycloud`, instance types (flavor names), volume types (Cinder type names), network type `public` (`in_vpc: false`), and one region whose `code` is `OS_REGION_NAME` with one availability zone whose `code` is the Nova AZ.
- `ccx.services.deployer.config.openstack_vendors.mycloud`: `project_id`, `network_id`, `floating_network_id`, `regions.<OS_REGION_NAME>` with `image_id` and `secgrp_name: ccx-common`, `root_volume` only for a `Disk 0` flavor, `compute_api_microversion` only if Phase 2 found the maximum below `2.79`, and one `database_vendors` entry per **enabled** database:

```
security_groups:
  - { cidr: <control-plane IP>/32, ip_protocol: tcp, from_port: 1,    to_port: 65535 }  # one per Phase 1 IP
  - { cidr: <end-user CIDR>,       ip_protocol: tcp, from_port: 5432, to_port: 5432 }   # the database port only
```

Ports: 3306 for MariaDB and Percona, 5432 for PostgreSQL, 6379 for Valkey, 1433 for MSSQL. Never open `1-65535` to end users.

The chart only accepts the license and admin password as values. Generate `ccx-secrets.values.yaml` (`0600`, never shown) from `CMON_LICENSE` and `CCX_ADMIN_PASSWORD` with a script, containing `cmon.license` and `ccx.admin.password`. Tell me to keep it private and out of git, because upgrades need it again.

Then:

1. Show me `ccx-openstack-values.yaml`, but not the secrets file.
2. Run `helm upgrade --install ccx <chart> -n <ns> -f ccx-openstack-values.yaml -f ccx-secrets.values.yaml --dry-run=server > <0600 file>`. Report only the exit status and errors, then delete that output file. It must be `--dry-run=server`: the chart resolves `prometheusHostname` and the `cloudSecrets` with `lookup`, which always returns empty under plain `helm template`, so a client-side render fails with errors that mean nothing.
3. With my OK, run the same command with `--wait` instead of `--dry-run=server`.
4. Check that `kubectl get configmap ccx -n <ns> -o jsonpath='{.data.USE_PUBLIC_IPS}'` is `true`.
5. Check that `ccx-config-core` contains `image_id`, `secgrp_name` and the vendor key, and that the deployer pod is ready. A deployer that restarts with `s3 config: missing` or `unknown openstack` in its log means the vendor key or the secret prefix is wrong.
6. Only for private images: check that **every** pod using one ended up with a pull secret: `kubectl get pod -n <ns> <pod> -o jsonpath='{.spec.imagePullSecrets[*].name}'`. If one has none, the chart forgot it - don't edit the chart. Attaching the secret to the namespace's `default` ServiceAccount fixes it (`kubectl patch serviceaccount default -n <ns> -p '{"imagePullSecrets":[{"name":"<name>"}]}'`), but that affects **every** pod in the namespace, so tell me that before you do it and let me approve. Then recreate the affected pod.
7. Open both FQDNs and tell me the status codes. Both should answer; the troubleshooting list below covers what a failure means.

## Phase 7: Smoke test

Register at `https://<ccxFQDN>/auth/register?from=ccx` and deploy a 3-node datastore of one of the enabled databases while watching `kubectl logs -f -n <ns> deploy/ccx-runner-service`. PostgreSQL is a good default: its backups exercise the S3 settings that are easiest to get wrong.

**If TLS is self-signed, do this through the API, not a browser.** Chrome's certificate interstitial will not let browser automation attach to the page at all, and trusting a lab CA system-wide is not worth it. The calls the UI makes:

```
POST   /api/auth/register              {login, password, firstName, lastName, termsAccepted, allowNewsletters, origin}
POST   /api/auth/login                 {login, password}          # the field is "login", NOT "email"
GET    /api/content/api/v1/deploy-wizard                          # confirms the cloud config surfaced
POST   /api/prov/api/v2/cluster        {general{...}, cloud{...}, instance{...}, network{...}}
GET    /api/deployment/v3/data-stores                             # progress and end state
DELETE /api/prov/api/v2/cluster/<uuid>
```

Keep the session cookie from the login and send it with the rest.

**The end state is `cluster_status: STARTED`, not "Available".** There is no such value as Available; a watcher waiting for one waits forever. A finished datastore reports `cluster_status: STARTED`, `deploy_progress: 100`, `is_deploying: false`, `operable: true`, and `cluster_status_text` reading "There are no failed nodes, there are started nodes". Check the node roles too: one `master` and two `replica`, each with a floating IP. While it runs, `openstack server list`, `openstack floating ip list` and `openstack volume list` should show exactly three of each more than the Phase 2 baseline; the servers carry the Nova tag `ccx-cluster:<uuid>` (`openstack server list --tags ccx-cluster:<uuid>`).

Then delete it **through CCX** and confirm its servers, floating IPs, volumes, security group, keypair and server group are gone - compare against the baseline counts recorded in Phase 2. Note that the datastore disappears from the UI and from `GET /api/deployment/v3/data-stores` well before OpenStack has finished releasing anything, so the UI is not evidence. The `ccx-<uuid>` bucket is deleted by CCX on OpenStack; if it is still there after the servers are gone, report that as a finding rather than cleaning it up silently.

Tell me to always delete datastores through CCX before uninstalling the chart. Uninstalling first orphans their servers, floating IPs, volumes and buckets, and they then have to be cleaned up by hand.

If something fails:

- Deploy stalls around 8-16% with an SSH timeout at host init → `ccx-common` is missing one of the Phase 1 source IPs, or the floating IP does not route (no router gateway).
- `cloud-init status` exits non-zero on the node → the image is not a stock Ubuntu cloud image, or its datasource does not receive user-data; check `/var/log/cloud-init.log` on the node.
- `flavor does not exist` → `instance_types[].type` is not an exact flavor name.
- `missing openstack region` → the `regions` key under the vendor is not the Keystone region name in `regions[].code`.
- `unknown vendor` / `unknown openstack vendor` → the `openstack_vendors` key doesn't match `clouds[].code`.
- `can't authenticate to openstack` in the deployer log → wrong password, user domain **name**, or a project **name** where the id is needed.
- Deployer never ready, `s3 config: missing access key` (or `endpoint`) in its log → the S3 secret's prefix doesn't match the cloud code, or `MYCLOUD_S3_*` keys are missing.
- `Quota exceeded for resources: ['floatingip']` (or `instances`, `cores`, `gigabytes`) → the project quota is full.
- `Version 2.79 is not supported by the API` → set `compute_api_microversion` to the maximum from Phase 2.
- `402` → the `REQUIRE_*` flags are still on.
- `ImagePullBackOff` → private images without a pull secret, or the secret is misnamed or absent from that one pod's spec.
- `Missing secret ... cloudSecrets` → one of the two secrets isn't in `<ns>`.
- `Endpoint url cannot have fully qualified paths` → a scheme leaked into `MYCLOUD_S3_ENDPOINT`.
- `x509: certificate signed by unknown authority` on a backup → wal-g is on against a self-signed S3; it ignores `S3_INSECURE_SSL` and needs a trusted certificate.
- Release stuck at `pending-install` with cmon restarting, `Malformatted JSon request` in its events → `cmon.license` needs the extra base64 layer. cmon's `startupProbe` is the command that installs the licence, so a wrong encoding means it never becomes ready and `--wait` hangs with nothing mentioning a licence. Confirm with `kubectl logs -n <ns> cmon-0 -c cmon | grep -i licen`: it must say **enterprise**, not community.
- Admin portal 503 while the main UI is fine → `ccx.ingress.whitelist` was passed as a list instead of a comma-separated string. Confirm with `AnnotationParsingFailed` in the ingress controller log.
- `helm install` fails on a CRD `conflict ... .spec.versions` → CRDs left behind by a previous install.
- Ingress Service stuck at `<pending>` with no `EXTERNAL-IP`, and both FQDNs unreachable → the cluster has no LoadBalancer implementation; see Phase 1.
- Certificate never `Ready`, ACME challenge rejected with `cannot be used with pathType Exact` → the ingress controller has `use-proxy-protocol` on behind an OpenStack load balancer that does not speak it; see the tutorial's troubleshooting section.

Finish with the URLs, where the admin login is (the `admin-users` secret), the IDs and names used, which `OS_*` hints were stale, and a reminder to rotate the S3 keys now that they live in the cluster.
````
