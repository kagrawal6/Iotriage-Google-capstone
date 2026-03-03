/**
 * scanController.js
 * ------------------
 * Handles uploaded scan files and controls the main backend workflow:
 * JSON upload → device parsing → CVE lookup → mitigation generation.
 */

const deviceModel = require("../Models/deviceModel");
const vulnerabilityModel = require("../Models/vulnerabilityModel");
const nvdService = require("../Services/nvdService");
const llmService = require("../Services/llmService");

/**
 * Handles uploaded Nmap scan JSON from frontend.
 * @param {Request} req - HTTP request containing scan JSON
 * @param {Response} res - HTTP response
 */
exports.uploadScan = async (req, res) => {
  try {
    const scanData = req.body;

    deviceModel.clearDevices();
    vulnerabilityModel.clearVulnerabilities();

    deviceModel.addDevices(scanData);
    const devices = deviceModel.getAllDevices();

    for (const device of devices) {
      const cpes = device.getCPEs();

      for (const cpe of cpes) {
        const cves = await nvdService.fetchCVEs(cpe);

        for (const cve of cves) {
          vulnerabilityModel.addVulnerability({
            ...cve,
            deviceIp: device.ipAddress
          });
        }
      }
    }

    const vulnerabilities = vulnerabilityModel.getAllVulnerabilities();
    const mitigations = await llmService.createMitigationSteps(vulnerabilities);

    res.json({
      devices,
      vulnerabilities,
      mitigations
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process scan" });
  }
};

/**
 * Returns all stored devices.
 * @param {Request} req
 * @param {Response} res
 */
exports.getDevices = (req, res) => {
  res.json(deviceModel.getAllDevices());
};