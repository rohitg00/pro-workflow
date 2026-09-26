#!/usr/bin/env node
const { readHookInput } = require('./lib/hook-input');

const ADVICE = {
  rate_limit: 'Rate limited, wait a moment and retry',
  overloaded: 'API overloaded, retry in a few seconds',
  server_error: 'Server error, retry in a few seconds',
  authentication_failed: 'Authentication failed, run /login',
  oauth_org_not_allowed: 'This organization is not allowed for OAuth, check /login',
  cloud_credential_error: 'Cloud provider credentials failed, refresh them and retry',
  billing_error: 'Billing problem, check your plan or credits',
  account_on_hold: 'Account on hold, check your account status',
  model_not_found: 'Model not found, pick another with /model',
  max_output_tokens: 'Hit the output token limit, ask for a smaller piece of work',
  invalid_request: 'Invalid request, try /compact or simplify the request',
};

readHookInput().then(input => {
  const error = input.error || 'unknown';
  console.error('[ProWorkflow] API error occurred: ' + error);
  if (input.error_details) {
    console.error('[ProWorkflow]   Details: ' + input.error_details);
  }
  console.error('[ProWorkflow]   ' + (ADVICE[error] || 'Consider retrying or simplifying the request'));
});
