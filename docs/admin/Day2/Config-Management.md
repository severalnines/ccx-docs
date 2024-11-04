# Configuration Management

This section describes the configuration management feature in CCX. This feature gives the end-user self-service capabilities to update the datastore configuration. It is the administrator of CCX who decides which database configuration parameters that can be changed by the end-user.

## Limitations / Important information

- This feature, if used improperly, can bring significant risk to datastore stability.
- We do not recommend changing anything that affects calculated values based on the instance memory.
- The following list (section below) is not final, but the following parameters and type of parameters must not be changed.
- We recommend that you contact CCX Support before adding or changing a parameter.

:::note
The parameter settings are applied on scaling and during upgrads (Life-cycle management).
:::

:::danger
It is not recommended to update database configuration parameters manually, using S9S CLI or ClusterControl UI. The changes will be overwritten by the the latest saved settings when adding a node (either as part of Scaling, during Lifecycle management, or during automatic repair).
:::
 
## Non-supported parameters and limitations

### MySQL/Mariadb

- max_connections
- caches such as innodb_buffer_pool settings, table open caches, tmp table size.
- datafir and file settings, such as innodb_file_per_table and storage locations.
- Galera settings such as wsrep_slave_threads.
- Any setting affecting connectivity (e.g port, bind addresses).
- Replication settings.
- Any setting requiring a server restart.

### Postgres

- max_connections
- Any setting affecting connectivity (e.g port, listen_addresses)
- datafir and file settings, and other storage locations.
- WAL settings.
- Any setting requiring a server restart.

### Redis

- Any setting affecting connectivity (e.g port, listen_addresses)
- Replication settings.
- Any setting requiring a server restart.

### Microsoft SQL Server

- Configuration change is not supported.

## Applying configuration changes and Add Node

The new settings are applied on the datastore and also saved in CCX DB. Only the last config change is saved.
The latest saved settings are applied when adding a node (either as part of Scaling, during Lifecycle management, or during automatic repair).

## YAML configuration

The configuration is stored in values.yaml

### Adding a parameter

A new parameter can be added by adding a new section to the yaml file:

```yaml
    - name: `<PARAMETER_NAME>`
      description: "`<DESCRIPTION>`"
      type: "`<TYPE>`"
      default_value: `<DEFAULT_VALUE>`
      validation_options: "min=`<MIN_VALUE>`,max=`<MAX_VALUE>`"
      vendors:
        - `<SUPPORTED_VENDOR>`
        ...
	- `<SUPPORTED_VENDOR>`
```

- `<PARAMETER_NAME>` - the name of the configuration parameter as written in the database configuration file.
- `<DESCRIPTION>` - a decription of the configuration parameter.
- `<TYPE>` - the datatype of the value of the configuration parameter. Supported types are "number" and "text".
- `<DEFAULT_VALUE>` - the default value of the configuration parameter.
- `<SUPPORTED_VENDOR>` - the vendor that supports this configuration parameter.
- `<MIN_VALUE>`/`<MAX_VALUE>` - The validation_options applies to parameters of the type "number" and sets an upper and lower bound of the value of the configuration parameter.

### Example config

```yaml
# primary config file for CCX
config:
  parameters:
    - name: sql_mode
      description: "Specifies the sql_mode"
      type: "text"
      default_value:
        "ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_E\
        NGINE_SUBSTITUTION"
      vendors:
        - "percona"
    - name: sql_mode
      description: "Specifies the sql_mode"
      type: "text"
      default_value: "STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION"
      vendors:
        - "mariadb"
    - name: timeout
      description: Close the connection after a client is idle for N seconds (0 to disable)
      type: number
      default_value: 0
      validation_options: "min=0,max=10800"
      vendors:
        - "redis"
    - name: statement_timeout
      description: Sets the time to wait (in milliseconds) on a lock before checking for deadlock
      type: number
      default_value: 0
      validation_options: "min=0,max=10800"
      vendors:
        - "postgres"
```
