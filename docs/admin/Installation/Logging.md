# Logging Setup

This page describes how to setup logging configs.
Here's an overview of the steps to configure Fluent Bit logging using Helm in helm-ccx charts.

## Edit values.yaml:

Open the values.yaml file within your Helm chart directory or open the overriden values.yaml file (helm-ccx/values.yaml). This file contains the default values that can be overridden when you install the chart.

Configure Fluent Bit settings by adding or modifying entries in this file. For example, you might configure input plugins (like tailing logs from files), output plugins (like sending logs to Elasticsearch or a different backend), and filters.

You need to update `.Values.fluentbit.enabled` to `true`

## Create Fluent Bit Configuration in `.Values.fluentbit.config`:

### Example Fluent Bit Configuration to send logs to Loki output plugin :

```yaml
fluentbit:
  enabled: true
  config: |
    [SERVICE]
        Flush                     5
        Log_Level                 info
        Daemon                    off
        Parsers_File              parsers.conf
        HTTP_Server               On
        HTTP_Listen               0.0.0.0
        HTTP_Port                 2020
        storage.path              /var/fluent-bit/state/flb-storage/
        storage.sync              normal
        storage.checksum          off
        storage.backlog.mem_limit 5M

    [INPUT]
        Name                tail
        Tag                 ccx.mysql
        Path                /var/log/mysql/mysqld.log
        DB                  /var/fluent-bit/state/flb_mysql.db
        Mem_Buf_Limit       5MB
        Skip_Long_Lines     On
        Refresh_Interval    10
        Read_from_Head      false

    [INPUT]
        Name                tail
        Tag                 ccx.pg
        Path                /var/log/postgresql/postgresql-11-main.log, /var/log/postgresql/postgresql-14-main.log, /var/log/postgresql/postgresql-15-main.log
        DB                  /var/fluent-bit/state/flb_pg.db
        Mem_Buf_Limit       5MB
        Skip_Long_Lines     On
        Refresh_Interval    10
        Read_from_Head      false

    [INPUT]
        Name                tail
        Tag                 ccx.redis
        Path                /var/log/redis/redis-server.log, /var/log/redis/redis-sentinel.log
        DB                  /var/fluent-bit/state/flb_redis.db
        Mem_Buf_Limit       5MB
        Skip_Long_Lines     On
        Refresh_Interval    10
        Read_from_Head      false

    [INPUT]
        Name                tail
        Tag                 ccx.mssql
        Path                /var/opt/mssql/log/errorlog
        DB                  /var/fluent-bit/state/flb_redis.db
        Mem_Buf_Limit       5MB
        Skip_Long_Lines     On
        Refresh_Interval    10
        Read_from_Head      false

    [FILTER]
        Name record_modifier
        Match *
        Record hostname ${HOSTNAME}
        Record datastoreid ${CLUSTER_UUID}

    [OUTPUT]
        Name        loki
        Match       *
        Host        loki.s9s-dev.net
        port        443
        tenant_id   1
        labels      job="fluent-bit"
        tls         on
        tls.verify  off
        auto_kubernetes_labels on
```

:::note
Don't change the input plugin path `[INPUT].Path` and filter record `[FILTER]`.
:::

Input plugins, filters are prepared with the desired settings and are recommended default configuration that should be ready to use without any modifications. If you still need to customize it, you can do that but don't change the `[INPUT].Path` and filter record `[FILTER]`.

:::note
Modifications are needed only on 'output plugins'.
:::
The following configurations are in files/fluent-bit.conf automatically generated if `.Values.fluentbit.enabled` to `true` and `.Values.fluentbit.config` is not defined.

This configuration mounts the fluent-bit.conf configuration file from the ConfigMap into the /etc/fluent-bit/ directory in the host.

### Example Fluent Bit Configuration to send logs to Elasticsearch output plugin:

```yaml
fluentbit:
  enabled: true
  config: |
    [SERVICE]
        Flush                     5
        Log_Level                 info
        Daemon                    off
        Parsers_File              parsers.conf
        HTTP_Server               On
        HTTP_Listen               0.0.0.0
        HTTP_Port                 2020
        storage.path              /var/fluent-bit/state/flb-storage/
        storage.sync              normal
        storage.checksum          off
        storage.backlog.mem_limit 5M

    [INPUT]
        Name                tail
        Tag                 ccx.mysql
        Path                /var/log/mysql/mysqld.log
        DB                  /var/fluent-bit/state/flb_mysql.db
        Mem_Buf_Limit       5MB
        Skip_Long_Lines     On
        Refresh_Interval    10
        Read_from_Head      false

    [INPUT]
        Name                tail
        Tag                 ccx.pg
        Path                /var/log/postgresql/postgresql-11-main.log, /var/log/postgresql/postgresql-14-main.log, /var/log/postgresql/postgresql-15-main.log
        DB                  /var/fluent-bit/state/flb_pg.db
        Mem_Buf_Limit       5MB
        Skip_Long_Lines     On
        Refresh_Interval    10
        Read_from_Head      false

    [INPUT]
        Name                tail
        Tag                 ccx.redis
        Path                /var/log/redis/redis-server.log, /var/log/redis/redis-sentinel.log
        DB                  /var/fluent-bit/state/flb_redis.db
        Mem_Buf_Limit       5MB
        Skip_Long_Lines     On
        Refresh_Interval    10
        Read_from_Head      false

    [FILTER]
        Name record_modifier
        Match *
        Record hostname ${HOSTNAME}
        Record datastoreid ${CLUSTER_UUID}

    [OUTPUT]
        Name          es
        Match         *
        Host          elasticsearch.s9s-dev.net
        Port          9200
        Index         fluent-bit
        Type          _doc
        Logstash_Format On
```

Once configured. Proceed with helm Installation of CCX

```
helm install ccx ccx/ccx --wait --debug --values YOUR-values.yaml
```
