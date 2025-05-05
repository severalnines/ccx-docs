# Configuration
## Volume size
Since Valkey is an in-memory database, the storage size is fixed and twice the amount of the RAM. Thus, it is not possible to:
* specify the storage size in the deployment wizard.
* scale the storage.

## Persistance 
Redis is configured to use both AOF and RDB for persistance.
The following configuration parameters are set:
* appendonly yes
* default values for AOF
* default values for RDB




