# Secrets

CCX stores sensitive information in the form of secrets.

Such secrets include:

- SSH Keys: to connect to the database cluster
- Database Credentials: to connect to the database cluster - this is shown to end-users in the UI

These secrets are stored using kubernetes secrets.

This provides great flexibility in terms of how the secrets are stored and managed, since kubernetes secrets, in addition to the default etcd storage, can be stored in a variety of backends, such as Hashicorp Vault, AWS KMS, Azure Key Vault, etc.
