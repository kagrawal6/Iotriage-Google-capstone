/**
 * app.js
 * -------
 * Entry point for the backend server.
 * Initializes Express and loads API routes.
 */

const express = require("express");
const app = express();
const scanRoutes = require("./Routes/scanRoutes");

/**
 * Enables JSON request parsing.
 */
app.use(express.json());

/**
 * Registers API routes under /api.
 */
app.use("/api", scanRoutes);

/**
 * Starts the server.
 */
app.listen(3000, () => {
  console.log("Server running on port 3000");
});