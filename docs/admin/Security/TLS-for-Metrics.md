# Database Metrics

## Overview

To enhance security, it is required to use TLS for accessing metrics. This document outlines how the metrics served securely using TLS for each exporter.

## Metrics Endpoint Format

Metrics for each exporter is served on:

```
https://CCX_URL/metrics/<storeID>/<nodeName>/<exporterType>
```


### How to Access Exporter Metrics

To access the metrics securely, follow the steps:


 **Inspect the Rules in the Ingress and access the metrics securely via HTTPS**:
   - Identify the ingress resource corresponding to your exporter. For example, the ingress name will follow the format `usr-<storeID>-ingress`.
   - Use the command to view the rules for the metrics ingress.
    ```
    kubectl get ingress -o json 2> /dev/null| jq -r '.items[] | .spec.rules[] | .host as $host | .http.paths[] | ( $host + .path)' | sort | grep metrics
    ```

This command will show the ingress url for accessing metrics.

### Exporter Type Examples:

1. **MSSQL**:
   - **URL**: `https://CCX_URL/metrics/<storeID>/<nodeName>/mssql_exporter`

2. **Redis**:
   - **URL**: `https://CCX_URL/metrics/<storeID>/<nodeName>/redis_exporter`

3. **PostgreSQL**:
   - **URL**: `https://CCX_URL/metrics/<storeID>/<nodeName>/postgres_exporter`

4. **MySQL**:
   - **URL**: `https://CCX_URL/metrics/<storeID>/<nodeName>/mysqld_exporter`

5. **MariaDB**:
   - **URL**: `https://CCX_URL/metrics/<storeID>/<nodeName>/mysqld_exporter`

6. **NodeExporter**:

   - **URL**: `https://CCX_URL/metrics/<storeID>/<nodeName>/node_exporter`
   

By serving metrics over HTTPS with TLS, we ensure secure monitoring access for customers. 

