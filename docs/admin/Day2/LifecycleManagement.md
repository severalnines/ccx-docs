# Datastore Lifecycle Management

CCX provides a Lifecycle management feature to ensure that database software and Operating systems of the datastores are updated to the latest patch levels.

## Upgrade procedure

The update will be performed using a roll-forward upgrade algorithm:

1. The oldest replica (or primary if no replica exist) will be selected first.
2. A new node will be added with the same specification as the oldest node and join the datastore.
3. The oldest node will be removed.
4. Steps 1 to 3 continues until all replicas (or primaries in case of a multi-primary setup) are updated.
5. If it is a primary-replica configuration then the primary will be updated last. A new node will be added, the new node will be promoted to become the new primary, and the old primary will be removed.

> **NOTE**
>
> - The FQDNs will be constant but the underlying IP addresses may change.
> - There will be a brief service interruption during step 5, to promote the new primary.

## Pre-requisites

- The CSP is reponsible for providing updated images.

## Configuring the update

- Update the image id to the latest in `ccx-deployer` config.
- Update the `LATEST_SERVER_CONFIG` value to the current date in the Helm values file.

CCX will now inspect and compare the deployed version of a datastore with the new version specified in the Helm chart. If the versions does not match, then the user will be prompted in the web application that there is an upgrade pending. The user can either opt to carry out the upgrade now, or schedule it.

## Limitations

As the user can set the schedule, the end user can procrastinate and delay the upgrade in absurdum. The CSP must then take actions on the end user.
