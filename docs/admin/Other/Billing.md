## Overview
This documentation outlines the functionality and usage of the billing report API that generates a JSON or CSV formatted report detailing all cluster usage within a specified date range. This report includes data from active and deleted clusters and is accessible only to admin users from the admin panel.

Also see [Tagging](docs/admin/Other/Tagging.md).

## Environment Variables

## API Endpoint

The endpoint is `https://ccx.example.com/api/admin/datastores/billing/{type}`

### Method: GET

Parameters:

- `start`: Start date of the period (YYYY-MM-DD)
- `end`: End date of the period (YYYY-MM-DD)

**Example Request:**

```
curl -X GET "https://ccx.example.com/api/admin/datastores/billing/{type}?start=2024-04-05&end=2024-04-05" -H "Authorization: Bearer {access_token}"
```

Response Format:
```
{
  "datastores": [
    {
      "datastore": "string",
      "deleted_at": "string",
      "customer_id": "string",
      "type": "string",
      "nodes_count": 0,
      "vendor": "string",
      "instances_types_usage": [
        {
          "instances_type": "string",
          "hours": 0
        }
      ],
      "volumes_types_usage": [
        {
          "volume_type": "string",
          "average_gib": 0,
          "gib_per_hours": 0
        }
      ]
    }
  ],
  "network_egress_usage_gib": 0,
  "from": "string",
  "to": "string"
}
```

##  Actions Impacting Billing
This section describes various user or system actions that influence the billing calculations in the cluster management system. Understanding these actions is crucial for admins to predict changes in billing due to operational modifications.

### Basic accounting of usage:

Only account for usage where a database node is STARTED and online for 15 minutes.


### Creating a New Cluster
Details: The system begins to track compute and volume usage from the moment of creation.

### Delete an existing Cluster
Details: When a datastore is removed, the removed_at timestamp is updated, stopping further billing from the time of removal. Usage up to the point of removal is calculated and included in the report.

### Adding a Node to an Existing Cluster
Details: A new record for the datastore is created with an updated number of nodes. Each added node is recorded with its creation time, and its resources are included in the cluster's overall usage calculation. 

### Removing an Existing Node from the Cluster
Details: A new record for the datastore is created with an updated number of nodes. When a node is removed, further billing is stopped from the time of removal. Usage up to the point of removal is calculated and included in the report.

### Removing an Node  Upgrade 


### Removing an Node (automatic) repair


### Scaling Node Volume
Details: Volume scaling leads to the creation of a new volume size entry. The change in storage allocation is tracked from the exact timestamp of the modification.

### Changing Datastore Volume Type. (Removing an Existing Node from the Cluster) 
Details: A change in volume type initiates a new volume_types entry for the respective node. The system accounts for any difference in storage type from the time of change, adjusting the billing accordingly

Each of these actions triggers specific changes within the datastore that are directly reflected in the billing calculations. The API effectively aggregates and computes the financial impact of these operational activities, ensuring that each action's financial implications are transparent and well-documented in the billing report.

