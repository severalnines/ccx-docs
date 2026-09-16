---
title: Install CCX supporting CloudStack with Claude (Beta)
sidebar_label: Claude prompt
sidebar_class_name: sidebar-badge-beta
---

# Install CCX supporting CloudStack with Claude <span className="badge badge--warning">Beta</span>

This page contains a ready-made prompt for [Claude Code](https://claude.com/claude-code) that gets a quick-start CCX install running with CloudStack as the cloud provider. It follows the [CloudStack guide](cloudstack.md), asks for your domains, networks and instance types, reads credentials from environment variables, looks up the CloudStack IDs with `cmk`, and waits for your approval before changing anything.

## Before you start

You need:

- The CCX Helm charts tarball from Severalnines.
- A Google service account JSON key, used to pull the private CCX images. Contact [johan@severalnines.com](mailto:johan@severalnines.com) to get one.
- `kubectl` and `helm` access to the Kubernetes cluster that will run CCX.
- CloudStack API access (API URL, API key and secret key), ideally with [CloudMonkey (`cmk`)](https://github.com/apache/cloudstack-cloudmonkey) configured.
- S3-compatible object storage for datastore backups, with a bucket and credentials. Use whatever you already run - AWS S3, Ceph RADOS Gateway, SeaweedFS, OpenStack Swift with the S3 API. If you have nothing, [MinIO](https://min.io/) is the usual choice for a lab, and the CloudStack guide's [S3 backup storage](cloudstack.md#s3-backup-storage) section walks through setting it up.
- [Claude Code](https://claude.com/claude-code) installed on the same machine.

Export your credentials and endpoints as environment variables in the shell you start Claude Code from. The prompt builds the Kubernetes secrets from them, so you never paste a secret into the chat:

```bash
# Secrets - required
export CLOUDSTACK_API_KEY=...
export CLOUDSTACK_SECRET_KEY=...
export S3_ACCESS_KEY=...
export S3_SECRET_KEY=...
export CMON_LICENSE=...          # base64-encoded license
export CCX_ADMIN_PASSWORD=...    # optional, generated if unset

# Endpoints - optional, and not secret. Set them and the prompt skips the
# matching questions; leave them unset and it asks instead.
export CLOUDSTACK_API_URL=http://cloudstack.example.com:8080/client/api
export S3_ENDPOINT=minio.example.com:9000   # host[:port], no http:// prefix
export S3_BUCKET=ccx-backups
export S3_INSECURE=false                    # true for a self-signed or invalid S3 certificate
```

The `CLOUDSTACK_*` names are the ones the [Apache CloudStack Terraform provider](https://github.com/apache/cloudstack-terraform-provider) uses, so an existing environment usually works unchanged. The prompt also accepts `CS_URL`, `CS_APIKEY` and `CS_SECRET` as aliases.

To keep them out of your shell history, put the lines in a `0600` file and `source` it.

:::note

The two endpoints have different formats, and mixing them up is the most common
setup mistake. `CLOUDSTACK_API_URL` is a full URL ending in `/client/api`, while
`S3_ENDPOINT` is a bare `host[:port]` with no scheme, because that is what CCX
writes into `MYCLOUD_S3_ENDPOINT`. The prompt strips a leading `http://` or
`https://` from `S3_ENDPOINT` for you and tells you it did.

:::

Zone, network, service offering, disk offering and template IDs are deliberately
**not** read from the environment. The prompt discovers them with `cmk` and
validates each one before use - that the zone is Advanced and has a DNS domain,
that the disk offering is `iscustomized=true`, that the template is patched. If
you already have the IDs, export them as `CS_ZONE`, `CS_NETWORK`, `CS_OFFERING`,
`CS_DISK` and `CS_TEMPLATE`: the prompt treats them as hints, pre-selects them in
its tables, and still runs every check.

:::caution

The prompt tells Claude never to print secrets and to ask before running any command that changes your cluster or CloudStack. Still, review every command before you approve it.

:::

## Use the prompt

1. Start Claude Code in an empty working directory, from the shell with the variables exported: `claude`
2. Copy the prompt below with the copy button in the top-right corner of the block.
3. Paste it into Claude Code and answer the questions.

## The prompt

````text
Help me get a **quick-start CCX install** running on Kubernetes, with **Apache CloudStack** as the cloud where database nodes are deployed. Fetch these docs first. They are the source of truth, so stop and tell me if this prompt disagrees with them:

- https://severalnines.github.io/ccx-docs/docs/admin/Installation/Cloud-Providers/cloudstack/
- https://severalnines.github.io/ccx-docs/docs/admin/Installation/
- https://severalnines.github.io/ccx-docs/docs/admin/Installation/Tutorial-openstack (same flow, different cloud)

## What I have

- A **Helm chart tarball** (`ccx`, `ccxdeps`) from Severalnines. Use it instead of the public Helm repo, and check every values key against its files.
- A **Google service account JSON key** for pulling the private CCX images (e.g. cmon on `eu.gcr.io`). If I don't have one, tell me to ask johan@severalnines.com, then stop.
- CloudStack API access, ideally with `cmk` configured.
- `kubectl` and `helm` access to the cluster.
- **Credentials exported as environment variables** in the shell I started you from. Never ask me for their values, and never print them:
  - `CLOUDSTACK_API_KEY`, `CLOUDSTACK_SECRET_KEY` (aliases: `CS_APIKEY`, `CS_SECRET`)
  - `S3_ACCESS_KEY`, `S3_SECRET_KEY`
  - `CMON_LICENSE` (base64)
  - `CCX_ADMIN_PASSWORD` (optional; generated if unset)

  Check each one with `printenv <NAME> >/dev/null && echo set || echo MISSING`. If a required one is missing, tell me to exit, export it, and start you again. `CCX_ADMIN_PASSWORD` is optional: if it's unset, leave `ccx.admin.password` out. Report the **length** of each secret you found and flag any that looks implausibly short for what it is, without printing the value.
- **Endpoints, optionally exported** in the same shell. These are **not** secrets, so read them, show me the value, and ask me to confirm rather than asking me to type it again. If one is unset, ask for it in Phase 0:
  - `CLOUDSTACK_API_URL` (alias: `CS_URL`) - full URL ending in `/client/api`.
  - `S3_ENDPOINT` - `host[:port]` with **no scheme**. If it starts with `http://` or `https://`, strip that, use the rest, and tell me you did. CCX always reaches S3 over **HTTPS**, so the scheme carries no information and a plain-HTTP endpoint will not work.
  - `S3_BUCKET` - the bucket name.
  - `S3_INSECURE` - `true` when the S3 certificate is self-signed or invalid. It maps **directly** to `MYCLOUD_S3_INSECURE_SSL`; do not invert it.

## Rules

1. Work **one phase at a time**, and wait for my OK before starting the next.
2. **Never guess** UUIDs, CIDRs, domains or sizes. Look them up, show a short table, and let me pick.
3. **Ask before changing anything**: `kubectl apply/create/run`, `helm install/upgrade`, `cmk create/deploy/delete`. Read-only commands are fine.
4. **Secrets only come from the environment variables above** and go into Kubernetes secrets or a `0600` values file. Never print them or ask me for them, and keep them out of command arguments: pipe generated manifests into `kubectl apply -f -`. Only show key names or lengths.
5. Use `-n <ns>` on every `kubectl` and `helm` command.

## Must match

- **Use one cloud code everywhere** (e.g. `mycloud`): `ccx.config.clouds[].code`, the key under `cloudstack_vendors`, the secret name, the uppercase key prefix (`MYCLOUD_CLOUDSTACK_API_KEY`) and `ccx.cloudSecrets`.
- `availability_zones[].code` is the CloudStack **zone UUID** and `network_id` is the guest network UUID. CCX supports one zone per region.
- `instance_types[].type` is a **service offering UUID**. Take `cpu` from the offering. `ram` is in GB, while CloudStack reports `memory` in MiB, so divide by 1024 (4096 → 4).
- `volume_types[].code` is a **disk offering UUID with `iscustomized=true`**.
- **Every database enabled in `ccx.config.databases` needs a `database_vendors` entry with the same name.** Deploying a database without one fails with `no rules defined for database <name>`. The chart enables `mariadb`, `percona`, `postgres`, `valkey_sentinel` and `microsoft` by default. To offer fewer, copy the chart's full `databases` list into the values file (Helm replaces lists) and set `enabled: false` on the rest.
- Keep `ccx.env.USE_PUBLIC_IPS: "true"`, and keep the image tags from the tarball.

## Phase 0: Questions

Ask a few at a time:

- `ccxFQDN` (e.g. `ccx.example.com`) and `ccFQDN` (e.g. `cc.example.com`). DNS names for datastores (`ccx.userDomain`) are optional: only use them if external-dns is already running, or if I name an existing Kubernetes secret (or workload identity) for its DNS provider. Otherwise skip them for the quick start.
- TLS: a cert-manager ClusterIssuer (`ccx.ingress.ssl.clusterIssuer`), or existing certificates. Also ask whether the domains are public and reachable from the internet. With existing certificates, `ccxFQDN` uses the secret in `ccx.ingress.ssl.secretName`, and the admin portal uses a secret named exactly `<ccFQDN>`.
- Admin portal allowlist (`ccx.ingress.whitelist`, empty = public), and the admin email (`ccx.admin.email`). The password comes from `CCX_ADMIN_PASSWORD` or is generated.
- Kubernetes context, namespace (default `ccx`), storage class.
- CloudStack API URL (skip if `CLOUDSTACK_API_URL` is set - show it and confirm), `verify_ssl`, cloud code and name, region (code, name, city, country, continent).
- Databases to offer (from the chart's `ccx.config.databases`), and the end-user CIDRs allowed to reach them.
- S3 for backups: endpoint `host[:port]`, bucket, and whether its TLS certificate is valid. Skip whichever of these `S3_ENDPOINT`, `S3_BUCKET` and `S3_INSECURE` already answer - show the values and confirm them in one go. If I have no S3-compatible storage yet, say that MinIO is the usual choice for a lab and point me at the **S3 backup storage** section of the CloudStack guide.

  Then check the endpoint before we build anything on it, because these surface much later as broken backups:

  - `curl -sSI --max-time 10 https://<endpoint>` - it must answer over **HTTPS**. If only plain HTTP answers, stop and tell me: CCX always connects over HTTPS and bucket creation will fail at deploy time.
  - If the host part is a **bare IP address**, warn me that no public CA issues certificates for private IPs, so the endpoint needs `S3_INSECURE=true` or a DNS name.
- Paths to the chart tarball and the service account key.

## Phase 1: Kubernetes

- `kubectl get nodes -L kubernetes.io/arch` must show `amd64` everywhere. Docs sizing: 3 × 4 vCPU / 8 GB, about 100 GiB of PVCs.
- `kubectl get storageclass`: if there is no default class, or I picked a different one, find the storage class keys in both charts and set them in Phases 4 and 6.
- Note which of ingress-nginx, cert-manager and external-dns are missing.
- **Namespace:** check `kubectl get namespace <ns>`. If it's missing, create it after I confirm. Every later step needs it.
- **Source IP as CloudStack sees it:** the firewall rules must allow the address the cluster's traffic appears from **on the path to the CloudStack public range**. With my OK, run a short-lived pod on **each node** (`nodeName` override). If the public range is routed privately (e.g. a static route), use the `src` from `ip route get <an IP in the public range>`. Otherwise use `curl -s ifconfig.me`. Record every distinct IP.

## Phase 2: CloudStack (read-only)

- If `cmk` isn't configured, set it up from `CLOUDSTACK_API_URL`, `CLOUDSTACK_API_KEY` and `CLOUDSTACK_SECRET_KEY` without printing the keys.
- `CS_ZONE`, `CS_NETWORK`, `CS_OFFERING` and `CS_DISK` may be set. Treat them as **hints, not answers**: mark the matching row in each table below as pre-selected, run every check on it as if I had picked it, and say so. A hint that fails its check is reported and dropped, never used.
- Zone (`cmk list zones`): it must have a DNS domain set. Network (`cmk list networks zoneid=<id>`): an isolated guest network.
- Service offerings (`cmk list serviceofferings filter=name,id,cpunumber,memory,rootdisksize`): we recommend **at least 20 GB of root disk**. A `rootdisksize` on the offering overrides the 20 GB CCX asks for. Offer only those whose effective root size is at least 20 GB and at least the template's size.
- Disk offerings with `iscustomized=true`: ask for default, minimum and maximum GiB.
- Public IPs: one per node, plus the virtual router, console proxy and storage VM. Say how many nodes fit.
- A pod must be able to reach the public IP range (it may need a static route). The S3 firewall must allow that range, because nodes connect out from their public IPs.

## Phase 3: Guest template

A stock Ubuntu 24.04 image fails on CloudStack. Follow the docs' **Guest template requirements**: patch cloud-init, confirm `cloud-init status` exits `0`, reset the image, and register it with `sshkeyenabled=true`. Then, with my OK, deploy a test VM **from the registered template**, run the check again, and delete the VM. Record `template_id`.

If `CS_TEMPLATE` is set, do **not** assume it is patched - an ID left over from an earlier setup is usually the stock image, and every deploy then fails at host init. Check that it exists and reports `sshkeyenabled: true`, then run the test-VM check above against it. Use it only if `cloud-init status` exits `0`; otherwise tell me it isn't usable and build the template from scratch.

## Phase 4: Pull secret and dependencies

- Unpack the tarball. `ccx.imagePullSecret` is used by the chart templates even if `values.yaml` doesn't list it. Check with `grep -rn imagePullSecret`.
- With a small script, write a `0600` `.dockerconfigjson` for `eu.gcr.io` (username `_json_key`, password = the key file's contents). Then run `kubectl create secret generic gcr-pull -n <ns> --type=kubernetes.io/dockerconfigjson --from-file=.dockerconfigjson=<file>`, and delete the file.
- Install `ccxdeps` from the tarball. Add `ingressController.enabled=true` or `cert-manager.enabled=true` only for what's missing, plus external-dns only if I gave its provider credentials secret (and set its provider values). Wait for all pods.
- If the ClusterIssuer I named doesn't exist, create it after I confirm. For public domains, use Let's Encrypt as the OpenStack tutorial shows. For private domains (e.g. `.local`, or a lab behind NAT), Let's Encrypt can't issue, so use a self-signed ClusterIssuer (`spec.selfSigned: {}`) or a CA ClusterIssuer from my own CA secret, and tell me browsers will warn until that CA is trusted. For existing certificates, both TLS secrets must exist in `<ns>`: the one in `ccx.ingress.ssl.secretName` (covering `ccxFQDN`) and one named `<ccFQDN>`.
- Show the A records for both FQDNs pointing at the ingress `EXTERNAL-IP`, and wait until they resolve.

## Phase 5: Cloud secret

Generate this secret with a small script that reads the environment variables, and pipe it straight into `kubectl apply -n <ns> -f -`, after I confirm. Nothing is written to disk or printed:

```
apiVersion: v1
kind: Secret
metadata:
  name: mycloud
  namespace: <ns>
type: Opaque
stringData:
  MYCLOUD_CLOUDSTACK_API_KEY: $CLOUDSTACK_API_KEY
  MYCLOUD_CLOUDSTACK_API_SECRET_KEY: $CLOUDSTACK_SECRET_KEY
  MYCLOUD_S3_ENDPOINT: <$S3_ENDPOINT, scheme stripped, or the host[:port] I gave you>
  MYCLOUD_S3_ACCESSKEY: $S3_ACCESS_KEY
  MYCLOUD_S3_SECRETKEY: $S3_SECRET_KEY
  MYCLOUD_S3_BUCKETNAME: <$S3_BUCKET, or the bucket I gave you>
  MYCLOUD_S3_INSECURE_SSL: <$S3_INSECURE, or "true" if the S3 certificate is self-signed or invalid, else "false">
```

Check it with `kubectl get secret mycloud -n <ns> -o json | jq '.data | map_values(length)'`.

## Phase 6: Values and install

Write `ccx-cloudstack-values.yaml`:

- `ccxFQDN`, `ccFQDN`, TLS, `ccx.ingress.whitelist`, `ccx.admin.email`, storage class if needed. No secrets go in this file.
- `ccx.cloudSecrets: [mycloud]`, `ccx.imagePullSecret: gcr-pull`, `ccx.userDomain` if used, and `ccx.config.databases` if I'm not offering all the defaults.
- `ccx.env`: `USE_PUBLIC_IPS: "true"`, `REQUIRE_EMAIL_VERIFICATION: "false"`, `REQUIRE_SUBSCRIPTION: "false"`.
- `ccx.config.clouds`: one `type: cloudstack` cloud with instance types, volume types, network type `public` (`in_vpc: false`), and a region with one AZ (zone UUID + `network_id`).
- `ccx.services.deployer.config.cloudstack_vendors.mycloud`: `url`, `verify_ssl`, `no_expunge: false`, `template_id`, `zone`, `network_id`, and one `database_vendors` entry per **enabled** database:

```
security_groups:
  - { cidr: <cluster outbound IP>/32, ip_protocol: tcp, from_port: 1,    to_port: 65535 }  # one per outbound IP
  - { cidr: <end-user CIDR>,          ip_protocol: tcp, from_port: 5432, to_port: 5432 }   # the database port only
```

Ports: 3306 for MariaDB and Percona, 5432 for PostgreSQL, 6379 for Valkey, 1433 for MSSQL. Never open `1-65535` to end users.

The chart only accepts the license and admin password as values. Generate `ccx-secrets.values.yaml` (`0600`, never shown) from `CMON_LICENSE` and `CCX_ADMIN_PASSWORD` with a script, containing `cmon.license` and `ccx.admin.password`. Tell me to keep it private and out of git, because upgrades need it again.

Then:

1. Show me `ccx-cloudstack-values.yaml`, but not the secrets file.
2. Run `helm upgrade --install ccx <chart> -n <ns> -f ccx-cloudstack-values.yaml -f ccx-secrets.values.yaml --dry-run=server > <0600 file>`. Report only the exit status and errors, then delete that output file.
3. With my OK, run the same command with `--wait` instead of `--dry-run=server`.
4. Check that `kubectl get configmap ccx -n <ns> -o jsonpath='{.data.USE_PUBLIC_IPS}'` is `true`.
5. Check that `ccx-config-core` contains `template_id` and the vendor key.

## Phase 7: Smoke test

Register at `https://<ccxFQDN>/auth/register?from=ccx` and deploy a 3-node datastore of one of the enabled databases while watching `kubectl logs -f -n <ns> deploy/ccx-runner-service`. Prefer PostgreSQL. Check the datastore reaches Available. Then delete it and confirm its VMs, IPs and volumes are gone.

If something fails:

- `cloud-init status` exits 2 → the template isn't patched.
- SSH error at host init → wrong outbound IP rule, or the template is missing `sshkeyenabled`.
- `no rules defined for database` → a `database_vendors` entry is missing.
- IP allocation error → the public IP pool is full.
- `402` → the `REQUIRE_*` flags are still on.
- `ImagePullBackOff` → there's a problem with `gcr-pull`.
- `Missing secret ... cloudSecrets` → the secret isn't in `<ns>`.
- `Endpoint url cannot have fully qualified paths` → a scheme leaked into `MYCLOUD_S3_ENDPOINT`.

Finish with the URLs, where the admin login is (the `admin-users` secret), the IDs used, and a reminder that **`apt upgrade cloud-init` on a node reverts the template patch.**
````
