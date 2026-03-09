/**
 * ScanController.js
 * -----------------
 * Handles uploaded Nmap scan JSON and processes devices, vulnerabilities, and mitigations.
 */

const Device = require("../Models/device");
const Vulnerability = require("../Models/vulnerability");
const nvdService = require("../Services/nvdService");
const llmService = require("../Services/llmService");

/**
 * Processes uploaded Nmap scan JSON.
 * Converts devices, queries CVEs, generates mitigations, and returns results.
 * @param {Request} req
 * @param {Response} res
 */
exports.uploadScan = async (req, res) => {
  try {
    const scanData = req.body;

    // Convert raw JSON into Device objects
    const devices = scanData.map(d => new Device(d));
    let vulnerabilities = [];

    // Process each device
    for (const device of devices) {
      const cpes = device.getCPEs();

      for (const cpe of cpes) {
        const cves = await nvdService.fetchCVEs(cpe);

        for (const cve of cves) {
          vulnerabilities.push(
            new Vulnerability({
              ...cve,
              deviceIp: device.ipAddress
            })
          );
        }
      }
    }

    //TODO: Rank vulnerabilities

    // Generate mitigation steps using LLM service
    const mitigations = await llmService.createMitigationSteps(vulnerabilities);

    // Attach mitigation advice to vulnerability objects
    vulnerabilities = vulnerabilities.map(vuln => {
      const match = mitigations.find(m => m.cveId === vuln.cveId);
      if (match) {
        return {
          ...vuln,
          mitigation: match.mitigation,
          riskSummary: match.riskSummary || null,
          priority: match.priority || null,
          steps: match.steps || [],
          verification: match.verification || null,
          ransomwareWarning: match.ransomwareWarning || null,
        };
      }
      return { ...vuln, mitigation: null };
    });

    res.json({
      devices,
      vulnerabilities
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process scan" });
  }
};