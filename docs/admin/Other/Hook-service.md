# CCX Hook Service

A service for third party hooks. DEPRECATED

## Spec

`pre-` hooks are called before the request is accepted. If the request involves creating resources, the hook can reject the request.

`pre-` hooks receive the session ID of the requesting user.

`pre-` hook response can include a `workID` which will be included in the corresponding `post-` hook.

`post-` hooks are informative, saying that the work is complete, either successfully or otherwise. There is not curarently a guarantee that `post-` hooks will be delivered.

The definitive source for each call is `<./ccx-hook-service.proto>`, the following is an approximate idea of how the service communicates with integrator, but it is variable.

### pre-create-cluster

Request:

```json
{
  // cluster details
  "cluster_id": "",
  "cluster_name": "",
  "datastore_type": "",
  "cloud": "",
  "node_count": "",
  "instance_type": "",
  // user details
  "auth_id": ""
}
```

Response:

```json
{
  // whether to proceed
  "approved": true,
  // correlation
  "work_id": "",
  // user details
  "user_id": "",
  "project_id": "",
  "organisation_id": ""
}
```

### post-create-cluster

Request:

```json
{
  // cluster details
  "cluster_id": "",
  "cluster_name": "",
  "datastore_type": "",
  "cloud": "",
  "node_count": "",
  "instance_type": "",
  // cluster state
  "cluster_status": "ok",
  "node_ids": [""],
  // correlation
  "work_id": ""
}
```

Response:

```json
{}
```

### pre-add-node

Request:

```json
{
  // cluster details
  "cluster_id": "",
  "cloud": "",
  "node_count": "",
  "instance_type": "",
  // user details
  "auth_id": ""
}
```

Response:

```json
{
  // whether to proceed
  "approved": true,
  // correlation
  "work_id": ""
}
```

### post-add-node

Request:

```json
{
  // cluster details
  "cluster_id": "",
  "cloud": "",
  "node_count": "",
  "instance_type": "",
  // cluster state
  "node_ids": [""],
  // correlation
  "work_id": ""
}
```

Response:

```json
{}
```

### pre-remove-node

Request:

```json
{
  // cluster details
  "cluster_id": "",
  "node_id": "",
  // user details
  "auth_id": ""
}
```

Response:

```json
{
  // correlation
  "work_id": ""
}
```

### post-remove-node

Request:

```json
{
  // cluster details
  "cluster_id": "",
  "node_id": "",
  // correlation
  "work_id": ""
}
```

Response:

```json
{}
```

### pre-delete-cluster

Request:

```json
{
  // cluster details
  "cluster_id": "",
  // user details
  "auth_id": ""
}
```

Response:

```json
{
  // correlation
  "work_id": ""
}
```

### post-delete-cluster

Request:

```json
{
  // cluster details
  "cluster_id": "",
  "status": "",
  // correlation
  "work_id": ""
}
```

Response:

```json
{}
```

## Running

Run the service normally:

`ccx-hook-service` or `ccx-hook-service serve`

Run a service locally, hooking to a local HTTP server:

`ccx-hook-service local-server myserver`

Run the HTTP server which it will call:

`ccx-hook-service mock-hooks`

This will print the incoming hooks, and respond with 200 status.

Trigger a hook (the json is mapped to the protobuf types, not the public things):

`ccx-hook-service test-client add_node '{"clusterId":"1","cloud":"c1","nodeCount":1,"instanceType":"i1","authId":"a1"}'`
