const core = require('@actions/core');
const { context } = require('@actions/github');
const axios = require('axios');

const run = async () => {
    try {
        // Inputs
        const serverUrlInput = 'https://api.docketqa.com';
        const triggerEndpoint = '/test_group_run/trigger_ci_run/';

        const apiKey = core.getInput('apiKey', { required: true });
        const testParametersString = core.getInput('testParameters', { required: true });
        const repositoryFullName = core.getInput('repositoryFullName', { required: true });

        // Validate repository name format
        if (!repositoryFullName.includes('/')) {
            throw new Error('Invalid repository name format. Expected format: owner/repo');
        }

        let parsedTestParameters;
        try {
            parsedTestParameters = JSON.parse(testParametersString);
            // Validate test parameters structure
            if (typeof parsedTestParameters !== 'object' || parsedTestParameters === null) {
                throw new Error('Test parameters must be a valid JSON object');
            }
        } catch (error) {
            throw new Error(`Invalid testParameters JSON: ${error.message}`);
        }

        // Validate required GitHub context
        if (!process.env.GITHUB_SHA && !context.sha) {
            throw new Error('Missing commit SHA from both env and context');
        }
        if (!process.env.GITHUB_REF && !context.ref) {
            throw new Error('Missing ref from both env and context');
        }
        if (!process.env.GITHUB_RUN_ID) {
            throw new Error('Missing GITHUB_RUN_ID from env');
        }


        const payloadToServer = {
            ...parsedTestParameters,
            github_context: {
                repository: repositoryFullName || `${context?.repo?.owner}/${context?.repo?.repo}`,
                commit_sha: process.env.GITHUB_SHA || context.sha,
                run_id: process.env.GITHUB_RUN_ID,
                ref: process.env.GITHUB_REF || context.ref,
            }
        };

        core.info('Triggering Docket tests on server (expecting webhook for results)...');
        const timestamp = new Date().toISOString();
        let initialResponse;
        try {
            initialResponse = await axios.post(`${serverUrlInput}${triggerEndpoint}`, payloadToServer, {
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 45000,
                validateStatus: function (status) {
                    return status >= 200 && status < 300; // Only accept 2xx status codes
                }
            });

            // Validate response structure
            if (!initialResponse.data) {
                throw new Error('Empty response received from server');
            }

            if (!initialResponse.data.test_group_run) {
                throw new Error('Invalid response format: missing test_group_run object');
            }

            if (!initialResponse.data.test_group_run.id) {
                throw new Error('Invalid response format: missing test_group_run.id');
            }

            core.info(`Successfully triggered Docket tests. Server status: ${initialResponse.status}`);
        } catch (error) {
            let errorMessage;
            if (error.response) {
                // Server responded with error status
                errorMessage = `Server error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
                core.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
            } else if (error.request) {
                // Request was made but no response received
                errorMessage = `No response received from server: ${error.message}`;
            } else {
                // Error in request configuration
                errorMessage = `Request failed: ${error.message}`;
            }
            throw new Error(`Failed to trigger Docket tests: ${errorMessage}`);
        }

        const runId = initialResponse.data.test_group_run.id;
        core.setOutput('runId', runId);

        core.info(`Docket test run ID: ${runId} triggered at ${timestamp}. Waiting for webhook from server for completion status.`);
    } catch (error) {
        core.setFailed(error.message);
    }
};

run();