# Backup and Restore

CCX backs up Microsoft SQL Server with SQL Server's own native backup, streamed directly to S3 storage.

## Backup

### How backups are taken

Backups use SQL Server's `BACKUP ... TO URL`, which writes the backup straight to S3 storage:

- Nothing is written to the database server's disk first, and there is no separate upload step. A backup is complete when SQL Server has finished writing it to S3.
- Every backup is compressed, encrypted (AES-256) and checksummed by SQL Server.
- Each database is written to its own object, so a backup of a datastore with several databases contains one file per database.
- In the Always On configuration, backups are taken on the primary. After a failover, backups continue on the new primary.

### Backup types and schedule

Three backup types are used together:

| Type | What it contains | Default schedule |
|---|---|---|
| Full | The complete database | Once a day |
| Differential (incremental) | Changes since the last full backup | Every hour |
| Log | The transaction log since the previous log backup | Every 15 minutes |

The log backups determine how much data can be lost: with the default schedule, a restore can bring the database back to within about 15 minutes of a failure.

The backup schedule can be tuned and backups can be paused.

### After a failover

The first backup taken on a new primary after a failover is always a full backup, even if a differential or log backup was scheduled. Normal scheduling continues after that.

### Deleting backups

When a backup is deleted, either manually or because it has passed the retention period, its files are removed from S3 storage.

## Restore

### Restore a backup on the existing datastore

Choose the backup to restore. CCX builds the sequence SQL Server needs to reach that point and restores it on the primary:

1. the full backup the chosen backup is based on,
2. the most recent differential backup before the chosen backup, if any,
3. the log backups after that, up to and including the chosen backup.

Choosing a log backup restores the database to the moment that log backup was taken.

The backup files are read directly from S3 storage. In the Always On configuration, the databases are restored on the replica as well and rejoined to the availability group, so the datastore is highly available again when the restore finishes.

Please note:

- A restore replaces the current contents of the restored databases. Data written after the chosen backup is lost.
- The databases are unavailable to applications while the restore runs.
- Backups taken on either node can be restored, also after a failover has moved the primary to the other node.

### Backups taken before native S3 streaming

Backups taken before native S3 streaming was introduced (written to disk first and then uploaded) remain listed and can still be restored. CCX downloads them to the primary before restoring them. A restore sequence may mix both kinds, for example an older full backup followed by newer differential and log backups.

## Limitations

- **Backups taken right after a restore.** Differential and log backups taken between a restore and the next scheduled full backup may not be restorable. With the default schedule this window lasts until the next daily full backup. Backups taken before the restore, and backups taken after the next full backup, are not affected.
