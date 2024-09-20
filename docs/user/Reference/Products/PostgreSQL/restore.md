# Backup and Restore

## Backups
pg_basebackup are used to create backups.

## Restore
Data may be restored to a particular point in time (called PITR).
Postgres configures `archive_command` and `archive_mode=always`.
Morever, during the restore the `restore_command` is set.

There are two options to restore a backup:
- Restore a backup on the existing datastore
- Restore a backup on a new datastore



## Restore a backup on the existing datastore
This option allows to restore a backup with point in time recovery.

