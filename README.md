# Docket QA Trigger Action

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Docket%20QA%20Trigger-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=github)](https://github.com/marketplace/actions/docket-action) This GitHub Action triggers a new Docket QA test run. It's designed to be used in your CI/CD pipelines, typically when a new release is created.

After triggering the test run, this action outputs a `runId` from the Docket server. The Docket server will then perform the QA tests asynchronously and report the status back to your GitHub repository using a `repository_dispatch` event, which should be handled by a separate listener workflow (e.g., to update commit statuses).

## Prerequisites

* A Docket account and an API key for authentication with the Docket API.
* The Docket GitHub App should be installed on the repository where this action will run.

## Inputs

| Name                  | Description                                                                                                                               | Required | Default                               |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :------- | :------------------------------------ |
| `apiKey` | The API key for authenticating with your Docket service. Store this as a GitHub secret (`DOCKET_API_KEY`).                                                   | `true`   |                                       |
| `repositoryFullName`  | The full name of the repository being tested (e.g., `owner/repo`). This is usually `${{ github.repository }}`.                               | `true`   |                                       |
| `testParameters`      | A JSON string containing parameters for the QA test run. This typically includes `commitSha` and `releaseTag` or other contextual info. | `false`  | `{}`                                  |

## Outputs

| Name    | Description                                                     |
| :------ | :-------------------------------------------------------------- |
| `runId` | The ID of the test run initiated on the Docket server, if provided by the server. |

## Secrets

* **`DOCKET_API_KEY`** (Required): The API key for your Docket service. This should be configured as a secret in the GitHub repository where this action is used. Example:
    ```yaml
    with:
      docketServiceApiKey: ${{ secrets.DOCKET_API_KEY }}
    ```

## Example Usage

This example shows how to use the Docket QA Trigger Action when a new GitHub Release is published. It sends the commit SHA and release tag as part of `testParameters`.
TBD