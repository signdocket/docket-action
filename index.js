const core = require('@actions/core');
const axios = require('axios');

const run = async () => {
    const serverUrl = 'https://api-final-8734-ccd74d9a-vw05i32o.onporter.run/test_group_run/';

    // Inputs
    const apiKey = core.getInput('apiKey', { required: true });
    const params = core.getInput('params') || '{}';
    const polling = parseInt(core.getInput('pollingInterval') || '10', 10) * 1000;
    const timeout = parseInt(core.getInput('timeout') || '1800', 10) * 1000;

    let parsedParams, initialResponse;

    try {
        parsedParams = JSON.parse(params);
    } catch (error) {
        core.setFailed(`Invalid params: ${error.message}`);
        return;
    }

    core.info('Running Docket tests...');
    try {
        initialResponse = await axios.post(`${serverUrl}/trigger_ci_run`, parsedParams, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        core.setFailed(`Failed to run Docket tests: ${error.message}`);
        return;
    }

    // Get the run ID and status
    const runId = initialResponse.data.test_group_run.id;
    let runStatus = initialResponse.data.test_group_run.status;

    // If the run failed, set the output and return
    if (!runId || runStatus !== 'running') {
        core.setFailed(`Failed to run Docket tests: ${initialResponse.data.message}`);
        core.setOutput('results', JSON.stringify(initialResponse.data.test_group_run || {}));
        return;
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const statusResponse = await axios.get(`${serverUrl}/test_group_run/ci/${runId}`, {
                headers: {
                    'X-API-KEY': apiKey,
                },
            });

            runStatus = statusResponse.data.status;

            if (runStatus === 'passed') {
                core.info('Docket tests passed');
                core.setOutput('results', JSON.stringify(statusResponse.data));
                return;
            } else if (runStatus === 'failed') {
                core.setFailed(`Docket tests failed: ${statusResponse.data.message || 'No error message provided'}`);
                core.setOutput('results', JSON.stringify(statusResponse.data));
                return;
            }

            await new Promise(resolve => setTimeout(resolve, polling));
        } catch (error) {
            core.setFailed(`Error polling Docket tests: ${error.message}`);
            if (initialResponse && initialResponse.data && initialResponse.data.test_group_run) {
                core.setOutput('results', JSON.stringify(initialResponse.data.test_group_run));
            } else {
                core.setOutput('results', JSON.stringify({ error: error.message, runId }));
            }
            return;
        }
    }

    core.setFailed('Docket tests timed out');
    if (initialResponse && initialResponse.data && initialResponse.data.test_group_run) {
        core.setOutput('results', JSON.stringify(initialResponse.data.test_group_run));
    } else {
        core.setOutput('results', JSON.stringify({ error: 'Timeout', runId }));
    }
}

run();