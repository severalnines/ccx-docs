# Datastore Metrics

## Overview

To enhance security, using TLS for accessing metrics is recommended.
This document outlines how the metrics served securely using TLS for each exporter.
Each node typically has a Node Exporter and a corresponding database-specific exporter to provide detailed metrics.
Access to these metrics is limited to the sources specified in [Firewall Management](Firewall.md).

## Service discovery

There is a service discovery endpoint created for each datastore.

It's available at `https://<ccxFQDN>/metrics/<storeID>/targets` and implements [Prometheus HTTP SD Endpoint](https://prometheus.io/docs/prometheus/latest/http_sd/).

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


## Individual Metrics Endpoints Format

Metrics for each exporter is served on:

```
https://ccx.example.com/metrics/<storeID>/<nodeName>/<exporterType>
```

Where nodeName is short name, not full fqdn.

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

6. **NodeExporter**:

    - **URL**: `https://ccx.example.com/metrics/<storeID>/<nodeName>/node_exporter`

By serving metrics over HTTPS with TLS, we ensure secure monitoring access for customers. 
