# Limitations

Every product has limitations. Below is a list of Microsoft SQL Server limitations:

:::warning

An Always On datastore cannot be converted to a single-node (standalone) datastore. To move to a standalone datastore, create a new standalone datastore and move the databases into it, for example by restoring a backup of each database into the new datastore.

:::

## License

- The standard license is applied.

## Configurations

- Single node (no High Availability)
- Always On (2 nodes, asynchronous commit mode, High Availability)

## Always On-specific limitations

- Refer to the Microsoft standard license for a complete list of limitations.
- Only asynchronous commit mode is currently supported. If the primary fails, the last transactions committed on it may not have reached the replica, and they are lost.
- With the standard license, an availability group holds one database, and the secondary is not readable.
- Scaling is not supported as the standard license does not permit more than two nodes.

## Databases and availability groups in the Always On configuration

From version 1.58.

- CCX creates `ccxdb` in the availability group `s9s_ag1`. Further databases and availability groups are created and dropped by you in SQL Server; CCX cannot create or drop databases or availability groups in the Always On configuration yet. See [Always On](./always-on.md).
- A database that is in no availability group is not replicated to the other node. It is lost on a failover, an automatic repair or a node replacement. Put every database into an availability group.
- Keep `ccxdb` in `s9s_ag1`. A node cannot be added while `s9s_ag1` holds no database: the add node job fails after waiting 10 minutes for the new node to synchronize.
- SQL Server reports an availability group that holds no database as not healthy.

## Single node

- CCX can create and drop databases on a single-node datastore. A single-node datastore has no availability groups.

## Restore

- A restore replaces the current contents of the restored databases. Data written after the chosen backup is lost.
- The restored databases are unavailable to applications while the restore runs.
- If a restore fails, the final line of the job's error message may not include the reason. The job log describes the failing step in the lines before it.
