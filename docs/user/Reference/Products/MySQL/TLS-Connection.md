# TLS User Authentication

## SSL Modes

CCX currently supports connections to MySQL in two SSL modes:

1. `REQUIRED`: This mode requires an SSL connection. If a client attempts to connect without SSL, the server rejects the connection.

2. `VERIFY_CA`: This mode requires an SSL connection and the server must verify the client's certificate against the CA certificates that it has.

### CA Certificate

The Certificate Authority (CA) certificate required for `VERIFY_CA` mode can be downloaded from your datastore on CCX using an API call or through the user interface on page `https://{your_ccx_domain}/projects/default/data-stores/{datastore_id}/settings`.
This certificate is used for the `VERIFY_CA` SSL mode.


### Example Commands

Here are example commands for connecting to the MySQL server using the two supported SSL modes:

1. `REQUIRED` mode:

```bash
mysql --ssl-mode=REQUIRED -u username -p -h hostname
```

2. `VERIFY_CA` mode:
```bash
mysql --ssl-mode=VERIFY_CA --ssl-ca=ca.pem -u username -p -h hostname
```

## require_secure_transport
This is a MySQL setting that governs if connections to the datastore are required to use SSL. You can change this setting in CCX in Settings -> DB Parameters

| Scenario                                   | Server Parameter Settings                                   | Description                                                                                                                                                                                                                          |
|--------------------------------------------|------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Disable SSL enforcement**                | `require_secure_transport = OFF`                           | This is the default to support legacy applications. If your legacy application doesn't support encrypted connections, you can disable enforcement of encrypted connections by setting `require_secure_transport=OFF`. However, connections are encrypted unless SSL is disabled on the client. See examples |
| **Enforce SSL**   | `require_secure_transport = ON`  | This is the recommended configuratuion.                                                                                              |
                                                                               |
### Examples

#### ssl-mode=DISABLED and require_secure_transport=OFF

```
mysql -uccxadmin -p -h...  -P3306 ccxdb --ssl-mode=disabled
...
mysql> \s
--------------
...
Connection id:		52
Current database:	ccxdb
Current user:		ccxadmin@...
*SSL:			Not in use*
Current pager:		stdout
...
```

#### ssl-mode=PREFERRED and require_secure_transport=OFF
```
mysql -uccxadmin -p -h...  -P3306 ccxdb --ssl-mode=preferred
...
mysql> \s
--------------
...
Connection id:		52
Current database:	ccxdb
Current user:		ccxadmin@...
SSL:			Cipher in use is TLS_AES_256_GCM_SHA384
Current pager:		stdout
...
```

#### ssl-mode=DISABLED and require_secure_transport=ON
```
mysql -uccxadmin -p -h...  -P3306 ccxdb --ssl-mode=disabled
mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 3159 (08004): Connections using insecure transport are prohibited while --require_secure_transport=ON.
```

#### ssl-mode=PREFERRED|REQUIRED and require_secure_transport=ON
```
mysql -uccxadmin -p -h...  -P3306 ccxdb --ssl-mode=preferred|required
mysql> \s
--------------
...
Connection id:		52
Current database:	ccxdb
Current user:		ccxadmin@...
SSL:			Cipher in use is TLS_AES_256_GCM_SHA384
Current pager:		stdout
...
```
## tls_version

The tls_version is set to the following by default:

| Variable_name | Value           |
|---------------|-----------------|
| tls_version   | TLSv1.2,TLSv1.3 |
