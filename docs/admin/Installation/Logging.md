## Datastores node DB Logging
#### Pre-requisites

* ccxdeps must be updated and deployed.
```
helm repo update
helm upgrade --install ccxdeps s9s/ccxdeps --debug
```

#### About fluentbit and Loki
In our CCX Application, we use loki as log aggregation tool. 
Fluent Bit deployed on datastore nodes will be configured to send logs to Loki using an output plugin. In this setup, Fluent Bit collects logs from various sources, processes them, and forwards them to a Loki instance for storage and querying.

The chart will automatically configure the Loki URL using the value of ccxFQDN from ccx chart. This ensures that there’s always a valid FQDN for the logging service even if no customization is made.

:::note
If the Loki gateway ingress is not found, a warning will be shown when you deploy ccx. Make sure you have updated and deployed ccxdeps, else the logging feature will be disabled.
:::


#### Additional Fluent Bit Output Host Configuration

You can provide additional Fluent Bit output configurations to forward logs to another logging tool by using extraOutputConfig in ccx chart. For example:
```
fluentbit:
  extraOutputConfig: |
    [OUTPUT]
        Name   es
        Match  *
        Host   elasticsearch.example.com
        Port   9200
        Index  fluentbit-index
        Type   _doc
        Logstash_Format On
```
This allows you to forward logs to other systems like Elasticsearch, S3, or Splunk alongside Loki.

#### Visualizing Logs with Grafana

#### Pre-requisites

* `ccx-monitoring` helm chart must be deployed with Grafana enabled.


If Loki is used from the `ccxdeps` helm chart, make sure that the value in the `ccx-monitoring` helm chart called `lokiHostname` is set to `ccxdeps-loki.${namespace}.svc`.
If Loki is enabled through `ccx-monitoring` helm chart, Loki will be automaticly impored as a datasource. 
Both can be enabled.

To verify it, go to `Connection --> Data Sources` in Grafana. Loki data sources shoud be shown there.

To take a look at the logs, got to `Explore` tab in Grafana. Make sure that you pick Loki as a datasource. In Label filters pick a datastoreId, and for value the database which logs you wish to see. Pick a time perioud on which you'd like to see logs and press Run quiery. That will show you the logs for the chosen database. 

### Custom loki Setup (Optional)
Click here for Advanced setup [Custom Loki](Custom-Loki.md)


### Loki Authentication

Loki helm chart doesn't support authentication, so the only way to secure the Loki endpoint is to add the nginx authentication on the loki ingress.

When Loki auth is enabled, two Kubernetes secrets are required:

- **`loki.authSecret`** — used by the NGINX ingress controller to enforce HTTP basic auth on the `/loki` endpoint.
- **`loki.ingressSecret`** — used by the CCX REST service to authenticate when querying Loki. Must contain the keys `LOKI_USERNAME` and `LOKI_PASSWORD`.

#### Step 1: Generate credentials

Generate an htpasswd file with your desired username (e.g. `admin`):

```bash
htpasswd -c auth admin
```

This creates a file called `auth` with a bcrypt-hashed password entry.

#### Step 2: Create the NGINX auth secret

```bash
kubectl create secret generic loki-basic-auth \
  --from-file=auth \
  -n <namespace>
```

#### Step 3: Create the REST service credentials secret

```bash
kubectl create secret generic loki-ingress-secret \
  --from-literal=LOKI_USERNAME=admin \
  --from-literal=LOKI_PASSWORD=<your-password> \
  -n <namespace>
```

#### Step 4: Configure the CCX Helm chart

Set the following values in your CCX `values.yaml` (or pass them via `--set`):

```yaml
loki:
  url: "https://<ccxFQDN>/loki"       # Loki URL used by the REST service to query logs
  authSecret: loki-basic-auth          # Name of the K8s secret used for NGINX basic auth
  ingressSecret: loki-ingress-secret   # Name of the K8s secret used by the REST service
```

`loki.url` sets the Loki endpoint the CCX REST service queries for log data. If not set, log retrieval will be disabled. When using the built-in Loki from `ccxdeps`, this should be `https://<ccxFQDN>/loki` where `ccxFQDN` matches the value set in your CCX chart.

Also set the Fluent-bit credentials so that log shippers on datastore nodes can authenticate:

```yaml
fluentbit:
  auth:
    http_user: "admin"
    http_passwd: "<your-password>"
```

#### How it works

- The **NGINX ingress** for the `/loki` path is annotated with `nginx.ingress.kubernetes.io/auth-type: basic` and `nginx.ingress.kubernetes.io/auth-secret: <loki.authSecret>`, requiring HTTP basic auth for all requests to the Loki gateway.
- The **CCX REST service** reads `LOKI_USERNAME` and `LOKI_PASSWORD` from the `loki.ingressSecret` Kubernetes secret and uses them when querying Loki for log data.
- **Fluent-bit** on each datastore node sends logs to Loki using the credentials set in `fluentbit.auth.http_user` and `fluentbit.auth.http_passwd`.