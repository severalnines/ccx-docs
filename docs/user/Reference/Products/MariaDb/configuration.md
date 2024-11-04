# Configuration
##  max_connections
* 75 connections / GB of RAM.
* Example: 4GB of RAM yields 300 connections.
* This setting cannot be changed as it affects system stability.

## InnoDb settings
* These setting cannot be changed as it affects system stability.
### innodb_buffer_pool_size
* 50% of RAM if total RAM is &gt; 4GB
* 25% of RAM if total RAM is &lt;= 4GB
### innodb_log_file_size 
* 1024 MB if innodb_buffer_pool_size &gt;= 8192MB
* 512 MB if innodb_buffer_pool_size &lt; 8192MB  
### innodb_buffer_pool_instances
* 8 

### InnoDB options

| variable_name                | variable_value        |
|------------------------------|---------------------|
| innodb_buffer_pool_size       | Depends on instance size   |
| innodb_flush_log_at_trx_commit| 2                     |
| innodb_file_per_table         | 1                     |
| innodb_data_file_path         | Depends on instance    |
| innodb_read_io_threads        | 4                     |
| innodb_write_io_threads       | 4                     |
| innodb_doublewrite            | 1                     |
| innodb_buffer_pool_instances  | Depends on instance size|
| innodb_redo_log_capacity      | 8G                    |
| innodb_thread_concurrency     | 0                     |
| innodb_flush_method           | O_DIRECT              |
| innodb_autoinc_lock_mode      | 2                     |
| innodb_stats_on_metadata      | 0                     |
| default_storage_engine        | innodb                |

### General options

| variable_name                | variable_value      |
|------------------------------|---------------------|
| tmp_table_size               | 64M                 |
| max_heap_table_size          | 64M                 |
| max_allowed_packet           | 1G                  |
| sort_buffer_size            | 256K                |
| read_buffer_size            | 256K                |
| read_rnd_buffer_size        | 512K                |
| memlock                      | 0                   |
| sysdate_is_now               | 1                   |
| max_connections              | Depends on instance size   |
| thread_cache_size            | 512                 |
| table_open_cache             | 4000                |
| table_open_cache_instances   | 16                  |
| lower_case_table_names       | 0                   |


## Storage
### Recommended storage size
* We recommend a maximum of 100GB storage per GB of RAM.
* Example: 4GB of RAM yields 400GB of storage.
* The recommendation is not enforced by the CCX platform.
