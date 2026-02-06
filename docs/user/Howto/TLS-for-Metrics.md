# Datastore Metrics

## Overview

To enhance security, using TLS for accessing metrics is recommended.
This document outlines how metrics are served securely using TLS for each exporter.
Each node typically has a Node Exporter and a corresponding database-specific exporter to provide detailed metrics.
Access to these metrics is limited to the sources specified in [Firewall Management](Firewall.md).

## Service discovery

There is a service discovery endpoint created for each datastore.
Available from CCX v1.53 onwards.

It's available at `https://<ccxFQDN>/metrics/<storeID>/targets` and
implements [Prometheus HTTP SD Endpoint](https://prometheus.io/docs/prometheus/latest/http_sd/).

:::note

`<ccxFQDN>` is the domain you see in your address bar with CCX UI open, not a datastore URL or a connection string.
We'll use `ccx.example.com` hereafter.

:::

Here is an example of a scrape config for Prometheus:

```yaml
scrape_configs:
  - job_name: 'my datastore'
    http_sd_configs:
      - url: 'https://ccx.example.com/metrics/50e4db2a-85cd-4190-b312-e9e263045b5b/targets'
```

### Additional labels

Each target returned by this endpoint provides additional labels that can be used for filtering and grouping metrics:

```json
{
   "labels": {
      "datastore_name": "example datastore",
      "datastore_uuid": "50e4db2a-85cd-4190-b312-e9e263045b5b",
      "exporter_name": "example_exporter",
      "instance": "db-6ae82.50e4db2a-85cd-4190-b312-e9e263045b5b.ccx.example.com",
      "node_name": "db-6ae82",
      "node_role": "replica"
   }
}
```

## Individual Metrics Endpoints Format

Metrics for each exporter are served at:

```
https://ccx.example.com/metrics/<storeID>/<nodeName>/<exporterType>
```

Where nodeName is a short name, not the full FQDN.

### Exporter Type Examples:

1. **MSSQL**:
    - **URL**: `https://ccx.example.com/metrics/<storeID>/<nodeName>/mssql_exporter`

2. **Redis**:
    - **URL**: `https://ccx.example.com/metrics/<storeID>/<nodeName>/redis_exporter`

3. **PostgreSQL**:
    - **URL**: `https://ccx.example.com/metrics/<storeID>/<nodeName>/postgres_exporter`

4. **MySQL**:
    - **URL**: `https://ccx.example.com/metrics/<storeID>/<nodeName>/mysqld_exporter`

5. **MariaDB**:
    - **URL**: `https://ccx.example.com/metrics/<storeID>/<nodeName>/mysqld_exporter`

6. **Node Exporter**:
    - **URL**: `https://ccx.example.com/metrics/<storeID>/<nodeName>/node_exporter`
   
By serving metrics over HTTPS with TLS, we ensure secure monitoring access for customers.
