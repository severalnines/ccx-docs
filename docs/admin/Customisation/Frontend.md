# Frontend customization

## Integration using JWT
Integration with JWT can be used if you are white-labeling the UI and wish to integrate CCX with your service panel.
JWT allows a way to authenticate users from your service panel in CCX.
Read more in the [JWT Authentication guide](JWT.md).

## Theming and white-labeling
Colours, the logo and the favicon can be changed without modifying the application.
Read more in the [Theming and white-labeling guide](Theming.md).

## Environment Variables

A number of variables is used to control the frontend. The enviroment variables are set under `ccx.services.uiapp` in the `values.yaml` for ccx.


```yaml
- name: FE_BASE_DOMAIN
  value: The app's base domain
- name: FE_STRIPE_PK
  value: stripe key
- name: FE_REACT_APP_FAVICON_URL
  value: app favicon path
- name: FE_REACT_APP_LOGO_URL
  value: app logo path
- name: FE_VPC_DISABLED
  value: hide VPCs entirely (sidebar entry, the VPCs page, and the create-VPC option in the deployment wizard)
- name: FE_BILLING_DISABLED
  value: control billing, pricing, invoices, subscription etc
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
- name: FE_HIDE_PROJECT_NAME
  value: not in use but intended to show or hide project dropdown in header bar
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
  value: "https://example.com/my.css" # stylesheet loaded at runtime to re-brand the UI. See the Theming and white-labeling guide for the supported theme tokens.
```

### Example

The enviroment variables are set under `ccx.services.uiapp.env`. Below is an example:

```
ccx:
   ...
   services:
       ...
       uiapp:
            affinity: {}
            replicas: 3
            env:        
                FE_REACT_APP_FAVICON_URL: "https://ccx.example.com/favicon.ico"
                FE_REACT_APP_LOGO_URL: "https://ccx.example.com/logo.png"        
                FE_VPC_DISABLED: 'true'
```