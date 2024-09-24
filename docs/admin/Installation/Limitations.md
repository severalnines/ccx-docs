# Limitations

List of current limitations.

## Maintenance

It is currently not possible to put the K8s in maintenance mode, i.e e.g to prevent deployments to start, etc for a given period of time

## Namespaces

Currently, namespaces and corresponding cluster DNS names are set within the assemblies.

## Automatic error handling

Currently, if a node fails or a VM fails, then CMON attempts to do cluster/node recovery. User can add a new node and remove the faulty node in multi-node configurations.

## CCX configuration

### cmon.db.user and cmon.db.password.

The `cmon.db.user` and the `cmon.db.password` is used to authenticate to both:

- cmon database
- datastores

Extreme care must be taken to change the `cmon.user` and `cmon.password` at runtime/during the lifecycle to prevent access denied to either part. The password is not applied on the either the CMON database or the datastores. Please contact CCX Support before changing these properties on a running system.

### cmon.db.host

The `cmon.db.host` sets the `mysql_hostname` property in `cmon.cnf` and specifies the location of the cmon database. However, each datastore also has mysql_hostname set in `/etc/cmon.d/cmon_X.cnf`, where X is the cluster id of the datastore.
Updating the `cmon.db.host` property requires tha the `mysql_hostname` is updated in cmon.cnf and in all `cmon_X.cnf` files. Please contact CCX Support before changing these properties on a running system.
