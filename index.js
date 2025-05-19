const core = require('@actions/core');
const axios = require('axios');

const run = async () => {
    try {
        // Inputs
        const serverUrlInput = 'https://api-final-8734-ccd74d9a-vw05i32o.onporter.run';
        const triggerEndpoint = '/test_group_run/trigger_ci_run/';

        const apiKey = core.getInput('apiKey', { required: true });
        const testParametersString = core.getInput('testParameters') || '{}';
        const repositoryFullName = core.getInput('repositoryFullName', { required: true });

        let parsedTestParameters;
        try {
            parsedTestParameters = JSON.parse(testParametersString);
        } catch (error) {
            core.setFailed(`Invalid testParameters JSON: ${error.message}`);
            return;
        }

        const payloadToServer = {
            ...parsedTestParameters,
            github_repository: repositoryFullName
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
            core.setFailed(`Failed to trigger Docket tests: ${error.message}`);
            if (error.response) {
                core.error(`Server responded with status: ${error.response.status}`);
                core.error(`Server response data: ${JSON.stringify(error.response.data)}`);
            }
            return;
        }

        if (initialResponse.data?.test_group_run?.id) {
            const runId = initialResponse.data.test_group_run.id;
            core.setOutput('runId', runId);
            core.info(`Docket test run ID: ${runId}. Waiting for webhook from server for completion status.`);
        } else {
            core.setFailed('Server did not return the expected runId in the response.');
        }
    } catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
};

run();