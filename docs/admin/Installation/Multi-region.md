# Multi-region Setups

This guide explains how to configure CCX for multi-region deployments across different cloud providers and regions.

## Overview

Multi-region setups allow you to deploy and manage CCX across multiple geographic regions. Each region operates independently with its own configuration, secrets, and resources while being managed through a unified interface.

## Configuration

### Secrets Management

Each region requires its own set of secrets. Ensure that all necessary secrets are properly configured for each region before deployment.

### Deployer Configuration

Configure each region in your `ccx.deployer.config` file. This file contains the deployment settings for all regions in your multi-region setup.

#### OpenStack Configuration

For OpenStack deployments, you must specify all regions in the `ccx.deployer.config.openstack_vendors` section:

```yaml
ccx:
  deployer:
    config:
      openstack_vendors:
        mycloud-region1:
          auth_url: https://region1.example.com:5000/v3
          username: admin
          password: your_password
          project_name: your_project
          # Additional region-specific configuration
        mycloud-region2:
          auth_url: https://region2.example.com:5000/v3
          username: admin
          password: your_password
          project_name: your_project
          # Additional region-specific configuration
```

**Important**: Each region requires its own complete configuration including:
- Database vendors
- Network configuration
- Storage settings
- Authentication credentials

### Cloud Groups Configuration

To organize your regions into logical groups, configure cloud groups in your `values.yaml` file:

```yaml
ccx:
  config:
    cloud_groups:
      - label: MYCLOUD
        logo: https://url/to/logo.png
        name: mycloud
```

This configuration creates a cloud group named "MYCLOUD" that will contain multiple regions.

### Cloud Configuration

Associate each region with the cloud group by setting the `ccx.config.clouds.group` parameter, which links to the `ccx.config.cloud_groups.name` parameter.

```yaml
ccx:
  config:
    clouds:
      - code: mycloud-region1
        group: mycloud
        # Region-specific configuration
      - code: mycloud-region2
        group: mycloud
        # Region-specific configuration
```

## User Interface

After configuration, the frontend will display a single cloud group "MYCLOUD" containing all associated regions:
- `mycloud-region1`
- `mycloud-region2`

Users can select the desired region from within the cloud group interface.

## Best Practices

1. **Naming Convention**: Use consistent naming patterns for regions (e.g., `mycloud-region1`, `mycloud-region2`)
2. **Configuration Management**: Keep region-specific configurations well-documented
3. **Testing**: Test each region configuration independently before deploying to production

## Troubleshooting

Common issues in multi-region setups:
- **Authentication Failures**: Verify that each region has correct authentication credentials.
- **Network Connectivity**: Ensure proper network configuration.
- **Resource Limits**: Check that each region has sufficient resources allocated.
- **Configuration Synchronization**: Verify that all regions have consistent configuration settings.

