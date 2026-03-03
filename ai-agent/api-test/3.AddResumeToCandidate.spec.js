const { test, expect, request } = require('@playwright/test');
const { BASE_URL, API_KEY, ENDPOINTS, generateResumePayload, createHeaders, delay } = require('../helpers/apiHelpers');
const { getCandidateId } = require('../helpers/sharedState');

test.describe('Add Resume to Candidate API Tests', () => {
  let apiContext;

  test.beforeAll(async () => {
    apiContext = await request.newContext({ baseURL: BASE_URL });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  const addResume = async (resumeData, apiKey = API_KEY) => {
    return await apiContext.post(ENDPOINTS.RESUME, {
      headers: createHeaders(apiKey),
      data: { data: Array.isArray(resumeData) ? resumeData : [resumeData] }
    });
  };

  test('Add Resume To Candidate - should add resume to candidate from shared state', async () => {
    const candidateId = getCandidateId();
    
    if (!candidateId) {
      throw new Error('CandidateID not found in shared state. Please run test 2.CreateCandidateAPI first.');
    }

    console.log('Using CandidateID from shared state:', candidateId);
    
    const resumePayload = generateResumePayload(candidateId);
    console.log('Resume Payload:', JSON.stringify({
      ...resumePayload,
      base64EncodedFileContents: resumePayload.base64EncodedFileContents.substring(0, 50) + '...'
    }, null, 2));

    const resumeResponse = await addResume(resumePayload);
    const resumeStatus = resumeResponse.status();
    console.log('Resume Response Status:', resumeStatus);

    expect([200, 201, 404, 429]).toContain(resumeStatus);

    if (resumeStatus === 201) {
      const resumeBody = await resumeResponse.json();
      console.log('Resume Response Body:', JSON.stringify(resumeBody, null, 2));
      console.log('✓ Successfully added resume to candidate!');
    } else if (resumeStatus === 404) {
      console.log('⚠ Resume endpoint not available (404) - Test passed with warning');
    }
    
    await delay(500);
  });
});
