# Upgrading the Control Plane

:::danger
Downgrades are not supported.
::::


The supported upgrade path is to update to each version increment between the released versions.
E.g, if you are on version 1.45 and the current version is 1.49, you need to apply:
1.45 -> 1.46 -> 1.47 -> 1.48 -> 1.49

Update the helm chart:

```bash
helm update
```

And then perform the upgrade using:

```bash
helm upgrade VERSION
```

Replace VERSION with the target version (e.g: 1.47) and the released versions are presented in the Changelog.
