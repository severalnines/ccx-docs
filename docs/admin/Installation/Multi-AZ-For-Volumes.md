# Multiple Availability Zones for Volumes

Volumes are dedicated by zone. Making a persistent volume (PV) highly available across multiple availability zones involves using distributed storage solutions and configurations that support replication across those zones.

## Solution for Cloud Environments:

For cloud providers like AWS, GCP, and Azure, you can choose a storage type or class that supports replication or regional persistent disks or multi-AZ deployment.

## Solution for Openstack environments:

Using Distributed Storage Systems (e.g., Ceph, GlusterFS, JuiceFS) to replicate PVs across zones and support failover between zones

### Setup Using Distributed Storage Systems (e.g., Ceph, GlusterFS, JuiceFS)

- Install and configure distributed storage system
- Deploy a distributed storage system like Ceph or GlusterFS or JuiceFS that inherently provides high availability and replication across multiple nodes and availability zones.
- Create StorageClass for distributed storage.
- Define a StorageClass that points to the distributed storage solution and has settings for multi-AZ deployment.

### Multi AZ configuration for StatefulSet CMON

You can use `nodeSelector` for the pods that use persistent volume and provide a fixed availability zone, so if the pods are re-scheduled to other nodes will land in the same availability zone as the volume. For example:

```yaml
cmon:
  nodeSelector:
    zone: europe-west1-a
```

The deployment has the `nodeSelector` which defines in which zone will be deployed the pod.

In StorageClass, don't forget to configure:

```yaml
volumeBindingMode: WaitForFirstConsumer
```

This is to delay volume binding and pv creation until Pod is scheduled. Distributed storage systems are an effective way to solve the high available Statefulsets.

### Multi AZ configuration for multiple replicas of ccx

Use `podAntiAffinity` to tell the Kubernetes scheduler to deploy each replica in different nodes in different availability zones. A pod should be scheduled based on the topology of the underlying nodes. For example:

```yaml
ccx:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: app
                  operator: In
                  values:
                    - ccx-deployer-service
            topologyKey: topology.kubernetes.io/zone
```
