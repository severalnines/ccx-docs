# Autoscaling
*Introduced in v.1.50.*

CCX supports autoscaling of storage for clusters.
Autoscaling is a feature that automatically adjusts the storage capacity of a cluster based on the current disk usage.

End-users have to activate this feature on a per cluster basis by setting autoscale storage to true in the UI. It is disabled by default.

If enabled for a cluster, and the cluster has any node that exceeds a defined threshold, the cluster will automatically scale up by a defined percentage.

This disk increase may be repeated multiple times if the disk usage continues to exceed the threshold after each increase.

If notifications are enabled for the cluster, the designated email addresses will receive a notification when the cluster is scaled up.


The threshold and percentage values are defined in helm values as `autoscaling.storage.threshold` and `autoscaling.storage.percentage`.


The default `autoscaling.storage.threshold` is `75` and `autoscaling.storage.percentage` is `20`


To disable storage autoscaling globally (users won't be able to enable it for their datastores) set `autoscaling.storage.enabled: false`
