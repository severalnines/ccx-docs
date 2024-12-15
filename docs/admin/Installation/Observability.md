# Observability

CCX delivers the observability stack as a separate deployment available as a Helm chart here - https://github.com/severalnines/observability/.

This page describes how to set up observability. The observability solution for CCX relies heavily on VictoriaMetrics/VM-alerts (or Prometheus/AlertManager) with Grafana for visualisation. We recommend using VictoriaMetrics and hence Prometheus is not covered in any more detail in this document.

Moreover, the datastores are also visualized in the ClusterControl UI.

## Overview

This stack uses:

- Victoria metrics - Prometheus compatibile observability for metrics and alerting (vmsingle/vmalert) - https://docs.victoriametrics.com/Single-server-VictoriaMetrics.html
- Alertmanager - https://prometheus.io/docs/alerting/latest/alertmanager/
- Grafana - https://grafana.com/docs/
- kube-state-metrics - https://github.com/kubernetes/kube-state-metrics

## Deployment

### Requirements

- kubernetes cluster
- helm - https://helm.sh/docs/intro/install/
- ccx-monitoring helm chart - https://github.com/severalnines/observability/

### Namespace

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

### Pull the chart

```
helm pull s9s/ccx-monitoring --untar
```

### Helm dependencies

Update your helm dependencies by running:

```
helm dependencies update
```

### Values

It is very important to edit `values` file and set variables like cluster name, ingress host, etc. Please make sure to go through `values` file and modify it as necessary.

```
helm show values ccx-monitoring > YOUR_VALUES.yaml
```

## Installation & upgrade

```
helm upgrade --install ccx-monitoring ccx-monitoring --values YOUR_VALUES.yaml --debug
```

Please note that this guide as some other documents and URLs assumes that you use `ccx-monitoring` release name.

## Grafana dashboards

Grafana dashboards and datasources are kept as a code in the repo.

```
kubectl delete -k ccx-monitoring/dashboards
kubectl create -k ccx-monitoring/dashboards
```

Additional dashboards can be placed as `.json` files in folders inside `dashboards` directory.

### Grafana datasources

Grafana dashboards and datasources are kept as a code in the repo. Navigate to `datasources` directory, edit `grafana_datasource.yaml` and apply using:

```
kubectl apply -k ccx-monitoring/datasources
```

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
