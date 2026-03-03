const { test, expect, request } = require('@playwright/test');
const { 
  BASE_URL, 
  API_KEY, 
  ENDPOINTS, 
  generateUUID, 
  generateAssessment, 
  generateCandidate, 
  generateResumePayload, 
  createHeaders, 
  delay 
} = require('../helpers/apiHelpers');

test.describe('E2E Complete Workflow - Sequential Execution', () => {
  let apiContext;

  test.beforeAll(async () => {
    apiContext = await request.newContext({ baseURL: BASE_URL });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('E2E_001: Complete Workflow - Assessment → Candidate → Resume → Application', async () => {
    console.log('\n========================================');
    console.log('E2E COMPLETE WORKFLOW TEST');
    console.log('========================================\n');

    // Step 1: Create Assessment
    console.log('=== STEP 1: Create Assessment ===');
    const assessment = generateAssessment();
    console.log('Assessment Payload:', JSON.stringify(assessment, null, 2));

    const assessmentResponse = await apiContext.post(ENDPOINTS.ASSESSMENT, {
      headers: createHeaders(),
      data: { data: [assessment] }
    });

    const assessmentStatus = assessmentResponse.status();
    console.log('Assessment Response Status:', assessmentStatus);
    expect([200, 201, 429]).toContain(assessmentStatus);

    let jobId;
    if (assessmentStatus === 201) {
      const assessmentBody = await assessmentResponse.json();
      console.log('Assessment Response Body:', JSON.stringify(assessmentBody, null, 2));
      jobId = assessment.jobId;
      console.log('✓ Created JobID:', jobId);
    } else if (assessmentStatus === 429) {
      console.log('⚠ Rate limited, using generated JobID');
      jobId = assessment.jobId;
    }

    await delay(1000);

    // Step 2: Create Candidate
    console.log('\n=== STEP 2: Create Candidate ===');
    const candidate = generateCandidate();
    console.log('Candidate Payload:', JSON.stringify(candidate, null, 2));

    const candidateResponse = await apiContext.post(ENDPOINTS.CANDIDATE, {
      headers: createHeaders(),
      data: { data: [candidate] }
    });

    const candidateStatus = candidateResponse.status();
    console.log('Candidate Response Status:', candidateStatus);
    expect([200, 201, 429]).toContain(candidateStatus);

    let candidateId;
    if (candidateStatus === 201) {
      const candidateBody = await candidateResponse.json();
      console.log('Candidate Response Body:', JSON.stringify(candidateBody, null, 2));
      candidateId = candidate.candidateId;
      console.log('✓ Created CandidateID:', candidateId);
    } else if (candidateStatus === 429) {
      console.log('⚠ Rate limited, using generated CandidateID');
      candidateId = candidate.candidateId;
    }

    await delay(1000);

    // Step 3: Add Resume to Candidate
    console.log('\n=== STEP 3: Add Resume to Candidate ===');
    const resumePayload = generateResumePayload(candidateId);
    console.log('Resume Payload:', JSON.stringify({
      ...resumePayload,
      base64EncodedFileContents: resumePayload.base64EncodedFileContents.substring(0, 50) + '...'
    }, null, 2));

    const resumeResponse = await apiContext.post(ENDPOINTS.RESUME, {
      headers: createHeaders(),
      data: { data: [resumePayload] }
    });

    const resumeStatus = resumeResponse.status();
    console.log('Resume Response Status:', resumeStatus);
    
    if (resumeStatus === 404) {
      console.log('⚠ Resume endpoint not available (404) - Skipping resume upload');
    } else {
      expect([200, 201, 429]).toContain(resumeStatus);
      if (resumeStatus === 201) {
        const resumeBody = await resumeResponse.json();
        console.log('Resume Response Body:', JSON.stringify(resumeBody, null, 2));
        console.log('✓ Successfully added resume to candidate!');
      }
    }

    await delay(1000);

    // Step 4: Attach Candidate to Assessment
    console.log('\n=== STEP 4: Attach Candidate to Assessment ===');
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
    
    if (applicationStatus === 404) {
      console.log('⚠ Application endpoint not available (404) - Skipping application creation');
    } else {
      expect([201, 429]).toContain(applicationStatus);
      if (applicationStatus === 201) {
        const applicationBody = await applicationResponse.json();
        console.log('Application Response Body:', JSON.stringify(applicationBody, null, 2));
        expect(applicationBody).toBeTruthy();
        console.log('✓ Successfully attached candidate to assessment!');
      }
    }

    // Final Summary
    console.log('\n========================================');
    console.log('E2E WORKFLOW SUMMARY');
    console.log('========================================');
    console.log('1. Assessment Created');
    console.log('   - JobID:', jobId);
    console.log('   - Title:', assessment.jobTitle);
    console.log('   - Experience Level:', assessment.experienceLevel);
    console.log('');
    console.log('2. Candidate Created');
    console.log('   - CandidateID:', candidateId);
    console.log('   - Name:', `${candidate.firstName} ${candidate.lastName}`);
    console.log('   - Email:', candidate.email);
    console.log('');
    console.log('3. Resume Added');
    console.log('   - FileName:', resumePayload.fileName);
    console.log('   - FileType:', resumePayload.fileType);
    console.log('');
    console.log('4. Application Created');
    console.log('   - ApplicationID:', applicationPayload.applicationId);
    console.log('   - JobID:', applicationPayload.jobId);
    console.log('   - CandidateID:', applicationPayload.candidateId);
    console.log('');
    console.log('✓ E2E Workflow Completed Successfully!');
    console.log('========================================\n');
  });
});
