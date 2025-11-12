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
