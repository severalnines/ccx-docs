# FAQ

## Commercial

### Can we white-label your UI?

Yes, the UI can be white-labeled.

### What version of SQL Server does CCX support?

2022

### What database version does CCX support?
Here is a list of [supported database versions](../user/Reference/Supported-Databases.md).

### Do you support MongoDB?

Not at this time due to MongoDB SSPL license restrictions (Server Side Public License FAQ ).

### Do you support OpenStack?

Yes.

### What other clouds do you support?

Please see the [features](Index.md) for information.

### Are there any specific dependencies between CCX and OpenStack/VMware?

No.

### Do you support CloudStack?

We are working on supporting CloudStack.

### Do you support VMWare?

Yes

### Do you support Nutanix?

Not yet, but we have plans to support it in the future.

### Do you support KVM?

Not yet, but we have plans to support it in the future.

### Do we have to separate the data stores?

No.

### Is it self-hosted in the partner’s infra/datacenter or hosted by Severalnines?

Self hosted in partner’s data center.

### Do I have to pay license fees for the database software?

No, with the exception of Microsoft SQL Server.

### How can we charge our customer? How do you meter services for charging purposes?

There are a couple of ways to meter and charge your customer.

CCX can provide you with information as to when virtual machines are created for the database. Using this information you can come up with what to charge your customer.

A metering service in CCX is currently being developed. You will be able to use this service to calculate what to charge your customer.

### Is there a module that can set prices/calculate the consumption cost etc.?

Not yet.

## Technical

### Are the databases deployed in Kubernetes?

No, databases are deployed on virtual machines.

### Is customer database deployed in a global project or customer’s project (in relation to Openstack, etc., project)?

Global project.

### Can a deployed database cluster span multiple availability-zones?

Yes, by default CCX places database hosts in different availability zones.

### Can you deploy Microsoft SQL Server with CCX?

Yes, but please reach out to sales@severalnines.com.

### Where is CCX control-plane hosted?

You host it in your Kubernetes cluster.

### What is the requirement to host CCX control-plane?

A Kubernetes cluster with ingress controller (load balancer), persistent volume, a floating IP, and a registered domain.

### What are the Kubernetes version supported?

CCX requires 1.22 or later.

### Is CCX upgrade dependent on the K8s upgrade ? - what are the requirements here?

No, they are independent upgrades.

### Is there a predefined frequency for the updates?

No. As updates are made available by the respective database authority, they will in turn made available in CCX.

### Do you handle database software upgrades automatically?

Yes, CCX uses a rolling forward upgrade mechanism.

### How are backups taken?

CCX automatically takes full and incremental backups based on predefined backups schedules.

### Do you take full and incremental backups?

Yes.

### Is the database deployed in a private network (akin to virtual a private cloud - VPC) or a globally accessible public network with appropriate firewall protection?

Global network with a firewall to restrict access.

### Is the database data encrypted on disk?

No.

### Do you use SSL to encrypt inter-node and client/server communications?

Yes, SSL is used for all inter-host and client/server communications.

### Where are backups stored? Are they encrypted and who has access to backups?

Backups are stored in S3-compatible storage. All backups are encrypted by default.

### How can I restore from a backup?

The CCX UI (and API) provide a mechanism to restore from an existing backup.

### Can I spin up a new database from a backup?

Yes.

### Can I tune the database?

No, the database is auto-tuned by CCX.

### Do we have access to the standby database for read-only workloads?

Yes, all standby database nodes are available for Reads. The only exception to this rule being is Microsoft SQL Server.

### How many standby nodes can I have in my cluster?

As many as you like.

### Can I add additional standby nodes to my cluster?

Yes.

### Can I add additional storage to my database cluster nodes after deploying it?

Yes.

### Is there any downtime for adding/removing nodes?

No.

### Will I encounter downtime during database software upgrades? If so, how much?

Typically, less than 30 secs of connectivity loss to the Primary (Write) database host.

### Does the CCX operator have access to an Administrator/Operator view of all the deployed clusters by CCX?

Yes, the admin UI provides this capability.

### How can I find slow queries?

The “Query” tab in the UI allows for this.

### Does the IP need to be public?

Yes.

### While scaling is there a way to identify the network where the new node will be created?

No.

### Are the database parameters optimized based on the instance size?

Yes.

### Can end users modify the parameters?

Some parameters are modifiable.

### Is it possible to extend storage volumes without restarting database instances?

We do not modify the storage of an existing instance. To grow the storage or instance type, the user must add a new node. Then decommission the old one.

### How are minor version upgrades handled?

[Lifecycle Management](Day2/Lifecycle-Management.md)

### Is vertical scaling possible? If so how is it handled?

By adding a node with another instance type.

### “Horizontal” scaling for other purposes than high availability (DW/whatnot)?

Yes, we have “add node”.

### Is it possible to handle users and roles using the Terraform provider?

The Terraform provider authenticates using an OAUTH2 token created in the CCX UI. See [CCX Terraform Provider](https://registry.terraform.io/providers/severalnines/ccx/latest) .
