# E2E Tests
This page describes how to run the cypress e2e tests.

CCX comes with a number of e2e tests that can be used to test and verify a CCX installation.
These tests are recommended to be executed following an upgrade:

production/ccx-production-jobs

Please be sure to edit ccx-e2e.secret.yaml (production/ccx-production-jobs/ccx-e2e.secret.yaml) prior to running test.

To run tests, simply execute 
```
kubectl create -f ccx-e2e-test.job.yaml
```

*Note*
These tests will take a while, could be several hours.
