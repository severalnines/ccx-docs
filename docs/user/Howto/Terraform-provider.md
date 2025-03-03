# Terraform provider 
The CCX Terraform provider allows to create datastores on all supported clouds.
The CCX Terraform provider project is hosted on [github](https://github.com/severalnines/terraform-provider-ccx).
## Oauth2 credentials
Oauth2 credentials are used to authenticate the CCX Terraform provider with CCX.
You can generate these credentials on the Account page Authorization tab.
![Create creds](../images/createcreds.png)
And then you will see:
![Created creds](../images/createdcreds.png)

## Terraform provider

### Requirement
- Terraform 0.13.x or later

### Quick Start

1. Create Oauth2 credentials.
2. Create a `terraform.tf` 
3. Set `client_id`, `client_secret`, below is a terraform.tf file:

```terraform
terraform {
  required_providers {
    ccx = {
      source  = "severalnines/ccx"
      version = "~> 0.3.1"
    }
  }
}

provider "ccx" {
    client_id = `client_id`
    client_secret = `client_secret`
}

Now, you can create a datastore using the following terraform code.
Here is an example of a parameter group:

``` terraform
resource "ccx_parameter_group" "asteroid" {
    name = "asteroid"
    database_vendor = "mariadb"
    database_version = "10.11"
    database_type = "galera"

    parameters = {
      table_open_cache = 8000
      sql_mode = "STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION"
    }
}
```
This group can then be associated with a datastore as follows:
``` terraform
resource "ccx_datastore" "luna_mysql" {
	name           = "luna_mysql"
	size           = 3
	type           = "replication"
	db_vendor      = "mysql"
	tags           = ["new", "test"]
	cloud_provider = "aws"
	cloud_region   = "eu-north-1"
	instance_size  = "m5.large"
	volume_size    = 80
	volume_type    = "gp2"
	parameter_group = ccx_parameter_group.asteroid.id
}
```

For more information visit the [terraform-provider-ccx](https://github.com/severalnines/terraform-provider-ccx) github page.