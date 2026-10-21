# Overview

CCX supports two Microsoft SQLServer 2022 configurations:

- Single-node (No high-availability)
- Always-on, two nodes, async-commit mode (high-availability) in an primary-replica configuration.

The 'standard' license is applied.

An Always On datastore cannot be converted to a single-node datastore, so choose the configuration when you create the datastore. See [Always On](./always-on.md) for how databases and availability groups work in the Always On configuration.

## Scaling

Scaling is not supported in SQLServer as of the standard license.

## Storage

- Maximum size depends on the service provider and instance size
- Volume type cannot currently be changed

## Further Reading

- [Always On](./always-on.md)
- [Limitations](./limitations.md)
- [Backup and Restore](./backup-restore.md)
