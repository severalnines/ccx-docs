# DynamicDNS a.k.a Access to Services a.k.a friendly endpoint

## Overview

CCX can provide a dynamic DNS names for datastores for easy and convinient access to services.
Users would use standard database port for connection and in most cases would use the same FQDN regardless of cluster status.
These are 100% handled by CCX and only require initial setup to get going.
CCX will dynamicaly update cluster DNS records based on current cluster status.

## How does it work?

CCX creates a `ExternalName` type service pointing to desired FQDN.
ExternalDNS automatically creates desired DNS records at selected DNS provider.
In the event of cluster primary fails/changes/add node/etc. CCX will update the `ExternalName` record to reflect desired change which will be subsequently updated by ExternalDNS.

### Naming convention

- primary - `UUID`.`userDomain`
- replica - `replica`.`UUID`.`userDomain`

## Requirements

- [ExternalDNS](https://github.com/kubernetes-sigs/external-dns)
- Domain name managed by one of [ExternalDNS supported providers](https://github.com/kubernetes-sigs/external-dns#status-of-providers)

### DNS providers supported by ExteralDNS

If your DNS provider is not supported by ExternalDNS (see https://github.com/kubernetes-sigs/external-dns), or you do not have a DNS provider, then you can do one of the following:

- _Recommended_: Delegate or create a zone in one of ExternalDNS supported DNS providers - like Google DNS, Amazon Route53, or CloudFlare DNS, etc.
- _Local DNS_: Setup your local DNS server in your kubernetes cluster via CoreDNS, PowerDNS or other supported by ExternalDNS software.

:warning: **Warning**: we do not recommend using standalone CoreDNS/PowerDNS in a production environment. The DNS service is mission critical and if it is unreachable then it will not be possible to access the datastores.

## Setup

### Helm-CCX

- Set a desired domain name to use here - https://github.com/severalnines/helm-charts/blob/main/charts/ccxdeps/values.yaml#L54

### ExternalDNS

- Set your cloud provider credentials as described in - https://artifacthub.io/packages/helm/bitnami/external-dns - in https://github.com/severalnines/helm-charts/blob/main/charts/ccxdeps/values.yaml#L51 under `externaldns`.
  For example:

```yaml
externaldns:
  enabled: true
  aws:
    credentials:
      secretName: aws-credentials
    zoneType: public
... rest of the config ...
```

where secret is:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
data:
  config: Cltwcm9maWxlIGRlZmF1bHRdCnJlZ2lvbiA9IHVzLWVhc3QtMQo=
  credentials: IFtkZWZhdWx0XQphd3NfYWNjZXNzX2tleV9pZCA9IEFXU19BQ0NFU1NfS0VZX0lECmF3c19zZWNyZXRfYWNjZXNzX2tleSA9IEFXU19TRUNSRVRfQUNDRVNTX0tFWQ==
```

- Enable external-dns in ccxdeps helm chart (disabled by default) - https://github.com/severalnines/helm-ccxdeps/blob/main/values.yaml#L50
- Configure the desired domain name from above in external-dns helm chart - https://github.com/severalnines/helm-ccxdeps/blob/main/values.yaml#L53

  _NOTE:_ It is recommended to use a dedicated (not shared) domain name for CCX. For example - dbaas.example.org, ccx.example.org

## Notes

- Please note that this is not required to use ExternalDNS from ccxdeps helm chart. Feel free to use existing ExternalDNS for your cluster. Just make sure to handle `service` resource with `ExternalName` type.
- It is recommended to set negative cache TTL - SOA.MINIMUM to a low value (0-10) to prevent issues with negative cache. This can be done by modifying SOA record for the domain used for `userDomain`.
- It is recommended to set ExternalDNS `interval` to a low value (10s) to enable fast dns record creation and prevent issues with dns timeouts or record not found errors.
