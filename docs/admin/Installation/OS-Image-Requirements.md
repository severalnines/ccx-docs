# OS Image Requirements

CCX deploys database nodes as plain virtual machines and provisions them with cloud-init on first boot. The base OS image is deliberately minimal: no database software is pre-installed, everything is installed at boot time. In exchange, the image must satisfy the requirements below. Most failed onboardings of a new cloud provider trace back to one of these points.

## 1. Base operating system

- **Ubuntu 22.04 LTS (Jammy)**, official Ubuntu cloud image, at a recent patch level. Use `ubuntu-22.04-server-cloudimg-amd64.img` (or the cloud provider's equivalent of the official cloud image).
- The image version must match the OS version configured for the deployer in the environment's Helm values. Mixing versions across regions (e.g. one region on 24.04 while the deployer expects 22.04) leads to failed deployments, because package names and vendor support matrices differ between releases.
- The image must be a clean base OS. Cloud-init installs the database packages, log forwarder and monitoring agents on first boot — a pre-baked database installation is not expected and can conflict with it.

## 2. Kernel

The kernel shipped in the image **must** include:

- the **`dm_crypt`** module and the standard crypto modules it depends on (`aes`, `xts`). CCX encrypts the data volume with LUKS; without `dm_crypt` the encryption step fails and encryption at rest is unavailable.
- **device-mapper and LVM** support. The data volume is managed as an LVM logical volume (`VG_data/data`) on top of the LUKS device, which is how online volume scaling works.

> **Warning — avoid `-kvm` kernel flavors.** The Ubuntu cloud image variants that ship the `linux-kvm` kernel (e.g. `ubuntu-22.04-server-cloudimg-amd64-disk-kvm.img`) do **not** include `dm_crypt`. Use images with the generic (or HWE) kernel. If a cloud provider only offers a `linux-kvm`-based image, LUKS encryption will not work on that cloud.

To verify an image before using it:

```bash
# On a running VM booted from the image:
sudo modprobe dm_crypt   # must succeed silently

# Or inspect the image offline with libguestfs-tools:
guestmount -a ubuntu-22.04-server-cloudimg-amd64.img -i --ro /mnt
ls /mnt/lib/modules/*/kernel/drivers/md/dm-crypt.ko*
```

## 3. cloud-init

- cloud-init must be installed and configured with the **datasource appropriate for the cloud** (OpenStack, ConfigDrive, NoCloud, etc.), so that the user-data CCX passes at VM creation is actually executed.
- cloud-init must run to completion and report `status: done` (`cloud-init status`). The controller waits for cloud-init to finish before configuring the database, so a hung or failed cloud-init blocks the whole deployment.
- The user-data supplied by CCX must not be exposed to the guest as an extra block device. Additional visible volumes confuse the volume-provisioning script, which treats every unmounted disk as a candidate data disk.

## 4. Users and SSH

- The image must have the standard **`ubuntu`** default user, with passwordless `sudo` and SSH key injection via cloud-init. The provisioning scripts and the controller connect over SSH and expect this user to exist.
- Images whose default user has a different name are currently not supported; the typical symptom is a deployment failing while installing TLS certificates on the node.

## 5. Userland required by provisioning

The first-boot volume setup script relies on standard tooling that is present in the official Ubuntu cloud images: `bash`, `util-linux` (`lsblk`, `blkid`), `lvm2`, `openssl`, `mkfs.ext4`, and SCSI rescan support under `/sys/class/scsi_host`. `cryptsetup` itself is installed by cloud-init, but it can only work if the kernel requirements above are met. If you build a custom or stripped-down image, keep these packages.

## 6. Network access at first boot

On first boot the node installs packages from external APT repositories (Severalnines, the database vendor, Fluent Bit, and the standard Ubuntu mirrors) and downloads the CCX agent. These endpoints must be reachable from the data plane, or mirrored internally. The full endpoint list and air-gapped deployment guidance are in [Firewall and Air-Gapped Deployment](Firewall-and-Air-Gap.md).

Note that if APT mirrors are unreachable, cloud-init does not fail fast — it can keep retrying for hours while the deployment appears stuck.

## 7. Cloud environment expectations

These are requirements on the cloud rather than on the image itself, but they surface as image/first-boot failures:

- The **data volume must be attached before the VM boots**. The volume setup runs from cloud-init on first boot; if the disk appears later, the node ends up with `/data` on the root filesystem, unencrypted.
- IP addresses must be assigned automatically and must not change for the lifetime of the VM.
- Block storage must be resizable if online volume scaling is expected; ephemeral-only storage cannot be scaled later.

## Quick checklist

- [ ] Official Ubuntu 22.04 cloud image, recent patch level
- [ ] OS version matches the deployer configuration for every region
- [ ] Generic/HWE kernel — `modprobe dm_crypt` succeeds
- [ ] cloud-init installed, correct datasource, reaches `status: done`
- [ ] Default `ubuntu` user with passwordless sudo
- [ ] APT repositories and agent download reachable (or mirrored) — see [Firewall and Air-Gapped Deployment](Firewall-and-Air-Gap.md)
- [ ] Data volume attached before first boot; no extra volumes visible in the guest
