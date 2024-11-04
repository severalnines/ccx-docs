# Operations and Management

CCX comes with many tools for managing and operating your installation.

## CCX Admin UI

Your `CCX_URL` has the `/auth/admin` endpoint that allows you (and your support team) to administer all datastores deployed.

The account details for this are found in the kubernetes secret `admin-users`. (The format is `<email>:<password>` and additional users can be specified using the `;` as a separator)

You need to logout from CCX web-app first or clear the cookies for your `CCX_URL` in a browser.

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
