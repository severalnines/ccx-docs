# Backup and Restore

The **Backup and Restore** feature provides users with the ability to create, view, and restore backups for their databases. This ensures data safety and allows recovery to previous states if necessary.

## Backup List View

In the **Backup** tab, users can view all the backups that have been created. The table provides essential information about each backup, such as:

- **Method**: The tool or service used to perform the backup (e.g., `mariabackup`).
- **Type**: The type of backup (e.g., full backup).
- **Status**: The current state of the backup (e.g., `Completed`).
- **Started**: The start time of the backup process.
- **Duration**: How long the backup process took.
- **Size**: The total size of the backup file.
- **Actions**: Options to manage or restore backups.

### Example Backup Table

![Backup table](../images/restore_backup.png)


Users can manage their backups using the "Actions" menu, where options such as restoring a backup are available.

## Restore Backup

To restore a backup, navigate to the **Backup** tab, find the desired backup, and select the **Restore** action from the **Actions** menu. This opens the restore dialog, where the following information is displayed:

- **Backup ID**: The unique identifier of the backup.
- **Type**: The type of backup (e.g., full backup).
- **Size**: The total size of the backup file.

### Restore Settings

- **Use Point in Time Recovery**: Option to enable point-in-time recovery for finer control over the restore process. PITR is only supported by Postgres, MySQL/MariaDb, and MS SQLServer.
  
By default, this option is turned off, allowing a full restoration from the selected backup.

### Confirmation

Before initiating the restore, users are presented with a confirmation dialog:

> **You are going to restore a backup**  
> You are about to restore a backup created on `03/10/2024 05:00 UTC`.  
> This process will completely overwrite your current data, and all changes since your last backup will be lost.

Users can then choose to either **Cancel** or proceed with the **Restore**.

### Example Restore Dialog:

![Restore dialog](../images/restore_backup_dialog.png)

This ensures that users are fully aware of the potential data loss before proceeding with the restore operation.
