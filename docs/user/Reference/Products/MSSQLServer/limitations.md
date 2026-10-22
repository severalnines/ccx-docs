# Limitations

Every product has limitations. Below is a list of Microsoft SQL Server limitations:

:::warning

An Always On datastore cannot be converted to a single-node (standalone) datastore. To move to a standalone datastore, create a new standalone datastore and move the databases into it, for example by restoring a backup of each database into the new datastore.

:::

## License

- The `standard` license is applied.

## Configurations

- Single node (no High Availability)
- Always On (2 nodes, asynchronous commit mode, High Availability)

## Always On-specific limitations

- Refer to the Microsoft `standard` license for a complete list of limitations.
- Only asynchronous commit mode is supported. A promotion is lossless, but an automatic failover after a node has failed is not: the last transactions committed on the failed node may not have reached the replica, and they are lost.
- With the `standard` license, an availability group holds one database, and the secondary is not readable.
- Scaling is not supported as the `standard` license does not permit more than two nodes.

## Databases and availability groups in the Always On configuration

From version 1.58.

- CCX creates `ccxdb` in the availability group `s9s_ag1`. You cannot create or drop databases or availability groups from the CCX UI or API in the Always On configuration. In version 1.58, if you want availability groups other than the default `s9s_ag1`, you must create and drop them yourself, directly in SQL Server. See [Always On](./always-on.md).
- A database that is in no availability group is not replicated to the other node. It is lost when its node is removed or replaced, after a failure or in an upgrade. It is backed up only while it is on the datastore's primary. Put every database into an availability group.
- A promote moves only the availability groups whose primary is the datastore's primary (the primary of `s9s_ag1`) and that have a replica on the promoted node. An availability group led by another node keeps its primary where it is.
- When a node fails, CCX fails over every availability group that node was the primary of, to the datastore's primary if it holds a replica, otherwise to the replica furthest ahead in the log. This is a forced failover: transactions not yet sent to that replica are lost, as with any automatic failover under asynchronous commit.
- An availability group does not replicate logins. Create logins through CCX, or on every node with the same SID.
- Database names must be unique across the datastore.
- Keep `ccxdb` in `s9s_ag1`. A node cannot be added while `s9s_ag1` holds no database: the add node job fails after waiting 10 minutes for the new node to synchronize. A promotion does not move `s9s_ag1` while it holds no database.
- SQL Server reports an availability group that holds no database as not healthy.

## Single node

- CCX can create and drop databases on a single-node datastore. A single-node datastore has no availability groups.

## Restore

- A restore replaces the current contents of the restored databases. Data written after the chosen backup is lost.
- The restored databases are unavailable to applications while the restore runs.
- Every node must be reachable for a restore in the Always On configuration.
