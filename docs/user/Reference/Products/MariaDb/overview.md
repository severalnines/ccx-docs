# Overview

CCX supports two types of MariaDB clustering:

- MariaDB Replication (Primary-replica configuration)x
- MariaDB Cluster (Multi-primary configuration)

For general purpose applications we recommend using MariaDB Replication, and we only recommend to use MariaDB Cluster if you are migrating from an existing application that uses MariaDB Cluster.

If you are new to MariaDB Cluster we stronly recommend to read about the [ MariaDB Cluster 10.x limitations](https://mariadb.com/kb/en/mariadb-galera-cluster-known-limitations/) and [MariaDB Cluster Overview](https://mariadb.com/kb/en/what-is-mariadb-galera-cluster/) to understand if your application can benefit from MariaDB Cluster.

MariaDB Replication uses the standard asynchronous replication based on GTIDs.

## Scaling

Storage and nodes can be scaled online.

### Nodes (horizonal)

- The maximum number of database nodes in a datastore is 5.
- Multi-primary configuration must contain an odd number of nodes (1, 3 and 5).

### Nodes (vertical)

A node cannot be scaled vertically currently. To scale to large instance type, then a larger instance must be added and then remove the unwanted smaller instances.

### Storage

- Maximum size depends on the service provider and instance size
- Volume type cannot currently be changed

## Further Reading

- [Limitations of MariaDB](./limitations.md)
- [Configuration](./configuration.md)
- [Importing Data](./Importing-Data.md)
