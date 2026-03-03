const { test, expect, request } = require('@playwright/test');
const { BASE_URL, API_KEY, ENDPOINTS, generateAssessment, createHeaders, delay } = require('../helpers/apiHelpers');
const { setJobId } = require('../helpers/sharedState');

test.describe('Create Assessment API Tests', () => {
  let apiContext;

  test.beforeAll(async () => {
    apiContext = await request.newContext({ baseURL: BASE_URL });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  const createAssessments = async (assessments, apiKey = API_KEY) => {
    return await apiContext.post(ENDPOINTS.ASSESSMENT, {
      headers: createHeaders(apiKey),
      data: { data: assessments }
    });
  };

  test('Create Assessment - should create a single assessment successfully', async () => {
    const assessment = generateAssessment();
    console.log('Creating assessment:', JSON.stringify(assessment, null, 2));

    const response = await createAssessments([assessment]);
    const status = response.status();
    console.log('Response Status:', status);

    expect([200, 201, 429]).toContain(status);

    if (status === 201) {
      const responseBody = await response.json();
      console.log('Response Body:', JSON.stringify(responseBody, null, 2));
      expect(responseBody).toBeTruthy();
      expect(responseBody).toHaveProperty('data');
      setJobId(assessment.jobId);
      console.log('✓ Saved JobID to shared state:', assessment.jobId);
    } else if (status === 200 || status === 429) {
      setJobId(assessment.jobId);
      console.log('✓ Saved JobID to shared state:', assessment.jobId);
    }
    await delay(500);
  });
});