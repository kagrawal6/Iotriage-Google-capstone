/**
 * chatRoutes.js
 * -------------
 * Defines routes for chat interaction with the LLM.
 */

const express = require("express");
const router = express.Router();
const chatController = require("../Controllers/chatController");

/**
 * Sends a chat message with context to the LLM.
 */
router.post("/chat", chatController.sendMessage);

module.exports = router;