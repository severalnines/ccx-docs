# Restore

There are two options to restore a backup:

- Restore a backup on the existing datastore
- Restore a backup on a new datastore

Please note that restoring a backup may be a long running process.

## Restore a backup on the existing datastore

This option allows to restore a backup with point in time recovery.
The WAL logs are replayed until the desired PITR.
Warning! Running several restores may change the timelines.

## Restore a backup on a new datastore

This option allows to restore a backup on a new datastore.
This option does not currently support PITR.
