<!-- Title: Releases_Changelog -->
<!-- Label: CCX -->
<!-- Space: CCXDOCS -->
<!-- Parent: CCX -->

# Release Changelog
:::danger
Downgrades are not supported.
::::

:::info
Please read this section [Upgrading the Control Plane](Day2/Upgrading-the-Control-Plane.md) for more information how to upgrade.
::::

# Release Notes - CCX - v1.52.0

### New Features

- **Add Replica Lag for Async Replication**  
  Displays replication lag for MySQL, MariaDB, and PostgreSQL replicas in the nodes tab.

- **New UI for Selecting Instances**  
  Improves the process of choosing instance types in the deployment workflow.

- **Improved CCX Admin UI Delete Confirmation**  
  Enhances delete dialogs to include identifying datastore information, reducing the risk of accidental deletions.

- **Collect MySQL Slow Query Logs**  
  Integrates slow query log collection into Fluent Bit for easier troubleshooting and analysis.

- **Helm Preflight Checks**  
  Adds hooks and checks to fail fast if certain credentials or configurations are invalid, providing clearer error messages.

- **Backup Source Selection (Primary or Replica)**  
  Lets users choose whether backups run on the primary node or a replica for MySQL, MariaDB, and PostgreSQL.

- **Configurable Pricing in YAML**  
  Allows prices or cost-related configurations to be defined in YAML instead of relying on external references.

- **Extended Event Log for “Enabling Read Only” Job**  
  Captures and displays why nodes were put in read-only mode, including disk space threshold messages.

- **Keycloak API Integration (PoC)**  
  Begins integration of Keycloak for user and realm management, laying groundwork for external authentication.

- **Switch to `pgx` Driver for PostgreSQL**  
  Uses the `pgx` library to support `target_session_attrs=read-write`, helping detect read-only nodes more reliably.

- **Multi-AZ (Multiple Availability Zones) Support**  
  Offers the ability to deploy nodes across multiple zones for greater resilience.

- **Terraform Provider Enhancements**  
  - Supports creating and assigning parameter groups.  
  - Accepts `mysql` as a valid vendor name (in addition to legacy `percona`).  
  - Various bug fixes around node sizing, maintenance hours, and datastore destruction.

- **Return Backup Metrics in Usage/Billing**  
  Exposes backup counts and sizes along with other usage metrics.

- **TLS for Exporters**  
  Enables secure connections for database/exporter metrics using HTTPS endpoints.

- **KubeVirt Integration**  
  - Adds KubeVirt as a supported CSP vendor.  
  - Allows creation and deletion of KubeVirt cluster nodes.  
  - Supports adding/removing volumes and managing provider-specific templates.

- **Ubuntu 24.04 Support**  
  Adds images and compatibility checks for Ubuntu 24.04 when provisioning.

- **S3 Bucket Management**  
  Adds ability to create and delete S3 buckets natively within CCX.

- **Ordered Data Volume & VM Creation**  
  Ensures data volumes are fully created before provisioning the associated VM (in KubeVirt and similar providers).

- **Load Balancer Rate Limiting**  
  Implements throttling logic to avoid hitting cloud provider rate limits during fast or large-scale deployments.

- **Use of Exposed Ports from Deployer Config**  
  Dynamically fetches and applies port settings from the deployer configuration for KubeVirt.

- **Piwik PRO Analytics**  
  Integrates privacy-conscious analytics to track user signups and measure engagement without exposing personal data.

- **`net.ipv4.conf.all.rp_filter` = 0 for MSSQL**  
  Adjusts kernel parameter for MSSQL deployments that require relaxed reverse path filtering.

- **Use Cluster UUID for VM Naming**  
  Prefers cluster UUID instead of node UUID in CloudStack (and similar) to standardize VM names.

- **“Cache22” Replaces “Redis” Branding**  
  Removes references and logos of Redis to comply with legal requirements, adopting an internal “Cache22” brand.

- **Exponential Backoff in Repair Jobs**  
  Applies a retry strategy with increasing wait times for certain automated cluster repair operations.

- **Improved Backup Schedule Configuration**  
  Shifts from selecting a single node to choosing “auto” or “prefer replica,” making backups more flexible.

- **Job System Enhancements**  
  Refines the underlying job orchestration for greater stability, visibility, and scale.

- **Refined Datastore Recommendations**  
  Updates the default recommended cluster configurations (for single vs. multi-node) and labeling in the UI.


### Tasks

- **Rework S3 Credentials for Backups**  
  Consolidates multiple S3 credentials into a single or region-based credential in most deployments.

- **Rename `ccx-datastore-storage`**  
  Renames the service to a simpler “datastores” component in the codebase and directory structure.

- **Nodes List & Scale Modals**  
  Implements “Nodes list,” “Scale nodes,” and “Scale volume” modals for more transparent cluster scaling.

- **Upgrade Procedure v2**  
  Revisits the auto-upgrade flow, moving away from scheduling upgrades via manual timestamps.

- **Cleanup of `db_parameter_tests`**  
  Removes obsolete or duplicated tests, consolidating parameter checks.


### Bugs

- **Invalid DB Parameter Acceptance**  
  Fixed an issue allowing invalid DB parameters to be saved, causing cluster errors.

- **Missing Validation for Backup Retention**  
  The UI now properly enforces valid backup retention periods.

- **Occasional State Worker Panic**  
  Addressed a nil-pointer dereference in the state worker leading to random panics.

- **Disk Resize Email Formatting**  
  Corrected alerts that incorrectly showed “resized from 50GB to 50GB” even when the size changed.

- **Double-Promote Node in MSSQL**  
  Prevented duplicate “promote node” jobs from running when changing volumes on MSSQL AlwaysOn clusters.

- **Ephemeral Volume Change Validation**  
  Added checks to forbid switching from “ephemeral” to a standard volume type after deployment (and vice versa) when unsupported.

- **Panic on Backup Schedules (`makeslice: cap out of range`)**  
  Resolved an overflow bug when reading certain schedule data from CMON.

- **Terraform Cannot Destroy Failed Datastores**  
  Fixed internal references so a datastore that failed during creation can still be destroyed via Terraform.

- **Maintenance Window Shifting in Terraform**  
  Corrected an issue where updating the node count in Terraform also changed maintenance hours unexpectedly.

- **Random Datastore Ordering**  
  Ensured the datastore list is sorted (by creation time) rather than appearing in random order.

- **Datastore “Unknown” or “Unreachable” During Deployment**  
  Improved status transitions to remain in “Deploying” until fully validated.

- **Flag Icons Scrambled on Delete**  
  Refresh logic now correctly updates flags and icons after deleting a datastore from the list.

- **Duplicate DB Parameter Group Names**  
  Added both frontend and backend checks to prevent accidental name collisions.

- **Cannot Delete DB Parameter Group if Datastore is Deleting**  
  Allowed parameter group removal if all associated datastores are already in “deleting” state.

- **Wizard Crash on Cloud Switch**  
  Fixed a UI crash when switching cloud providers mid-wizard.

- **Scaling Redis Nodes in GCP**  
  Addressed rate-limit and context-cancellation issues when adding multiple nodes quickly.

- **No Reboot Indicator in Datastore Overview**  
  The UI now shows an in-progress job status during a node reboot operation.

- **Redis Primary Reboot Failure**  
  Revised the logic that previously rejected reboot jobs on a node hosting multiple processes.

- **KubeVirt AddNode Memory Passing**  
  Ensured memory sizing is properly included when adding KubeVirt nodes.

- **Redis Data Volume Size Mismatch**  
  Corrected an error that assigned incorrect sizes to Redis volumes.

- **Region and CSP Misalignment**  
  Standardized the layout so cloud region info aligns properly in the UI.

- **Creating DB Parameter Group Fails for MariaDB/MySQL**  
  Fixed improper validation of `require_secure_transport` for these vendors.

- **Empty Volume Code Validation**  
  Prevented invalid volume code “blank” entries during cluster creation.

- **MSSQL AlwaysOn Node Config Not Preselected**  
  The recommended multi-node setting is now auto-selected if it’s the only valid choice.

- **Residual Entries in Deployer DB After Delete**  
  Ensured cluster metadata is fully removed from the deployer database on datastore deletion.

- **Vulnerable JS Library & Missing SRI**  
  Updated front-end dependencies and added Subresource Integrity (SRI) checks for external scripts.

- **CloudStack Add Volume Panic**  
  Added safer logic when tagging or attaching volumes in CloudStack to prevent nil-pointer panics.

- **Excessive Node Creation**  
  Fixed a reconciliation bug that occasionally spawned more nodes than requested.

- **IOPS Charts Unit Label**  
  Changed misleading “p/s” label to “IOPS” for disk throughput metrics.

- **Resource Cleanup on Network Failures**  
  Improved rollback/cleanup steps when adding a node fails due to a dropped cloud connection.

- **Missing Backup Sub-Tab**  
  Restored the sub-tab that displays the name/details of each configured backup.

- **Legacy DB Parameter View Default Values**  
  Corrected a UI bug that always showed the default value instead of the currently applied value.

- **Removing a Node with an Active Backup Schedule**  
  No longer deletes the entire schedule; scheduling is adjusted to “auto” if the chosen replica is removed.

- **Parameter Group Sync Always “Pending”**  
  Fixed the logic so the sync status properly reflects “success,” “failed,” or “pending.”

- **Intermittent PANIC Alerts**  
  Added guards and logging improvements to handle unexpected corner cases more gracefully.

- **Incomplete `sql_mode` Defaults for MySQL/MariaDB**  
  Updated default and allowed `sql_mode` values for MySQL 8, MariaDB 10.11, and 11.4 to match upstream documentation.

# Release notes - CCX - v1.51.7

### Customer Bug

- Customer datastore parameters being reset after auto upgrade
- Deploy wizard - going back from network to resources breaks the wizard

# Release notes - CCX - v1.51.6

### Customer Bug

- extra node in cmon
- wrong DNS configuration
- AddNode when connection to cloud breaks 

# Release notes - CCX - v1.51.5

### Bugs

- The hostname and hostname\_internal values are empty in remove node jobs
- Customer datastore parameters being reset after auto upgrade
- CCX creates more nodes than expected size
- CCXCTL missing from 1.51
- ccx runner service is leaking private keys
- Use cluster UUID instead of node UUID VM names

## Release Notes - CCX - v1.51.4

### Bugs

- Create datastore from backup from older db version then the newest one available

## Release Notes - CCX - v1.51.3

### Bugs

- Create datastore from backup wizard not working when there is just 1 CSP

## Release Notes - CCX - v1.51.2

### Features

- **Parameter Groups for Database Management**
  - Introduced **Parameter Groups** to simplify database parameter management.

- **Database Logs in Events Viewer**
  - Added a **Database Logs** section to the Events Viewer/UI.

- **Create Datastore from backup***
  - Can be restored form incremental backup and what is more to different cloud, region or storage type

- **Reboot database Node**  
  - Added a “Reboot node” action

- **Make Postgres SUPERUSER configurable**  
  Added a SUPERUSER checkbox when creating a new PostgreSQL user, with caution prompts.

### **Bugs**

- **Reset password is not working**  
  Fixed a 401 issue when attempting to reset passwords via email links.

- **Deployments stuck in deploying status forever**  
  Corrected state transitions so a failed deployment eventually marks as “failed” instead of hanging.

- **CCX updates k8s services every minute**  
  Reduced unnecessary `Service` updates, lowering API calls to Kubernetes.

- **Backend - forbid creating VPCs on non-AWS clouds**  
  Removed “Create VPC” capability from CSPs that do not support it.

- **Connection assistant displaying `{your_port}`**  
  Fixed placeholder to show the actual DB port instead of `{your_port}`.

- **Backup schedule: increment backup crontab schedule is wrong**  
  Set correct interval to 15/30/60 minutes for incremental backups.

- **Edit storage is accessible for ephemeral storage**  
  Disabled volume-editing for ephemeral storage as it was never intended.

### **Other Improvements**

- **Round all pop-ups with a radius of 8px**  
  Rounded all pop-ups to align with new design standards.

- **Flags icons**  
  Updated all flag icons to use the new flag-pack design.

- **Upgrade v2**  
  - Allow operators to set a deadline for upgrades.  
  - Automatic upgrade after deadline is met (if non-empty deadline).  
  - Send customer email reminders for pending enforced upgrades.  
  - Use maintenance window for enforced upgrades.

- **global - Notification popup should be lower not to hide user settings**  
  Adjusted notification pop-up position to ensure user settings remain visible.

- **Top Queries - colors are bad after expand**  
  Reworked colors and column sizing for better readability in expanded view.

- **Get rid of `CCX_BILLING_NETWORK` env variable**  
  Removed redundant logic since billing network tracking is now always enabled.

- **Update the primer color with the latest one (#160482)**  
  Updated the primary purple color for buttons, radios, checkboxes, and switches.

- **Update the UI components corners radius**  
  - Small components (e.g., checkboxes, tags): 2px corner radius.  
  - Inputs, dropdowns, grouped components: 8px corner radius.  
  - Larger elements: 16px corner radius.

- **Replace the old illustration with the new one**  
  Swapped out obsolete product illustrations with new branding assets.

- **Update the current Sign up/Sign in flows**  
  Refreshed login and registration to comply with the latest brand guidelines.

- **Create user without a database**  
  Added a “Create Database” checkbox (not checked by default) to allow user creation without DB.

- **Add "per second" to postgresql metrics**  
  Updated PostgreSQL metric graphs to explicitly show operations “per second” (p/s).

- **Change Date and Time field to a single DateTime Picker from antd**  
  Streamlined PITR (Point-In-Time Recovery) form with one combined DateTime field.

- **Auto save datastore setting changes instead of the save button**  
  Removed manual “Save” button in settings; changes now auto-save.

- **Scale volume - more logs**  
  Improved logging for volume scaling operations.

- **Create a docs for db logs on ccx-docs**  
  Documented db logging capabilities in ccx-docs.

- **Add reboot node job description and icon to UI**  
  UI improvements for the `JOB_TYPE_REBOOT_NODE` event.

- **Scale nodes: Availability zone is selectable, but there is only one**  
  Simplified UI for single-AZ scenarios by hiding unnecessary selection fields.

- **Redirect to error page if resource not found**  
  If a user navigates to an unknown resource, they are redirected to a user-friendly error page.

- **Improve datastore wizard defaults and information about replicas**  
  - Clearer warnings for 1-primary setups without a replica.  
  - Default selection now includes Primary/Replica.  
  - Better labeling and disclaimers for failover readiness.

- **Update the log gathering script to include new/renamed services**  
  Adjusted gather-logs script to account for service name updates since 1.48.

- **Backend API gives 500 when it should be Not Found 404**  
  Corrected HTTP status codes for missing datastore or resource endpoints.

- **Add /auth/admin-login to swagger.**  
  Documented admin login endpoints in Swagger, found under `/admin`.

- **Filters and pagination**  
  Enhanced listing UIs (e.g., datastores, nodes) with search filters and pagination.

- **Recover from All servers are Read Only**  
  - If disk usage > 90%, the datastore is set to read-only.  
  - When usage is back to normal, CCX resets the datastore to read-write.

- **CLI tools for CCX**  
  `ccxctl cluster state/unlock/remove`, `ccxctl job state/kill`, etc. for operational tasks.

## Release Notes - CCX - v1.50.10
### Bugs
- Nodes disappear from ccx UI

## Release Notes - CCX - v1.50.9
CMON version: 2.2.0-11542
### CMON Bugs
- MSSQL - Create backup for databases with - in name

## Release Notes - CCX - v1.50.8
CMON version: 2.2.0-11405
### CMON Bugs
- Postgres - multizone environment.
- Spamlogging failed queries cmon.log
- Multiple concurrent full backups race condition

## Release Notes - CCX - v1.50.7

### Bugs
- User cannot update credit card info when wrong was inserted

## Release Notes - CCX - v1.50.6

### Bugs
- Password present in multiple logfiles
- Loglines are extended repeatedly until the service restarts.

## Release Notes - CCX - v1.50.5

### improvements
- Autoscale is enabled by default for new datastores

### Bugs
- Duplicated VPCs issue
- MSSQL - missing ccxadmin user after failover
- Multiple parameters change is changing only one
- Password reset issue
- Increase pg wal_keep to 1024 

## Release Notes - CCX - v1.50.3

### Bugs
- Failover job not visible for MSSQL
- Newly created datastore incremental date is invalid (once a day)
- 500 errors after failover
- External DNS records not being created

## Release Notes - CCX - v1.50.2

### Bugs
- Optimize failover time for Always on

## Release Notes - CCX - v1.50.1

### Bugs
- Concurent backups failures
- Autoscale switch missing in UI

## Release Notes - CCX - v1.50.0

### Features
- Auto-scale volumes
- Send email notifications to end user
- TLS v1 Postgres and Redis
- Cloudstack support

### Task
- Add mariadb 11.4 support
- Global: tooltip rounding
- Global: modal rounding
- Global: Modal margins for action buttons
- Landing page: change date format on click
- Datastore wizard: DB type selection
- Datastore wizard: CSP selection
- TLS support for Postgres
- Redis support
- Datastore overview: show AZ in network section
- Global: Copy button should fill purple on hover
- Scale nodes: slider and picker on the slider should be purple
- Scale nodes: Configuration text should be purple
- Scale nodes: polish the popup
- Scale nodes: galera - when adding 2 more nodes, there is empty space
- Monitoring: loaders are not centered, loader box smaller on loading
- Monitoring: Auto Refresh -> refresh and the same row as label
- Copy action: top right notification
- Deployment wizard: remove recommended if there is just one option to pick
- Backend: send the notifications
- Backend APIs for Dashboard Revamp
- Merge cmon-go repo into ccx-backend
- Configure HostAutoScaleDiskSpaceReached event in observability
- Handle HostAutoScaleDiskSpaceReached event in ccx
- Send notification to user on auto-scaling success
- Implement FE design
- Use zone\_ids from clouds config
- Playwright tests for autoscale
- Add/Remove nodes
- Resource cleaning
- Multiple Openstack region backend support
- Restore again
- Datastore form backup tests
- Add cloud groups to yaml and API endpoints
- Group cloud vendors
- Delete ssh keys
- We do not update public IP in add node to cluster
- Wrong cloud-init setup in add node
- AddNode did not add volumes
- Log API error responses
- Release v1.50.0
- Return on error from createNode
- Node information is gone when we can't attach a disk
- Restore Volume
- Restore from backup: validate whether the backup ID belongs to the user
- Add Autoscale to status handler
- Autoscale use status info
- Redis deployment missing /data
- Encrypt data volumes

### Bugs
- CCX main page is repeatedly calling for jobs
- UI: Inconsistent placement of "Connection information"
- Scale wizard auto reloads before I had time to make my selections
- Inconsistent use of Instance names and types
- ccx-controller-storage selects random controller from the database and fails if controller\_address is not set
- CCX can't handle Postgres failover
- Users are not available while there is a backup restore running in the background
- Multiple 401 in Admin Panel
- CCX main page is repeatedly calling for subscription
- CCX main page is repeatedly calling for deploy wizard
- Errors in log when viewing failed clusters
- Spelling error on the signup page
- cmon-sd panic on fail response from cmon
- Too little disk for Safespring volume
-  Missing cmon host
- Clicking on CCX logo does not always lead to the "homepage"
- Command error, will retry
- Restore backup fails on VMWare
- \[MSSQL\] Restore backup: Storage host must be the same as restore host
- Incorrect key parsing in users
- Fix creation of store inside project
- Deployer S3 config all broken
- S3 bucket not created/deleted for VMWare
- VMWare username not set from secret
- VMWare deployer does not delete secrets
- GCP deployer eats errors
- Some sort of test conflict on GitHub runners
- Some services report an error on shutdown
- "Custom migrations" in ccx-migrate are unwanted and print errors
- Theme missing for admin panel
- Nodes frames are too close to each other
- Create datastore from backup fails for PostgreSQL 16
- Monitoring Summary Tab: Fixes
- Do not set PrivateFQDN if userDomain is not set
- Can't deploy to AWS with IOPS
- Cannot display datastore when having more than 30 datastores
- Backup schedule is always the same
- Connection assistant won't display newly created users
- Privileges are concatenated in the User List
- \[VMWare\] cloud-init domain not set
- Volume size OR IOPS cannot be changed on AWS io1 volume type
- Multiply network does not work on VMWare
- Clicking on "Settings" redirects to main page
- Create\_restore\_dir error
- Autoscale Storage button reverts automatically
- Nodes info and settings are being reset at every request
- Autoscale for Redis is enabled
- \[DB Parameters\] Aborting edition displays unsaved value as current
- DB parameter should display default value when nothing is set yet
- Panic on zap logger
- Redis and MSSQL backup restore is not working

### Known issues
- Newly created datastore incremental date is invalid (once a day)
- Failover job is not visible in Event viewer for MSSQL

## Release notes - CCX - v1.49.4

### Customer Bug
* increase datastore deployment default timeout 
  
## Release notes - CCX - v1.49.3

### Customer Bug

* VMWare multiple network support
* Admin panel theme fix

## Release notes - CCX - v1.49.2

### Improvement

* Delete VMs in VMWare

### Customer Bug

* datastore resolved to multiple instances

### Story

* \[VMWare\] allow cloud vendor configuration override per datastore

### Bug \(Internal\)

* MariaDB Galera and redis 3 node deployment is failing on aws

* Openstack galera deployment 

* VMWare add node for redis is failing

## Release notes - CCX - v1.49.1

### Bugs
* admin app image is not public

  
## Release notes - CCX - v1.49.0

### Features

* Move admin page to separated package 

* Credential creation timepicker for expiration time

* MySQL: Create ccxadmin with caching\_sha2\_password

* VMWARE/VSPHERE support

* TLS v1 Mysql/MariaDB

* GCP


### Improvements

* Helm chart option for default service replicas

* CCX Terraform provider improvements

* Event viewer:  Rename "Errored" to "Failed"

* Filter on non-matching db type shows 'There are no datastores created yet'

* Remove unneeded binaries

* MSSQL: Use must select configuration even if there is only one

* Move admin page to separated package 

* Do all DNS through ExternalDNS

### Bugs

* Restore initiated by 'system'

* panic: runtime error: invalid memory address or nil pointer dereference \[signal SIGSEGV: segmentation violation code=0x1 addr=0x0 pc=0x1a72c17\]

Missing indicator when filters are set

* Ephemeral disk size is not displayed

* Version not set in prometheus stats

* sha3sum not found in cloud-init log

* Errors in logs when slack is working fine

* Cmon remove node not always retried

* VMWareDeployer.fillSpecDefaults\(nil\) in deployer doesn't do anything

* Adding node loader is misalign

* Modify DB Parameter wait is too short

* Remove firewall tab from frontend for VMWare deployments

* Change volume type is not blocking other actions on UI

* Save button on settings tab is not at the bottom

* Can't select DB version in wizard

* \[MSSQL\] Restore backup - Storage host must be the same as restore host.

## Release notes - CCX - v1.48.10
### CMON Fixes
* Postgres restore fixes
* Postgres charts in CC UI fixes

## Release notes - CCX - v1.48.9
### CMON Fixes
* Create datastore from backup for psql

### Features
* Terraform creating firewall support

## Release notes - CCX - v1.48.8
### Fixes
* invalid memory address or nil pointer dereference - panic error log fix

## Release notes - CCX - v1.48.7
### Fixes
* MSSQL change volume type fix
* Create datastore from backup fix
* Change volume type UI validation improvments

## Release notes - CCX - v1.48.6
### Fixes
* JWT - fails to register/login

## Release notes - CCX - v1.48.5
### Fixes
* After automatic failover number of nodes is increased by 1

## Release notes - CCX - v1.48.4
### Fixes
* create RBAC first fix
* Bring back ccx-datastore-storage-service-svc in k8s

## Release notes - CCX - v1.48.3
### Fixes
* add permissions to service account

## Release notes - CCX - v1.48.2
### Fixes
* Users login permission fix

## Release notes - CCX - v1.48.1
### Fixes
* use cmondb instead of mysql for dabatase config in cmon.cnf

## Release notes - CCX - v1.48.0
CMON version: 2.0.0.9042

⚠️ Migrate vault is enabled by default. So if you are using Vault we will copy all the values to the Kubernetes secrets. To disable it change useK8sSecrets in values.yaml ⚠️

### Features
* Change volume type
* [beta] Billing for admins
* Change password for account
* Migrate vault key/values into secrets
* CCX Admin UI : Export all tabs to CSV-files
* Mobile UI
* Datastore overview page paging and filtering
* Implement date picking for DBgrowth
  
### Bugs
* Protect against deleting DNS record by accident
* Deploy wizard change order of configs
* Databases records are not being removed
* Multiple calls to the same endpoints in datastore overview
* Failed repair leaves permanently reduced cluster
* MSSQL License is not passed in the create cluster
* Datastores in CSV doesn't include show user email
* Change in code path breaks existing session
* 13:00 PM when scheduling an upgrade
* Scaling storage breaking volume type billing 
* Pricing plans | Terms of service | Privacy policy links not working 
* Vault cannot be disabled
* Restores get stuck in "defined" state
* Stores are shown while deleting
* Copy icon do not have margin in node tabs for IP addresses
* Horizontal scroll appears on datastore list on desktop
* Allow disabling of cloud service step in datastore deploy wizard via env config
* cmon-go GetDatabaseHosts and IsSSLEnabled methods are wrong
* Sending user notifications of cluster events doesn't work
* Test coverage action problems
* Fix vault migration
* User is misled that there is no datastore during loading 
* When /deployments takes longer then the /nodes request then nodes info is not displayed
* Volume type change: When user do not change IOPS then action fails
* New CCX deployment \(or upgrade to 1.48\) can fail to see controllers
* Scale nodes is missing for mssql\_ao\_async
* Redis not displaying volume type
* Paging on datastore overview is not working properly
* Billing is crashing - divide by zero
* Cannot get billing report for one day
* Missing cookie should not be logged as error by auth
* Default MSSQL license not applied
* Sorting issue with data-store API with paging
* V2 and V3 of deployments API don't match V1
* Billing missing fields in csv
* Billing is returning datastores that were deleted before selected billing period
* Nodes disk\_type is the same for all nodes even if API returns others

## Release notes - CCX - v1.47.0
CMON version: 2.0.0-8679

### New features

- Automated failure handling
- Datastore from backup
- Database growth
- Expose monitoring ports
- Repair and node scaling for MSSQL
- CCv2: ssh to DB node

### Improvement

- navigational bar: icons
- Upgrade datastore - tool tip with help text
- CCX UI: Filter list of datastores on database type and tags.
- API for grouped firewall rules

### Task

- UI Improvement: Extended white area height when no content in tabs
- Remove vault dependency
- Migrate vault key/values into secrets
- Support multiple nodes in the repair job
- Restore backup should be a job
- Install pigz and clud on the db nodes
- CMON status in /deployments endpoint
- Use proper byte units on databases screen
- configurable Disabling cmon db refreash
- Stop using CMON for metrics.
- Protect against deleting DNS record by accident

### Customer Bug

- External addresses is not created for cluster
- ccx-datastore-storage sql: no rows in result set #319
- Datastore Lifecycle Upgrade failed #297
- Infinite retrying are blocking customers
- Error: cloud provider does not support instance type "X"
- DNS resolution fails when adding a node
- Billing - wrong amount
- presentation of changed cluster and node states
- Creating datastore waits for DNS record #342
- Do not allow user to delete MSSQL DB
- List databases does not seem to set refresh_now.

### Bug \(Internal\)

- Changing backup schedules for MSSQL is not working
- Datastore status showing UNREACHABLE when CCX cannot contact CMON, despite the datastore is OK.
- Servers can be misconfigured re. file permissions
- First pausing of incremental backup pause full backup as well
- If datastore status is unreachable one cannot click on datastore to get into details
- When there are no nodes, disable "Scale nodes" button
- Change the style of message component in "Extend node storage" pop-up
- Change the formatting of the CTA of few of the main tabs navigation
- Center the empty state illustration in the middle of the some of the the pages
- Inputs don't use same rounding
- Failed to process CMON alarm in ccx-notification-service
- /sqlstat/aggregate not working
- Prometheus URL missing for rest-service
- Databases tab not showing created databases
- \[AWS\] Your requested instance type is not supported in your requested Availability Zone
- \[AWS\] Prod deployments fail in us-east-1 region
- Create user on postgres is crashing
- Opening Create database too fast return empty list for db users
- DB and version version are displayed in two rows
- MSSQL node order after promotion
- User cannot open and delete failed and maintenance datastore
- Missing monitoring icon is not centered
- Restore from backup - ccxadmin password wrong on the new datastore
- DBs from the parent datastore are copied, but they are missing on the UI
- Restore from backup for multiple node datastore
- AWS s3 buckets delete does not work.
- Unhardcode "nil" controller ID
- Deleting during a running job both succeeds and fails
- Retry of cluster delete \(maintenance job\) no longer works
- Add node job will retry 8640 times
- Repair job tries to run on single node cluster
- CMON sends negative cluster_id in the event to notification service
- Database growth data
- Retry configs are still bad
- When Primary is down endless loop of remove and add node is triggered
- After failover node ends up with 2 primary node and user cannot delete any of them
- Failed repair leaves permanently reduced cluster
- Secrets implementations are not consistent in API
- POD_NAMESPACE not set in controller-storage
- Cannot Add node to REDIS
- Datastores with running jobs are not being deleted
- Click to get nodes appears 2 rows above hovered one
- Scaling nodes - frontend send the chosen node selections to the backend for the first node only
- MSSQL missing "replica." in replica DSN
- VPC selector is broken on Linta staging
- current date is displayed twice in DB growth
- Upgrading datastore returns fails and returns 500
- Top largest tables are not loaded
- DB growth data does not match
- Lack of background in tables
- Error handling for galeras is not working
- Repair primary node for Redis is not working

### Known issues:

- Postgres add database is randomly failing as template1 database is in use. Workaround is to wait few minutes until database is reachable again or restart the server. It mostly happens when there is multiple add database actions in row (e.g. during e2e test run)

## Release notes - CCX - v1.46.2 - Released 13th of March 2024

CMON version - 8080

### Bugs

- Fixed an issue changing backup schedules for MSSQL.
- Fixed an issue where Infinite retrying are blocking customers during promote node.
- Fixed an issue where CCX failed to process CMON host changes, because CCX did not know the CMON cluster id when the event came.
- MSSQL Upgrade datastore functionality is now disabled, as it is not yet supported.

### CMON issues

- Fixed an issue in MS SQLServer where promoting a replica to primary failed.
- Fixed an issue in MS SQLServer where restore failed on the secondary, causing it to never join the availability group.z
- Fixed an issue in MS SQLServer with differential backup.
- Fixed an issue with deadlocks in MS SQLServer monitoring.
- Fixed an issue in MS SQLServer where backup/restore failed for single server.
- Fixed an issue in MS SQLServer where the 'ccxadmin' user was not present on the secondary.
- Fixed an issue where deleting a cluster created an unnecessary action to remove backups. Unnecessary since CCX deletes the entire S3 bucket where the backup is stored.
- Fixed an issue in MS SQLServer where the wrong backup host was elected.
- Fixed an issue with state handling for Redis, MS SQL, and Postgres. Cluster state must still be STARTED after a node has been gracefully shutdown.
- Fixed an issue in Postgres, removing a number of log messages unnecessarily written when a node was in User Shutdown state.

## Release notes - CCX - v1.46.1 - Released 21st February 2024

CMON version - 1.9.8-7802

### Story

- REDIS user management

### Bug

- SSH to datastores, invalid cloud-config #316

- CCX UI anomaly #315

- CCX user login information undefined #314

- ccx-notification-service cannot unmarshal string into Go struct #317

- ccx-datastore-storage sql: no rows in result set #319

- CCX UI MySQL changing DB parameter collation_server throws an Error

- ccx-datastore-storage sql: no rows in result set #319

- Mixup for golang. FQDN DNS integration for Connection assistant #307

- Redis - Volume Size should not be configurable

- /sqlstat/aggregate not updating "from" nor "to"

- Wrong node count for mssql in values.yaml

## Release notes - CCX - v1.46.0 - Released 31st of January

CMON version - 1.9.8-7463

# CMON

## Bugs fixed

- Fixed a number of deadlock issues in CMON regarding connection handling.
- Fixed a crashing bug

## New features

- Microsoft SQLServer 2022 support for Ubuntu 22.04

# Improvement

- failed to add nodes: Improve error message
- deployer config - floating_ip_api_version default value
- deployer-config - compute_api_microversion default value
- deployer-config - default retires to 5
- UI contrast and availability improvements

# Task

- Scale storage hooks #37
- CORS Misconfiguration
- Content Security Policy (CSP) Header Not Set
- CCX Theme Updates
- deployer-config - make sure we can remove s3 from config
- Implement Core Dump in K8S Cluster

# Bug

- Retry manual upgrade jobs
- Fix DNS never resolved error after hitting max retries
- Clicking in admin view gets you away from admin with no coming back
- Access To Services, DNS TTL is hardcoded to 15 seconds
- Deploy cluster job fails due to DNS not being available but it is there.
- Validation error during db parameters save
- Account empty personal info after first login
- Authenticate password to cmon exposed in debug logs in cmon-go
- Changing store type in wizard can send invalid config
- Admin password not getting updated
- LoadAVG Graph broken
- Connection assistant missing for MSSQL with turned off Access to services
- Billing not getting disabled enough
- Admin Panel - Datastore is Available but no are nodes displayed
- Nodes slider in scaling modal is not updated after adding/removing nodes
- Upgrade datastore for redis is not working properly all the time
- Add galera node can end up in endless loop adding nodes until license is used

## Release notes - CCX - v1.45.1 - Released 19th of December

### Cmon bug fixes - cmon 1.9.8-7156

- Replication lag makes CmonHostFailed. This is too aggressivie
- Reducing load caused by CmonHostCollector
- Discrepancy in PostgreSQL max_connections setting vs recommended
- Force failover did not work properly and as expected
- Setting a sane default value for ccx for the variable
- CMON fails to init datastores if a single datastore have wrong mysql_hostname
- Galera restore is failing. Refactored startCluster and changed startup order. Delete datadirs from the non-donor nodes, and then start each node at a time.
- MariaDB deployment fails - CREATE USER syntax is wrong
- Removed printout "detected version on server has changed from X.Y to X"

### New Features

- Repair failed nodes
- Specify authentication plugin when creating MySQL Admin user
- Allow modification to CSS
- Event viewer

### Improvements

- DB Parameters empty for MSSQL
- Update S9s logo and copyright text on the login screen
- Possibility to run CCX without Access to Services

### Bugs

- DNS for internal IPs for MSSQL
- Monitoring charts fixes for MSSQL, Redis (redisSlaveLag) and Queries per second graph
- Job running indicator do not disappear if page is not refreshed
- Scaling AWS storage breaks after 8 times

# Release notes - CCX - v1.44.0 - Released 16th of November

### New Features

- Access to services/failover. This provides the user with a single entrypoint to the datastore. Requires ExternalDNS. Check your CCX Wiki for main/wiki/Dynamic-DNS.md
- Configuration Management. Ability to let the end-user tune certain configuration values. Use with care.
- Lifecycle Management. Ability to upgrade datastores (OS and database software) using a roll-forward upgrade method.

### Improvements

- Make ccx_growfs script create new volumes if necessary
- CCX ADMIN UI. Quick copy cluster-id in CCX admin #236
- Create, mount, and use disk for restore job (#241)
- Use 24h format everywhere
- Select the 'Primary' by default in the Monitoring dropdown
- Create swap partition (4GB) and set swappiness to 1
- Make remove_cluster job synchronous in CMON (Datastore deleted in CCX remains in CMON #242)
- Improved to handle a CMON restart during datastore deployment, which breaks deployment and datastore was stuck in deploying status forever. Now the datastore is stuck any longer.
- Restore backup on additional mounted volume.
- Dropdowns with single option are preselected
- Postgres: Create database when creating an user.
- Postgres: Add Database owner when creating databse
- Use 24h format everywhere on charts
- Select the 'Primary' by default monitoring dropdown

### Bugs

- Postgres monitoring issues.
- Admin view is table is broken when datastore name is too long
- Scaling modal is refreshed without any user action
- One can promote replica in failed state
- Monitoring break when IP address reused too quickly.
- Should not retry cluster create on same hardware
- Modals and pop-ups have wrong corner rounding
- Improvements of the actions menu in the data store list page
- CCX UI: going directly to datastore services page throws error (#265)

### CMON fixes

- Role set to PRIMARY on Single SQLServer.
- Fixes in Microsoft SQLServer exporter.
- Support for preview version of MS SqlServer 2022 on Ubuntu 22.04.
- Support for the configuration management job used in the Config management feature.
- Install Timezone data for MySQL/MariaDb on Create Cluster. This is required in order to be able to set Timezone from configuration management, else only the default operating system timezone is used.
- Removed unnecessary SQL statements and removed called to TRUNCATE and CREATE TABLE IF EXISTS during runtime which may cause issues when the CMON DB is located on Galera.
- Fixed a bug where the number of postgres tables was displayed incorrectly.
- Fixed a bug Setting max_connections when adding new node in mysql.
- Fixed a bug where creating a database called 'test' would display 79 tables in CCX UI.

## Release notes - CCX - v1.43.6

### Bugs

- Allow not using galera configuration on frontend

## Release notes - CCX - v1.43.5

### Bugs

- Add node with large datasets fails due to timeout

## Release notes - CCX - v1.43.4

### Bugs

- Could not select machine image - error fix
- Panic in deployer - error fix

### Tasks

- Write server metadata in openstack

## Release notes - CCX - v1.43.3

### Bugs

- CMON fails silently during startup when initing datastores #235. An alert is raised (requires the :latest cmon_exporter). The latest release of https://github.com/severalnines/observability must also be applied to have the alert sent to AlertManager.
- Users OAuth credentials does not get revoked or expire #269

### CMON 1.9.8-65NN

- Properly creating an alarm in case a cluster fails to initialize.

## Release notes - CCX - v1.43.2 (released 14th of September)

### Bugs

- Fixed the pg_basebackup restore PITR. UI sent the time in the wrong timezone

### CMON 1.9.8-6522

- Fixed PITR issue where CMON had difficulties handling a stop time in the future, and if stop_time was not set, then recovery was until end of the WAL Logs. Now CMON will restore only the backup if no stop_time is set, and until the end of the logs if NOW is selected in the frontend.

## Release notes - CCX - v1.43.1 (released 12th of September)

### Bugs

- Scale storage fails

### Known bugs:

- pg_basebackup restore PITR

## Release notes - CCX - v1.43.0 (released 8th of September)

### Bugs

- Fixed a bug in the Create datastore UI, causing it to crash because of the missing field.
- Scaling node UI issues, which sometimes causes the UI to collapse the section where the nodes are added.
- Users could add more then 5 nodes via API. The limit is 5.
- Fixed an issue where cloudinit was hanging by adding a timeout. This timeout is configurable with the CLOUD_INIT_TIMEOUT_MINUTES environment variable. The default is 15 minute. #260

### Improvements

- Roll deployments on changes to secrets #249
- Populate orgId field in OpenStack instance metadata and volume metadata using CCX User externalIds #263
- Frontend: An ellipsis \(...\) has different colour than the datastore title.
- Frontend: User does not any longer need to refresh a page in order to track deployment progress.

### CMON 1.9.8-6512:

- Redis: Adds the 'allchannels' privilege to 'ccxadmin' user
- Redis: Fixed a bug where adding a replica failed to enable the monitoring agent due to invalid credentials.
- PostgreSQL: Scale max_connections based on RAM.
- Create an alarm in case cmon fails to start a cluster (this is an extended version of a previous version. Now, an alarm will be raised if the monitoring thread cannot be created, as well as configuration issues.)
- Improved add_node reliability for MariaDb Cluster / Percona XtraDb.

### Known bugs

- Scaling storage does not work when scaling factor is set to 1.
- Postgres connection string is wrong, the port 5432 is specified twice.

## Release notes - CCX - v1.42.3 (released 4th of September)

### Bugs

- Removing node on Redis set datastore in warning status
- ccx-deployer-service improve logging structure
- PVCs are created with storage-provisioner annotation for GCP

### CMON 1.9.8-6501

- Tmpdir was not created properly.
- Exporters are now installed using systemd for stopping/starting.
- MySQL/MariaDb (Galera): Syncing node during addnode will be retried before giving up.

# Release notes - CCX - v1.42.2 (released 17th of August)

### Bugs

- Change default vault base path back to `kv`
- Add support for vault environment variables in ccx helm chart

## Release notes - CCX - v1.42.0 (released 11th of August)

### Improvement

- Added Logging of VM IDs on datastore creation #238.
- Added PostgreSQL 15 support.
- UI: The view of the Connection string in the node tab has been shortened to make it readable.
- Made improvements in dialogs of Scaling MySQL or MariaDB multi-master galera cluster setups.
- Improved ccx-deployer-service logging structure #243.
- Enable promoting replica for Redis datastore.
- Vault secret (address, token) is now managed by helm chart. It needs to be set as described here - https://github.com/severalnines/helm-ccx/blob/main/values.yaml#L53

### Bugs

- Fixed an upgrade bug that happened when upgrading ccx from 1.39 to 1.40.0. The fix prevents this from happening.
- Fixed a bug where the deployer ignored openstack region.
- Fixed a bug where the deployer ignored the VM error status.
- Fixed a bug where the postgres connectstring was incorrect.
- Fixed a bug where a missing REPLICATION SLAVE ADMIN privilege in Mysql/mariadb prevented users from setting up a replication link to an external primary.
- Fixed a bug where the scaling nodes modal is using prefered_region and not region.

## Release notes - CCX - v1.41.2

### CMON Controller updated to 1.9.8-6459

- Fixed a Memory leak and segfault happening due to an unprotected (no lock) debug log message.
- Fixed a bug with Backup retention. Backups stored on S3 were not always deleted.

## Release notes - CCX - v1.41.1

### CMON Controller updated to 1.9.8-6431

- Fixed a bug where an added node was immediately stopped due to a race condition.

## Release notes - CCX - v1.41.0

### Bugs

- Fixed a bug in the PITR Calendar: Possible to select future dates #244.
- Fixed a bug in the frontend where the Incorrect instance specs was shown.
- Fixed a issue where making a selection in the deployment wizard was not shown.
- Fixed a bug in the frontend, where the elipsis (...) is shown even though there is space to display entire name.
- Fixed a bug in the frontend, where the elipsis (...) did not have the correct color.
- Fixed a bug in helm-ccx: StorageClass needs to be configurable for PV #248.
- Fixed a bug in the frontend, where the host field is out of modal bounds for long hostnames.
- Fixed a bug where there was duplicate scrape target with identical labels.
- Fixed a number of Scaling nodes/storage bugs:
  ** Scaling nodes modal issues
  ** Scale storage fails if an add node action was performed before.
  ** Scale node modal do not show proper instance sizes
  ** Redis scaling nodes should works the same as for Galera

### Improvements

- Allowing user to create max 10TB storage
- Hide billing costs if FE_BILLING_DISABLED env var is set to true

## Release notes - CCX - v1.40.0. - 26th of June

### Features

- Ability to resize the volume of a datastore node upon customer request CCX-937
  Limitations: due to https://bugs.launchpad.net/ubuntu/+source/linux/+bug/2003816 we recommend you update images to Ubuntu 22.04.6. There is a regression in resizefs.
- A Terraform provider that is working and up-to-date CCX-2995
- - https://github.com/severalnines/terraform-provider-ccx/releases/tag/v0.2.3
- - https://registry.terraform.io/providers/severalnines/ccx/latest
- One bucket per datastore #163

### Improvement

- Redesign the configuration selection in the Deployment wizard.
- Update/manage existing security groups #219
- Update CMON and CCUI v2
- CCX User UI, allow user to choose AZ for the services #104
- Node scaling , scale with 2 nodes for Galera. #160
- CCX UI: allow user to choose AZ when creating a new datastore node CCX-2894
- Upgraded NATS to Jetstream as NATS is deprecated.

### Bugs

- CCX UI: Create datastore, possible to add duplicate tags #191
- Postgres: Created database could only have ccxadmin as owner. Now the user can select database owner.
- Inform user about failed datastore deployment reason when it is quota exceeded error
- CCX spams the logs - added debug flag
- Insufficient privileges: Percona/MySQL add WITH GRANT OPTION

### CMON improvements/fixes in 1.9.8-6397

- Fixed a bug where auto recovery was disabled following a restore database
- MySQL/MariaDb: For small configuration (4GB RAM or less), the innodb_buffer_pool_size is set to 25% (was 50% before).
- MySQL/MariaDb: Fixed a bug in database sizes (as presented in the UI)

### Current limitations / Known issues.

- Scale storage (this is being worked on now)
- - Node information is not being updated after storage extension, the user needs to refresh to see the proper state:
- - When the user makes scale nodes/extend storage action, then there is a few seconds delay before buttons are disabled. Can we make /a job request right after the Save button is clicked?
- - Unify naming Replica and secondary.
- - After adding multiple node actions or deleting node actions then the scale nodes modal shows the not updated state. Even page refreshing is not fixing this state.
- - Due to https://bugs.launchpad.net/ubuntu/+source/linux/+bug/2003816 we recommend you update images to Ubuntu 22.04.6. There is a regression in resizefs.

## Release notes - CCX - v1.39.0

### Improvements

- CCX UI: Delete node was improved
- Added support for Volume tags #130
- CCX UI: datastore monitoring, show more info in node dropdown list #198
- CCX UI: create new datastore => Resources => Storage, set Volumes as default selection #203
- CCX UI: Firewall, Make the firewall expanded by default, removing the possibility to collapse
- CCX UI: delete datastore confirm box, add more info about the datastore #208

### Bugs

- CCX UI: ccxdb password shown in hover-text in Query Stats views #204
- CCX UI: Fixed an issue where the Copy button is not aligned at the Top queries.
- Fixed a issue with cloud_only:false from Backup job in case of Redis/MS SQLServer
- Fixed a bug where it was possible to create >1 restore backup job #178

## Release notes - CCX - v1.38.0. (12th of May)

- CCX UI: Added Help text in deploy wizard to help the customer #96
- CCX UI: Added text Promote Replica dialog
- CCX UI: Revisit UI design on User Privileges
- CCX UI: Query Stats: Change "Instance" to "Node"
- CCX UI: Create datastore, impossible to go back and change storage type #166
- CCX UI: Fixed a bug where you cannot see the node flavor #176
- CCX UI: Datastore creation wizard - navigation issues
- CCX UI: Change to modal
- Helm chart needs to support affinity #169
- Node information is missing instance type and volume type
- Fixed a bug where S3 backup buckets are not being deleted
- Datastore details on admin panel are not displayed properly

## Release notes - CCX - v1.37.0. (28th of April)

- Fixed an issue in the CCX UI and removed the "multi-az" selector as multi-az is not supported for deployment into customer project
- Fixed an issue where ServerGroup is not used in OpenStack deployments
- Added a feature to allow the user to Promote Replica and Remove Primary instance
- Added a feature to allow User-configurable backup schedule and retention.
- Fixed an issue where Backup Schedule settings were shown unnecessarily
- Fixed an issue with MySQL 8.0 ccxadmin privileges.
- Fixed an issue where the MariaDb ccxadmin privileges were too open
- CCX UI: can't select database id, now it is possible to copy the database uuid from the
- CCX UI: removed a tooltip: "Our Support Team has been notified ..."
- CCX UI: Separates Users & Database into two separate sections.
- CCX UI: Change master slave text
- CCX UI User Not Found UI error

## Release notes - CCX - v1.36.0.

- Removed the v1-small-1 flavor
- Improved the deployment wizard to skip the steps in the setup where there is only one choice available.
- Improved the front to be able to see which AZ a service is running in.
- Fixed an issue where VMs were not created on all AZs
- Query Monitor: Top Queries, "Instance" column is missing
- Configurable max limit of number of datastores
- Users & Databases: Field validation
- Users & Databases: Missing details for MySQL users
- Fixed an issue where removing data nodes, where a create cluster job would report 'Host is already in another cluster'.
- Query stats: Added copy button for DSN under instance
- Added option to deploy one master and one replica when you create MySQL/MariaDb/Postgres datastores (only primary/replica configuration)
- Configurable max limit of number of datastores
- Volumes support
- Deployment wizard: Network type in Preview step was empty
- Admin panel: Remove datastore
- Fixed an issue when adding a Firewall rule without description
- Fixed an issue where opening a non-existing datastore or one the user do not have access to shows loading screen instead of 404/403 page
- Fixed an issue where CMON raising alert about ssh to victoriametrics
- Fixed an issue where add node doesn't wait for cloud init

## Release notes - CCX - v1.35.0. (23rd of February)

- MSSQL: Limit to one primary and one secondary to comply with the standard license of availability groups.
- Change the footer color to the same as the header.
- Backup page: Show actual time instead of "X days ago"
- Deployer leaking secrets to log.

## Release notes - CCX - v1.34.0

- Redis: "Queries per second" monitoring info is not loading.
- Change quota limit of datastores per user in alpha environment: 20 datastores per user.

## Release notes - CCX - v1.33.0

- Added synchronous replication flag to create postgres cluster/ add node postgres job.
- Fixed a bug with Datastore deletion.

## Release notes - CCX - v1.32.0

- SQL Server: Connectstring information in Service view
- UI improvements and minor bug fixes.
- Redis: Dashboards shows empty database charts

## Release notes - CCX - v1.32.0

- SQL Server: Connectstring information in Service view
- UI improvements and minor bug fixes.
- Redis: Dashboards shows empty database charts

## Release notes - CCX - v1.31.0

- CSS changes in UI
- Added MSSQL to deployment wizard (BETA)
- Fixed an issue where the disk size multiplier did not work with add node
- Add node: Added nodes always go to first AZ
- Wrong status 'unknown' but should be 'shutdown' in Service view
- Admin page redirect is stuck in a redirection loop

## Release notes - CCX - v1.30.0

- Service lifecycle/shutdown issues
- Retire prometheus in favor of VictoriaMetrics
- Move metrics to a separate port in each service
- Add admin user from K8s secrets
- CCv2 UI
- Security: Leaking secrets: Don't log CMON RPC calls
- Postgres: hide Predefined Roles
- Provisioning service: Panic when user makes too many stores

## 1.29.0 (24th of November)

- Tag instances
- Enable add node for OpenStack deployments
- Removed unnecessary API call to load privileges.

## 1.28.0 (16th of November)

- Removed the "Availability Zone" shown in Summary of Deploy wizard when not applicable.
- Introduced the new Admin Webpage
- Implemented new datastore overview page
- Fixed bugs in Cypress e2e-tests
- Fixed a bug where the Signup page shows despite FE_ONBOARDING_DISABLED variable is set to “true”
- Fixed an issue where some services prints out secrets in logs
- Fixed a bug where creating a MySQL multi-master clusters fail
- Fixed a bug where Datastore deletion fails
- Fixed a bug where MySQL deployment fails

## 1.27.0 (11th of October)

- Fixed a regression where Redis backups are not uploaded to cloud storage
- Fixed a bug with leaking cloud resources, e.g a security group was not deleted when the datastore was deleted.
- Postgres: systemctl auto starts node which may cause multiple masters

## 1.26.0 (5th October)

- Fixed a UI connection assistant (in Users and databases) issue where broken DSNs and connectstrings were generated.
- A Default credit card deletion is delayed until setting another credit card as default.
- Datastore deployment fails to start due to NATS issues and timeouts
- Deploy wizard: IOPS size field doesn't allow a user to delete the first number of its value if it's the only number in the field
- Deploy wizard: IOPS outline highlighting area is not fully drawn on pointer hover
- Deploy wizard: Fixed a typo.
- Users and Database: MySQL/Mariadb: Allow to only create an admin user.
- Service overview: Change the way we display a deploying node
- Service overview: Change the way the timestamp is displayed

## 1.25.2

- Firewall-service fix.
- e2e-tests timeout added

## 1.25.1

- CMON Update

## 1.25.0

- Adding a service throws error: "There was an error adding new node. Error: prehook error"

- The ccx-deployer-service doesn't accept cluster names larger than 64 characters

- Deployment wizard: Can move from step 2 to step 3 without selecting config.

- Services page: Invalid date set on the datastores

- Users and databases page : It must not be possible to create a user called 'ccxadmin'

- Service page: Include information about instance type in the service list

- Deployment wizard: add name plans for the different instances types
