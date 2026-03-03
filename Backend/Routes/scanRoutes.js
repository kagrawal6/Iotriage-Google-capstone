/**
 * scanRoutes.js
 * --------------
 * Defines HTTP API endpoints and maps them to controller methods.
 */

const express = require("express");
const router = express.Router();
const scanController = require("../Controllers/scanController");
const cveController = require("../Controllers/cveController");

/**
 * Uploads an Nmap scan JSON file.
 */
router.post("/upload", scanController.uploadScan);

/**
 * Retrieves all devices from memory.
 */
router.get("/devices", scanController.getDevices);

/**
 * Retrieves all vulnerabilities from memory.
 */
router.get("/results", cveController.getVulnerabilities);

module.exports = router;