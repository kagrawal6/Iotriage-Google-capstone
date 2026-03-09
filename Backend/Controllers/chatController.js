/**
 * chatController.js
 * -----------------
 * Handles AI chat requests from the frontend after frontend gets first json batch 
 * and forwards them to the LLM.
 */

const llmService = require("../Services/llmService");

/**
 * Receives chat context and new user message.
 * Sends them to the LLM and returns the AI response.
 * @param {Request} req
 * @param {Response} res
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatHistory, message, scanContext } = req.body;

    const aiResponse = await llmService.sendChatToLLM(
      chatHistory,
      message,
      scanContext || null
    );

    res.json({ reply: aiResponse });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "LLM request failed" });
  }
};