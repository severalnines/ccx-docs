# TLS/SSL in CCX

CCX uses Transport Layer Security (TLS) and Secure Sockets Layer (SSL) to secure the communication between the MySQL server and clients. Here's how the process works:

## Certificate Generation

1. **CA Certificate Generation**: CCX creates a self-signed Certificate Authority (CA) certificate. This certificate is stored in Kubernetes secrets.

2. **Server Key and Certificate Generation**: CCX generates a server key and a server certificate for each datastore node. The server certificate is signed with the CA certificate. These are stored on each datastore node and MySQL is configured to use them.

3. **API for CA Certificate**: CCX provides an API to download the CA certificate. This allows clients to trust the server certificate that was signed by the CA certificate.

4. **UI for CA Certificate**: In addition to the API, CCX also provides a user interface to download the CA certificate. This can be found in the datastore settings tab.

## MySQL Specifications

SSL is required for all users. The following SSL modes are supported:

- `REQUIRED`: This mode requires an SSL connection. If a client attempts to connect without SSL, the server rejects the connection.

- `VERIFY_CA`: This mode requires an SSL connection and the server must verify the client's certificate against the CA certificates that it has.

Unsecured connections can only be established for users that use the `mysql_native_password` authentication method. This is because this method sends the password as a hash, which provides some level of security.

Please note that CCX will not start if the CA certificate is not found in the Kubernetes secrets. This is to ensure that all connections are secured with SSL.
