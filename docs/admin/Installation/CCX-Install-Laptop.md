# Installing Docker Desktop and Configuring Kubernetes for CCX on Laptop

This guide explains how to install Docker Desktop, enable Kubernetes, configure AWS credentials for deploying CCX's datastore in AWS, and deploy CCX on the Kubernetes cluster.

---

## Prerequisites

- A system with **Docker Desktop** installed.
- AWS CLI [AWS installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).
- AWS credentials.
- **Helm** installed on your system. If not, follow the [Helm installation guide](https://helm.sh/docs/intro/install/).

---

## Step 1: Install Docker Desktop

- Download Docker Desktop from the [official Docker website](https://www.docker.com/products/docker-desktop/).


---

## Step 2: Enable Kubernetes in Docker Desktop

1. Open Docker Desktop and navigate to **Settings > Kubernetes**.
2. Check the box **Enable Kubernetes** and click **Apply & Restart**.
3. Wait for Kubernetes to initialize. You can verify this by running:

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
## Step 3: Create and Switch to a Namespace

1. Create a new namespace for CCX:

    ```bash
    kubectl create namespace ccx
    ```

2. Switch your context to use this namespace:

    ```bash
    kubectl config set-context --current --namespace=ccx
    ```

## Step 4: Configure AWS Credentials

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
        NAME   TYPE     DATA   AGE
        aws    Opaque   2      24s
    ```
---


## Step 5: Deploy CCX Using Helm

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

2. Deploy CCXDEPS and CCX using the following command:
    ```bash
    helm upgrade --install ccxdeps s9s/ccxdeps --debug --wait
    ```
    Create the ingress:
    ```bash
    helm upgrade --install ccxdeps s9s/ccxdeps --debug --set ingressController.enabled=true
    ```

    ```bash
    helm upgrade --install ccx s9s/ccx \
      --debug --wait \
      --set 'ccx.cloudSecrets[0]=aws'
    ```

---

## Verification

1. Once the deployment is complete, verify the CCX installation by accessing `https://ccx.localhost` in your web browser.
2. Use the following command to confirm that all pods are running successfully:

    ```bash
    kubectl get pods
    ```

---

This document provides step-by-step instructions to set up Docker Desktop, Kubernetes, and CCX with a datastore deployed in AWS. For further details, refer to the official [CCX documentation](https://severalnines.github.io/ccx-docs/).

