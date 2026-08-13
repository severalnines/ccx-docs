# Deploying ccx and ccxdeps with ArgoCD

:::note
This page covers the GitOps deployment path (ArgoCD `ApplicationSet` + a values git repo). If you are managing an existing install directly with `helm upgrade --install`, see [Upgrading the Control Plane](Upgrading-the-Control-Plane.md) instead. The two approaches manage the same two Helm releases (`ccx` and `ccxdeps`) but are not meant to be mixed for the same tenant — pick one management path per tenant and stick to it, or ArgoCD's `selfHeal` will fight any manual `helm upgrade` you run against the same release.
:::

## Overview

Tenants are onboarded declaratively: dropping a values file into a git repo is what causes ArgoCD to render and sync a new `Application`. Two `ApplicationSet` resources drive this:

- **`ccx-tenants`** — deploys the `helm-ccx` chart (cmon, ccx-backend services, UI) per tenant.
- **`ccxdeps`** — deploys the `ccxdeps` chart (MySQL InnoDB Cluster / Postgres operator, NATS) per tenant.

Both use a **git generator**: they watch a directory of YAML files in a values repository (`ccx-argocd`), and one `Application` is rendered per matching file. Each rendered `Application` is a **multi-source** Application — one source is the actual Helm chart (pulled from its own chart repo), the other is the values repo, referenced via a `$values` alias so the chart source can point at value files that don't live in the chart's own repo.

## Repository layout

The values repo (`ccx-argocd` above — rename it to whatever fits your setup) only needs to follow one convention: a shared base file per chart, plus one override file per tenant in a directory the corresponding `ApplicationSet`'s git generator watches.

```
ccx-argocd/
├── ccx.yaml                # shared base values for helm-ccx — applied to every 
├── ccxdeps.yaml             # shared base values for ccxdeps — applied to every 
├── brands-ccx/              # per-brand overrides for helm-ccx, one file per client
│   └── <client>.yaml
└── brands-ccxdeps/          # per-brand overrides for ccxdeps, one file per client
    └── <client>.yaml
```

- `ccx.yaml` / `ccxdeps.yaml` are referenced directly by path (`$values/ccx.yaml`, `$values/ccxdeps.yaml`) in the `ApplicationSet` definitions below — renaming them means updating those references too.
- `brands-ccx/` and `brands-ccxdeps/` are just the default directory names used in this doc; the git generator's `files.path` glob (see below) can point at any directory name you prefer — rename both the folders and the glob together.
- Onboarding a tenant is nothing more than adding a same-named file to both `brands-ccx/` and `brands-ccxdeps/` — see [Onboarding a new tenant](#onboarding-a-new-tenant).

## Prerequisites

Nothing below is created by the `ApplicationSet`s themselves. All of it must exist **before** a new tenant's values files are committed, or the sync will fail partway through (commonly as `ImagePullBackOff`, cmon license errors, or other missing-secret failures).

### Cluster-level (once per cluster, not per tenant)

- **ArgoCD itself**, installed and reachable, with:
  - `ingress-nginx` and `cert-manager` already deployed, with a working `ClusterIssuer` (e.g. `letsencrypt-prod`) — the rendered `Application`s create `Ingress` objects that reference it by name.
- **MySQL Operator and Postgres Operator CRDs.** `ccxdeps` bundles both operators as subchart dependencies. Helm does not upgrade CRDs on `helm upgrade` (ArgoCD syncs go through the same code path) — the CRDs need to be present from a first install/CRD-apply. See the [CRD upgrades](Upgrading-the-Control-Plane.md#crd-upgrades) section for the manual-apply pattern if a chart bump requires it.
- **external-dns**, if you want tenant hostnames to get DNS records automatically, deployed with credentials for whichever DNS provider hosts your zone (e.g. Route53).

### Per-tenant, before that tenant's values files are committed

- **Namespace secrets** — `CreateNamespace=true` in the sync policy creates the namespace, but does **not** populate secrets. These must exist in the target namespace before sync, or pods will crash-loop or hang in `ImagePullBackOff`:
  - Every cloud-provider credential secret listed in that tenant's `ccx.cloudSecrets` (e.g. `digitalocean`, `aws`, `openstack`, …) — these are provider API credentials, not something ArgoCD can generate.
  - Backup credential secrets (e.g. `s3-backup-innodb`, `s3-backup-postgres`), if backups are enabled — see [Upgrading to be production ready](Upgrading-to-be-production-ready.md) for the exact secret shape.
- **The tenant's values files must exist in the values repo** (see [Repository layout](#repository-layout)) — this is the actual "onboarding" action; everything else on this list just needs to be true by the time it's committed.

## ApplicationSet definitions

Both `ApplicationSet`s live together, typically applied once per cluster:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: ccx-tenants
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]

  # Auto-discover brands from brands-ccx/<name>.yaml files in the git repo.
  # The name can be changed to match client prefferences
  generators:
    - git:
        repoURL: https://YOUR_GIT_REPO
        revision: main
        files:
          - path: "brands-ccx/*.yaml" # change brands-ccx to whateve name you prefer

  template:
    metadata:
      name: 'ccx-{{ trimSuffix ".yaml" .path.filename }}'
      annotations:
        argocd.argoproj.io/ignore-errors: "true"
    spec:
      project: default

      sources:
        # Source 1: Helm chart from the helm-ccx git repo at a fixed release branch
        - repoURL: https://severalnines.github.io/helm-charts/
          chart: ccx
          targetRevision: "1.58.0" # CCX version you wish to use
          helm:
            releaseName: 'ccx'
            valueFiles:
              - $values/ccx.yaml
              - '$values/{{ .path.path }}/{{ .path.filename }}'
            # The chart's cloudSecrets check uses Helm's `lookup` function, which
            # requires live cluster access. ArgoCD's repo-server renders via
            # `helm template` (sandboxed, no cluster access), so `lookup` always
            # returns empty there even when the secret genuinely exists.
            values: |
              ccx:
                skipCloudSecretValidation: true

        # Source 2: Git repo supplying the value files ($values alias)
        - repoURL: https://YOUR_GIT_REPO
          targetRevision: main
          ref: values

      destination:
        server: https://kubernetes.default.svc
        namespace: 'ccx'

      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true

      ignoreDifferences:
        - group: ""
          kind: Secret
          jsonPointers:
            - /data
        - group: ""
          kind: PersistentVolumeClaim
          jsonPointers:
            - /spec/resources/requests/storage
---
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: ccxdeps
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]

  generators:
    - git:
        repoURL: https://YOUR_GIT_REPO
        revision: main
        files:
          - path: "brands-ccxdeps/*.yaml"  # change brands to what you prefer

  template:
    metadata:
      name: 'ccxdeps-{{ trimSuffix ".yaml" .path.filename }}'
      annotations:
        argocd.argoproj.io/ignore-errors: "true"
    spec:
      project: default

      sources:
        # Source 1: the ccxdeps chart, pulled directly from the packaged Helm chart repo
        - repoURL: https://severalnines.github.io/helm-charts/
          chart: ccxdeps
          targetRevision: "0.6.19" #Use version you prefer for ccxdeps
          helm:
            releaseName: ccxdeps
            valueFiles:
              - $values/ccxdeps.yaml
              - '$values/{{ .path.path }}/{{ .path.filename }}'

        # Source 2: this git repo, referenced only to supply the value files above ($values alias)
        - repoURL: https://YOUR_GIT_REPO
          targetRevision: main
          ref: values

      destination:
        server: https://kubernetes.default.svc
        namespace: 'ccx'

      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true
```

A few things worth calling out about how these are put together:

- **`goTemplateOptions: ["missingkey=error"]`** means a value referenced in the template (e.g. `.path.filename`) that doesn't resolve will fail the render loudly, rather than silently producing an empty string in a resource name. This is deliberate — a silently-wrong Application name is harder to notice than a failed sync.
- **The `$values` source is never deployed on its own** — `ref: values` just makes its contents addressable by the other source via the `$values/...` prefix in `valueFiles`. It has no `path`/`helm` block of its own.
- **`values: | ccx: skipCloudSecretValidation: true`** (inline, on the chart source) exists specifically to work around ArgoCD's sandboxed rendering — don't remove it thinking it's a leftover; without it, every sync will report a false-positive validation failure for cloud secrets that actually exist.
- **`destination.namespace: 'ccx'` points every tenant at the same namespace** by default — fine for a single-tenant deployment. For genuine multi-tenant use, template this the same way the Application's own name is templated (e.g. derive the namespace from `.path.filename`) so each discovered file gets its own namespace instead of colliding in one.
- **`ignoreDifferences` on Secrets (`/data`) and PVCs (`/spec/resources/requests/storage`)** stops ArgoCD from fighting things it shouldn't manage post-creation: Secret data that gets rotated out-of-band, and PVC sizes that get grown manually (Kubernetes doesn't allow shrinking a PVC back down, so a chart-declared size lower than the live, already-grown size would otherwise show as permanent drift).

## Onboarding a new tenant

1. Work through the per-tenant prerequisites above — secrets — for the tenant's target namespace.
2. Commit `brands-ccx/<tenant>.yaml` (helm-ccx overrides) and `brands-ccxdeps/<tenant>.yaml` (ccxdeps overrides) to the `ccx-argocd` repo's `main` branch. The filename (minus `.yaml`) becomes the tenant identifier used in both the rendered `Application` name and, if you've templated it per the note above, the destination namespace.
3. Both `ApplicationSet`s poll the git generator on their own schedule — ArgoCD will pick up the new files and render `ccx-<tenant>` and `ccxdeps-<tenant>` `Application`s automatically. No manual `argocd app create` step.
4. Watch the sync in the ArgoCD UI or via:
   ```bash
   kubectl get applications -n argocd | grep <tenant>
   ```

## Troubleshooting

- **Sync succeeds but pods crash-loop on missing secrets.** Almost always a prerequisite secret that wasn't pre-created in the namespace before sync — see the per-tenant secrets list above.
- **A tenant's chart version and running image drift out of sync after a manual hotfix.** If a tenant's `Application` is bumped to a newer app image without also bumping the chart version (or vice versa), you can end up with a values/template mismatch the chart maintainers never intended to be run together — for example, a chart still rendering an old container `command` that doesn't match a binary layout in a newer image. Always move chart version and image tag together, and treat any manual live-cluster patch as temporary — `selfHeal: true` means ArgoCD will silently revert it on the next reconcile unless the git source is also updated to match.
- **Validation fails for a cloud secret you know exists.** Confirm the chart source still has `ccx.skipCloudSecretValidation: true` set — without it, ArgoCD's sandboxed `helm template` rendering can't see live secrets via `lookup` and will report a false failure.
