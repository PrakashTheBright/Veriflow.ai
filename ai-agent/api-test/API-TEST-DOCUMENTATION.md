# API Test Suite Documentation

## Overview

This API test suite provides comprehensive testing for the PrismTechnology SelectPrism platform's RESTful APIs. The tests cover the complete workflow from assessment creation to candidate assignment, with both sequential and standalone execution patterns.

## Project Structure

```
ai-agent/
├── api-test/                          # Main API test suite
│   ├── 1.CreateAssessmentAPI.spec.js  # Assessment creation endpoint
│   ├── 2.CreateCandidateAPI.spec.js   # Candidate creation endpoint
│   ├── 3.AddResumeToCandidate.spec.js # Resume upload endpoint
│   ├── 4.AttachCandidateToAssessment.spec.js # Application linking endpoint
│   ├── E2E-CompleteWorkflow.spec.js   # Complete workflow (✅ ACTIVE)
│   ├── authentication.spec.js         # Auth flow tests (commented)
│   ├── create-assessment.json         # Assessment test metadata
│   ├── create-candidate.json          # Candidate test metadata
│   ├── add-resume-to-candidate.json   # Resume test metadata
│   ├── attach-candidate-to-assessment.json # Application test metadata
│   ├── e2e-complete-workflow.json     # E2E workflow metadata
│   └── API-TEST-DOCUMENTATION.md      # This documentation
├── helpers/                           # Utility and helper modules
│   ├── apiHelpers.js                  # API utilities and Faker.js data generators
│   └── sharedState.js                 # Cross-test state management
├── credentials/                       # API credentials and config
├── Resume_Files/                      # Sample resume files for testing
├── reports/                           # Test execution reports
├── test-cases/                        # Test case management
└── veriflow-ui/                       # UI components for test management
```

---

## API Configuration

### Base Configuration
- **Base URL**: `https://api.pfuat.xyz` (configurable via `API_BASE_URL` environment variable)
- **Client ID**: `ptpfmtyzfg` (configurable via `API_CLIENT_ID` environment variable)
- **API Key**: `eae718ff-0a11-4baf-94cc-816dd0ee67ab` (configurable via `API_KEY` environment variable)
- **Authentication**: API Key-based (x-api-key and X-API-Key headers)

### API Endpoints

```javascript
const ENDPOINTS = {
  ASSESSMENT: `/v3/inbounds/clients/${CLIENT_ID}/types/job-assessments`,
  CANDIDATE: `/v3/inbounds/clients/${CLIENT_ID}/types/candidates`,
  RESUME: `/v3/inbounds/clients/${CLIENT_ID}/types/resumes`,
  APPLICATION: `/v3/inbounds/clients/${CLIENT_ID}/types/applications`,
  ATTACH_CANDIDATE: (assessmentId) => `/v3/inbounds/clients/${CLIENT_ID}/assessments/${assessmentId}/candidates`
};
```

### Environment Variables

You can override default configuration using environment variables:

```bash
export API_BASE_URL=https://api.pfuat.xyz
export API_CLIENT_ID=ptpfmtyzfg
export API_KEY=eae718ff-0a11-4baf-94cc-816dd0ee67ab
```

---

## Test Execution Workflow

### Sequential Test Pattern (Recommended)

The tests are designed to run in sequence, maintaining state between tests:

```
1. CreateAssessmentAPI
   ↓ (saves jobId to shared state)
2. CreateCandidateAPI
   ↓ (saves candidateId to shared state)
3. AddResumeToCandidate
   ↓ (uses candidateId from shared state)
4. AttachCandidateToAssessment
   ↓ (uses jobId + candidateId from shared state)
```

### Run Commands

```bash
# Run all API tests in sequence
npx playwright test ai-agent/api-test/

# Run individual test files (modular approach)
npx playwright test ai-agent/api-test/1.CreateAssessmentAPI.spec.js
npx playwright test ai-agent/api-test/2.CreateCandidateAPI.spec.js
npx playwright test ai-agent/api-test/3.AddResumeToCandidate.spec.js
npx playwright test ai-agent/api-test/4.AttachCandidateToAssessment.spec.js

# Run E2E complete workflow (alternative approach)
npx playwright test ai-agent/api-test/E2E-CompleteWorkflow.spec.js

# Run with debug mode
npx playwright test ai-agent/api-test/ --debug

# Run with headed browser (shows API requests in browser context)
npx playwright test ai-agent/api-test/ --headed

# Run with custom environment variables
API_BASE_URL=https://api.pfuat.xyz API_KEY=your-key npx playwright test ai-agent/api-test/
```

---

## Test File Details

### 1. CreateAssessmentAPI.spec.js

**Purpose**: Tests assessment/job creation endpoint

**Key Features**:
- Creates assessment with Faker.js generated random data
- Validates response status (200, 201, or 429)
- Saves `jobId` to shared state for subsequent tests
- Handles rate limiting gracefully

**Test Data Generated** (using Faker.js):
```javascript
{
  jobId: "JOB-1708088400000-123",
  jobTitle: "District Response Consultant",
  jobDescription: "Detailed lorem ipsum job description",
  requiredSkills: ["Marketing", "Full-time", "technology"],
  location: "San Francisco",
  experienceLevel: "Senior",
  employmentType: "Full-time",
  salaryRange: { min: 65000, max: 120000 },
  createdBy: "john.doe@example.com",
  department: "Technology",
  status: "Active",
  isActive: true,
  startDate: "2026-02-16T10:30:00.000Z",
  endDate: "2026-03-18T10:30:00.000Z",
  numberOfPositions: 3,
  priority: "High"
}
```

**ID Pattern**: `JOB-${timestamp}-${random}` (e.g., `JOB-1708088400000-456`)

**Expected Responses**:
- `201`: Assessment created successfully
- `200`: Assessment already exists
- `429`: Rate limited (continues with generated ID)

---

### 2. CreateCandidateAPI.spec.js

**Purpose**: Tests candidate creation endpoint

**Key Features**:
- Creates candidate with Faker.js generated unique email and personal data
- Validates response status (200, 201, or 429)
- Saves `candidateId` to shared state for subsequent tests

**Test Data Generated** (using Faker.js):
```javascript
{
  candidateId: "CAND-1708088400000-789",
  firstName: "John",
  lastName: "Smith",
  email: "john.smith42@gmail.com",
  phone: "+1-555-234-5678",
  location: "New York",
  skills: ["Technology", "Contract", "innovation"],
  experience: 8,
  education: "Master",
  currentRole: "Senior Quality Engineer",
  linkedinUrl: "https://example.com/linkedin",
  githubUrl: "https://example.com/github"
}
```

**ID Pattern**: `CAND-${timestamp}-${random}` (e.g., `CAND-1708088400000-234`)

**Email Generation**: Uses `faker.internet.email()` for realistic, unique email addresses

---

### 3. AddResumeToCandidate.spec.js

**Purpose**: Tests resume upload endpoint for candidates

**Key Features**:
- Retrieves `candidateId` from shared state
- Uploads base64-encoded PDF resume file
- Validates file attachment to candidate profile

**Dependencies**:
- Requires test 2 (CreateCandidateAPI) to run first
- Throws error if candidateId not found in shared state

**Test Data Generated**:
```javascript
{
  candidateId: "CAND-1708088400000-789 (from shared state)",
  fileName: "resume_CAND-1708088400000-789.pdf",
  base64EncodedFileContents: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIK...",
  uploadedAt: "2026-02-16T10:30:00.000Z"
}
```

**Resume Content**: Base64-encoded dummy PDF document (minimal valid PDF structure with "Resume" text)

---

### 4. AttachCandidateToAssessment.spec.js

**Purpose**: Tests candidate-to-assessment linking endpoint (application creation)

**Key Features**:
- Retrieves both `jobId` and `candidateId` from shared state
- Creates application linking candidate to assessment
- Validates successful association
- Provides final summary of complete workflow

**Dependencies**:
- Requires test 1 (CreateAssessmentAPI) for jobId
- Requires test 2 (CreateCandidateAPI) for candidateId
- Throws error if either ID is missing

**Test Data Generated**:
```javascript
{
  jobId: "JOB-1708088400000-456 (from shared state)",
  candidateId: "CAND-1708088400000-789 (from shared state)",
  applicationId: "770e8400-e29b-41d4-a716-446655440002" // Faker.js generated UUID
}
```

**Expected Response**: `201` or `429` only (no 200 for applications)

**Final Summary Output**:
```
=== Final Summary ===
JobID: JOB-1708088400000-456
CandidateID: CAND-1708088400000-789
ApplicationID: 770e8400-e29b-41d4-a716-446655440002
Status: All steps completed successfully
```

---

## Helper Modules

### apiHelpers.js

**Core Utilities Module** - Provides all API interaction utilities using Faker.js for data generation

#### Dependencies
```javascript
const { faker } = require('@faker-js/faker');
```

#### Constants
```javascript
BASE_URL = process.env.API_BASE_URL || 'https://api.pfuat.xyz'
API_CLIENT_ID = process.env.API_CLIENT_ID || 'ptpfmtyzfg'
API_KEY = process.env.API_KEY || 'eae718ff-0a11-4baf-94cc-816dd0ee67ab'
```

#### Key Functions

**`generateUUID()`**
- Returns: Faker.js generated UUID
- Usage: Generate unique IDs for all entities
- Implementation: `faker.string.uuid()`

**`delay(ms)`**
- Parameters: Milliseconds to wait
- Usage: Add delays between API calls to avoid rate limiting

**`createHeaders(apiKey)`**
- Parameters: Optional API key (defaults to configured key)
- Returns: HTTP headers object with Content-Type, x-api-key, and X-API-Key
- Note: Includes both lowercase and uppercase API key headers for compatibility

**`generateAssessment()`**
- Returns: Complete assessment payload with 15+ fields
- Uses Faker.js for realistic data generation
- Fields include:
  - `jobId`: `JOB-${timestamp}-${random}`
  - `jobTitle`: Generated using `faker.person.jobTitle()`
  - `jobDescription`: Generated using `faker.lorem.paragraph()`
  - `requiredSkills`: Array of 3 skills using `faker.person.jobArea()`, `faker.person.jobType()`, `faker.word.noun()`
  - `location`: Generated using `faker.location.city()`
  - `experienceLevel`: Random selection from `['Junior', 'Mid', 'Senior']`
  - `employmentType`: Random selection from `['Full-time', 'Part-time', 'Contract']`
  - `salaryRange`: Object with min (50k-80k) and max (80k-150k)
  - `createdBy`: Generated using `faker.internet.email()`
  - `department`: Generated using `faker.person.jobArea()`
  - `status`: Always `'Active'`
  - `isActive`: Always `true`
  - `startDate`: Current date ISO string
  - `endDate`: 30 days from now ISO string
  - `numberOfPositions`: Random 1-5
  - `priority`: Random selection from `['High', 'Medium', 'Low']`

**`generateCandidate()`**
- Returns: Complete candidate payload with 10+ fields
- Uses Faker.js for realistic data generation
- Fields include:
  - `candidateId`: `CAND-${timestamp}-${random}`
  - `firstName`: Generated using `faker.person.firstName()`
  - `lastName`: Generated using `faker.person.lastName()`
  - `email`: Generated using `faker.internet.email()`
  - `phone`: Generated using `faker.phone.number()`
  - `location`: Generated using `faker.location.city()`
  - `skills`: Array of 3 skills
  - `experience`: Random 0-15 years
  - `education`: Random selection from `['Bachelor', 'Master', 'PhD']`
  - `currentRole`: Generated using `faker.person.jobTitle()`
  - `linkedinUrl`: Generated using `faker.internet.url()`
  - `githubUrl`: Generated using `faker.internet.url()`

**`generateResumePayload(candidateId)`**
- Parameters: Candidate ID string
- Returns: Resume upload payload
- Fields:
  - `candidateId`: Passed candidate ID
  - `fileName`: Pattern `resume_${candidateId}.pdf`
  - `base64EncodedFileContents`: Base64-encoded dummy PDF document
  - `uploadedAt`: Current date ISO string
- Note: Generates a minimal valid PDF structure, not a text file

---

### sharedState.js

**Cross-Test State Management Module**

#### Purpose
Maintains state between sequential test executions, allowing tests to share IDs and data without hardcoding or manual intervention.

#### State Variables
```javascript
sharedState = {
  jobId: null,          // Assessment/Job ID (e.g., JOB-1708088400000-123)
  candidateId: null,    // Candidate ID (e.g., CAND-1708088400000-456)
  assessmentId: null,   // Assessment ID for tracking
  resumeId: null        // Resume ID for tracking
}
```

#### Functions

**`setJobId(jobId)`**
- Stores assessment/job ID for use in test 4
- Logs state change

**`getJobId()`**
- Retrieves stored assessment/job ID
- Logs retrieval attempt
- Returns null if not set

**`setCandidateId(candidateId)`**
- Stores candidate ID for use in tests 3 and 4
- Logs state change

**`getCandidateId()`**
- Retrieves stored candidate ID
- Logs retrieval attempt
- Returns null if not set

**`setAssessmentId(assessmentId)`**
- Stores assessment ID for additional tracking
- Logs state change

**`getAssessmentId()`**
- Retrieves stored assessment ID
- Logs retrieval attempt
- Returns null if not set

**`setResumeId(resumeId)`**
- Stores resume ID for tracking
- Logs state change

**`getResumeId()`**
- Retrieves stored resume ID
- Logs retrieval attempt
- Returns null if not set

**`resetSharedState()`**
- Clears all shared state variables
- Resets entire state object to initial values
- Useful for test cleanup or isolation
- Logs reset action

#### Usage Pattern
```javascript
// In test 1
const assessment = generateAssessment();
setJobId(assessment.jobId);

// In test 4
const jobId = getJobId();
if (!jobId) {
  throw new Error('JobID not found. Run test 1 first.');
}
```

---

## Response Handling

### Status Code Patterns

#### 200 - OK
- Resource already exists
- Request processed successfully
- Tests continue with generated ID

#### 201 - Created
- Resource created successfully
- Response body contains confirmation
- Tests capture response data and IDs

#### 429 - Rate Limited
- Too many requests to API
- Tests gracefully continue with generated ID
- Automatic delay added (500-1000ms)

### Response Validation Pattern

```javascript
const response = await apiContext.post(ENDPOINT, { ... });
const status = response.status();

expect([200, 201, 429]).toContain(status);

if (status === 201) {
  const responseBody = await response.json();
  // Process successful creation
} else if (status === 200 || status === 429) {
  // Continue with generated ID
}
```

---

## Rate Limiting Handling

### Built-in Protections

1. **Delays Between Requests**
   ```javascript
   await delay(500);  // 500ms after each test
   await delay(1000); // 1000ms before final application
   ```

2. **Graceful 429 Handling**
   - Tests accept 429 as valid response
   - Continue execution with generated IDs
   - Log rate limit warnings

3. **Sequential Execution**
   - Tests run one at a time by default
   - Prevents parallel request flooding

---

## Error Handling & Debugging

### Common Error Scenarios

#### Missing Shared State
```
Error: CandidateID not found in shared state. 
Please run test 2.CreateCandidateAPI first.
```
**Solution**: Run tests in sequential order (1 → 2 → 3 → 4)

#### API Rate Limiting
```
Response Status: 429
⚠ Rate limited, using generated JobID
```
**Solution**: Wait a few minutes and retry, or check rate limit quota

#### Invalid API Key
```
Response Status: 401 or 403
```
**Solution**: Verify API_KEY in apiHelpers.js is correct and active

### Debug Logging

All tests include extensive console logging:

```javascript
console.log('Creating assessment:', JSON.stringify(assessment, null, 2));
console.log('Response Status:', status);
console.log('Response Body:', JSON.stringify(responseBody, null, 2));
console.log('✓ Saved JobID to shared state:', jobId);
```

---

## Commented/Disabled Tests

### authentication.spec.js
**Status**: Fully commented out

**Original Purpose**: Test Next.js Server Action authentication flow

**Why Disabled**: 
- Complex Next.js Server Action ID extraction
- Requires dynamic HTML parsing
- API tests use API Key authentication instead

**Code Preserved For**: Future reference if authentication testing needed

---

### E2E-CompleteWorkflow.spec.js
**Status**: ✅ **ACTIVE AND FULLY FUNCTIONAL**

**Purpose**: Single test file that executes all 4 steps (Assessment → Candidate → Resume → Application) in one comprehensive test case

**When to Use**:
- **E2E Workflow Testing**: Run this file when you want to test the complete end-to-end flow in a single execution
- **Alternative to Modular Tests**: Instead of running tests 1-4 sequentially, run this single file
- **Quicker Setup**: All steps executed in one test context without relying on shared state between separate test files

**Key Features**:
- Self-contained workflow with all dependencies in one test
- Detailed console logging for each step
- Comprehensive error handling
- Final summary with all generated IDs
- Proper delays between API calls

**Run Command**:
```bash
npx playwright test ai-agent/api-test/E2E-CompleteWorkflow.spec.js
```

**Note**: This is a **parallel approach** to the modular tests (1-4). Use either:
- **Modular Approach**: Run tests 1 → 2 → 3 → 4 separately (better for debugging individual steps)
- **E2E Approach**: Run E2E-CompleteWorkflow.spec.js (better for complete flow validation)

---

## Best Practices

### When Writing New Tests

1. **Use Faker.js for Data Generation**
   ```javascript
   const { faker } = require('@faker-js/faker');
   const email = faker.internet.email();
   const name = faker.person.firstName();
   ```

2. **Leverage Helper Functions**
   ```javascript
   const assessment = generateAssessment();
   // All fields automatically populated with realistic data
   ```

3. **Handle All Expected Status Codes**
   ```javascript
   expect([200, 201, 429]).toContain(response.status());
   ```

4. **Add Delays to Avoid Rate Limiting**
   ```javascript
   await delay(500);
   ```

5. **Use Shared State for Sequential Tests**
   ```javascript
   const { getJobId, setJobId } = require('../helpers/sharedState');
   ```

6. **Log Important Data**
   ```javascript
   console.log('Request Payload:', JSON.stringify(payload, null, 2));
   ```

7. **Use Environment Variables for Configuration**
   ```javascript
   const BASE_URL = process.env.API_BASE_URL || 'https://api.pfuat.xyz';
   ```

### Test Isolation Considerations

- Tests 1 and 2 are **independent** (can run alone)
- Test 3 **depends on** test 2
- Test 4 **depends on** tests 1 and 2
- For complete workflow, run all tests in order OR use E2E-CompleteWorkflow.spec.js

### Data Uniqueness

- All IDs use timestamp-based patterns (e.g., `JOB-${Date.now()}-${random}`)
- Faker.js ensures realistic and varied data
- Email addresses are unique on each run
- No cleanup required - each run creates new entities

---

## Troubleshooting Guide

### Test Fails with "JobID not found"
1. Run test 1 first: `npx playwright test ai-agent/api-test/1.CreateAssessmentAPI.spec.js`
2. Then run test 4: `npx playwright test ai-agent/api-test/4.AttachCandidateToAssessment.spec.js`
3. Or run all tests in sequence: `npx playwright test ai-agent/api-test/`
4. Or use E2E workflow: `npx playwright test ai-agent/api-test/E2E-CompleteWorkflow.spec.js`

### Test Fails with "CandidateID not found"
1. Run test 2 first: `npx playwright test ai-agent/api-test/2.CreateCandidateAPI.spec.js`
2. Then run test 3 or 4
3. Or run all tests in sequence: `npx playwright test ai-agent/api-test/`
4. Or use E2E workflow: `npx playwright test ai-agent/api-test/E2E-CompleteWorkflow.spec.js`

### All Tests Return 429
- API rate limit exceeded
- Wait 5-10 minutes before retrying
- Check API quota with platform administrator
- Consider adding longer delays between tests

### Tests Pass but No Data Visible in UI
- API and UI may have separate databases (SIT vs UAT)
- Current configuration uses UAT environment (`api.pfuat.xyz`)
- Verify API base URL matches environment
- Check client ID matches your test environment
- Confirm API key has proper permissions

### Environment Variable Not Working
- Ensure environment variables are set before running tests
- On Windows PowerShell: `$env:API_KEY="your-key"; npx playwright test`
- On Linux/Mac: `export API_KEY=your-key && npx playwright test`
- Verify variable names match: `API_BASE_URL`, `API_CLIENT_ID`, `API_KEY`

---

## Integration with UI Tests

### Shared Resources

- **Resume files**: `ai-agent/Resume_Files/` directory contains sample resume documents
- **API Helpers**: `ai-agent/helpers/apiHelpers.js` provides reusable API utilities
- **State Management**: `ai-agent/helpers/sharedState.js` enables cross-test data sharing

### Complementary Test Suites

- **API Tests** (this suite): Backend service validation and data creation
- **UI Tests**: Frontend workflow validation and user interface testing
- **E2E Tests**: Complete end-to-end workflow validation across API and UI
- **Together**: Provide full-stack test coverage for the PrismTechnology SelectPrism platform

### Test Data Flow

1. **API Tests** create assessment and candidate records
2. **Shared State** maintains IDs across test files
3. **UI Tests** can reference API-created data for validation
4. **Resume Files** are uploaded via both API and UI test paths

---

## Future Enhancements

### Potential Additions

1. **Negative Testing**
   - Invalid API keys
   - Malformed payloads
   - Missing required fields
   - Invalid ID formats
   - Boundary value testing

2. **Bulk Operations**
   - Create multiple assessments in single request
   - Create multiple candidates in single request
   - Batch resume uploads
   - Performance testing with large payloads

3. **Data Validation**
   - Verify data persistence in database
   - Cross-check API vs UI data consistency
   - Validate data integrity after operations
   - Schema validation for responses

4. **Performance Testing**
   - Response time assertions (e.g., < 2 seconds)
   - Load testing with concurrent requests
   - Rate limit boundary testing
   - Stress testing with maximum payload sizes

5. **Authentication Testing**
   - Re-enable and update authentication.spec.js
   - Test token expiration scenarios
   - Test invalid credentials handling
   - Test authorization levels

6. **Advanced Faker.js Usage**
   - Localized data generation (multiple languages)
   - Industry-specific job titles and descriptions
   - Realistic skill combinations based on roles
   - Coordinated data generation (matching skills to job requirements)

7. **Test Data Management**
   - Implement test data cleanup utilities
   - Create reusable test data fixtures
   - Add data seeding capabilities
   - Implement test isolation strategies

8. **Reporting Enhancements**
   - Custom HTML reports with detailed API logs
   - Performance metrics tracking
   - API response time trends
   - Success rate dashboards

---

## Appendix: Sample Payloads

### Assessment Creation
```json
{
  "data": [{
    "jobId": "JOB-1708088400000-456",
    "jobTitle": "District Response Consultant",
    "jobDescription": "Comprehensive role requiring expertise in quality assurance and automation testing frameworks.",
    "requiredSkills": ["Technology", "Full-time", "innovation"],
    "location": "San Francisco",
    "experienceLevel": "Senior",
    "employmentType": "Full-time",
    "salaryRange": {
      "min": 65000,
      "max": 120000
    },
    "createdBy": "john.doe@example.com",
    "department": "Technology",
    "status": "Active",
    "isActive": true,
    "startDate": "2026-02-16T10:30:00.000Z",
    "endDate": "2026-03-18T10:30:00.000Z",
    "numberOfPositions": 3,
    "priority": "High"
  }]
}
```

### Candidate Creation
```json
{
  "data": [{
    "candidateId": "CAND-1708088400000-789",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith42@gmail.com",
    "phone": "+1-555-234-5678",
    "location": "New York",
    "skills": ["Technology", "Contract", "automation"],
    "experience": 8,
    "education": "Master",
    "currentRole": "Senior Quality Assurance Engineer",
    "linkedinUrl": "https://linkedin.example.com/in/johnsmith",
    "githubUrl": "https://github.example.com/johnsmith"
  }]
}
```

### Resume Upload
```json
{
  "data": [{
    "candidateId": "CAND-1708088400000-789",
    "fileName": "resume_CAND-1708088400000-789.pdf",
    "base64EncodedFileContents": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFJlc3VtZSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NiAwMDAwMCBuIAowMDAwMDAwMTQ1IDAwMDAwIG4gCjAwMDAwMDAyNTQgMDAwMDAgbiAKMDAwMDAwMDM0MyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQzNgolJUVPRg==",
    "uploadedAt": "2026-02-16T10:30:00.000Z"
  }]
}
```

**Note**: The base64 content above is a minimal valid PDF document structure.

### Application Creation
```json
{
  "data": [{
    "jobId": "JOB-1708088400000-456",
    "candidateId": "CAND-1708088400000-789",
    "applicationId": "770e8400-e29b-41d4-a716-446655440002"
  }]
}
```

---

## Contact & Support

For issues, questions, or contributions to the API test suite, please contact the QA automation team or refer to the main project documentation.

---

## Changelog

### Version 2.0 - February 16, 2026
- **Major Update**: Documentation completely revised to match current implementation
- Updated API configuration (BASE_URL: `api.pfuat.xyz`, CLIENT_ID: `ptpfmtyzfg`)
- Documented Faker.js library integration for data generation
- Corrected E2E-CompleteWorkflow.spec.js status to ACTIVE
- Added environment variable configuration support
- Updated all sample payloads to reflect actual Faker.js-generated data
- Documented additional shared state variables (assessmentId, resumeId)
- Corrected resume endpoint path and file format (PDF instead of TXT)
- Removed references to non-existent helper files
- Updated project structure to match actual folder organization
- Added comprehensive Faker.js function documentation

### Version 1.0 - February 2026
- Initial documentation release

---

**Last Updated**: February 16, 2026  
**Version**: 2.0  
**Maintained By**: QA Automation Team
