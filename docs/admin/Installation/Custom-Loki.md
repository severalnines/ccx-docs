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
  