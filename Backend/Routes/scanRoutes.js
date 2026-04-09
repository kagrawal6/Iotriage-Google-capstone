/**
 * scanRoutes.js
 * -------------
 * Defines routes for scan processing.
 */

const express = require("express");
const router = express.Router();
const scanController = require("../Controllers/scanController");

/**
 * Uploads an Nmap scan JSON file.
 */
router.post("/upload", scanController.uploadScan);

/**
 * Generates mitigation steps for a single vulnerability.
 */
router.post("/mitigation", scanController.generateMitigation);

module.exports = router;