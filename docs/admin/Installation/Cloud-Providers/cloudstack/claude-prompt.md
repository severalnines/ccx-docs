---
title: Install CCX supporting CloudStack with Claude (Beta)
sidebar_label: Claude prompt
sidebar_class_name: sidebar-badge-beta
---

# Install CCX supporting CloudStack with Claude <span className="badge badge--warning">Beta</span>

This page contains a ready-made prompt for [Claude Code](https://claude.com/claude-code) that gets a quick-start CCX install running with CloudStack as the cloud provider. It follows the [CloudStack guide](cloudstack.md), asks for your domains, networks and instance types, reads credentials from environment variables, looks up the CloudStack IDs from the CloudStack API, and waits for your approval before changing anything.

## Before you start

You need:

- The CCX Helm charts tarball from Severalnines.
- Credentials for the private CCX images on `eu.gcr.io`. Recent tarballs ship a ready-made `gcr.yaml` Secret manifest; if yours does not, you need a Google service account JSON key instead. Contact [johan@severalnines.com](mailto:johan@severalnines.com) for either.
- `kubectl` and `helm` access to the Kubernetes cluster that will run CCX.
- CloudStack API access (API URL, API key and secret key). [CloudMonkey (`cmk`)](https://github.com/apache/cloudstack-cloudmonkey) is convenient but optional - the prompt can sign API calls itself.
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
export S3_INSECURE=false                    # true only for a self-signed cert - see the caution below
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

:::caution S3 must answer over HTTPS

CCX always reaches S3 over HTTPS, so a plain-HTTP endpoint does not work. The
prompt checks this in Phase 0, before anything is built on it, because the
failure otherwise surfaces much later as broken backups.

`S3_INSECURE=true` is the right setting for a self-signed or otherwise untrusted
certificate, and it covers CCX's bucket management and the credentials it
registers with ClusterControl.

One caveat applies only if you turn wal-g on. The chart ships
`ccx.services.runner.env.USE_WALG: "true"`, and wal-g does **not** honour
`S3_INSECURE_SSL`: PostgreSQL WAL archiving then fails with
`x509: certificate signed by unknown authority` while `pg_wal` grows unchecked.
The prompt sets `USE_WALG: "false"` unconditionally, so PostgreSQL uses
`pg_basebackup` through ClusterControl, which does honour the flag. If you want
wal-g, give S3 a DNS name and a trusted certificate first - see
[S3 backup storage](cloudstack.md#s3-backup-storage) in the CloudStack guide.

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

- A **Helm chart tarball** from Severalnines. **Ask me for its path first, before searching for it** - guessing wastes a round trip and may pick up an old copy. Unpack it and check every values key against its files; the chart's own `minimal-values-cloudstack.yaml` beats any published example. The tarball may contain only the `ccx` chart, in which case take `ccxdeps` from `https://severalnines.github.io/helm-charts/`.
- Credentials for the private `eu.gcr.io` images. Look **inside the tarball first**: recent ones ship a `gcr.yaml` Secret manifest (name `gcr-pull-secret`, type `kubernetes.io/dockerconfigjson`) ready to `kubectl apply -n <ns>`. Only if it isn't there, ask me for a Google service account JSON key; if I don't have one either, tell me to ask johan@severalnines.com, then stop.
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
6. **Prove a check works before trusting it.** Any test that can fail for an uninteresting reason - a registry probe, a readiness check, a credential test - must be run against a case you know passes, so a broken method cannot read as a real result.
7. **A pod is not ready because it is Running.** Judge readiness per container (`.status.containerStatuses[].ready`), never on `.status.phase`. A crashlooping container sits in `Running` between restarts.

## Must match

- **Use one cloud code everywhere** (e.g. `mycloud`): `ccx.config.clouds[].code`, the key under `cloudstack_vendors`, the secret name, the uppercase key prefix (`MYCLOUD_CLOUDSTACK_API_KEY`) and `ccx.cloudSecrets`. The deployer indexes `cloudstack_vendors` by the cloud's own `code`, and does not check the key exists, so a mismatch crashes it on a nil pointer before any validation reports it. The chart's `minimal-values-cloudstack.yaml` ships this mismatch (`code: mycloud` with a `cloudstack:` vendor key) - do not copy it.
- `availability_zones[].code` is the CloudStack **zone UUID** and `network_id` is the guest network UUID. CCX supports one zone per region.
- `instance_types[].type` is a **service offering UUID**. Take `cpu` from the offering. `ram` is in GB, while CloudStack reports `memory` in MiB, so divide by 1024 (4096 → 4).
- `volume_types[].code` is a **disk offering UUID with `iscustomized=true`**.
- **Every database enabled in `ccx.config.databases` needs a `database_vendors` entry with the same name.** Deploying a database without one fails with `no rules defined for database <name>`. The chart enables `mariadb`, `percona`, `postgres`, `valkey_sentinel` and `microsoft` by default. To offer fewer, copy the chart's full `databases` list into the values file (Helm replaces lists) and set `enabled: false` on the rest.
- Keep `ccx.env.USE_PUBLIC_IPS: "true"`, and keep the image tags from the tarball.
- Set `ccx.services.runner.env.USE_WALG: "false"`. The chart defaults it to `"true"`, and wal-g ignores `S3_INSECURE_SSL`. Do not ask me about this - just set it.
- **`cmon.license` must be the licence blob base64-encoded *again*.** The chart puts it under `data:` in the `cmon-license` secret, so Kubernetes decodes it once on mount, and cmon wants the base64 text, not the decoded bytes. Pass `base64(<$CMON_LICENSE with whitespace stripped>)`. `CMON_LICENSE` usually arrives with newlines from base64 line-wrapping - strip them first.
- **`ccx.ingress.whitelist` must be a comma-separated string**, not a YAML list. The chart interpolates it directly into the nginx annotation, so a list renders as `[10.0.0.0/8]`, nginx rejects it with `AnnotationParsingFailed`, and the admin portal serves 503.

## Phase 0: Questions

Ask a few at a time:

- `ccxFQDN` (e.g. `ccx.example.com`) and `ccFQDN` (e.g. `cc.example.com`). DNS names for datastores (`ccx.userDomain`) are optional: only use them if external-dns is already running, or if I name an existing Kubernetes secret (or workload identity) for its DNS provider. Otherwise skip them for the quick start.
- TLS: a cert-manager ClusterIssuer (`ccx.ingress.ssl.clusterIssuer`), or existing certificates. Also ask whether the domains are public and reachable from the internet. With existing certificates, `ccxFQDN` uses the secret in `ccx.ingress.ssl.secretName`, and the admin portal uses a secret named exactly `<ccFQDN>`.
- Admin portal allowlist (`ccx.ingress.whitelist`, empty = public), and the admin email (`ccx.admin.email`). The password comes from `CCX_ADMIN_PASSWORD` or is generated.
- Kubernetes context, namespace (default `ccx`), storage class.
- CloudStack API URL (skip if `CLOUDSTACK_API_URL` is set - show it and confirm), `verify_ssl`, cloud code and name, region (code, name, city, country, continent).
- Databases to offer (from the chart's `ccx.config.databases`), and the end-user CIDRs allowed to reach them.
- S3 for backups: endpoint `host[:port]`, bucket, and whether its TLS certificate is valid. Skip whichever of these `S3_ENDPOINT`, `S3_BUCKET` and `S3_INSECURE` already answer - show the values and confirm them in one go. If I have no S3-compatible storage yet, say that MinIO is the usual choice for a lab and point me at the **S3 backup storage** section of the CloudStack guide.

  Then check the endpoint before we build anything on it, because both failures below surface much later as broken backups:

  - `curl -sSI --max-time 10 https://<endpoint>` - it must answer over **HTTPS**. If only plain HTTP answers, stop and tell me: CCX always connects over HTTPS and bucket creation will fail at deploy time.
  - If the host part is a **bare IP address**, warn me that no public CA issues certificates for private IPs, so PostgreSQL datastores cannot work against it.
  - Confirm the credentials actually work before building on them, with a signed request (AWS SigV4) rather than an unauthenticated one: `curl -sk --aws-sigv4 "aws:amz:us-east-1:s3" -u <key>:<secret> https://<endpoint>/`. A `200` means valid. Do this even when a key looks implausibly short - length proves nothing either way.
  - The bucket named in `S3_BUCKET` does **not** need to exist. CCX creates one bucket per datastore, named `ccx-<datastore uuid>`, and `MYCLOUD_S3_BUCKETNAME` is only consulted when cleaning backups up at delete time. Do not pre-create it or treat a `404` on it as an error.
- The chart tarball path (ask for this first) and, only if the tarball has no `gcr.yaml`, the service account key path.

## Phase 1: Kubernetes

- `kubectl get nodes -L kubernetes.io/arch` must show `amd64` everywhere. Docs sizing: 3 × 4 vCPU / 8 GB and about 60 GB of PVCs. If the cluster is smaller or single-node, say so and what it costs (no HA, no headroom), then carry on if I accept.
- `kubectl get storageclass`: if there is no default class, or I picked a different one, find the storage class keys in both charts and set them in Phases 4 and 6.
- Note which of ingress-nginx, cert-manager and external-dns are missing.
- **Namespace:** check `kubectl get namespace <ns>`. If it's missing, create it after I confirm. Every later step needs it.
- **Leftover CRDs from a previous CCX install.** Helm never removes CRDs on uninstall, so a rebuilt cluster keeps them and the next `ccxdeps` install dies with `conflict ... with "postgres-operator" ... .spec.versions`. `--take-ownership` does not help - Helm's `crds/` path ignores it. Run `kubectl get crd | grep -E 'acid.zalan.do|mysql.oracle.com|zalando.org'`. If any exist, check each has **zero** custom resources and no owning release, show me the list, and delete them only after I confirm.
- **Source IP as CloudStack sees it:** the firewall rules must allow the address the cluster's traffic appears from **on the path to the CloudStack public range**. With my OK, run a short-lived pod on **each node** (`nodeName` override). If the public range is routed privately (e.g. a static route), use the `src` from `ip route get <an IP in the public range>`. Otherwise use `curl -s ifconfig.me`. Record every distinct IP.

## Phase 2: CloudStack (read-only)

- If `cmk` isn't configured, either set it up from `CLOUDSTACK_API_URL`, `CLOUDSTACK_API_KEY` and `CLOUDSTACK_SECRET_KEY` without printing the keys, or skip it and sign the API calls yourself - installing `cmk` is not worth a detour. When signing: sort parameters by lowercased key, join as `k=v`, lowercase the whole string, HMAC-SHA1 with the secret, base64. Percent-encode with `%20` for spaces, **not** `+`, or every call with a space in a value returns 401.
- `CS_ZONE`, `CS_NETWORK`, `CS_OFFERING` and `CS_DISK` may be set. Treat them as **hints, not answers**: mark the matching row in each table below as pre-selected, run every check on it as if I had picked it, and say so. A hint that fails its check is reported and dropped, never used.
- Zone (`cmk list zones`): it must have a DNS domain set. Network (`cmk list networks zoneid=<id>`): an isolated guest network.
- Service offerings (`cmk list serviceofferings filter=name,id,cpunumber,memory,rootdisksize`): we recommend **at least 20 GB of root disk**. A `rootdisksize` on the offering overrides the 20 GB CCX asks for. Offer only those whose effective root size is at least 20 GB and at least the template's size.
- Disk offerings with `iscustomized=true`: ask for default, minimum and maximum GiB.
- Public IPs: one per node via static NAT, plus one for the virtual router's source NAT. The console proxy and secondary storage VMs each take one too, but per zone, not per datastore. Count what is free and say how many datastores fit.
- A pod must be able to reach the public IP range (it may need a static route). The S3 firewall must allow that range, because nodes connect out from their public IPs.

## Phase 3: Guest template

A stock Ubuntu 24.04 image fails on CloudStack. Follow the docs' **Guest template requirements**: patch cloud-init, confirm `cloud-init status` exits `0`, reset the image, and register it with `sshkeyenabled=true`. Then, with my OK, deploy a test VM **from the registered template**, run the check again, and delete the VM. Record `template_id`.

If `CS_TEMPLATE` is set, do **not** assume it is patched - an ID left over from an earlier setup is usually the stock image, and every deploy then fails at host init. A name or description claiming it is patched is not evidence either. Check that it exists and reports `sshkeyenabled: true`, then run the test-VM check above against it. Use it only if `cloud-init status` exits `0`; otherwise tell me it isn't usable and build the template from scratch.

While that test VM is up, it is the only chance to settle two things cheaply, both of which otherwise fail much later:

- **What source address a pod really presents.** Connect to the VM from an ordinary (non-`hostNetwork`) pod and read the peer address on the VM - `tcpdump` on a port you opened, or the sshd log. Confirm it matches the Phase 1 answer. This is the CIDR every `database_vendors` rule depends on; wrong, and every deploy fails at SSH host init.
- **Whether a node can reach S3.** `curl -k https://<s3 endpoint>` from the VM. Nodes connect out from their public IPs, so this is the only realistic test of the S3 firewall path.

## Phase 4: Pull secret and dependencies

- `ccx.imagePullSecret` is used by the chart templates even if `values.yaml` doesn't list it. Check with `grep -rn imagePullSecret`, and set it to the **actual name of the secret you create** - if the tarball ships `gcr.yaml`, that name is `gcr-pull-secret`, not `gcr-pull`.
- Create the pull secret. If the tarball has `gcr.yaml`, just `kubectl apply -n <ns> -f gcr.yaml` (it carries no namespace of its own). Otherwise write a `0600` `.dockerconfigjson` for `eu.gcr.io` (username `_json_key`, password = the key file's contents), `kubectl create secret generic <name> -n <ns> --type=kubernetes.io/dockerconfigjson --from-file=.dockerconfigjson=<file>`, and delete the file.
- **Verify the credential before installing anything.** For each private image in the chart's values, fetch a registry token with the secret's `auth` and request the manifest; a `200` means pullable. Run the same check against a known-public image first - if that control does not return `200`, your method is broken and the private results mean nothing. Finding this out now costs a minute; finding out during the install costs a failed release.
- Install `ccxdeps`. Add `ingressController.enabled=true` or `cert-manager.enabled=true` only for what's missing, plus external-dns only if I gave its provider credentials secret (and set its provider values). Wait for all pods, judging readiness per container. `ccxdeps` also provides the `victoria-metrics` Service that the ccx chart looks up for `prometheusHostname`, so it must be running before Phase 6.
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
- `ccx.cloudSecrets: [mycloud]`, `ccx.imagePullSecret: <the pull secret's real name>`, `ccx.userDomain` if used, and `ccx.config.databases` if I'm not offering all the defaults.
- `ccx.env`: `USE_PUBLIC_IPS: "true"`, `REQUIRE_EMAIL_VERIFICATION: "false"`, `REQUIRE_SUBSCRIPTION: "false"`. And `ccx.services.runner.env.USE_WALG: "false"`.
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
2. Run `helm upgrade --install ccx <chart> -n <ns> -f ccx-cloudstack-values.yaml -f ccx-secrets.values.yaml --dry-run=server > <0600 file>`. Report only the exit status and errors, then delete that output file. It must be `--dry-run=server`: the chart resolves `prometheusHostname` with a `lookup`, which always returns empty under plain `helm template`, so a client-side render fails with a `prometheusHostname is required` error that means nothing.
3. With my OK, run the same command with `--wait` instead of `--dry-run=server`.
4. Check that `kubectl get configmap ccx -n <ns> -o jsonpath='{.data.USE_PUBLIC_IPS}'` is `true`.
5. Check that `ccx-config-core` contains `template_id` and the vendor key.
6. Check that **every** pod using a private image ended up with a pull secret: `kubectl get pod -n <ns> <pod> -o jsonpath='{.spec.imagePullSecrets[*].name}'`. If one has none, the chart forgot it - don't edit the chart, attach the secret to the namespace's ServiceAccount (`kubectl patch serviceaccount default -n <ns> -p '{"imagePullSecrets":[{"name":"<name>"}]}'`) and recreate that pod.
7. If the release sits at `pending-install` with a pod restarting, look at **cmon** first. Its `startupProbe` is the command that installs the licence, so a wrong `cmon.license` encoding means it never passes, cmon CrashLoopBackOffs, and `--wait` hangs with nothing anywhere mentioning a licence. The tell is `Malformatted JSon request` in the pod events. Confirm with `kubectl logs -n <ns> cmon-0 -c cmon | grep -i licen`: it must say **enterprise**, not community.
8. Open both FQDNs. `https://<ccFQDN>` returning 503 while `https://<ccxFQDN>` is fine means the whitelist annotation didn't parse - check the ingress controller log for `AnnotationParsingFailed`.

## Phase 7: Smoke test

Register at `https://<ccxFQDN>/auth/register?from=ccx` and deploy a 3-node datastore of one of the enabled databases while watching `kubectl logs -f -n <ns> deploy/ccx-runner-service`. PostgreSQL is a good default: with `USE_WALG: "false"` its backups go through `pg_basebackup`, which honours `S3_INSECURE_SSL`. Check the datastore reaches Available. Then delete it **through CCX** and confirm its VMs, public IPs, volumes and its `ccx-<uuid>` bucket are gone.

Tell me to always delete datastores through CCX before uninstalling the chart. Uninstalling first orphans their VMs, IPs and buckets, and they then have to be cleaned up by hand.

If something fails:

- `cloud-init status` exits 2 → the template isn't patched.
- SSH error at host init → wrong outbound IP rule, or the template is missing `sshkeyenabled`.
- `no rules defined for database` → a `database_vendors` entry is missing.
- IP allocation error → the public IP pool is full.
- `402` → the `REQUIRE_*` flags are still on.
- `ImagePullBackOff` → the pull secret is missing, misnamed, or absent from that one pod's spec.
- `Missing secret ... cloudSecrets` → the secret isn't in `<ns>`.
- `Endpoint url cannot have fully qualified paths` → a scheme leaked into `MYCLOUD_S3_ENDPOINT`.
- `x509: certificate signed by unknown authority` on a backup → wal-g got switched on; it ignores `S3_INSECURE_SSL` and needs a trusted certificate.
- `Malformatted JSon request` in cmon's events, release stuck at `pending-install` → `cmon.license` needs the extra base64 layer.
- Admin portal 503 while the main UI works → `ccx.ingress.whitelist` was passed as a list instead of a comma-separated string.
- `helm install` fails on a CRD `conflict ... .spec.versions` → CRDs left behind by a previous install.
- `unknown cloudstack vendor`, or the deployer crashing on startup → the `cloudstack_vendors` key doesn't match `clouds[].code`.

Finish with the URLs, where the admin login is (the `admin-users` secret), the IDs used, and a reminder that **`apt upgrade cloud-init` on a node reverts the template patch.**
````
