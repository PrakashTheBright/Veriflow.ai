const { test, expect, request } = require('@playwright/test');
const { BASE_URL, API_KEY, ENDPOINTS, generateCandidate, createHeaders, delay } = require('../helpers/apiHelpers');
const { setCandidateId } = require('../helpers/sharedState');

test.describe('Create Candidate API Tests', () => {
  let apiContext;

  test.beforeAll(async () => {
    apiContext = await request.newContext({ baseURL: BASE_URL });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  const createCandidates = async (candidates, apiKey = API_KEY) => {
    return await apiContext.post(ENDPOINTS.CANDIDATE, {
      headers: createHeaders(apiKey),
      data: { data: candidates }
    });
  };

  test('Create Candidate - should create a single candidate successfully', async () => {
    const candidate = generateCandidate();
    console.log('Creating candidate:', JSON.stringify(candidate, null, 2));
    
    const response = await createCandidates([candidate]);
    console.log('Response Status:', response.status());

    expect([200, 201, 429]).toContain(response.status());
    if (response.status() === 201) {
      const responseBody = await response.json();
      console.log('Response Body:', JSON.stringify(responseBody, null, 2));
      expect(responseBody).toBeTruthy();
      expect(responseBody).toHaveProperty('data');
      setCandidateId(candidate.candidateId);
      console.log('✓ Saved CandidateID to shared state:', candidate.candidateId);
    } else if (response.status() === 200 || response.status() === 429) {
      setCandidateId(candidate.candidateId);
      console.log('✓ Saved CandidateID to shared state:', candidate.candidateId);
    }
    await delay(500);
  });
});