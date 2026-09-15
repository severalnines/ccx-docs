---
sidebar_label: Claude prompt
---

# Install CCX on CloudStack with Claude

This page contains a ready-made prompt for [Claude Code](https://claude.com/claude-code) that gets a quick-start CCX install running with CloudStack as the cloud provider. It follows the [CloudStack guide](cloudstack.md), asks for your domains, networks and instance types, reads credentials from environment variables, looks up the CloudStack IDs with `cmk`, and waits for your approval before changing anything.

## Before you start

You need:

- The CCX Helm charts tarball from Severalnines.
- A Google service account JSON key, used to pull the private CCX images. Contact [johan@severalnines.com](mailto:johan@severalnines.com) to get one.
- `kubectl` and `helm` access to the Kubernetes cluster that will run CCX.
- CloudStack API access (API URL, API key and secret key), ideally with [CloudMonkey (`cmk`)](https://github.com/apache/cloudstack-cloudmonkey) configured.
- [Claude Code](https://claude.com/claude-code) installed on the same machine.

Export your credentials as environment variables in the shell you start Claude Code from. The prompt builds the Kubernetes secrets from them, so you never paste a secret into the chat:

```bash
export CLOUDSTACK_API_KEY=...
export CLOUDSTACK_SECRET_KEY=...
export S3_ACCESS_KEY=...
export S3_SECRET_KEY=...
export CMON_LICENSE=...          # base64-encoded license
export CCX_ADMIN_PASSWORD=...    # optional, generated if unset
```

To keep them out of your shell history, put the lines in a `0600` file and `source` it.

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
- **Credentials exported as environment variables** in the shell I started you from. Never ask me for their values:
  - `CLOUDSTACK_API_KEY`, `CLOUDSTACK_SECRET_KEY`
  - `S3_ACCESS_KEY`, `S3_SECRET_KEY`
  - `CMON_LICENSE` (base64)
  - `CCX_ADMIN_PASSWORD` (optional; generated if unset)

  Check each one with `printenv <NAME> >/dev/null && echo set || echo MISSING`. If a required one is missing, tell me to exit, export it, and start you again. `CCX_ADMIN_PASSWORD` is optional: if it's unset, leave `ccx.admin.password` out.

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
- `database_vendors[].name` must match exactly: `mariadb`, `percona`, `postgres`, `redis`, `microsoft`, `valkey_sentinel`. A database with no entry fails with `no rules defined for database <name>`.
- Keep `ccx.env.USE_PUBLIC_IPS: "true"`, and keep the image tags from the tarball.

## Phase 0: Questions

Ask a few at a time:

- `ccxFQDN` (e.g. `ccx.example.com`), `ccFQDN` (e.g. `cc.example.com`), and optionally `ccx.userDomain` plus an external-dns provider for datastore endpoints.
- TLS: a cert-manager ClusterIssuer (`ccx.ingress.ssl.clusterIssuer`), or existing certificates. With existing certificates, `ccxFQDN` uses the secret in `ccx.ingress.ssl.secretName`, and the admin portal uses a secret named exactly `<ccFQDN>`.
- Admin portal allowlist (`ccx.ingress.whitelist`, empty = public), and the admin email (`ccx.admin.email`). The password comes from `CCX_ADMIN_PASSWORD` or is generated.
- Kubernetes context, namespace (default `ccx`), storage class.
- CloudStack API URL, `verify_ssl`, cloud code and name, region (code, name, city, country, continent).
- Databases to offer, and the end-user CIDRs allowed to reach them.
- S3 for backups: endpoint `host[:port]`, bucket, and whether its TLS certificate is valid.
- Paths to the chart tarball and the service account key.

## Phase 1: Kubernetes

- `kubectl get nodes -L kubernetes.io/arch` must show `amd64` everywhere. Docs sizing: 3 × 4 vCPU / 8 GB, about 100 GiB of PVCs.
- `kubectl get storageclass`: if there is no default class, or I picked a different one, find the storage class keys in both charts and set them in Phases 4 and 6.
- Note which of ingress-nginx, cert-manager and external-dns are missing.
- **Namespace:** check `kubectl get namespace <ns>`. If it's missing, create it after I confirm. Every later step needs it.
- **Outbound IP:** with my OK, run a short-lived pod on **each node** (`nodeName` override) that runs `curl -s ifconfig.me`. The firewall rules need every distinct IP.

## Phase 2: CloudStack (read-only)

- If `cmk` isn't configured, set it up from `CLOUDSTACK_API_KEY` / `CLOUDSTACK_SECRET_KEY` without printing them.
- Zone (`cmk list zones`): it must have a DNS domain set. Network (`cmk list networks zoneid=<id>`): an isolated guest network.
- Service offerings (`cmk list serviceofferings filter=name,id,cpunumber,memory,rootdisksize`): we recommend **at least 20 GB of root disk**. A `rootdisksize` on the offering overrides the 20 GB CCX asks for. Offer only those whose effective root size is at least 20 GB and at least the template's size.
- Disk offerings with `iscustomized=true`: ask for default, minimum and maximum GiB.
- Public IPs: one per node, plus the virtual router, console proxy and storage VM. Say how many nodes fit.
- A pod must be able to reach the public IP range (it may need a static route). The S3 firewall must allow that range, because nodes connect out from their public IPs.

## Phase 3: Guest template

A stock Ubuntu 24.04 image fails on CloudStack. Follow the docs' **Guest template requirements**: patch cloud-init, confirm `cloud-init status` exits `0`, reset the image, and register it with `sshkeyenabled=true`. Then, with my OK, deploy a test VM **from the registered template**, run the check again, and delete the VM. Record `template_id`.

## Phase 4: Pull secret and dependencies

- Unpack the tarball. `ccx.imagePullSecret` is used by the chart templates even if `values.yaml` doesn't list it. Check with `grep -rn imagePullSecret`.
- With a small script, write a `0600` `.dockerconfigjson` for `eu.gcr.io` (username `_json_key`, password = the key file's contents). Then run `kubectl create secret generic gcr-pull -n <ns> --type=kubernetes.io/dockerconfigjson --from-file=.dockerconfigjson=<file>`, and delete the file.
- Install `ccxdeps` from the tarball. Add `ingressController.enabled=true` or `cert-manager.enabled=true` only for what's missing, plus external-dns if I asked for it. Wait for all pods.
- If the ClusterIssuer I named doesn't exist, create it as the OpenStack tutorial shows. For existing certificates, both TLS secrets must exist in `<ns>`: the one in `ccx.ingress.ssl.secretName` (covering `ccxFQDN`) and one named `<ccFQDN>`.
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
  MYCLOUD_S3_ENDPOINT: <host[:port], no scheme>
  MYCLOUD_S3_ACCESSKEY: $S3_ACCESS_KEY
  MYCLOUD_S3_SECRETKEY: $S3_SECRET_KEY
  MYCLOUD_S3_BUCKETNAME: <bucket>
  MYCLOUD_S3_INSECURE_SSL: <"true" if the S3 certificate is self-signed or invalid, else "false">
```

Check it with `kubectl get secret mycloud -n <ns> -o json | jq '.data | map_values(length)'`.

## Phase 6: Values and install

Write `ccx-cloudstack-values.yaml`:

- `ccxFQDN`, `ccFQDN`, TLS, `ccx.ingress.whitelist`, `ccx.admin.email`, storage class if needed. No secrets go in this file.
- `ccx.cloudSecrets: [mycloud]`, `ccx.imagePullSecret: gcr-pull`, `ccx.userDomain`.
- `ccx.env`: `USE_PUBLIC_IPS: "true"`, `REQUIRE_EMAIL_VERIFICATION: "false"`, `REQUIRE_SUBSCRIPTION: "false"`.
- `ccx.config.clouds`: one `type: cloudstack` cloud with instance types, volume types, network type `public` (`in_vpc: false`), and a region with one AZ (zone UUID + `network_id`).
- `ccx.services.deployer.config.cloudstack_vendors.mycloud`: `url`, `verify_ssl`, `no_expunge: false`, `template_id`, `zone`, `network_id`, and one `database_vendors` entry per database:

```
security_groups:
  - { cidr: <cluster outbound IP>/32, ip_protocol: tcp, from_port: 1,    to_port: 65535 }  # one per outbound IP
  - { cidr: <end-user CIDR>,          ip_protocol: tcp, from_port: 5432, to_port: 5432 }   # the database port only
```

Ports: 3306 for MariaDB and Percona, 5432 for PostgreSQL, 6379 for Redis and Valkey, 1433 for MSSQL. Never open `1-65535` to end users.

The chart only accepts the license and admin password as values. Generate `ccx-secrets.values.yaml` (`0600`, never shown) from `CMON_LICENSE` and `CCX_ADMIN_PASSWORD` with a script, containing `cmon.license` and `ccx.admin.password`. Tell me to keep it private and out of git, because upgrades need it again.

Then:

1. Show me `ccx-cloudstack-values.yaml`, but not the secrets file.
2. Run `helm upgrade --install ccx <chart> -n <ns> -f ccx-cloudstack-values.yaml -f ccx-secrets.values.yaml --dry-run=server > <0600 file>`. Report only the exit status and errors, then delete that output file.
3. With my OK, run the same command with `--wait` instead of `--dry-run=server`.
4. Check that `kubectl get configmap ccx -n <ns> -o jsonpath='{.data.USE_PUBLIC_IPS}'` is `true`.
5. Check that `ccx-config-core` contains `template_id` and the vendor key.

## Phase 7: Smoke test

Register at `https://<ccxFQDN>/auth/register?from=ccx` and deploy a 3-node PostgreSQL datastore while watching `kubectl logs -f -n <ns> deploy/ccx-runner-service`. Check the datastore reaches Available. Then delete it and confirm its VMs, IPs and volumes are gone.

If something fails:

- `cloud-init status` exits 2 → the template isn't patched.
- SSH error at host init → wrong outbound IP rule, or the template is missing `sshkeyenabled`.
- `no rules defined for database` → a `database_vendors` entry is missing.
- IP allocation error → the public IP pool is full.
- `402` → the `REQUIRE_*` flags are still on.
- `ImagePullBackOff` → there's a problem with `gcr-pull`.
- `Missing secret ... cloudSecrets` → the secret isn't in `<ns>`.

Finish with the URLs, where the admin login is (the `admin-users` secret), the IDs used, and a reminder that **`apt upgrade cloud-init` on a node reverts the template patch.**
````
