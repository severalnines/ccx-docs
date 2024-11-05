# Limitations
Every product has limitations. Below is a list of Microsoft SQL Server limitations:

## License
* The standard license is applied.

## Configurations
* Single node (no High Availability)
* Always On (2 nodes, asynchronous commit mode, High Availability)

## Always On-specific limitations
* Refer to the Microsoft standard license for a complete list of limitations.
* Only asynchronous commit mode is currently supported.
* The `ccxdb` is currently the only supported Always On enabled database.
* Scaling is not supported as the standard license does not permit more than two nodes.

## User-created databases (not Always On) are not transferred to the replica
* In the Always On configuration, only the `ccxdb` is replicated.
* Data loss may occur for other user-created databases, as they are not transferred to the replica during the add node process. Therefore, they may be lost if a failover, automatic repair, or any other life-cycle management event occurs.
