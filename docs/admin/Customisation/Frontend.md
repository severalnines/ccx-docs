# Frontend customization

## Integration using JWT
Integration with JWT can be used if you are white-labeling the UI and wish to integrate CCX with your service panel.
JWT allows a way to authenticate users from your service panel in CCX.
Read more in the [JWT Authentication guide](JWT.md).

## Environment Variables

A number of variables is used to control the frontend. The enviroment variables are set under `ccx.services.uiapp` in the `values.yaml` for ccx.


```yaml
- name: FE_REACT_APP_FAVICON_URL
  value: app favicon path
- name: FE_REACT_APP_LOGO_URL
  value: app logo path
- name: FE_VPC_DISABLED
  value: hide VPCs entirely (sidebar entry, the VPCs page, and the create-VPC option in the deployment wizard)
- name: FE_ONBOARDING_DISABLED
  value: disable the onboarding hints and welcome flow
- name: FE_USER_MENU_DISABLED
  value: control visibility of the menu on the top right of the page
- name: FE_HIDE_CLOUD_PROVIDER
  value: hide the cloud provider selector in the deployment wizard (single-cloud mode). It no longer affects the footer; use FE_HIDE_FOOTER for that
- name: FE_HIDE_FOOTER
  value: hide the footer
  # Migration note: the previous UI hid the footer with FE_HIDE_CLOUD_PROVIDER. Set FE_HIDE_FOOTER=true as well if you relied on that.
- name: FE_EULA
  value: require EULA acceptance in the deployment wizard (link from FE_EULA_URL)
- name: FE_HIDE_HEADER
  value: hide the header bar across the app (the sidebar remains for navigation)
- name: FE_HIDE_BREADCRUMBS
  value: hide breadcrumbs
- name: FE_HIDE_FEEDBACK
  value: hide feedback button at the bottom left of the page
- name: FE_USE_PRIVATE_IPS
  value: show private IPs instead of public ones in connection details and node cards
- name: FE_WRONG_GLOBAL_REDIRECT_URL
  value: used to specify url which users are not allowed to access directly in case we are using iframe
- name: FE_GLOBAL_REDIRECT_URL
  value: used to specify where to send users whenever they try to access FE_WRONG_GLOBAL_REDIRECT_URL directly
- name: FE_AUTH_REDIRECT_URL
  value: used to specify where to send users who get a 401 response on any API call, if not specified then they are sent to the default FE_AUTH_APP_URL
- name: FE_AUTH_APP_URL
  value: URL where unauthorized users can login or sign up.
- name: FE_AUTH_UI_APP_DISABLED
  value: "true" # set it to true if you don't want to use the built-in `ccx-ui-auth` app. FE_AUTH_APP_URL *must* be set for this in order to work.
- name: FE_EXTERNAL_CSS_URL
  value: "https://example.com/my.css" # CSS file URL that will be loaded and applied to the CCX UI, might be useful for theming/visual customisatons. Could also break the layout if not used with caution.
```

### Examples

The environment variables are set under `ccx.services.uiapp.env`. The examples below use placeholder domains.

#### Branding

Replace the default logo and favicon, and load your own stylesheet:

```yaml
ccx:
  services:
    uiapp:
      env:
        FE_REACT_APP_LOGO_URL: "https://cdn.example.com/brand/logo.svg"
        FE_REACT_APP_FAVICON_URL: "https://cdn.example.com/brand/favicon.ico"
        FE_EXTERNAL_CSS_URL: "https://cdn.example.com/brand/ccx.css"
```

#### Single-cloud white-label installation

A branded installation on one cloud, with VPCs, onboarding and the feedback button hidden, and login handled outside the built-in `ccx-ui-auth` app:

```yaml
ccx:
  services:
    uiapp:
      env:
        FE_REACT_APP_LOGO_URL: "https://cdn.example.com/brand/logo.svg"
        FE_REACT_APP_FAVICON_URL: "https://cdn.example.com/brand/favicon.ico"
        FE_HIDE_CLOUD_PROVIDER: "true"
        FE_VPC_DISABLED: "true"
        FE_ONBOARDING_DISABLED: "true"
        FE_HIDE_FEEDBACK: "true"
        FE_AUTH_UI_APP_DISABLED: "true"
        FE_AUTH_APP_URL: "/auth/?from=ccx"
```

#### Embedded in a service portal

CCX runs inside an iframe in your own portal. The portal provides navigation, login and the user menu, so CCX hides its own. Users who open CCX directly at `https://ccx.example.com` are sent back to the portal. `FE_WRONG_GLOBAL_REDIRECT_URL` and `FE_GLOBAL_REDIRECT_URL` only take effect when both are set.

```yaml
ccx:
  services:
    uiapp:
      env:
        FE_REACT_APP_LOGO_URL: "https://cdn.example.com/brand/logo.svg"
        FE_REACT_APP_FAVICON_URL: "https://cdn.example.com/brand/favicon.ico"
        FE_HIDE_HEADER: "true"
        FE_HIDE_FOOTER: "true"
        FE_HIDE_BREADCRUMBS: "true"
        FE_USER_MENU_DISABLED: "true"
        FE_HIDE_CLOUD_PROVIDER: "true"
        FE_HIDE_FEEDBACK: "true"
        FE_ONBOARDING_DISABLED: "true"
        FE_VPC_DISABLED: "true"
        FE_USE_PRIVATE_IPS: "true"
        FE_EULA: "true"
        FE_EULA_URL: "https://portal.example.com/eula"
        FE_AUTH_REDIRECT_URL: "https://portal.example.com/"
        FE_WRONG_GLOBAL_REDIRECT_URL: "https://ccx.example.com"
        FE_GLOBAL_REDIRECT_URL: "https://portal.example.com/"
```
