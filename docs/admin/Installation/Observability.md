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

Run the following commands to create the password and secrets that will be used for authentication:

```
htpasswd -c auth <username>
kubectl create secret generic alertmanager-basic-auth --from-file=auth -n monitoring
kubectl create secret generic vmalert-basic-auth --from-file=auth -n monitoring
```

Use a different `auth` file per component if you want independent credentials for each. Verify both secrets exist:

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