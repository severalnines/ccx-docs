# Database Metrics

## Overview

To enhance security, using TLS for accessing metrics is recommended. This document outlines how the metrics served securely using TLS for each exporter. Each node typically has a Node Exporter and a corresponding database-specific exporter to provide detailed metrics.

## Metrics Endpoint Format

Metrics for each exporter is served on:

```
https://CCX_URL/metrics/<storeID>/<nodeName>/<exporterType>
```
Where nodeName is short name, not full fqdn.


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

