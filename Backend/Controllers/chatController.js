/**
 * chatController.js
 * -----------------
 * Handles AI chat requests from the frontend after frontend gets first json batch 
 * and forwards them to the LLM.
 */

const llmService = require("../Services/llmService");

/**
 * Receives chat context and new user message.
 * Streams the AI response back tot he client via SSE.
 * @param {Request} req
 * @param {Response} res
 */
exports.sendMessage = async (req, res) => {

  const { chatHistory, message, scanContext } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  await llmService.sendChatToLLM(chatHistory, message, res, scanContext || null);
    
};