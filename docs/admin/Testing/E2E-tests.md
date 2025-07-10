# End-to-End (E2E) Tests Documentation

This documentation explains how to execute E2E tests using Docker.

### Prerequisites

- Docker installed on your machine
- Access to the necessary environment variables and credentials

### How to Execute E2E Tests

You can run the E2E tests with the following Docker command:

```bash
docker run -p 8080:8080 -it --rm \
-e BASE_URL="https://yourULR.net" \
-e CC_URL="https://cc.yourULR.net" \
-e LOGIN="e2e@severalnines.com" \
-e PASSWORD="xxx" \
-e IP_ADDRESS="<IP_ADDRESS_FOR_FIREWALL_RULE>/32" \
-e CC_USER="cmon-user" \
-e CC_PASSWORD="xxx" \
europe-docker.pkg.dev/severalnines-public/ccx/playwright-e2e-tests:#CCX_VERSION# /bin/bash \
-c "npm run test:ui:#YOUR_CLOUD_NAME# || true && 
npm run test -- --grep '(?=.*\[#YOUR_CLOUD_NAME#\].*)(?=.*)' --grep-invert '@long-running|galera' --workers 4 || true &&
npm run report:generate &&
npm run report:open -- --port 8080"
```

### Environment Variables

| Variable   | Description                                                                                                      |
|------------|------------------------------------------------------------------------------------------------------------------|
| BASE_URL   | Base URL of CCX                                                                                                  |
| LOGIN      | CCX user login                                                                                                   |
| PASSWORD   | CCX user password                                                                                                |
| IP_ADDRESS | IP address with mask for firewall rules, so tests can connect to the database and execute queries                |
| CC_URL     | (Optional) When provided, if tests fail, it will grab the job logs of the failed cluster and attach them to the report |
| CC_USER    | (Optional) CC user login                                                                                         |
| CC_PASSWORD| (Optional) CC user password                                                                                      |

### Commands Overview

- `npm run test:ui:#YOUR_CLOUD_NAME#`: Runs all UI tests for `#YOUR_CLOUD_NAME#` (e.g. `aws`).
- `npm run test -- --grep '(?=.*\[#YOUR_CLOUD_NAME#\].*)(?=.*)' --grep-invert '@long-running|galera' --workers 4`: Runs all API tests excluding Galera's node configuration. The `--workers 4` flag sets the number of datastore tests to run in parallel (you can adjust this value based on your environment capacity).
- `npm run report:generate`: Generates a test report.
- `npm run report:open -- --port 8080`: Opens the report on port 8080. You can change the port to a different value if needed.

### Notes

- The `IP_ADDRESS` variable must include the firewall rule IP with the mask (e.g. `/32`).
- Adjust the number of workers using the `--workers` flag to optimize for your environment.
- Reports will be generated and hosted on the specified port.
- Replace #YOUR_CLOUD_NAME# with the name of CSP you want to run tests on (e.g. `aws`)
- Replace #CCX_VERSION# with version of CCX that you are running tests against (e.g. `1.47.0`)

Feel free to modify this setup to better suit your testing environment and preferences.
