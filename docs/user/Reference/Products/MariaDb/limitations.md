# Limitations of MariaDB

Every product has limitations. Here is a list MariaDB limitations:

## Permissions

The privilege system is not as flexible as in MySQL.

The 'ccxadmin' user has the following privileges:

### Global / all databases (_._):

- CREATE USER, REPLICATION SLAVE, REPLICATION SLAVE ADMIN, SLAVE MONITOR

### On databases created from CCX, the admin user can create new users and grant privileges:

- ALL PRIVILEGES WITH GRANT OPTION

This means that users can only create databases from the CCX UI. Once the database has been created from the CCX UI, then the ccxadmin user can create users and grant user privileges on the database using MariaDB CLI.
