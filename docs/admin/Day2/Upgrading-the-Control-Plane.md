# Upgrading the Control Plane

:::danger
Downgrades are not supported. Always upgrade sequentially — never skip versions.
:::

## Overview

The CCX control plane consists of two Helm releases:

- **ccx** — the core platform (cmon, ccx-backend, UI, runner services)
- **ccxdeps** — supporting infrastructure (MySQL InnoDB cluster, PostgreSQL operator, NATS, Loki, etc.)

Both releases may need to be upgraded. Check the Changelog for each version to determine if a ccxdeps upgrade is also required.

## Pre-upgrade checklist

Before upgrading, run through the following:

1. **Check pod health** — all pods should be Running/Ready:
   ```bash
   kubectl get pods -n ccx
   ```

2. **Back up the cmon (MySQL) database** — the cmon DB contains cluster state and job history. Take a dump from whatever MySQL instance you are using (ccxdeps InnoDB cluster or an external database):
   ```bash
   mysqldump -h <mysql-host> -P 3306 -u <user> -p \
     --single-transaction --routines --events cmon \
     > cmon_backup_$(date +%Y%m%d).sql
   ```

3. **Back up the CCX PostgreSQL database** — ccx-backend stores datastore metadata, credentials, and user data in PostgreSQL. Take a dump from your PostgreSQL instance:
   ```bash
   pg_dump -h <postgres-host> -U <user> -d ccx \
     > ccx_postgres_backup_$(date +%Y%m%d).sql
   ```

4. **Back up your values files** — keep a copy of both `ccx-values.yaml` and `ccxdeps-values.yaml` before making any changes.

5. **Check current versions**:
   ```bash
   helm list -n ccx
   ```

6. **Review the Changelog** for each intermediate version before upgrading.

## Upgrade path

The supported path is to upgrade one minor version at a time. If you are on version 1.45 and the current release is 1.49, you must apply:

```
1.45 → 1.46 → 1.47 → 1.48 → 1.49
```

Skipping versions is not supported and may result in failed database migrations.

## Performing the upgrade

### Step 1 — Update the Helm repo

```bash
helm repo update
```

### Step 2 — Upgrade ccxdeps (if required by the Changelog)

```bash
helm upgrade --install ccxdeps s9s/ccxdeps \
  --version <target-version> \
  -n ccx \
  --debug \
  --wait \
  -f ccxdeps-values.yaml
```

Wait for all pods to stabilize before proceeding:

```bash
kubectl get pods -n ccx -w
```

### Step 3 — Upgrade ccx

```bash
helm upgrade --install ccx s9s/ccx \
  --version <target-version> \
  -n ccx \
  --debug \
  --wait \
  -f ccx-values.yaml
```

Replace `<target-version>` with the target minor version (e.g. `1.47`).

The `--wait` flag will block until all Deployments and StatefulSets are ready, including the cmon database migration init-container.

### Step 4 — Repeat for each intermediate version

Repeat Steps 2–3 for each version increment until you reach the target version. Verify pod health between each step.

## Post-upgrade verification

After each version upgrade:

```bash
# All pods Running/Ready
kubectl get pods -n ccx

# cmon is healthy — should return "Ok"
kubectl exec -n ccx cmon-0 -c cmon -- \
  curl -sk https://localhost:9501/v2/controller?operation=ping | grep -o '"request_status":"[^"]*"'

# Migration jobs completed successfully
kubectl get jobs -n ccx
```

If cmon does not respond within a few minutes after upgrade, check its logs:

```bash
kubectl logs -n ccx cmon-0 -c cmon --tail=100
```

## CRD upgrades

Some ccxdeps releases require manual CRD upgrades that Helm will not apply automatically. Check the Changelog and apply any CRD manifests listed there **before** running `helm upgrade` for that version.

Example (postgres-operator CRDs — required when upgrading ccxdeps from below 0.6.6):

```bash
kubectl apply -f https://raw.githubusercontent.com/zalando/postgres-operator/refs/heads/master/charts/postgres-operator/crds/operatorconfigurations.yaml
kubectl apply -f https://raw.githubusercontent.com/zalando/postgres-operator/refs/heads/master/charts/postgres-operator/crds/postgresqls.yaml
kubectl apply -f https://raw.githubusercontent.com/zalando/postgres-operator/refs/heads/master/charts/postgres-operator/crds/postgresteams.yaml
```
