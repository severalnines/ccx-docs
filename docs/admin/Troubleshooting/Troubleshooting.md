# Troubleshooting

This page describes troubleshooting scenarios.

## CCX Error Report

The script to generate an error report is here - https://github.com/severalnines/helm-ccx/tree/main/scripts. Please attach the error report (.tar.gz file) to every ticket created for CCX support. This tremendously helps to diagnose the issue.

For the CMON managing the CMONDB and CCXDB, see below.

## CMON (Controller of Datastores)

Use kubectl and open a bash terminal on the cmon-master container.

### S9S CLI commands 

:::danger
Never use the S9S CLI nor the CCUIv2 to add or remove resources (nodes or datastores). This may lead to stray data.
Do not use the following commands:
- s9s cluster --[drop|remove-node|add-node|upgrade-cluster|reinstall-node|demote-node|reconfigure-node]
- s9s node --[stop|unregister]
::::
The 's9s job' commands can be used to debug why a datastore failed to create. Example:

```bash
# Check cluster status
s9s cluster --list --long
# Check node status
s9s node --list --long
# Check node status of particular cluster
s9s node --list --long --cluster-id=CLUSTERID
# Check status of replication links
s9s replication --list --long
## List jobs and view logs
s9s job --list
s9s job --job-id=NNN --log
```

### Creating an Error Report

The error report contains a lot of information about the system and is a very good help for support to understand the configuration, topology and states. From the ClusterControl Admin UI, you can create an error report by going the problematic datastore/cluster -> "Report" and then "Create Error Report". A error report in .tar.gz format will be generated and downloadable from the UI.

### Getting information of a failed job

Get details about the cluster, in case you know the CLUSTER_UUID (this can be obtained from logs, or from UI e.g).

```bash
s9s cluster --list | grep CLUSTER_UUID
```

List all the failed jobs of a cluster NNN. You get NNN from the `s9s cluster --list` above.

```bash
s9s job --list --cluster-id=NNN  |grep FAILED
```

If you dont know the cluster id, run:

```bash
s9s job --list  |grep FAILED
```

Locate the failed job you are interested in, and obtain the jobid (first column in the output).

```bash
s9s job --job-id=MMM --log
```

Additionally, an error report is needed in many cases as it contains detailed information about datastores. See [Creating an Error Report](#creating-an-error-report);

## Common Issues

### Monitoring is being setup/Charts/Dashboards are not loading up.

Launch the install agents job again on the controller:

```bash
s9s cluster --list --long | grep CLUSTER_UUID
# take the cluster id , NNN
s9s cluster --deploy-agents --cluster-id=NNN --log
```

Then check if it solved the issue. If not, contact the CCX Team.

### How do I determine what SSH credentials to use for connecting to the datastore's VM?

```bash
vault kv get kv/ccx-private-key/DATASTORE_UUID
```

### Recreating 'ccxadmin' user

Obtain the cluster-id of the problematic cluster (`--cluster-id=NNN` below):

### MySQL/Percona

```bash
s9s account --cluster-id=NNN --create --account='ccxadmin:PASSWORD@%' --privileges='*.*:SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS, REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, REPLICATION SLAVE, REPLICATION CLIENT, CREATE VIEW, REPLICATION_SLAVE_ADMIN, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, CREATE USER, EVENT, TRIGGER, GRANT'

s9s account --revoke  --account='ccxadmin:PASSWORD@%' --privileges='mysql.*:INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, EVENT, TRIGGER;sys.*:INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, EVENT, TRIGGER'
```

### MariaDB

```bash
s9s account --cluster-id=NNN --create --account='ccxadmin:PASSWORD@%' --privileges='ccxdb.*:ALL, GRANT;*.*:CREATE USER, REPLICATION SLAVE, REPLICATION SLAVE ADMIN, SLAVE MONITOR'
```

### PostgreSQL

```bash
s9s account --cluster-id=NNN --create --account='ccxadmin:PASSWORD@%' --privileges='NOSUPERUSER, CREATEROLE, LOGIN, CREATEDB'
```

### Rebuildint a failed replica
In some cases it is wanted to rebuild a replica.
```bash
s9s replication --cluster-id=NNN --stage --master="PUBLIC_ADDRESSS_OF_MASTER" --slave="PUBLIC_ADDRESSS_OF_REPLICA_TO_BE_REBUILT
```

## Certificates

## Services are bouncing

## Failed to deploy datastore

1. Check logs
2. Quotas/Resource issue, i.e cannot allocate RAM/DISK/CPU

## Upgrading Control Plane

Issues related to upgrading / migrations

## Auxiliary Infrastructure (Databases etc, external to Kubernetes)

### CCX Databases

All of the production databases are added in their respective ClusterControl installation. You can manage the most common problems from there.

### CMON (Controller of CMONDB and CCXDB)

If there are issues with the controller managing CMONDB and CCXDB, then please open a support request and attach an error report to the support issue.

#### Create an error report

Create an error report using the CCUIv2:

1. Select the Cluster (CCXDB or CMONDB).
2. Select Reports, and then Create Error Report.
3. The error report will now be created and presented in the web UI.

## Networking issues

If there are network issues (no route to host e.g, from the CCX control plane to the database nodes or the openstack infra) then it may help to restart the pods, because the underlying network may have changed. You can make a change to the environment (in Helm chart e.g) and then do `helm update`, which will trigger all pods to be restarted.
