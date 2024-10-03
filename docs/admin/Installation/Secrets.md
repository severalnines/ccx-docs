# Secrets

CCX stores sensitive information in the form of secrets.

Such secrets include:

- SSH Keys: to connect to the database cluster
- Database Credentials: to connect to the database cluster - this is shown to end-users in the UI

These secrets are stored using kubernetes secrets.

This provides great flexibility in terms of how the secrets are stored and managed, since kubernetes secrets, in addition to the default etcd storage, can be stored in a variety of backends, such as Hashicorp Vault, AWS KMS, Azure Key Vault, etc.

## Migration
Prior to CCX 1.48 secrets were stored using Vault.
This is being phased out in favor of kubernetes secrets.

The configuration for secrets is defined in the ccx values yaml, as follows:

```yaml
ccx:
    useK8sSecrets: true # or false for vault
```

If the above is set to true, then the secrets will be stored in kubernetes secrets. Existing secrets will be automatically migrated to kubernetes secrets.

Vault will no longer be required for CCX.

If not, then the secrets will be stored in Vault.

__Notice:__ In the future vault will no longer be supported and the vault configuration will be discontinued.