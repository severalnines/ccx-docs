# API
CCX has an API that can be used to access its features.

This includes:
- Provisioning stores: Create, delete, add, remove, repair and scaling.
- Store information: Get a store and its nodes and its active jobs.
- Firewall rules: List, add and remove CIDR rules that can access the store.
- Database configuration: List and set database configuration parameters.
- User accounts: Create, delete and list CCX authenticated users and their privileges.
- Content: Obtain content that can be displayed in the UI, e.g. available store deployment options.
- Backups: List available backups, configure backup schedule and settings and restore from a backup.
- Statistics: Get statistics about the store, e.g. connections, queries and overall database growth.
- System: Get overall system status
- Security: Download CA certificate.
- User and Database Management: Create, delete and list databases and user accounts on a database store.
- VPCs: Manage VPCs and peerings.
- Authentication: Authentication and user account management

The full API documentation is documented in a Swagger file that can be accessed at `https://<hostname>/api/swagger/index.html`.

## Authentication

There are two ways to authenticate with the API:

1. Using a username and password
2. Using a token

### Using a username and password

A cookie is returned when authenticating via username and password. The cookie must be sent with each request to the API.

The cookie has `HttpOnly` and `Secure` attributes which makes it ideal for usage in a browser, where the user is actively using the UI.

The request is as follows:

```http
POST /api/auth/login
Host: <hostname>
Content-Type: application/json

{
    "login": "john.doe@severalnines.com",
    "password": "..."
}
```

**Response Headers:**
```
Set-Cookie: ccx-session=xxx; Path=/; Domain=xxx; Max-Age=31536000; HttpOnly; Secure
```

**Response Body:**
```json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "description": "The unique identifier of the user."
        },
        "login": {
            "type": "string",
            "description": "The login username of the user."
        },
        "firstName": {
            "type": "string",
            "description": "The first name of the user."
        },
        "lastName": {
            "type": "string",
            "description": "The last name of the user."
        },
        "termsAccepted": {
            "type": "object",
            "properties": {
                "TermsAndConditionsV1": {
                    "type": "boolean",
                    "description": "Indicates whether the user has accepted the terms and conditions."
                },
                "PrivacyPolicyV1": {
                    "type": "boolean",
                    "description": "Indicates whether the user has accepted the privacy policy."
                }
            },
            "description": "The terms and conditions and privacy policy acceptance status of the user."
        },
        "origin": {
            "type": "string",
            "description": "The origin of the user."
        },
        "createdAt": {
            "type": "object",
            "properties": {
                "seconds": {
                    "type": "integer",
                    "description": "The number of seconds since the epoch."
                },
                "nanos": {
                    "type": "integer",
                    "description": "The number of nanoseconds."
                }
            },
            "description": "The creation timestamp of the user."
        },
        "updatedAt": {
            "type": "object",
            "properties": {
                "seconds": {
                    "type": "integer",
                    "description": "The number of seconds since the epoch."
                },
                "nanos": {
                    "type": "integer",
                    "description": "The number of nanoseconds."
                }
            },
            "description": "The last update timestamp of the user."
        },
        "additionalFields": {
            "type": "object",
            "description": "Additional fields for the user."
        }
    }
}
```

### Token

A bearer token can be used to authenticate with the API.

A `client_id` and `client_secret` pair can be generated by users in the **Account > Authorization** section of the UI. 
An expiry date must be set on creation. The token can be revoked at any time.

Tokens are useful for automation and can be used in scripts where the user does not want to store their password.

The request is as follows:

```http
POST {{endpoint}}/api/auth/oauth2/token
Host: <hostname>
Content-Type: application/x-www-form-urlencoded

client_id={{client_id}}&client_secret={{client_secret}}&grant_type=client_credentials
```

**Response Body:**
```json
{
    "access_token": "xxx",
    "token_type": "Bearer",
    "refresh_token": "xxx",
    "expires_in": 3600
}
```

Once a token is obtained, it can be used to authenticate with the API, for example:

```http
GET /api/auth/check
Authorization: Bearer {{token}}
``` 