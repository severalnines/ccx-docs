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

### Custom loki Setup (Optional)
Click here for Advanced setup [Custom Loki](Custom-Loki.md)
