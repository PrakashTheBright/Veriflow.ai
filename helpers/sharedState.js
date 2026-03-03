// Shared state to pass data between test files
let sharedState = {
  jobId: null,
  candidateId: null,
  assessmentId: null,
  resumeId: null
};

const setJobId = (id) => {
  sharedState.jobId = id;
  console.log('SharedState: JobID set to', id);
};

const getJobId = () => {
  console.log('SharedState: Getting JobID', sharedState.jobId);
  return sharedState.jobId;
};

const setCandidateId = (id) => {
  sharedState.candidateId = id;
  console.log('SharedState: CandidateID set to', id);
};

const getCandidateId = () => {
  console.log('SharedState: Getting CandidateID', sharedState.candidateId);
  return sharedState.candidateId;
};

const setAssessmentId = (id) => {
  sharedState.assessmentId = id;
  console.log('SharedState: AssessmentID set to', id);
};

const getAssessmentId = () => {
  console.log('SharedState: Getting AssessmentID', sharedState.assessmentId);
  return sharedState.assessmentId;
};

const setResumeId = (id) => {
  sharedState.resumeId = id;
  console.log('SharedState: ResumeID set to', id);
};

const getResumeId = () => {
  console.log('SharedState: Getting ResumeID', sharedState.resumeId);
  return sharedState.resumeId;
};

const resetSharedState = () => {
  sharedState = {
    jobId: null,
    candidateId: null,
    assessmentId: null,
    resumeId: null
  };
  console.log('SharedState: Reset');
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
