# Firewall and Air-Gapped Deployment

This document covers every external network dependency that CCX has at runtime. Use it to build firewall allowlists or to plan what must be mirrored or proxied when operating in a restricted or air-gapped environment.

There are two distinct planes with different requirements:

- **Control plane** – the Kubernetes cluster running CCX services (helm-ccx, helm-ccxdeps, clustercontrol).
- **Data plane** – the cloud VMs (database nodes) that CCX provisions on your cloud provider.

---

## 1. Container Image Registries

All container images must be reachable when Kubernetes pulls them. In an air-gapped environment, mirror every registry below to an internal registry and override the `image:` values in your Helm values files accordingly.

### helm-ccx images

| Registry | Used by |
|---|---|
| `eu.gcr.io/brave-night-121210` | All CCX backend services (stores, runner, rest, auth, notify, billing, monitor, state-worker), cmon |
| `europe-docker.pkg.dev/severalnines-public/clustercontrol` | ccmgr, kuber-proxy |
| `docker.io/severalnines` | cmon exporter (`severalnines/cmon_exporter-linux-amd64`) |
| `curlimages/curl` | `ccx-migrate-cloud-credentials` init job (hardcoded in template) |

### helm-ccxdeps images

| Registry | Used by |
|---|---|
| `docker.io/bitnamilegacy` | Keycloak (`bitnamilegacy/keycloak`) |
| `docker.io/bitnami` | kubectl init container in mysql-innodb-patch job (`bitnami/kubectl:latest`) |
| `docker.io/mysql` | mysql exporter init container (`mysql:8.4`) |
| `docker.io/prometheuscommunity` | postgres-exporter (`prometheuscommunity/postgres-exporter:v0.15.0`) |

### helm-ccxdeps chart repositories (Helm pull time)

These are only required when running `helm dependency update` or `helm install` for the first time. They are not needed at runtime, but must be accessible during CI/CD or the initial pull.

| Repository URL | Chart |
|---|---|
| `https://opensource.zalando.com/postgres-operator/charts/postgres-operator` | postgres-operator |
| `https://kubernetes.github.io/ingress-nginx` | ingress-nginx |
| `https://nats-io.github.io/k8s/helm/charts/` | nats |
| `https://kubernetes-sigs.github.io/external-dns/` | external-dns (optional) |
| `https://mysql.github.io/mysql-operator/` | mysql-operator / mysql-innodbcluster (optional) |
| `https://severalnines.github.io/helm-charts/` | ccx-monitoring |
| `oci://registry-1.docker.io/bitnamicharts` | keycloak |
| `oci://quay.io/jetstack/charts` | cert-manager (optional) |

### clustercontrol images

| Registry | Used by |
|---|---|
| `docker.io/severalnines` | cmon, cmon-sd, cmon exporter |
| `europe-docker.pkg.dev/severalnines-public/clustercontrol` | ccmgr, kuber-proxy |

---

## 2. License Server

CCX needs to push a valid ClusterControl (cmon) license on startup.

| Endpoint | Protocol/Port | Direction | Purpose |
|---|---|---|---|
| `severalnines.com/service/lic.php` | HTTPS / 443 | outbound from control plane | Trial license auto-fetch on first user registration (ccx-auth-service) |

**What happens without access:**

- If `cmon.license` is set in Helm values, the license is loaded from a Kubernetes Secret at startup via a `startupProbe`. No internet access is required for this path.
- If `cmon.license` is **not** set, ccx-auth-service attempts to fetch a trial license from `https://severalnines.com/service/lic.php` when the first user registers. If the call fails, the error is logged but user registration still succeeds; however, cmon remains unlicensed and will enforce cluster/node count limits.

**Recommendation for air-gapped environments:** Always set `cmon.license` with a pre-obtained license key in your Helm values. This avoids any outbound call to the license server.

Note: `helm-ccx` stores the license as base64-encoded data in the secret (`data:` field). `clustercontrol` uses plaintext (`stringData:` field). Do not mix formats between charts.

---

## 3. Data Plane – Database Node Package Repositories

When CCX deploys a database cluster, it provisions cloud VMs and bootstraps them via cloud-init. The VMs themselves make outbound package installation calls. In a properly firewalled or air-gapped environment these must either be allowed through or mirrored via an internal APT proxy (e.g. Aptly, Nexus, or a simple `apt-cacher-ng`).

### Always required (all clusters)

| Repository | URL | Purpose |
|---|---|---|
| Severalnines s9s agent | `https://europe-apt.pkg.dev/projects/severalnines-public` | ccx agent packages |

### Per database vendor

| Vendor | Repository URL | Purpose |
|---|---|---|
| **MariaDB** | `http://dlm.mariadb.com/repo/mariadb-server/<version>/` | MariaDB server packages |
| **Percona (MySQL 8.0 / PXC 8.0)** | `http://repo.percona.com/ps-80/apt` | Percona Server 8.0 |
| | `http://repo.percona.com/pxc-80/apt` | Percona XtraDB Cluster 8.0 |
| | `http://repo.percona.com/pxb-80/apt` | Percona XtraBackup 8.0 |
| | `http://repo.percona.com/telemetry/apt` | Percona telemetry agent |
| **Percona (MySQL 8.4 / PXC 8.4)** | `http://repo.percona.com/ps-84-lts/apt` | Percona Server 8.4 LTS |
| | `http://repo.percona.com/pxc-84-lts/apt` | Percona XtraDB Cluster 8.4 LTS |
| | `http://repo.percona.com/pxb-84-lts/apt` | Percona XtraBackup 8.4 LTS |
| | `http://repo.percona.com/telemetry/apt` | Percona telemetry agent |
| **PostgreSQL** | `http://apt.postgresql.org/pub/repos/apt` | PostgreSQL PGDG packages |
| **All vendors** | `https://packages.fluentbit.io/ubuntu/<release>` | Fluent Bit log forwarder |

Standard Ubuntu package mirrors (e.g. `archive.ubuntu.com`) must also be reachable or mirrored for base dependencies installed by cloud-init.

---

## 4. Backup Storage (Cloud Provider S3 / Object Storage)

CCX stores datastore backups in S3-compatible object storage. The database nodes and the control plane both need to reach the backup endpoint.

| Endpoint | Direction | Purpose |
|---|---|---|
| AWS S3 (`s3.amazonaws.com` / per-region endpoints) | outbound from control plane and data plane VMs | Backup upload and restore |
| Custom S3-compatible endpoint (configured per cloud in `ccx.yaml`) | outbound | Any S3-compatible store (MinIO, Zadara, Ceph, etc.) |

For air-gapped environments, configure an internal S3-compatible object store (e.g. MinIO) and set the `endpoint` field in the backup storage configuration accordingly.

---

## 5. Notification Services (Optional)

These are only required if the corresponding notification channel is enabled.

| Service | Endpoint | Protocol/Port | Env vars | Default |
|---|---|---|---|---|
| **SMTP** | Configurable | TCP / 25 or 587 | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | Disabled (`ENABLE_EMAIL`) |
| **Slack** | `https://hooks.slack.com` | HTTPS / 443 | `SLACK_URL`, `SLACK_CHANNEL`, `ENABLE_SLACK` | Disabled |
| **PagerDuty** | `https://events.pagerduty.com/v2/enqueue` | HTTPS / 443 | `PAGERDUTY_KEY`, `ENABLE_PAGERDUTY` | Disabled |

All three default to disabled. Only open the corresponding firewall rules if you explicitly enable a channel.

---

## 6. Stripe Billing (Optional)

Stripe billing is disabled by default (`ccx.services.billing.stripe: false`). When enabled:

| Endpoint | Protocol/Port | Direction | Purpose |
|---|---|---|---|
| `api.stripe.com` | HTTPS / 443 | outbound from ccx-billing-service | Subscription and payment management |
| `js.stripe.com` | HTTPS / 443 | browser → Stripe (client-side) | Stripe payment UI elements (allowed in CSP via helm-ccxdeps nginx config) |

In a fully air-gapped deployment, leave `stripe: false`.

---

## 7. Analytics / CDN (Optional, Browser-Side)

The following are browser-side calls and do not require server-side firewall rules. They are listed for completeness if you operate a restrictive client-side proxy or egress filter.

| Endpoint | Purpose |
|---|---|
| `https://severalnines.piwik.pro` | CCmgr analytics (allowed in CSP in cmon MCC deployment) |
| `https://st.s9s.io` | Static assets: logos, icons, email template images |

These can be blocked on the client side without affecting backend functionality. If `st.s9s.io` is blocked, email notification images will not load.

---

## 8. Internal Service Communication (No External Access Required)

The following services communicate within the Kubernetes cluster and require no external firewall rules. They are listed to clarify what is in-cluster only.

| Service | Port | Protocol |
|---|---|---|
| cmon RPC API | 9501 | HTTPS (in-cluster) |
| cmon legacy API | 9500 | HTTPS (in-cluster) |
| cmon SSH proxy | 9511 | TCP (in-cluster) |
| cmon cloud | 9518 | TCP (in-cluster) |
| cmon exporter | 9954 | HTTP (in-cluster) |
| cmon-sd (service discovery) | 8080 | HTTP (in-cluster) |
| ccmgr | 19051 | HTTP (in-cluster) |
| kuber-proxy HTTP | 8081 | HTTP (in-cluster) |
| kuber-proxy gRPC | 50051 | gRPC (in-cluster) |
| ccx-stores gRPC | 20001 / 20002 / 20003 | gRPC (in-cluster) |
| ccx-stores listener | 18097 | HTTP (in-cluster) |
| ccx-rest-user | 18091 | HTTP (in-cluster) |
| Victoria Metrics / Prometheus | 9090 | HTTP (in-cluster) |
| Keycloak | 80 (internal) | HTTP (in-cluster) |
| NATS JetStream | 4222 | TCP (in-cluster) |
| PostgreSQL (CCX DB) | 5432 | TCP (in-cluster) |

---

## 9. Cloud Provider API Endpoints

CCX makes API calls to your cloud provider control plane to provision VMs, volumes, floating IPs, and security groups. These endpoints are defined in your cloud configuration and are provider-specific.

| Cloud | API endpoint type | Notes |
|---|---|---|
| AWS | `ec2.<region>.amazonaws.com`, `s3.<region>.amazonaws.com` | Standard AWS regional endpoints; private endpoints supported |
| OpenStack | Keystone auth URL + Nova/Cinder/Neutron/Glance | Fully configurable; can be internal |
| GCP | `compute.googleapis.com`, `storage.googleapis.com` | Standard Google APIs |
| VMware / vCloud Director | Your vCenter / VCD endpoint | Fully on-premises |
| CloudStack | Your CloudStack API endpoint | Fully on-premises |
| Zadara | Configurable `endpoint` in cloud config | S3-compatible; can point to internal endpoint |

For cloud providers that support private API endpoints (AWS PrivateLink, OpenStack internal endpoints), use those to eliminate internet access from the control plane to the cloud APIs.

---

## 10. External DNS (Optional)

External-DNS is included as an optional dependency in helm-ccxdeps (`external-dns.enabled: false` by default). When enabled, the external-dns controller makes API calls to your DNS provider.

CCX itself creates Kubernetes `Service` objects annotated with `external-dns.alpha.kubernetes.io/*` for the external-dns controller to consume. The controller then calls your DNS provider API. Which DNS provider endpoints need to be allowed depends entirely on your configured external-dns provider (Route53, Cloudflare, Azure DNS, etc.).

---

## Summary Checklist

Use this as a quick reference when planning firewall rules or mirror lists.

### Required for all deployments

- [ ] Container image registries: `eu.gcr.io`, `europe-docker.pkg.dev`, `docker.io` (or internal mirrors)
- [ ] `cmon.license` pre-set in Helm values (avoids license server call)
- [ ] Data plane VMs can reach: `europe-apt.pkg.dev` + the relevant database vendor repository
- [ ] Data plane VMs can reach: `packages.fluentbit.io`
- [ ] Data plane VMs can reach your S3-compatible backup storage endpoint
- [ ] Cloud provider API endpoints reachable from control plane

### Required only if feature is enabled

- [ ] `severalnines.com/service/lic.php` — only if `cmon.license` is **not** pre-set
- [ ] SMTP host — only if `ENABLE_EMAIL=true`
- [ ] `hooks.slack.com` — only if `ENABLE_SLACK=true`
- [ ] `events.pagerduty.com` — only if `ENABLE_PAGERDUTY=true`
- [ ] `api.stripe.com` — only if `ccx.services.billing.stripe: true`
- [ ] DNS provider API endpoint — only if external-dns is enabled
- [ ] Helm chart repositories — only at install/upgrade time, not at runtime
