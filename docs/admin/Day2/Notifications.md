# Notifications

CCX has two types of notification available:

1. `Notify User` - This is used to notify end users about signing up, new services created, etc.
2. `Notify Support` - This is used to notify your support teams of datastores that are newly created, deleted, in need of attention or of maintenance tasks.

By default, CCX sends NO emails to either of the above parties. In order to configure this, you can set up `SUPPORT_RECEIVERS` with the emails of your support team such that they will be notified. The `CCX` service needs the following environment variables configured when deploying `ccx-runner-notifications` (this is going to be in the helmcharts and secret templates):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_FROM_NAME`
- `DISABLE_USER_EMAILS` - should be set to `"true"` as CCX does not get end-users' email addresses with the existing auth flow.

Alternatively, you can integrate with slack and use `SLACK_URL` and `SLACK_CHANNEL` to receive the same support alerts. This allows you to configure your own actions (i.e. notify support on all Slack messages).
