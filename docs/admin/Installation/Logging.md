## Logging Setup
#### Pre-requisites

* ccxdeps must be updated and deployed.
```
helm repo update
helm upgrade --install ccxdeps s9s/ccxdeps --debug
```

#### Configuring the FQDN of Loki URL
In our CCX Application, we use loki as log aggregation tool. 
Fluent Bit deployed on datastore nodes will be configured to send logs to Loki using an output plugin. In this setup, Fluent Bit collects logs from various sources, processes them, and forwards them to a Loki instance for storage and querying.

Customers can choose one of the following options to set the FQDN for the Loki service:

###### Option 1: Automatically Use ccxFQDN
If you do not set a custom FQDN in ccxdeps chart, the chart will automatically configure the Loki URL using the value of ccxFQDN from ccx chart. This ensures that there’s always a valid FQDN for the logging service even if no customization is made.

###### Option 2: Change the FQDN of ccxdeps-loki-gateway Ingress
You can modify the FQDN by updating the ingress host configuration in ccxdeps chart values.yaml file. This ensures that Fluent Bit forwards logs to the correct Loki endpoint.

 How to change FQDN: 
Update the ingress rules in your Helm values file to set the desired FQDN in ccx-monitoring.loki.loki_host_url.
```
helm show values s9s/ccxdeps
```
Replace the loki fqdn that you want to set
```
ccx-monitoring:
  enabled: true
  loki:
    loki_host_url: &loki_host_url "REPLACE_ME" # Set your custom Loki FQDN here
```

:::note
If the FQDN for Loki is not explicitly set, it will default to the value from the ccxFQDN     variable from ccx chart. This default behavior ensures that logs are routed to the ccxFQDN         domain if no custom FQDN is provided in ccxdeps chart.
:::


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

### Configuring Custom loki Setup (Optional)

If you're using your own Loki setup, configure the fluentbit.host value in ccx Helm chart to point to your custom Loki URL which you have already deployed on your environment.
```
fluentbit:
  host: "custom-loki-fqdn.com"
```
and set your custom Loki URL below
```
ccx:
  services:
    rest_service:
      env:
        LOKI_URL: "custom-loki-fqdn.com"
```
  