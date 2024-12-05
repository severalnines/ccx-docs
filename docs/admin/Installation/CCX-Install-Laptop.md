# Install CCX on a Laptop

This guide explains how to install Docker Desktop, enable Kubernetes, configure AWS credentials for deploying CCX's datastore in AWS, and deploy CCX on the Kubernetes cluster.

---

## Prerequisites
- **System requirements**: a laptop/desktop with atleast 4 cores and 8GB of RAM, 20GB of free storage.
- **Docker Desktop**, you can download Docker Desktop from the [official Docker website](https://www.docker.com/products/docker-desktop/).
- **kubectl** installed and on the PATH, [get kubectl here](https://kubernetes.io/docs/tasks/tools/#kubectl).
- **AWS CLI**, see the [AWS installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).
- **AWS credentials**, allowing you to create VMs, volumes, security groups, networks, S3, etc..
- **Helm** installed on your system. If not, follow the [Helm installation guide](https://helm.sh/docs/intro/install/).

---

## Step 1: Enable Kubernetes in Docker Desktop

1. Open Docker Desktop and navigate to **Settings > Kubernetes**.
2. Check the box **Enable Kubernetes** and click **Apply & Restart**. We have tested these instructions with Kubernetes v1.30.5.
3. Wait for Kubernetes to initialize. It may take some time for Kubernetes to be Started. You can verify this by running:

    ```bash
    kubectl cluster-info
    ```
    The output of this command should look something like this:
    ```
    Kubernetes control plane is running at https://127.0.0.1:6443
    CoreDNS is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
    ```

4. Ensure that the `docker-desktop` context is selected:

    ```bash
    kubectl config use-context docker-desktop
    ```

---
## Step 2: Create and Switch to a Namespace

1. Create a new namespace for CCX:

    ```bash
    kubectl create namespace ccx
    ```

2. Switch your context to use this namespace:

    ```bash
    kubectl config set-context --current --namespace=ccx
    ```

## Step 3: Configure AWS Credentials

CCX uses AWS credentials to deploy its datastore in the AWS cloud. These credentials need to be securely provided to Kubernetes as a secret.

### Steps

1. Run the following command to configure your AWS credentials:

    ```bash
    aws configure
    ```

    Provide the following details:
    - AWS Access Key ID
    - AWS Secret Access Key
    - Default Region

    
2. Create a Kubernetes secret for the AWS credentials using the following command:

    ```bash
    kubectl create secret generic aws \
      --from-literal=AWS_ACCESS_KEY_ID=$(awk 'tolower($0) ~ /aws_access_key_id/ {print $NF; exit}' ~/.aws/credentials) \
      --from-literal=AWS_SECRET_ACCESS_KEY=$(awk 'tolower($0) ~ /aws_secret_access_key/ {print $NF; exit}' ~/.aws/credentials)
    ```
    Verify the secret is available:
    ```
        kubectl get secrets aws
    ```
    The output of this command should look something like this:
    ```
        NAME   TYPE     DATA   AGE
        aws    Opaque   2      24s
    ```
---


## Step 4: Deploy CCX Using Helm

1. Add the required Helm repository:

    ```bash
    helm repo add s9s https://severalnines.github.io/helm-charts/
    helm repo update
    ```
    and you will see:
    ```
    "s9s" has been added to your repositories
    Hang tight while we grab the latest from your chart repositories...
    ...Successfully got an update from the "s9s" chart repository
    Update Complete. ⎈Happy Helming!⎈
    ```

2. Deploy CCXDEPS using the following command:
    ```bash
    helm upgrade --install ccxdeps s9s/ccxdeps --debug --wait --set ingressController.enabled=true
    ```
3. Deploy CCX:
    :::danger
    This setup is only for demo and development purposes and the installtion will only work for the specified CIDR or 0.0.0.0/0 if no CIDR is set.
    For production and testing we recommend [to follow the installation guide](docs/admin/Installation/Index) and overriding the values.yaml with your settings. If you set the CIDR below then CCX will only be able to access the datastores from this CIDR.
    :::
    **Using the CIDR 0.0.0.0/0 (access is allowed from everywhere, which might be a security risk):**
    ```bash
    helm upgrade --install ccx s9s/ccx \
      --debug --wait \
      --set 'ccx.cloudSecrets[0]=aws'
    ```
    **Using a custom CIDR N.N.N.N/32 (access is allowed only from *this* CIDR):**
    ```bash
    curl ifconfig.me # the IP is the N.N.N.N 

    helm upgrade --install ccx s9s/ccx \
      --debug --wait \
      --set 'ccx.cloudSecrets[0]=aws' \
      --set 'ccx.cidr=N.N.N.N/32'
    ```
    :::note
    If you move the laptop/computer where the installation is made to another location, then you must login to the AWS Console and add that network to the security group.
    :::
---

## Verification

1. Once the deployment is complete, verify the CCX installation by accessing `https://ccx.localhost` in your web browser.
2. Use the following command to confirm that all pods are running successfully:

    ```bash
    kubectl get pods
    ```

## Accessing the frontends
### CCX frontend
The CCX frontend is the end-user interface and allows the end-user to create and manage datastores. The necessary infrastructure (VMs, volumes, etc) are created and managed by CCX.
1. Navigate to `https://ccx.localhost` in your web browser.
2. Register a new user. In this configuration, no confirmation email will be sent and you will need to go back to `https://ccx.localhost` (you can press Back in the browser) and login with your email address and password.

### CC frontend
The CC frontend is an administrative interface and allows the CCX administrator to manage datastores. 
1. Navigate to `https://cc.localhost` in your web browser.
2. Login with the CC credentials, which are stored in Kubernets secrets:
```
    kubectl get secret cmon-credentials  -o jsonpath='{.data.cmon-user}' | base64 -d
```
```    
    kubectl get secret cmon-credentials  -o jsonpath='{.data.cmon-password}' | base64 -d
```    
:::danger
Do not use this UI to delete clusters or add and remove nodes. Please see the [Troubleshooting guide](/docs/admin/Troubleshooting/).
:::

## Troubleshooting
- If you experience sudden glitches or pod failures, you can try allocate more resoures too Docker Desktop. You can allocated more resources under `Settings->Resources->Advanced`.
- If you experience issues deploying, reset the environment (Settings->Kubernetes, Reset Kubernetes Cluster), increase resources, and try again.
- [Troubleshooting guide](/docs/admin/Troubleshooting/Troubleshooting).

## Limitations
- Backups are not supported. A license to CMON is required. Please contact [sales@severalnines.com](mailto:sales@severalnines.com).

## Next steps
- [Installation guide](/docs/admin/Installation/).
---

This document provides step-by-step instructions to set up Docker Desktop, Kubernetes, and CCX with a datastore deployed in AWS. For further details, refer to the official [CCX documentation](https://severalnines.github.io/ccx-docs/).

