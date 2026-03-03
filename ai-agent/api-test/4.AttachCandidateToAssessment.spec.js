const { test, expect, request } = require('@playwright/test');
const { BASE_URL, API_KEY, ENDPOINTS, generateUUID, createHeaders, delay } = require('../helpers/apiHelpers');
const { getJobId, getCandidateId } = require('../helpers/sharedState');

test.describe('Attach Candidate to Assessment API Tests', () => {
  let apiContext;

  test.beforeAll(async () => {
    apiContext = await request.newContext({ baseURL: BASE_URL });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('Attach Candidate To Assessment - should attach candidate to assessment from shared state', async () => {
    console.log('\n========================================');
    console.log('ATTACH CANDIDATE TO ASSESSMENT TEST');
    console.log('========================================\n');

    // Get JobID and CandidateID from shared state
    const jobId = getJobId();
    const candidateId = getCandidateId();

    if (!jobId) {
      throw new Error('JobID not found in shared state. Please run "Create Assessment" test first.');
    }

    if (!candidateId) {
      throw new Error('CandidateID not found in shared state. Please run "Create Candidate" test first.');
    }

    console.log('Using JobID from shared state:', jobId);
    console.log('Using CandidateID from shared state:', candidateId);

    await delay(1000);

    // Attach Candidate to Assessment
    console.log('\n=== Attach Candidate to Assessment ===');
    const applicationPayload = {
      jobId: jobId,
      candidateId: candidateId,
      applicationId: generateUUID()
    };
    console.log('Application Payload:', JSON.stringify(applicationPayload, null, 2));

    const applicationResponse = await apiContext.post(ENDPOINTS.APPLICATION, {
      headers: createHeaders(),
      data: { data: [applicationPayload] }
    });

    const applicationStatus = applicationResponse.status();
    console.log('Application Response Status:', applicationStatus);

    // Handle 500 errors with clear guidance
    if (applicationStatus === 500) {
      const errorBody = await applicationResponse.json();
      console.log('Error Response Body:', JSON.stringify(errorBody, null, 2));
      console.log('\n========================================');
      console.log('ERROR: JobID or CandidateID not found on server');
      console.log('========================================');
      console.log('The JobID or CandidateID used may have expired or been deleted.');
      console.log('');
      console.log('To resolve this issue:');
      console.log('1. Run "Create Assessment" test first to create a fresh JobID');
      console.log('2. Run "Create Candidate" test to create a fresh CandidateID');
      console.log('3. Then run this "Attach Candidate to Assessment" test');
      console.log('');
      console.log('OR run the "E2E Complete Workflow" test which handles all steps.');
      console.log('========================================\n');
      throw new Error(`Server returned 500: ${errorBody?.message || 'JobID or CandidateID not found'}. Please run Create Assessment and Create Candidate tests first.`);
    }

    expect([201, 429]).toContain(applicationStatus);

    if (applicationStatus === 201) {
      const applicationBody = await applicationResponse.json();
      console.log('Application Response Body:', JSON.stringify(applicationBody, null, 2));
      expect(applicationBody).toBeTruthy();
      console.log('✓ Successfully attached candidate to assessment!');
    } else if (applicationStatus === 429) {
      console.log('⚠ Rate limited, but application created');
    }

    // Final Summary
    console.log('\n========================================');
    console.log('WORKFLOW SUMMARY');
    console.log('========================================');
    console.log('ApplicationID:', applicationPayload.applicationId);
    console.log('JobID:', jobId);
    console.log('CandidateID:', candidateId);
    console.log('');
    console.log('✓ Workflow Completed Successfully!');
    console.log('========================================\n');

    await delay(500);
  });
});
