const fs = require('fs');
const path = require('path');

// Path to the shared state file
const STATE_FILE = path.join(__dirname, '..', '.shared-state.json');

// Get current environment key from API_BASE_URL
const getEnvironmentKey = () => {
  const baseUrl = process.env.API_BASE_URL || 'default';
  // Extract domain name as key (e.g., "api.prismforce.com" -> "production", "api.pfsit.xyz" -> "sit")
  if (baseUrl.includes('prismforce.com')) return 'production';
  if (baseUrl.includes('pfsit')) return 'sit';
  if (baseUrl.includes('pfuat')) return 'uat';
  return 'default';
};

// Initialize state file if it doesn't exist
const initStateFile = () => {
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      environments: {}
    }, null, 2));
  }
};

// Read state from file
const readState = () => {
  try {
    initStateFile();
    const data = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(data);
    
    // Migrate old format to new environment-aware format
    if (!parsed.environments) {
      const migrated = {
        environments: {
          default: {
            jobId: parsed.jobId || null,
            candidateId: parsed.candidateId || null,
            assessmentId: parsed.assessmentId || null,
            resumeId: parsed.resumeId || null
          }
        }
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(migrated, null, 2));
      return migrated;
    }
    return parsed;
  } catch (error) {
    console.error('Error reading shared state:', error);
    return { environments: {} };
  }
};

// Get environment-specific state
const getEnvState = () => {
  const state = readState();
  const envKey = getEnvironmentKey();
  if (!state.environments[envKey]) {
    state.environments[envKey] = {
      jobId: null,
      candidateId: null,
      assessmentId: null,
      resumeId: null
    };
  }
  console.log(`SharedState: Using environment '${envKey}'`);
  return state.environments[envKey];
};

// Write state to file
const writeState = (state) => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error writing shared state:', error);
  }
};

// Update environment-specific state
const updateEnvState = (updates) => {
  const state = readState();
  const envKey = getEnvironmentKey();
  if (!state.environments[envKey]) {
    state.environments[envKey] = {
      jobId: null,
      candidateId: null,
      assessmentId: null,
      resumeId: null
    };
  }
  Object.assign(state.environments[envKey], updates);
  writeState(state);
};

const setJobId = (id) => {
  updateEnvState({ jobId: id });
  console.log('SharedState: JobID set to', id);
};

const getJobId = () => {
  const envState = getEnvState();
  console.log('SharedState: Getting JobID', envState.jobId);
  return envState.jobId;
};

const setCandidateId = (id) => {
  updateEnvState({ candidateId: id });
  console.log('SharedState: CandidateID set to', id);
};

const getCandidateId = () => {
  const envState = getEnvState();
  console.log('SharedState: Getting CandidateID', envState.candidateId);
  return envState.candidateId;
};

const setAssessmentId = (id) => {
  updateEnvState({ assessmentId: id });
  console.log('SharedState: AssessmentID set to', id);
};

const getAssessmentId = () => {
  const envState = getEnvState();
  console.log('SharedState: Getting AssessmentID', envState.assessmentId);
  return envState.assessmentId;
};

const setResumeId = (id) => {
  updateEnvState({ resumeId: id });
  console.log('SharedState: ResumeID set to', id);
};

const getResumeId = () => {
  const envState = getEnvState();
  console.log('SharedState: Getting ResumeID', envState.resumeId);
  return envState.resumeId;
};

const resetSharedState = () => {
  const state = readState();
  const envKey = getEnvironmentKey();
  state.environments[envKey] = {
    jobId: null,
    candidateId: null,
    assessmentId: null,
    resumeId: null
  };
  writeState(state);
  console.log(`SharedState: Reset for environment '${envKey}'`);
};

module.exports = {
  setJobId,
  getJobId,
  setCandidateId,
  getCandidateId,
  setAssessmentId,
  getAssessmentId,
  setResumeId,
  getResumeId,
  resetSharedState
};
