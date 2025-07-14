# Frontend customization

## Integration using JWT
Integration with JWT can be used if you are white-labeling the UI and wish to integrate CCX with your service panel.
JWT allows a way to authenticate users from your service panel in CCX.
Read more in the [JWT Authentication guide](JWT.md).

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
  value: control visibility of vpc create buttons across the app
- name: FE_BILLING_DISABLED
  value: control billing, pricing, invoices, subscription etc
- name: FE_ONBOARDING_DISABLED
  value: disabling the old onboarding page
- name: FE_USER_MENU_DISABLED
  value: control visibility of the menu on the top right of the page
- name: FE_HIDE_CLOUD_PROVIDER
  value: show or hide cloud providers in the deployment wizard (its also used to show or hide footer)
- name: FE_HIDE_FOOTER
  value: not in use but intended to replace FE_HIDE_CLOUD_PROVIDER when hiding footer
- name: FE_EULA
  value: old deployment wizard (no longer in use)
- name: FE_HIDE_HEADER
  value: hide header bar across app and show back button (to return home) on overview page
- name: FE_HIDE_BREADCRUMBS
  value: hide breadcrumbs
- name: FE_HIDE_FEEDBACK
  value: hide feedback button at the bottom left of the page
- name: FE_HIDE_PROJECT_NAME
  value: not in use but intended to show or hide project dropdown in header bar
- name: FE_USE_PRIVATE_IPS
  value: control whether or not to use private ips for monitoring
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

### Example

The enviroment variables are set under `ccx.services.uiapp`. Below is an example:

```
ccx:
   ...
   services:
       ...
       uiapp:
            env:
                FE_AUTH_APP_URL: '/auth/?from=ccx'
                FE_BILLING_DISABLED: 'true'
                FE_HIDE_CLOUD_PROVIDER: 'true'
                FE_HIDE_FEEDBACK: 'true'
                FE_HIDE_PROJECT_NAME: 'true'
                FE_ONBOARDING_DISABLED: 'true'
                FE_REACT_APP_FAVICON_URL: https://ccx.example.com/favicon.ico
                FE_REACT_APP_LOGO_URL: https://ccx.example.com/logo.png               
                FE_VPC_DISABLED: 'true'
```