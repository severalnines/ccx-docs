# Observability

CCX delivers the observability stack as a separate deployment available as a Helm chart.

This page describes how to set up observability. The observability solution for CCX relies heavily on VictoriaMetrics/VM-alerts (or Prometheus/AlertManager) with Grafana for visualisation. We recommend using VictoriaMetrics and hence Prometheus is not covered in any more detail in this document.

Moreover, the datastores are also visualized in the ClusterControl UI.

## Overview

This stack uses:

- Victoria metrics - Prometheus compatibile observability for metrics and alerting (vmsingle/vmalert or vmcluster/vmagent/vmalert) 
- Alertmanager - https://prometheus.io/docs/alerting/latest/alertmanager/
- Grafana - https://grafana.com/docs/
- kube-state-metrics - https://github.com/kubernetes/kube-state-metrics

## Deployment

### Requirements

- kubernetes cluster
- helm - https://helm.sh/docs/intro/install/
- ccx-monitoring helm chart 

### Namespace

The observability stack is quite resource-intensive. When deploying it for production use, it’s recommended to have a dedicated node group, separate from the one used by the ccx or ccxdeps Helm charts. This can be achieved by using a combination of affinity and toleration rules.

It's preferred to have a dedicated namespace for this stack. Create namespace:

```
kubectl create ns monitoring
kubectl config set-context --current --namespace=monitoring
```

### Add chart repo

```
helm repo add s9s https://severalnines.github.io/helm-charts/
helm repo update
```

### Pull the chart values
 
```
helm show values s9s/ccx-monitoring > values.yaml
```


### Values

It is very important to edit `values` file and set variables like cluster name, ingress host, etc. Please make sure to go through `values` file and modify it as necessary.

## Installation & upgrade

```
helm upgrade --install ccx-monitoring s9s/ccx-monitoring --values YOUR_VALUES.yaml --debug
```

## Grafana dashboards

When installing Grafana, dasboard for CCX monitoring will be automaticly imported.

(Optional) Repository aslo contains additional dashboards, that can be imported in order to track entire kubernetes cluster. 

```
helm pull s9s/ccx-monitoring --untar
kubectl delete -k ccx-monitoring/dashboards
kubectl create -k ccx-monitoring/dashboards
```

Additional dashboards can be placed as `.json` files in folders inside `dashboards` directory.

### Grafana datasources

Depending on the compnents that are enabled, when installing Grafana, Loki/VictoriaMetrics/Alertmanager datasources will be automaticly set, if they are deployed with `ccx-monitoring` helm chart.

In case `ccx-monitoring` helm chart is used with Loki deployed with `ccxdeps` helm chart with default values, or with some other helm chart, make sure that the value `lokiHostname` points to the service used for Loki. For `ccxdeps`, it would be `ccxdeps-loki`.

### To get Grafana admin password

To retrieve the admin password (with username `admin`):

```
kubectl get secret ccx-monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
```

## Removal

To uninstall the monitoring, run:

```
helm uninstall ccx-monitoring
```

## Integratation with Slack

To integrate with slack, please see example in `values.yaml` file. See https://prometheus.io/docs/alerting/latest/configuration/ - for various integration and configuration options.

## Alertmanager & vmalert Ingress Authentication

If Alertmanager and/or vmalert are exposed externally via Ingress (e.g. to make Slack action buttons like Silence and Query work, since they need to open a browser-reachable URL), they should be protected with authentication. Neither Alertmanager nor vmalert has robust native auth, so this is handled at the Ingress level via nginx-ingress Basic Auth.

Each component uses its own separate Secret and credentials — they are not shared.

### Creating the auth secret

Requires `htpasswd` (part of `apache2-utils` on Debian/Ubuntu, or `httpd` on macOS via Homebrew).

Run the following commands to create the passwords and secrets that will be used for authentication:

    htpasswd -c -B auth-alertmanager <username>
    kubectl create secret generic alertmanager-basic-auth --from-file=auth=auth-alertmanager -n monitoring

    htpasswd -c -B auth-vmalert <username>
    kubectl create secret generic vmalert-basic-auth --from-file=auth=auth-vmalert -n monitoring

This creates independent credentials per component. If you prefer shared credentials, reuse the same htpasswd file for both secrets.

```
kubectl get secret -n monitoring | grep basic-auth
```

### Values configuration

Add the following annotations to each component's `ingress` block. Double-check that each component's `auth-secret` points to its **own** secret — mixing these up is an easy mistake that fails silently (no error, just the wrong credentials being accepted).

```yaml
alertmanager:
  ingress:
    enabled: true
    annotations:
      kubernetes.io/ingress.class: nginx
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
      cert-manager.io/cluster-issuer: letsencrypt-prod
      nginx.ingress.kubernetes.io/auth-type: basic
      nginx.ingress.kubernetes.io/auth-secret: alertmanager-basic-auth
      nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
    hosts:
      - host: <your-alertmanager-hostname>
        paths:
          - path: /
            pathType: ImplementationSpecific
    tls:
      - secretName: alertmanager-cert
        hosts:
          - <your-alertmanager-hostname>

victoria-metrics-alert:
  server:
    ingress:
      enabled: true
      annotations:
        kubernetes.io/ingress.class: nginx
        nginx.ingress.kubernetes.io/ssl-redirect: "true"
        cert-manager.io/cluster-issuer: letsencrypt-prod
        nginx.ingress.kubernetes.io/auth-type: basic
        nginx.ingress.kubernetes.io/auth-secret: vmalert-basic-auth
        nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
      hosts:
        - name: <your-vmalert-hostname>
          path: /
      tls:
        - secretName: vmalert-cert
          hosts:
            - <your-vmalert-hostname>
```

Also requires `--web.external-url` (Alertmanager) and `-external.url` (vmalert) to be set to each component's own Ingress hostname, so that self-referential links they generate (e.g. Alertmanager's silence link, vmalert's `GeneratorURL`) point to a browser-reachable address rather than an internal cluster URL:

```yaml
alertmanager:
  extraArgs:
    web.external-url: "https://<your-alertmanager-hostname>"

victoria-metrics-alert:
  server:
    extraArgs:
      external.url: "https://<your-vmalert-hostname>"
```

### Verifying it's working

Confirm the annotations and args rendered correctly:

```
helm template <release> s9s/ccx-monitoring --values YOUR_VALUES.yaml | grep -B5 -A15 "kind: Ingress"
helm template <release> s9s/ccx-monitoring --values YOUR_VALUES.yaml | grep "web.external-url|external.url"
```

## Configuring the Grafana URL for Alert Dashboard Links

Alert rule annotations can include a `dashboard_url` pointing to a relevant Grafana dashboard, pre-filtered to the specific instance/pod/node that triggered the alert (shown as the "Dashboard" button on Slack notifications). Rather than hardcoding your Grafana hostname into every individual alert rule, it is set **once** as a vmalert external label and referenced from rule annotations via `$externalLabels`.

This means switching to a different Grafana instance (e.g. moving from a test environment to production) only requires changing **one value**, not editing every alert rule that has a `dashboard_url`.

### Setting the Grafana URL

Add `external.label` to vmalert's `extraArgs`, alongside the external URL flag already required for the Query button (see Ingress Authentication section above):

```yaml
victoria-metrics-alert:
  server:
    extraArgs:
      external.url: "https://<your-vmalert-hostname>"
      external.label: "grafana_url=https://<your-grafana-hostname>"
```

`external.label` takes a `key=value` pair. The key (`grafana_url` in this example) can be any name you choose, as long as it matches what's referenced in your alert rule annotations (see below). Do not include a trailing slash on the URL value.

### Referencing it in alert rules

In any alert rule's `dashboard_url` annotation, reference the label as `{{ $externalLabels.grafana_url }}` (or whatever key name you chose above), followed by the dashboard's path and query parameters:

```yaml
annotations:
  dashboard_url: "{{ $externalLabels.grafana_url }}/d/<dashboard-uid>/<dashboard-slug>?orgId=1&var-instance={{ $labels.instance }}"
```

`{{ $externalLabels.grafana_url }}` resolves to whatever was set via `external.label` above. `{{ $labels.instance }}` (or any other `$labels.*` reference) still comes from the individual alert's own labels, as usual — only the Grafana base URL itself is centralized.

### Important notes

- **`$externalLabels` vs `$labels`** — these are not interchangeable. `$externalLabels` refers to labels set globally on the vmalert instance itself (via `external.label`), while `$labels` refers to labels on the specific alert/metric that fired.
- **Every `dashboard_url` in this chart's alert rules must use `{{ $externalLabels.grafana_url }}`** rather than a hardcoded Grafana hostname, so that changing environments only requires updating the one `external.label` value. If a hardcoded hostname is found in any rule's `dashboard_url`, it should be migrated to this pattern.
- If `external.label` is not set at all, `{{ $externalLabels.grafana_url }}` will render as an empty string, and any `dashboard_url` referencing it will produce a broken/incomplete link (missing scheme and host). The Dashboard button will still render in Slack, but will not lead anywhere valid.

### Verifying it's working

```
helm template <release> s9s/ccx-monitoring --values YOUR_VALUES.yaml | grep "external.label"
```

Confirm the value matches your intended Grafana hostname, then trigger a real alert with a `dashboard_url` annotation and click the Dashboard button in Slack to confirm it resolves to the correct, fully-formed URL.

## Tuning Anomaly Detection Alert Sensitivity

The `AnomalyDetected` alert (`AnomalyAdaptiveAlerts` rule group) fires when a tagged metric moves outside a rolling mean/standard-deviation band computed from its own recent history. It's based on the ["adaptive" strategy](https://github.com/grafana/promql-anomaly-detection) — currently only node/pod CPU and memory usage are tagged for this (see the `AnomalyTaggingNodeExporter` rule group).

The band's width — and therefore how often the alert fires — is controlled by a few constants defined as their own recording rules, rather than as literal numbers inline in the band calculation. To change one, edit its `expr` value directly in `values.yaml` under `victoria-metrics-alert.server.config.alerts.groups` (group `AnomalyAdaptiveShortTerm`):

| Recording rule | Default | Effect |
|---|---|---|
| `anomaly:adaptive:stddev_multiplier` | `3` | Main sensitivity knob. The band is `average ± (stddev × this value)`. Higher = wider band = fewer, larger-deviation-only alerts. Lower = narrower band = more alerts, including smaller deviations. |
| `anomaly:adaptive:margin_multiplier` | `0.5` | Floor band width (`± average × this value`), used when a metric's recent variance is too low/filtered out to produce a useful stddev-based band (e.g. a mostly-flat metric). Prevents the band from collapsing to near-zero width on quiet series. |
| `anomaly:adaptive:threshold_by_covar` | `0.5` | Coefficient-of-variation cutoff used when smoothing the standard deviation over time: a given 1h window's stddev is only folded into the 26h smoothed average if it exceeds `average × this value`. Filters out abnormally quiet windows so they don't artificially tighten the long-term band. |
| `anomaly:adaptive:sparse_threshold` | `5/60` | Only applies to `anomaly_type="requests"` metrics. Series whose average is below this rate are treated as too sparse/low-traffic to reliably anomaly-detect, and are excluded. |

`stddev_multiplier` is the one to reach for first if the alert is firing too often (increase it) or missing real issues (decrease it). As a mental model: assuming roughly normal metric behavior, a multiplier of `2` lets ~4.5% of evaluations fall outside the band by chance alone, while `3` (the standard ["3-sigma rule"](https://en.wikipedia.org/wiki/68%E2%80%9395%E2%80%9399.7_rule)) cuts that to ~0.27% — since this evaluates continuously across every tagged series, even a small per-series false-positive rate compounds into frequent noise fleet-wide.

There's no substitute for watching real alert volume after a change — these are statistical approximations, not derived from this deployment's actual historical firing rate.

### Verifying it's working

```
helm template <release> s9s/ccx-monitoring --values YOUR_VALUES.yaml --show-only charts/victoria-metrics-alert/templates/server-alerts-configmap.yaml | grep -B1 "record: anomaly:adaptive:stddev_multiplier"
```

After deploying a change, monitor the alert channel for a few days (or check the `anomalies-adaptive` Grafana dashboard, which plots the actual band against real values) to judge whether it needs further adjustment.