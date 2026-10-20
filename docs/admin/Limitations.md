# Limitations in CCX

Limitations that apply to every cloud provider CCX supports. Provider-specific
ones live on each provider's page under
[Cloud Providers](Installation/Cloud-Providers/Cloud-Providers.md).

## Vertical scaling replaces nodes, it does not resize them

CCX does not change a running node's instance type in place on any provider.
A datastore keeps the instance type each node was deployed with. To move to a
different size, add a node with the new instance type and then remove the old
one; see the [FAQ](FAQ.md#is-vertical-scaling-possible-if-so-how-is-it-handled).

## Storage scaling adds a volume per scale-up

Every storage scale-up, manual or [autoscaled](Day2/Autoscaling.md), attaches a
**new** data volume to the node, encrypts it, and extends the node's LVM volume
group onto it. The existing volume is not grown in place. This is the same on
every provider.

Two consequences follow:

- **The number of scale-ups per node is finite.** Each one consumes a volume
  attachment slot, and the ceiling is set by the cloud or hypervisor, not by
  CCX. On CloudStack, for example, `cmk list hypervisorcapabilities` reports
  32 data volumes per VM on KVM, and between 13 and 59 on VMware and 6 and 254
  on XenServer depending on the hypervisor version. Check your provider's
  limit before planning many small increments.
- **Each scale-up adds moving parts.** Another encrypted device, another
  `crypttab` entry and another physical volume in `VG_data` on every node.

Size the initial data volume for expected growth rather than relying on
repeated small scale-ups, and prefer fewer, larger increments where the
autoscaling percentage allows.

## ClusterControl (CMON) runs in CCX mode

The ClusterControl controller (`cmon`) that CCX deploys runs with
`ccx_mode=true` in `/etc/cmon.cnf`. Every datastore's configuration inherits
the flag, and datastores created by CCX also get it set explicitly. The
ClusterControl UI has no CCX-specific logic of its own: it shows the menus and
pages a stand-alone ClusterControl shows. The differences below come from
`cmon` and appear in the UI as empty pages, missing data or failed requests.

`ccx_mode` is listed as an ordinary boolean under the datastore's
**Configuration** settings. Do not change it. CCX depends on the behaviour
below; turning the flag off makes `cmon` take over work that CCX does itself,
such as deploying Prometheus and upgrading the CMON database schema.

### Operational reports are not available

`cmon` creates no report generator for a datastore in CCX mode, and the cron
thread skips scheduled report runs.

- Generating, viewing, downloading or deleting an operational report fails
  with `Failed to get reporter for cluster <id>.` (legacy RPC:
  `No reporter available (for cluster <id>).`).
- Report schedules can still be listed and removed, but a schedule never runs.
- The MySQL "Schema Changes" report is never produced.

**Error reports are not affected.** Creating, listing and downloading an error
report from **Report → Create Error Report** still works; see
[Troubleshooting](Troubleshooting/Troubleshooting.md).

### Advisors and scheduled scripts do not run

`cmon` does not import the bundled advisor scripts or schedule them. The cron
thread does not load scheduled scripts, and the script engine refuses to run a
scheduled script. Expect the following:

- **Advisors** shows no results. Advisors scheduled by hand do not run either.
- In **Developer Studio**, scripts can still be edited and run by hand, but
  their schedules are ignored.
- **Performance → Schema Analyzer** has no data for MySQL or PostgreSQL:
  `cmon` does not run the analysis that finds redundant indexes and tables
  without a primary key.

Use the CCX alerting and [Observability](Observability.md) stack for the
checks the advisors would otherwise provide.

### Log and configuration file collection is off

The internal crontab leaves out the `COLLECT_LOGS` and `COLLECT_CONFIG` jobs,
and both operations return straight away without doing anything.

- The cluster's log file view shows no collected database or system log files.
- The configuration file view shows no imported `my.cnf` / `postgresql.conf`
  contents, and nothing is re-imported after a node is added.

Database configuration in CCX is managed through
[Config Management](Day2/Config-Management.md); read logs on the node or
through the observability stack.

### No e-mail notifications

`cmon` never starts its mail queue. This means:

- No alarm e-mails are sent, including "cleared alarm" e-mails.
- No backup or cloud upload/download notification e-mails are sent.
- Alarms are still raised and cleared, and are visible in the UI.

E-mail recipient settings in the UI have no effect.

### Reduced host and query statistics

Some samplers are switched off or slowed down in CCX mode:

- **SSH-based host statistics**: the CPU, network and OS collectors do not run;
  memory and TCP statistics still do. Use the Prometheus-based dashboards for
  host CPU and network metrics.
- **ProxySQL statistics**: stat deltas are not stored, so ProxySQL statistics
  graphs in the UI are empty.
- **MySQL deadlocks and long transactions**: the InnoDB transaction monitor
  is off, so nothing is reported.
- **MySQL SQL statistics** (Query Monitor): the default sampling interval is
  10 s instead of 1 s. Set `mysql_sql_statistics_interval` to override it.
- **Database growth**: MySQL tracks at most 10 databases, regardless of
  `database_growth_db_limit` (default 20). On PostgreSQL, `cmon` does not run
  `ANALYZE` as part of the growth check.

### Prometheus is managed by CCX, not by ClusterControl

`cmon` does not install or recover Prometheus in CCX mode. A job that asks
ClusterControl to deploy Prometheus succeeds without changing anything and
logs `In CCX mode - Prometheus is managed elsewhere. Won't install anything.`
See [Observability](Observability.md) for how monitoring is deployed in CCX.

### Backup behaviour differs

- **No concurrent backups.** A backup job that starts while another backup
  job of the same datastore is running is cancelled with
  `... Concurrent backups are currently blocked in CCX.`
- **Local copies are removed after a cloud upload.** Once the backup has been
  uploaded to object storage, the local copy is always deleted.
- **Downloaded backups are removed after a restore**, and restores always
  bootstrap the datastore.
- **"Keep forever" retention is not honoured.** A negative retention (`-1`)
  falls back to the default retention period instead of keeping the backup
  forever.
- **MSSQL backups are always compressed.**

### Schema upgrades of the CMON database are manual

`cmon` does not automatically upgrade its own database schema in CCX mode. It
only checks the schema at start-up. If the schema does not match, the
datastore's cluster thread does not start and the log shows
`Cmon DB schema is not compatible in CCX mode. Please run the schema upgrade manually.`

### Abandoned clusters are not cleaned up

`cmon` skips its abandoned-cluster cleanup and its cleanup of stale controller
records in CCX mode. CCX is responsible for removing datastores. Never delete
nodes or datastores from the ClusterControl UI or the S9S CLI; see
[Operations and Management](Troubleshooting/Operations-and-Management.md#clustercontrol-ui).
