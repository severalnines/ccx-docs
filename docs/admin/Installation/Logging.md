## Logging Setup
#### Pre-requisites

* ccxdeps must be updated and deployed.
```
helm repo update
helm upgrade --install ccxdeps s9s/ccxdeps --debug
```

#### Configuring the FQDN of Loki URL
In our CCX Application, we use loki as log aggregation tool. Customers can choose one of the following options to set the FQDN for the Loki service:

###### Option 1: Change the FQDN of ccxdeps-loki-gateway Ingress
You can modify the FQDN by updating the ingress host configuration in ccxdeps chart values.yaml file. This ensures that Fluent Bit forwards logs to the correct Loki endpoint.

 How to change FQDN: 
Update the ingress rules in your Helm values file to set the desired FQDN in ccx-monitoring.loki.loki_host_url.
```
helm show values s9s/ccxdeps
```
```
ccx-monitoring:
  enabled: true
  loki:
    loki_host_url: &loki_host_url "REPLACE_ME" # Set your custom Loki FQDN here
    gateway:
      ingress:
        hosts:
          - host: *loki_host_url
            paths:
              - path: /
                pathType: Prefix
        tls:
          - secretName: loki-gateway-tls
            hosts:
              - *loki_host_url 
      
```


> Note: If the FQDN for Loki is not explicitly set, it will default to the value from the ccxFQDN     variable from ccx chart. This default behavior ensures that logs are routed to the ccxFQDN         domain if no custom FQDN is provided in ccxdeps chart.

###### Option 2: Automatically Use ccxFQDN
If you do not set a custom FQDN, the chart will automatically configure the Loki URL using the value of ccxFQDN from ccx chart. This ensures that there’s always a valid FQDN for the logging service even if no customization is made.


> Note: If the Loki gateway ingress is not found, a warning will be shown when you deploy ccx. Make sure you have updated and deployed ccxdeps, else the logging feature will be disabled.

