const path = require('path');

// Load .env but do NOT override existing environment variables (dotenv default behavior)
// This allows server-passed environment variables to take precedence
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { faker } = require('@faker-js/faker');

// Base URL from environment - required
const BASE_URL = process.env.API_BASE_URL;
if (!BASE_URL) {
  console.warn('Warning: API_BASE_URL not configured in .env - using environment-specific URLs');
}

// API Key from environment - required for API tests
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn('Warning: API_KEY not configured in .env - API tests may fail');
}

// API Client ID from environment - required for API tests
const API_CLIENT_ID = process.env.API_CLIENT_ID;
if (!API_CLIENT_ID) {
  console.warn('Warning: API_CLIENT_ID not configured in .env - API tests may fail');
}

// API Endpoints
const ENDPOINTS = {
  ASSESSMENT: `/v3/inbounds/clients/${API_CLIENT_ID}/types/job-assessments`,
  CANDIDATE: `/v3/inbounds/clients/${API_CLIENT_ID}/types/candidates`,
  RESUME: `/v3/inbounds/clients/${API_CLIENT_ID}/types/resumes`,
  APPLICATION: `/v3/inbounds/clients/${API_CLIENT_ID}/types/applications`,
  ATTACH_CANDIDATE: (assessmentId) => `/v3/inbounds/clients/${API_CLIENT_ID}/assessments/${assessmentId}/candidates`,
};

// Helper to create headers with API key
const createHeaders = (apiKey = API_KEY) => ({
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'X-API-Key': apiKey,
});

// Generate a unique UUID
const generateUUID = () => {
  return faker.string.uuid();
};

// Generate assessment data
const generateAssessment = () => {
  const jobId = `JOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  return {
    jobId: jobId,
    title: faker.person.jobTitle(),
    role: faker.person.jobArea(),
    description: faker.lorem.paragraph(),
    location: {},
    employmentType: faker.helpers.arrayElement(['Full-time', 'Part-time', 'Contract'])
  };
};

// Generate candidate data
const generateCandidate = () => {
  const candidateId = `CAND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return {
    candidateId: candidateId,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    currentRole: faker.person.jobTitle()
  };
};

// Generate resume payload
const generateResumePayload = (candidateId) => {
  // Simple dummy PDF content in base64 (minimal valid PDF structure)
  const dummyPdfBase64 = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFJlc3VtZSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NiAwMDAwMCBuIAowMDAwMDAwMTQ1IDAwMDAwIG4gCjAwMDAwMDAyNTQgMDAwMDAgbiAKMDAwMDAwMDM0MyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQzNgolJUVPRg==';
  
  return {
    candidateId: candidateId,
    fileName: `resume_${candidateId}.pdf`,
    fileType: 'application/pdf',
    base64EncodedFileContents: dummyPdfBase64,
    uploadedAt: new Date().toISOString()
  };
};

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  BASE_URL,
  API_KEY,
  API_CLIENT_ID,
  ENDPOINTS,
  createHeaders,
  generateUUID,
  generateAssessment,
  generateCandidate,
  generateResumePayload,
  delay
};
