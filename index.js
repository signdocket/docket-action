const core = require('@actions/core');
const axios = require('axios');

const run = async () => {
    try {
        // Inputs
        const serverUrlInput = 'https://api.docketqa.com';
        const triggerEndpoint = '/test_group_run/trigger_ci_run';

        const apiKey = core.getInput('apiKey', { required: true });
        const testParametersString = core.getInput('testParameters', { required: true });
        const repositoryFullName = core.getInput('repositoryFullName', { required: true });

        let parsedTestParameters;
        try {
            parsedTestParameters = JSON.parse(testParametersString);
        } catch (error) {
            throw new Error(`Invalid testParameters JSON: ${error.message}`);
        }

        const payloadToServer = {
            ...parsedTestParameters,
            github_context: {
                repository: repositoryFullName,
                commit_sha: process.env.GITHUB_SHA,
                run_id: process.env.GITHUB_RUN_ID,
                ref: process.env.GITHUB_REF,
            }
        };

        core.info('Triggering Docket tests on server (expecting webhook for results)...');

        let initialResponse;
        try {
            initialResponse = await axios.post(`${serverUrlInput}${triggerEndpoint}`, payloadToServer, {
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 45000,
            });
            core.info(`Successfully triggered Docket tests. Server status: ${initialResponse.status}`);
        } catch (error) {
            const errorMessage = error.response 
                ? `Server responded with status: ${error.response.status}. Response data: ${JSON.stringify(error.response.data)}`
                : error.message;
            throw new Error(`Failed to trigger Docket tests: ${errorMessage}`);
        }

        if (!initialResponse.data?.test_group_run?.id) {
            throw new Error('Server did not return the expected runId in the response.');
        }

        const runId = initialResponse.data.test_group_run.id;
        core.setOutput('runId', runId);
        core.info(`Docket test run ID: ${runId}. Waiting for webhook from server for completion status.`);
    } catch (error) {
        core.setFailed(error.message);
    }
};

run();