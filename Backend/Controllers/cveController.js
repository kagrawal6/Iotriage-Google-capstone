/**
 * cveController.js
 *
 * Handles vulnerability analysis and mitigation generation.
 *
 * Responsibilities:
 * - Convert devices into CPE identifiers
 * - Query the NVD (CVE) database
 * - Filter vulnerabilities by affected version ranges
 * - Normalize CVE data into a consistent schema
 * - Generate human-readable mitigation steps using an LLM
 * - Store and return vulnerability results to the frontend
 *
 * This controller does NOT:
 * - Run network scans
 * - Handle UI logic
 */


const vulnerabilityModel = require("../Models/vulnerabilityModel");
const deviceModel = require("../Models/deviceModel");
const axios = require("axios");

// Analyze all devices for vulnerabilities
exports.analyzeDevices = async (req, res) => {
  vulnerabilityModel.clearVulnerabilities();

  const devices = deviceModel.getAllDevices();
  let results = [];

  for (let device of devices) {
    // Build CPE string for device
    const cpe = exports.buildCPE(device);

    // Fetch CVEs from NVD
    const rawCVEs = await exports.fetchCVEs(cpe);

    // Filter by version
    const filtered = exports.filterByVersion(rawCVEs, device.version);

    // Format CVEs into our schema
    const formatted = exports.formatVulnerabilities(filtered);

    // Generate plain-English mitigation using LLM
    const mitigation = await exports.generateMitigationWithLLM(device, formatted);

    const deviceResult = {
      device,
      vulnerabilities: formatted,
      mitigation
    };

    vulnerabilityModel.saveVulnerabilities(deviceResult);
    results.push(deviceResult);
  }

  res.json(results);
};

// Convert device → CPE format
exports.buildCPE = (device) => {
  return `cpe:2.3:o:${device.vendor}:${device.product}:${device.version}`;
};

// Query NVD API for CVEs
exports.fetchCVEs = async (cpe) => {
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${cpe}`;
  const response = await axios.get(url);
  return response.data.vulnerabilities || [];
};

// Filter CVEs by version range
exports.filterByVersion = (cves, version) => {
  // TODO: real version comparison logic
  return cves;
};

// Format CVEs into clean objects
exports.formatVulnerabilities = (cves) => {
  return cves.map(cve => ({
    id: cve.cve.id,
    severity: cve.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore,
    description: cve.cve.descriptions[0].value
  }));
};

// CALL LLM to generate mitigation steps
exports.generateMitigationWithLLM = async (device, vulns) => {
  // TODO: integrate Gemini / Ollama / Groq here
  return {
    summary: "This device has known vulnerabilities.",
    steps: ["Update firmware", "Disable unused services"]
  };
};

// Return stored vulnerabilities
exports.getVulnerabilities = (req, res) => {
  const vulns = vulnerabilityModel.getAllVulnerabilities();
  res.json(vulns);
};