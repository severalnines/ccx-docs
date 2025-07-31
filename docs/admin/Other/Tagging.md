# Tagging
Resources belonging to a datastore (instance, volume etc) are tagged with `ccx-cluster`, `cluster_id`, `user_id`.

```
ccx-cluster 56169751-8012-4ac3-87b3-748218d01238
cluster_id 56169751-8012-4ac3-87b3-748218d01238
user_id  03aab26c-572e-4c47-91d7-a727243dbee8
```

The tagging can be used to roll up billing data for instances/volumes created by a user. 

Users are stored in the `ccx.users` table in the CCX Postgres database.
