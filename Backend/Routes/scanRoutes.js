/**
 * scanRoutes.js
 *
 * Defines all REST API endpoints for the application.
 *
 * Responsibilities:
 * - Map HTTP routes (URLs) to controller methods
 * - Separate routing logic from business logic
 *
 * Example:
 * POST /api/scan      -> scanController.runScan
 * GET  /api/devices   -> scanController.getDevices
 * POST /api/analyze   -> cveController.analyzeDevices
 * GET  /api/results   -> cveController.getVulnerabilities
 *
 * This file contains NO scanning or CVE logic.
 * 
 */

const express = require("express");
const router = express.Router();

const scanController = require("../Controllers/scanController");
const cveController = require("../Controllers/cveController");

// Start a network scan
router.post("/scan", scanController.runScan);

// Get list of discovered devices
router.get("/devices", scanController.getDevices);

// Analyze devices for vulnerabilities
router.post("/analyze", cveController.analyzeDevices);

// Get vulnerability results
router.get("/results", cveController.getVulnerabilities);

module.exports = router;