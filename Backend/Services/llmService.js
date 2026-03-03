/**
 * llmService.js
 * -------------
 * Handles interaction with the Large Language Model (LLM).
 * Generates mitigation advice for vulnerabilities.
 */

const axios = require("axios");

/**
 * Receives a list of vulnerabilities and returns mitigation steps.
 * @param {Array<Object>} vulnerabilities
 * @returns {Promise<Array<Object>>} List of mitigations mapped by CVE ID
 */
exports.createMitigationSteps = async (vulnerabilities) => {
  // TODO: Replace with actual LLM provider API call
  console.log("Generating mitigations for vulnerabilities:", vulnerabilities);

  return vulnerabilities.map(v => ({
    cveId: v.cveId,
    mitigation: `Apply patches and update software affected by ${v.cveId}.`
  }));
};

/**
 * Receives chat history and new user message.
 * Returns AI-generated response based on context.
 * @param {Array<Object>} chatHistory
 * @param {string} userMessage
 * @returns {Promise<string>} AI response
 */
exports.sendChatToLLM = async (chatHistory, userMessage) => {
  console.log("Sending chat to LLM with context:", chatHistory);
  console.log("User message:", userMessage);

  // TODO: Replace with real LLM API call
  return "This is a placeholder AI response based on your scan data.";
};