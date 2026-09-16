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
