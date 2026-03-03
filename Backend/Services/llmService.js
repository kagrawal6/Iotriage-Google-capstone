/**
 * llmService.js
 * --------------
 * Handles interaction with an LLM 
 * Used to convert technical CVE data into plain English explanations
 * and generate mitigation advice for users.
 */

/**
 * Converts a CVE into a plain-English summary.
 * @param {Object} cveData - Vulnerability data
 * @returns {string}
 */
exports.summarizeCVE = async (cveData) => {
  return `Plain English explanation of ${cveData.cveId}`;
};

/**
 * Generates mitigation steps for a list of vulnerabilities.
 * @param {Array<Object>} vulnerabilities
 * @returns {Array<Object>} Mitigation instructions
 */
exports.createMitigationSteps = async (vulnerabilities) => {
  return vulnerabilities.map(v => ({
    cveId: v.cveId,
    mitigation: "Update the affected software and apply patches."
  }));
};