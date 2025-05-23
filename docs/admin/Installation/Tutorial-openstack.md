# Tutorial for Openstack

For laptop/desktop installation instructions please visit [Install CCX on a Laptop](CCX-Install-Laptop.md). 

In this tutorial we will install CCX so it is reachable from a domain, we will call it `dbaas.example.com`.

After this tutorial you will have a working solution, but you will need to extend it with External DNS later on.

Openstack will be configured as the cloud provider.

## Requirements for public installation
- An Openstack installation and an Openstack project. Please note that Huawei's Openstack implementation is rather different and will use other endpoints.
- Openstack credentials, obtain e.g an RC file.
- Ingress Controller. In this tutorial we will use the NGINX Ingress Controller. Then ingress controller must have an EXTERNAL-IP
- Domains (e.g `ccx.example.com`, `cc.example.com`)
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
Ensure you have a DNS A record setup, pointing the EXTERNAL_IP with the domain you wish to install CCX on, e.g `ccx.example.com`: 

`A 146.190.177.145  ccx.example.com`

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
helm install ccxdeps s9s/ccxdeps --debug --wait -n ccx
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

Moreover, you can use the script [create-openstack-secrets.sh](https://github.com/severalnines/helm-charts/tree/main/charts/ccx/scripts) which asks you for the openstack credentials. Make sure you have your Openstack RC file handy.

Download the scripts:

```
curl -o create-openstack-secrets.sh https://raw.githubusercontent.com/severalnines/helm-charts/main/charts/ccx/scripts/create-openstack-secrets.sh

curl -o create-openstack-s3-secrets.sh https://raw.githubusercontent.com/severalnines/helm-charts/main/charts/ccx/scripts/create-openstack-s3-secrets.sh
chmod u+x create-openstack-secrets.sh
chmod u+x create-openstack-s3-secrets.sh
```

Now run the scripts and fill enter the details:

```
./create-openstack-secrets.sh
```

and 

```
./create-openstack-s3-secrets.sh
```

Apply the generated secrets files:

```
kubectl apply -n ccx -f openstack-secrets.yaml
kubectl apply -n ccx -f openstack-s3-secrets.yaml
```

Verify that the secrets are created:

```
kubectl get secrets -n ccx
```

## Prepare the Openstack values file and Openstack
We will use a [minimal Openstack configuration](https://github.com/severalnines/helm-charts/blob/main/charts/ccx/minimal-values-openstack.yaml) as the template.
At this stage you must have the following information/resources created in your Openstack project:

- floating_network_id - this is the public network (public ip pool).
- network_id - this is the private network.
- project_id - the project_id where the resources will be deployed.
- image_id (this image must be an Ubuntu 22.04 of a recent patch level). Cloudinit will install the necessary tooling on the image.
- instance type (a code for the instance type you will use, e.g `x4.2c4m.100g`).
- volume type (a code for the volume type you will use, e.g `fastdisk`).
- region, e.g you need to know the name of the region, e.g `nova` or `sto1`.
- A security group called `ccx-common` and must allow all TCP traffic from all k8s nodes where ccx is running. Below is a screenshot showing the `ccx-common`. The EXTERNAL-IP is specified for the port range 1-65535.
![CCX architecture](../images/ccx-common-sec-group.png)


Download the minimal values file:

```
curl -o minimal-openstack.yaml https://raw.githubusercontent.com/severalnines/helm-charts/main/charts/ccx/minimal-values-openstack.yaml
```

Edit the `minimal-openstack.yaml` and replace all `MY_*` with the values for `floating_network_id`, `network_id` etc. Double-check that you do not omit or make any typos.
Also, ensure that instance types and volume types are specified.

### Sample minimal openstack values file
Below is an example. Please note that it is possible to add more instance types, volume types, clouds, etc. We recommend that you start small and expand the configuration.
```
ccx:
  # List of Kubernetes secrets containing cloud credentials.
  cidr: 0.0.0.0/0
  cloudSecrets:
    - openstack  # This secret must exist in Kubernetes. See 'secrets-template.yaml' for reference.
  config:
    clouds:
      - code: mycloud  # Unique code for your cloud provider
        name: MyCloud  # Human-readable name
        instance_types:
          - code: x4.2c4m.100g
            cpu: 2
            disk_size: 100
            name: x4.2c4m.100g
            ram: 4
            type: x4.2c4m.100g
        volume_types:
        - code: fastdisk
          has_iops: false
          info: Optimized for performance
          name: Fast storage
          size:
            default: 60
            max: 1000
            min: 30
        network_types:
          - code: public
            name: Public
            in_vpc: false
            info: >
              All instances will be deployed with public IPs.
              Access to the public IPs is controlled by a firewall.
        regions:
          - code: sto1  # this is your region code. 
            display_code: my-region1
            name: Stockholm
            city: Stockholm
            country_code: SE
            continent_code: EU
            availability_zones:
              - code: nove
                name: az1
  services:
    deployer:
      config:
        openstack_vendors:
          mycloud:
            compute_api_microversion: "2.79"
            floating_network_id: b19680b3-c00e-40f0-ad77-4448e81ae226  # Replace with actual ID, e.g., "12345-abcde"
            network_api_version: NetworkNeutron          # Typically "NetworkNeutron"
            network_id: 21dfbb3d-a948-449b-b727-5fdda2026b45                    # Replace with actual network ID
            project_id: 5b8e951e41f34b5394bb7cf7992a95de                    # Replace with your OpenStack project ID
            regions:
              sto1:  # region id, must be consistently set/named.
                image_id: 936c8ba7-343a-4172-8eab-86dda97f12c5                    # Replace with image ID for the region
                # secgrp_name refers to the security group name used by ccx to access datastore VMs.
                # It must be created manually and allow all TCP traffic from all Kubernetes nodes where ccx is running.
                secgrp_name: ccx-common                  # Recommended to use a dedicated security group
```

## Install CCX
Now it is finally time to install CCX:

```
helm upgrade --install ccx s9s/ccx --debug --wait --set ccxFQDN=ccx.example.com --set 'ccx.cidr=0.0.0.0/0' -f minimal-openstack.yaml
```

Wait for it to finish, and check the pods are `RUNNING`: 

```
kubectl get pods -n ccx
```

## CCX Web UI


Open `https://ccx.example.com/auth/register?from=ccx` in a web browser and register a new user. Please note that email notfications are not yet configured. You can just press the `Back` button after the signup.

Try and deploy a datastore. Does it fail at around 8% or 16% then there is a problem with the infrastrcture. See the trouble shooting below for clues.

## Basic troubleshooting

In the conception of a datastore, a number of resources are setup: Security groups, volumes, networks, and instances.
If you run into issues, then one good place to start is to look at logs from the `ccx-runner-service-NNN` pod:

```
kubectl logs ccx-runner-service-NNNN
```

### Timeouts

If you see issues with timeouts then:
- Ensure you have updated `ccx-common` security group with the correct IP address (the EXTERNAL-IP), but it might also be need to add the IPs of the nodes.

### Double check that URLs in the secrets file is correct:

```
kubectl get secret openstack    -o json | jq -r '.data | to_entries[] | "\(.key): \(.value | @base64d)"'
```

See our [Troubleshooting](docs/admin/Troubleshooting/Troubleshooting.md) section for more info.

## Next Steps

- Setup configure ExternalDNS
- Configure Instance (VMs, storages etc).
- Add another cloud provider (Openstack, CloudStack).
