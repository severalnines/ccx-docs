# Introduction

CCX is a comprehensive data management and storage solution that offers a range of features including flexible node configurations, scalable storage options, secure networking, and robust monitoring tools. It supports various deployment types to cater to different scalability and redundancy needs, alongside comprehensive management functions for users, databases, nodes, and firewalls. The CCX project provides a versatile platform for efficient data handling, security, and operational management, making it suitable for a wide array of applications and workloads.

## Installation
Check out our [Architecture and installation guide](Installation/Index.md) to get started.

## Deployment Solutions

Our deployment solutions offer customizable configurations for various node types, designed to support both dynamic and ephemeral storage requirements across multiple cloud environments. This includes comprehensive support for a wide range of cloud regions and instances, ensuring flexibility and scalability.

### Cloud Service Providers

We support integration with several leading Cloud Service Providers (CSPs), including:

- [Amazon Web Services (AWS)](/admin/Installation/Cloud-Providers/aws.md)
- [OpenStack](/admin/Installation/Cloud-Providers/openstack.md)
- [CloudStack](/admin/Installation/Cloud-Providers/cloudstack.md)
- [VMWare](/admin/Installation/Cloud-Providers/vmware.md)
- [Google Cloud (GCP)](/admin/Installation/Cloud-Providers/gcp.md)
### Database Support

Our platform is compatible with a diverse array of database types, including:

- MariaDB
- MySQL
- PostgreSQL
- Redis
- Microsoft SQL Server

### Node Configurations

We provide support for various node configurations to meet your database needs:

- Replica nodes for MariaDB, MySQL, PostgreSQL, Redis, and Microsoft SQL Server (Single server and Always-On).
- Galera clusters for MariaDB and MySQL.

### Database deployment topologies

#### MySQL & MariaDB

- Single (replication or Galera type).
- One primary and multiple read-only standby with (Asynchronous and Semi-synchronous replication). Separate hostname (DNS) based access URLs for primary and read-only replicas.
- Multi-Primary (Galera).

#### PostgreSQL

- Single.
- One primary and multiple read-only hot-standby. Separate hostname (DNS) based access URLs for primary and read-only replicas.

#### Redis

- Single.
- One primary and multiple read-only standby. Separate hostname (DNS) based access URLs for primary and read-only replicas.

#### Microsoft SQL server

- Single.
- One primary and multiple standby (mssql_ao_async)
  - Standard license - up to 2 nodes
  - Enterprise license - up to 5 nodes

## Features

### Monitoring and Management

Our platform features advanced monitoring capabilities, offering detailed performance analysis through extensive charts. It enables efficient management of nodes, including:

- Datastore scaling
- Volume scaling
- Promote replica to primary
- Node repair mechanisms

### User and Database Administration

We offer sophisticated tools for managing database users and their permissions, ensuring secure access control.

### Network Security

Our firewall configuration options are designed to enhance network security, providing robust protection for your data.

### Event Logging

The event viewer tracks and displays a comprehensive history of operations performed on the datastore, enhancing transparency and accountability.

### Backup and Recovery

Our backup solutions include:

- Incremental and full backup options for comprehensive data protection
- Point-in-time recovery capabilities
- Automated cloud backup uploads with customizable retention periods
- Restoration from separate volumes to optimize datastore space utilization

### Customizable Settings

We offer customizable settings for various operational database parameters, allowing for tailored database management.

### Account Management

Our platform facilitates user account creation and management, streamlining the login and registration process.

### Billing and Payments

Our billing and payment processing tools are designed to simplify financial transactions, including the management of payments and invoices.

## Feature Matrix

Each datastore has different features and are suitable for different use cases. Below is a feature matrix showing what operational feature is supported on each datastore:

<table><thead>
  <tr>
    <th rowspan="2">Feature</th>
    <th rowspan="2">MySQL</th>
    <th rowspan="2">MariaDB</th>
    <th rowspan="2">PostgreSQL</th>
    <th rowspan="2">Redis</th>
    <th colspan="2">Microsoft SQL Server</th>
  </tr>
  <tr>
    <th>Standalone</th>
    <th colspan="2">AlwaysOn<br/>(Standard license)</th>
  </tr>
  </thead>
<tbody>
  <tr>
    <td colspan="7"><strong>Provisioning and Deployment</strong><br/><i>Customers will be able to provision your infrastructure resources and deploy a database on them in clicks.</i></td>
  </tr>
  <tr>
    <td>Standalone</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Cluster/Replication</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&cross;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td colspan="7"><strong>Failover and Automatic Recovery</strong><br/><i>CCX constantly checks the pulse of your customers’ DBs and underlying resources and proactively fixes any issues.</i></td>
  </tr>
  <tr>
    <td>Automatic failover</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&cross;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td colspan="7"><strong>Scaling</strong><br/><i>You can enable your customers to right-size their data layer to their specific requirements.</i></td>
  </tr>
  <tr>
    <td>Add/Remove nodes</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&cross;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Scale volume*</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td colspan="7"><strong>Backups and Recovery</strong><br/><i>Customers can implement a sophisticated backup and disaster recovery strategy.</i></td>
  </tr>
  <tr>
    <td>Backup to S3-compatible storage</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Restore</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Point-in-time recovery</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&cross;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Create datastore from backup</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&cross;</center></td>
    <td><center>&cross;</center></td>
    <td><center>&cross;</center></td>
  </tr>
  <tr>
    <td colspan="7"><strong>Management</strong><br/><i>Customers can trigger management jobs</i></td>
  </tr>
  <tr>
    <td>Datastore upgrade</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Operating system upgrade</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Promote replica</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Configuration management</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&cross;</center></td>
    <td><center>&cross;</center></td>
  </tr>
  <tr>
    <td>User management**</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Create databases</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&cross;</center></td>
    <td><center>&cross;</center></td>
  </tr>
  <tr>
    <td>Firewall</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td colspan="7"><strong>Observability</strong><br/><i>Your customers can see what is going on up and down the data stack, pinpointing any issues.</i></td>
  </tr>
  <tr>
    <td>Monitoring dashboards</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Query monitoring</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Database growth</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&cross;</center></td>
    <td><center>&check;</center></td>
  </tr>
  <tr>
    <td>Export metrics to Prometheus/VictoriaMetrics</td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
    <td><center>&check;</center></td>
  </tr>
</tbody></table>

\* Scale volume is NOT supported for any ephemeral storage datastores.
\*\* User management features and scope depends on the underlying datastore. There are datastore specific limitations.
