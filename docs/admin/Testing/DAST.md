## DAST for CCX

With the OWASP ZAP scanner, we can perform DAST testing of web threats, and test the security vulnerabilities of our applications.

To demonstrate how we can automate security vulnerability testing with the OWASP Zed Attack Proxy, We can make use of GitHub Actions.

In GitHub actions, OWASP ZAP provides a baseline scan feature which helps to find common security faults in a web application without doing any active attacks. You can also include contexts to create a full scan.
The ZAP baseline action scans a target URL for vulnerabilities and and it produces report.

```yaml
name: ZAP-VULNERABILITY-SCAN
on:
  workflow_dispatch:
    inputs:
      target:
        description: "target URL to scan"
        required: true
        default: "https://your-website.com"
jobs:
  zap_vulnerability_scan:
    runs-on: ubuntu-latest
    steps:
      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.9.0
        with:
          target: "${{ github.event.inputs.target }}"
```

Things to make a note of:

- name: This name appears on any badges, and in the UI. A good title helps to understand what it is.
- The "target" should be the website where you want to perform a vulnerability assessment.

Next, we head over to "Actions," and click `ZAP-VULNERABILITY-SCAN` in github actions.
After clicking build, it produces report.

###### Download the Artifacts (Reports)

The OWASP ZAP scan produces a "zap_scan" zip file, containing all security assessment reports. Click it to download and see the report.

### Automate the scan report uploads and notification:

You can also make use of automating the scan report and uploading to cloud storage and notifying users via medium slack for the scan result.
Below is an example for GCP cloud provider.

```yaml
name: ZAP-VULNERABILITY-SCAN
on:
  workflow_dispatch:
    inputs:
      target:
        description: "target URL to scan"
        required: true
        default: "https://your-website.com"
jobs:
  zap_vulnerability_scan:
    runs-on: ubuntu-latest
    name: Scan the webapplication
    steps:
      - name: OWASP ZAP Scan
        uses: zaproxy/action-baseline@v0.9.0
        with:
          target: "${{ github.event.inputs.target }}"

      - id: "auth"
        uses: "google-github-actions/auth@v1"
        with:
          service_account: <your-service-account-email-in-gcp>

      - uses: "google-github-actions/upload-cloud-storage@v1"
        with:
          path: "report_html.html"
          destination: "<your-storage-bucket-name>/${{ github.run_id }}"
      - name: Get Authenticated URL
        run: |
          gcloud auth activate-service-account --key-file=${{ steps.auth.outputs.credentials_file_path }}
          SIGNED_URL=$(gsutil signurl -d 12h -r <region> -u -m GET gs://<your-storage-bucket-name>/${{ github.run_id }}/report_html.html | awk '{print $5}')
          echo "Authenticated URL: ${SIGNED_URL}"

      - name: Send alerts to Slack
        id: slack
        uses: slackapi/slack-github-action@v1.24.0
        env:
          SLACK_WEBHOOK_URL: ${{secrets.SLACK_WEBHOOK_URL}}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
        with:
          payload: |
            {
              "text": "GitHub Action for Zap vulnerability scan result: ${{ job.status }}\n",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "GitHub Action for Zap vulnerability scan result: ${{ job.status }}\nReport URL: https://storage.cloud.google.com/<your-storage-bucket-name>/${{ github.run_id }}/report_html.html\nFor more details, follow the link:\n ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
```

:::note
you need to replace the `<>` placeholder values with your values.
:::
