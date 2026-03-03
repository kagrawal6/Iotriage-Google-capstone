/**
 * llmService.js
 * -------------
 * Handles interaction with the Large Language Model (LLM).
 * Receives full chat context and new user message, and returns an AI response.
 */

const axios = require("axios");

/**
 * Sends chat history and new user query to the LLM.
 * @param {Array<Object>} chatHistory - Full conversation history
 * @param {string} userMessage - New user message
 * @returns {Promise<string>} AI-generated response
 */
exports.sendChatToLLM = async (chatHistory, userMessage) => {
  // TODO: Replace with actual LLM provider API call (OpenAI, Claude, etc.)

  console.log("Sending context to LLM:", chatHistory);
  console.log("New message:", userMessage);

  return "This is a placeholder AI response based on your scan data.";
};