# Autoscaling storage
*Introduced in v.1.50.*

CCX supports autoscaling of storage for datastores.
Autoscaling is a feature that automatically adjusts the storage capacity of a datastore based on the current disk usage.

End-users have to activate this feature on a per datastore basis by setting autoscale storage to true in the UI. It is disabled by default.

If enabled for a datastore, and the datastore has any node that exceeds a defined threshold, the cluster will automatically scale up by a defined percentage.

This disk increase may be repeated multiple times if the disk usage continues to exceed the threshold after each increase.

If the end-user has enabled notifications are for the datastore, the designated email addresses will receive a notification when the datastore storage is scaled up. The email notification is configured by the end-user under the [Datastore Settings](/docs/user/Howto/Datastore-settings#notifications-in-ccx).


## Configuration

The threshold and percentage values are defined in helm values as `autoscaling.storage.threshold` and `autoscaling.storage.percentage`.

The default `autoscaling.storage.threshold` is `70` and `autoscaling.storage.percentage` is `20`. 

To disable storage autoscaling globally (users won't be able to enable it for their datastores) set `autoscaling.storage.enabled: false`

### End-user enablement
The end user must enable the autoscale storage feature per datastore, see [Datastore Settings](/docs/user/Howto/Datastore-settings#auto-scaling-storage-size-in-ccx) for more information.

## Alarm notifications
When the `autoscaling.storage.threshold` has been reached for a storage volume in a datastore, then AlertManager/VM_alert will raise an alert:
called `HostAutoScaleDiskSpaceReached`. It may be look like this:

```
#76390: [Prometheus]: [FIRING:1] HostAutoScaleDiskSpaceReached /dev/mapper/VG_data-data 1.2.3.4:9100 warning (<datastore uuid>>
Disk usage on instance 1.2.3.4:9100 is above the autoscale threshold. Current usage: 70.01082600415612% Disk autoscale threshold has been reached on instance 1.2.3.4:9100 70.01082600415612%
Alerts Firing:
Labels:
- alertname = HostAutoScaleDiskSpaceReached
- ClusterID = NNN
```
If the end-user has not activated the autoscaling, then the alarm will be triggered repeatedly.