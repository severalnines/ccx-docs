# Datastore Lifecycle Management

CCX provides a Lifecycle Management feature to ensure that database software and operating systems of the datastores are updated to the latest patch levels.

## How upgrades are triggered

CCX detects that a datastore node needs an upgrade in two ways:

1. **Image version change** — the `LATEST_SERVER_CONFIG` timestamp in the CCX Helm values is set to a date newer than when the oldest node was provisioned. This signals that a new base image is available.

2. **OS package updates detected** — the ccx-monitor-service running on each datastore node reports available OS package updates back to CCX. When pending updates are detected on any node, the datastore is immediately flagged for upgrade regardless of the `LATEST_SERVER_CONFIG` value.

When either condition is met, the user is shown an upgrade notification in the UI and can choose to upgrade immediately or schedule it for their configured maintenance window.

## Upgrade procedure

The update is performed using a roll-forward algorithm — no in-place upgrades:

1. The oldest replica (or primary if no replica exists) is selected first.
2. A new node is provisioned with the same specification and joins the datastore.
3. The oldest node is removed.
4. Steps 1–3 continue until all replicas (or primaries in a multi-primary setup) are updated.
5. In a primary-replica configuration, the primary is updated last. A new node is added, promoted to primary, and the old primary is removed.

:::note
- FQDNs remain constant but the underlying IP addresses of nodes will change.
- There will be a brief service interruption during step 5 while the new node is promoted to primary.
:::

## Configuring the image update

To trigger a datastore software or OS upgrade:

1. Update the image ID to the latest in your cloud deployer config (per-region `image_id` in the CCX Helm values).
2. Set `LATEST_SERVER_CONFIG` to the current date and time (RFC 3339 format) in the CCX Helm values:

   ```yaml
   ccx:
     services:
       deployer:
         env:
           LATEST_SERVER_CONFIG: "2025-06-01T00:00:00Z"
   ```

3. Apply the change:
   ```bash
   helm upgrade --install ccx s9s/ccx -n ccx --debug --wait -f ccx-values.yaml
   ```

CCX will compare `LATEST_SERVER_CONFIG` against the provisioning timestamp of the oldest node in each datastore. If the node was created before this timestamp, the datastore is flagged for upgrade.

## OS upgrade impact

When the OS on a datastore node receives available package updates, the ccx-monitor-service reports those pending updates to CCX. This triggers the same roll-forward upgrade procedure as an image version change — new node provisioned with the latest image, old node removed.

**Impact during upgrade:**
- Nodes are replaced one at a time — the datastore remains available throughout (except during primary promotion).
- Connections to the datastore continue to work through the FQDN, which does not change.
- The primary promotion step (step 5) causes a brief interruption — applications should be configured to retry on connection loss.

:::note
OS upgrades are handled at the image level — CCX replaces the VM rather than running `apt upgrade` or equivalent in-place. There is no concept of an in-place OS patch on a running node.
:::

## Maintenance windows

Maintenance windows control when CCX is allowed to automatically trigger upgrades on a datastore. When the maintenance window is active and an upgrade is pending, CCX will initiate the roll-forward procedure automatically without user interaction.

### Window constraints

- The maintenance window is **exactly 2 hours** in duration. The end hour must be exactly 2 hours after the start hour.
- The window is defined per datastore by the end user.
- The window is evaluated in the server's local timezone (UTC by default in Kubernetes deployments).

### Configuring a maintenance window

End users set the maintenance window per datastore via the CCX UI (Datastore Settings) or via the API:

```json
PATCH /api/v2/stores/{store_id}

{
  "maintenance_settings": {
    "day_of_week": 2,
    "start_hour": 2,
    "end_hour": 4
  }
}
```

Field values:
- `day_of_week`: `1` = Monday through `7` = Sunday
- `start_hour`: Hour of day in 24h format (0–23)
- `end_hour`: Must equal `start_hour + 2` (the 2-hour window is enforced server-side)

### Default maintenance window

If no maintenance window is configured for a datastore, it defaults to **Monday 00:00–02:00 UTC**.

### How automatic upgrades interact with maintenance windows

CCX runs a maintenance loop that periodically calls `MaintainStore` for each datastore. The logic is:

1. If the current time falls within the datastore's maintenance window **and** an upgrade is pending → the upgrade job is dispatched automatically.
2. If outside the maintenance window → no action is taken, even if an upgrade is pending.
3. Users can also trigger an upgrade manually from the UI at any time regardless of the maintenance window.

A 2-second pause is applied between datastores to avoid sudden activity spikes during the maintenance sweep.

## Limitations

- **Microsoft SQL Server (single-node)** — the roll-forward upgrade is not supported for Microsoft SQL Server deployed in single-node mode. A SQL Server upgrade requires manual intervention.
- **User-initiated delays** — users can indefinitely defer an upgrade by not scheduling it and having no maintenance window active. As the CSP, if a critical OS patch needs to be applied urgently, you must coordinate with affected users or force the upgrade by setting `LATEST_SERVER_CONFIG` to the current date and contacting users to schedule their maintenance window.
- **Maintenance window timezone** — the window is evaluated against server time (UTC). Users setting windows based on their local timezone should account for the offset.
- **No in-place patches** — there is no mechanism to apply a hotfix to a running node. All OS-level changes require a node replacement via the roll-forward procedure.
