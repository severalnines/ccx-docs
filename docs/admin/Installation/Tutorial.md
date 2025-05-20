# Tutorial

For laptop/desktop installation instructions please visit [Install CCX on a Laptop](CCX-Install-Laptop.md). 

In this tutorial we will install CCX so it is reachable from a domain, we will call it `dbaas.example.com`.

After this tutorial you will have a working solution, but you will need to extend it with External DNS later on.

For simplicity, AWS will be configured as the cloud provider.

## Requirements for public installation

- AWS credentials (for this tutorial, must be able to create/destroy VMs, security groups and volumes.). Save the credentials in `~/.aws/credentials`.
- Ingress Controller. In this tutorial we will use the NGINX Ingress Controller.
- Cert manager

### Ingress Controller
You must have a working and correctly setup ingress controller. 

Make sure that you have ingress controller in your cluster and you are able to setup externally facing load balancers and that either your domain na    me points to the ingress IP or you have external DNS configured in your cluster.

By default CCX is configured to use `nginx` as the ingress controller  (`ingressClassName: nginx`).

```
kubectl get pods --all-namespaces -l app.kubernetes.io/name=ingress-nginx
```

should look like: 

```
NAMESPACE       NAME                                        READY   STATUS    RESTARTS   AGE
ingress-nginx   ingress-nginx-controller-659f54cbff-fcszg   1/1     Running   0          5h38m
ingress-nginx   ingress-nginx-controller-659f54cbff-lq29d   1/1     Running   0          5h38m
```

All pods should be in a READY state, and STATUS should be Running.

Finally, inspect the external IP address of your NGINX Ingress Controller Load Balancer by running below command:

```
kubectl get svc -n ingress-nginx
```

should look like the following:

```
NAME                                 TYPE           CLUSTER-IP      EXTERNAL-IP                                 PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.108.22.0     146.190.177.145,2a03:b0c0:3:f0::9cb5:3000   80:31096/TCP,443:31148/TCP   5h40m
ingress-nginx-controller-admission   ClusterIP      10.108.28.137   <none>                                      443/TCP                      5h40m
ingress-nginx-controller-metrics     ClusterIP      10.108.13.85    <none>                                      9090/TCP                     5h40m
```
You must have an `EXTERNAL-IP`, else the installation will fail.

### Cert manager
Also, we recommend you have certmanager setup:

```
kubectl get pods -n cert-manager
```

Verify the pods are running.

```
NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-66dbc9658d-4hh55              1/1     Running   0          11d
cert-manager-cainjector-69cfd4dbc9-lmxf2   1/1     Running   0          11d
cert-manager-webhook-5f454c484c-bx8gx      1/1     Running   0          11d
```

### Setup DNS
Ensure you have a DNS A record setup, pointing the EXTERNAL_IP with the domain you wish to install CCX on, e.g dbaas.example.com: 

`A 146.190.177.145  dbaas.example.com`

## Preparations
### Add Severalnines Helm Chart repository

```
helm repo add s9s https://severalnines.github.io/helm-charts/
helm repo update
```
The complete helm-charts is located on [Github](https://github.com/severalnines/helm-charts/tree/main/charts/ccx).

### Create a namespace

We will deploy in a namespace called `ccx`, so let's create it:

```
kubectl create namespace ccx
kubectl config set-context --current --namespace=ccx
```

## Install CCX Dependencies

First, we need to install the CCX dependencies. The dependencies are:

- Postgres -  [read more about the operator](./Postgres-Operator-Installation). In this tutorial we will just use the defaults.
- MySQL - [read more about the operator](./Mysql-Operator-Installation). In this tutorial we will just use the defaults.
- NATS 
- VictoriaMetrics
- Loki
- Keycloak

### Installing the dependencies
We will use the default values when we setup the `ccxdeps`:

```
helm install ccxdeps s9s/ccxdeps --debug --wait
```

Check the pods are the `RUNNING`:

```
kubectl get pods -n ccx
NAME                                         READY   STATUS    RESTARTS   AGE
acid-ccx-0                                   1/1     Running   0          7m13s
alertmanager-0                               1/1     Running   0          7m22s
ccxdeps-0                                    1/2     Running   0          67s
ccxdeps-ccx-nats-0                           3/3     Running   0          7m22s
ccxdeps-ccx-nats-box-c777b9b98-thhfs         1/1     Running   0          7m22s
ccxdeps-keycloak-0                           1/1     Running   0          7m22s
ccxdeps-loki-0                               1/1     Running   0          7m22s
ccxdeps-loki-gateway-56c8f56c6b-kw9s8        1/1     Running   0          7m22s
ccxdeps-postgres-operator-6847687666-79x8l   1/1     Running   0          7m22s
mysql-operator-5876cf5b66-6knkp              1/1     Running   0          27s
victoria-metrics-845694c98d-24wng            1/1     Running   0          7m22s
victoria-metrics-alert-7f695bf5c8-96ch5      1/1     Running   0          7m22s
```

:::note

If the mysql-operator pod fails to start with the error (use `kubectl logs mysql-operator-5876cf5b66-6knkp` to check:

        ```
        persists try setting MYSQL_OPERATOR_K8S_CLUSTER_DOMAIN via environment
        ```

Then do;        

```
kubectl edit deployment -n ccx  mysql-operator

Locate the `env` and set:

env:
  - name: MYSQL_OPERATOR_K8S_CLUSTER_DOMAIN
    value: "cluster.local"

```

Finally restart:

```
kubectl rollout restart deployment -n ccx mysql-operator
```

:::

## Configuring cloud credentials in K8s Secrets
To be able to deploy datastores to a cloud provider (AWS by default) you need to provide cloud credentials.
Cloud credentials should be created as kubernetes secrets in format specified in - https://github.com/severalnines/helm-charts/blob/main/charts/ccx/secrets-template.yaml

To setup cloud credentials for AWS you can run the following one-liner. 

```bash
kubectl create secret generic aws \
    --from-literal=AWS_ACCESS_KEY_ID=$(awk 'tolower($0) ~ /aws_access_key_id/ {print $NF; exit}' ~/.aws/credentials) \
    --from-literal=AWS_SECRET_ACCESS_KEY=$(awk 'tolower($0) ~ /aws_secret_access_key/ {print $NF; exit}' ~/.aws/credentials)
```

## Install CCX
Now it is finally time to install CCX:

```
helm upgrade --install ccx s9s/ccx --debug --wait --set ccxFQDN=dbaas.example.com --set 'ccx.cloudSecrets[0]=aws' --set 'ccx.cidr=0.0.0.0/0'
```

Wait for it to finish, and check the pods are `RUNNING`: 

```
kubectl get pods -n ccx
```

## CCX Web UI

Open `https://dbaas.example.com` in a web browser, and press the Sign up link to create a new user. Please not that email notfications are not yet configured. You can just press the `Back` button after the signup.

## Next Steps

- Setup configure ExternalDNS
- Configure Instance (VMs, storages etc).
- Add another cloud provider (Openstack, CloudStack).
