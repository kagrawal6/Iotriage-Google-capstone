/**
 * app.js
 *
 * Entry point for the backend server.
 *
 * Responsibilities:
 * - Create and configure the Express application
 * - Register API routes
 * - Enable middleware (JSON parsing, etc.)
 * - Start the HTTP server and listen for requests
 *
 * This file does NOT contain business logic.
 * It only wires the system together.
 * 
 */
require('dotenv').config();
const express = require("express");
const scanRoutes = require("./Routes/scanRoutes");

const app = express();
app.use(express.json()); // allow JSON body parsing

// Register routes
app.use("/api", scanRoutes);

// Start server
app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
