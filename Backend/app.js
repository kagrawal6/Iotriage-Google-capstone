/**
 * app.js
 * -------
 * Entry point for the backend server.
 * Configures middleware and registers API routes.
 */

require('dotenv').config();
const express = require("express");
const cors = require("cors");
const app = express();
const scanRoutes = require("./Routes/scanRoutes");
const chatRoutes = require("./Routes/chatRoutes");

/**
 * Enables CORS so the frontend (Vite dev server) can reach the API.
 */
app.use(cors());

/**
 * Enables JSON request body parsing.
 * Limit raised to 10mb to handle large Nmap scan files.
 */
app.use(express.json({ limit: "10mb" }));

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