const { faker } = require('@faker-js/faker');

// Base URL from environment - required
const BASE_URL = process.env.API_BASE_URL;
if (!BASE_URL) {
  console.warn('Warning: API_BASE_URL not configured in environment - API tests may fail');
}

// API Key from environment - required
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn('Warning: API_KEY not configured in environment - API tests may fail');
}

// API Endpoints
const ENDPOINTS = {
  ASSESSMENT: '/api/v1/assessments',
  CANDIDATE: '/api/v1/candidates',
  RESUME: '/api/v1/resume',
  ATTACH_CANDIDATE: (assessmentId) => `/api/v1/assessments/${assessmentId}/candidates`,
};

// Helper to create headers with API key
const createHeaders = (apiKey = API_KEY) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
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
    jobTitle: faker.person.jobTitle(),
    jobDescription: faker.lorem.paragraph(),
    requiredSkills: [
      faker.person.jobArea(),
      faker.person.jobType(),
      faker.word.noun()
    ],
    location: faker.location.city(),
    experienceLevel: faker.helpers.arrayElement(['Junior', 'Mid', 'Senior']),
    employmentType: faker.helpers.arrayElement(['Full-time', 'Part-time', 'Contract']),
    salaryRange: {
      min: faker.number.int({ min: 50000, max: 80000 }),
      max: faker.number.int({ min: 80000, max: 150000 })
    },
    createdBy: faker.internet.email(),
    department: faker.person.jobArea()
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
    phone: faker.phone.number(),
    location: faker.location.city(),
    skills: [
      faker.person.jobArea(),
      faker.person.jobType(),
      faker.word.noun()
    ],
    experience: faker.number.int({ min: 0, max: 15 }),
    education: faker.helpers.arrayElement(['Bachelor', 'Master', 'PhD']),
    currentRole: faker.person.jobTitle(),
    linkedinUrl: faker.internet.url(),
    githubUrl: faker.internet.url()
  };
};

// Generate resume payload
const generateResumePayload = (candidateId) => {
  return {
    candidateId: candidateId,
    resumeUrl: faker.internet.url(),
    fileName: `resume_${candidateId}.pdf`,
    uploadedAt: new Date().toISOString()
  };
};

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  BASE_URL,
  API_KEY,
  ENDPOINTS,
  createHeaders,
  generateUUID,
  generateAssessment,
  generateCandidate,
  generateResumePayload,
  delay
};
