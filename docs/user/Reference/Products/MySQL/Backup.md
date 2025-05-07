# Backup

Percona Xtrabackup is used to create backups.

CCX backups the Primary server. In multi-primary setups the node with the highest `wsrep_local_index` is elected.

## Backup Storage

Backups are streamed directly to S3 staroge.

## Backup locks

Percona Xtrabackup blocks DDL operations during the backup using the `--lock-ddl` flag.
Any attempt to `CREATE`, `ALTER`, `DROP`, `TRUNCATE` a table during backup creation will be locked with the status `Waiting for backup lock` (see `SHOW FULL PROCESSLIST`).
In this case, wait for the backup to finish and, perform the operation later.

Also see the section 'Schedule'.

## Schedule

The backup schedule can be tuned and backups can be paused.
