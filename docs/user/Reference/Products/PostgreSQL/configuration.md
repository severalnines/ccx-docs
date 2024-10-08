# Configuration
These settings cannot be changed as it affects system stability
## Important default values
| Parameter        | Default value           | Comment  |
| ------------- |-------------| -----|
| wal_keep_size | 512 |
| max_wal_senders | min 16, max 4 x Db Node count||
| wal_level | hotstandby ||
| hot_standby |  ON | Replica nodes |
| max_connections | see below | |
| shared_buffers | instance_memory x 0.25 | |
| effective_cache_size | instance_memory x *0.75 | |
| work_mem | instance_memory / max_connections | |
| maintenance_work_mem | instance_memory/16 | |

| Instance size (GiB RAM)       | Max connections |
| ------------- |-------------|
| < 4 | 100 |
| 8 | 200 |
| 16 | 400 |
| 32 | 800 |
| 64+ | 1000 |

## Archive mode
All nodes are configured with `archive_mode=always`.

## Auto-vacuum
Auto-vacuum settings are set to default. Please read more about [automatic vaccuming here](https://www.postgresql.org/docs/15/runtime-config-autovacuum.html)


