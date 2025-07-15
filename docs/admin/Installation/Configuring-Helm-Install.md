# Configuring Helm

Configuring OpenStack, available services, availability zones or other Helm values is done in
`$ENV-ccx-override-values.yaml`

## Common Configs

- `ccFQDN` - The domain name for the CCX installation
- `ccx`
  - `affiliation` - name of CCX owner
  - `env` - various environment variables to tweak CCX
    - `DISABLE_USER_MANAGEMENT` - set to `"true"` to disable standard user registration API endpoints, useful when
      using [JWT authentication flow](../Customisation/JWT.md).
    - `LOG_LEVEL` - possible values: `debug`, `info`, `warn`, `error`, `dpanic`, `panic`, `fatal`; default: `info`.
    - `DISABLE_ROLLBACK` - setting it to `"true"` will prevent automatic deletion of cloud resources (VMs, volumes and
      such) on failure. Useful for debugging. Remember to remove it when debugging is done.
  - `config`
    - `clouds` - cloud config per provider
      - `code` - cloud provider identifier
      - `name` - cloud provider name
        - `instance_types` - array of instances available
          - `code` - instance name
          - `cpu` - cores available per instance
          - `disk_size` - disk size (GB)
          - `ram` - RAM available (GB)
          - `name` - instance name
          - `type` - instance type
      - `network_types`-
        - `code` - network type identifier
        - `in_vpc` - if network is within a VPC
        - `info` - comment on network type
        - `name` - name of network type
      - `regions` - array of regions available
        - `availability_zones` -
          - `code` - AZ identifier
          - `name` - AZ name
        - `city` - city name
        - `code` - region identifier
        - `continent_code` - continent code
        - `country_code` - country code
        - `display_code` - user facing code
        - `name` - name of region
      - `volume_types` - array of volumes available
        - `code` - volume type code
        - `has_iops`
        - `info` - comment on volume type
        - `name` - name of volume type
        - `size`
          - `default` - default size of volume type
          - `max` - max size of volume type
          - `min` - min size of volume type
        - `verified_level`
    - `databases` - array of supported databases
      - `beta` - If the service is beta or not
      - `code`- database identifier
      - `enabled` - available to deploy (or not)
      - `info` - comment on database
      - `name` - database nane
      - `num_nodes` - array of nodes allowed
      - `ports` - array of opened ports
      - `types` - array of deployments supported
      - `versions` - array of supported versions
