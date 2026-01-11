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
