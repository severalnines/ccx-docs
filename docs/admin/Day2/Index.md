# Day 2 operations

:::danger
Never use the S9S CLI nor the CCUIv2 to delete resources (nodes or datastores). This may lead to stray data.
::::

The following sections covers day 2 operations as an administrator:

- [Configuration Management](Config-Management.md) - explains how an administrator can configure which database parameters your end-users are allowed to modify.
- [Lifecycle Management](Lifecycle-Management.md) - covers how to perform upgrades of the database infrastructure, OS upgrades, and maintenance window configuration.
- [Upgrading the Control Plane](Upgrading-the-Control-Plane.md) - how to upgrade the CCX control plane (ccx and ccxdeps Helm releases), including pre-upgrade backups and sequential version steps.
- [Deploying with ArgoCD](Deploying-with-ArgoCD.md) - how to set up the ccx and ccxdeps Helm releases via ArgoCD ApplicationSets instead of direct `helm upgrade`, what must be provisioned before onboarding a tenant, and the Application definitions themselves.
- [Autoscaling](Autoscaling.md) - covers automatic storage scaling for datastores.
- [Notifications](Notifications.md) - covers how to setup email notifications.
