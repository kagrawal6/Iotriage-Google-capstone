/**
 * app.js
 * -------
 * Entry point for the backend server.
 * Configures middleware and registers API routes.
 */

require("dotenv").config();
const express = require("express");
const app = express();
const scanRoutes = require("./Routes/scanRoutes");
const chatRoutes = require("./Routes/chatRoutes");

/**
 * Enables JSON request body parsing.
 */
app.use(express.json());

/**
 * Registers API routes.
 */
app.use("/api", scanRoutes);
app.use("/api", chatRoutes);

/**
 * Starts the HTTP server.
 */
app.listen(3000, () => {
  console.log("Server running on port 3000");
});