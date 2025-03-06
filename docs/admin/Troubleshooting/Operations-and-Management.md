# Operations and Management

CCX comes with many tools for managing and operating your installation.

## CCX Admin UI

Your `CCX_URL` has the `/auth/admin` endpoint that allows you (and your support team) to administer all datastores deployed.

The account details for this are found in the kubernetes secret `admin-users`. (The format is `<email>:<password>` and additional users can be specified using the `;` as a separator)

You need to logout from CCX web-app first or clear the cookies for your `CCX_URL` in a browser.

### CCX Admin API

#### Basic Auth
The following Admin API endpoints requires Basic Auth authentication method to work.
- Billing usage → GET /admin/datastores/billing/usage/{type}
- Users count → GET /admin/users/count
- Datastores count → GET /admin/datastores/count

The credentials can be found in the kubernetes secret `admin-basic-auth`.
To create a Basic Authentication Header we can use this command

```
BASIC_AUTH=$(kubectl get secret admin-basic-auth -o json | jq -r '(.data.ADMIN_AUTH_USERNAME | @base64d) + ":" + (.data.ADMIN_AUTH_PASSWORD | @base64d)' | tr -d '\n' | base64) printf "Authorization: Basic %s" $BASIC_AUTH
```

## ClusterControl UI

This is the admin panel for Cluster Control and exposes the functionality of CMON through a web interface (you can also use the `s9s` CLI to interact).

The account details for this are found in the kubernetes secret `cmon-credentials`.
:::danger
Never use the ClusterControl UI to delete resources (nodes or datastores). This may lead to stray data.
::::

## S9S CLI

This is a CLI tool that provides access to CMON functionality and the tool can be run from the `cmon-master` service within kubernetes.
:::danger
Never use the S9S CLI to delete resources (nodes or datastores). This may lead to stray data.
::::
