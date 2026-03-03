/**
 * ScanController.js
 * -----------------
 * Handles uploaded Nmap scan JSON and processes devices and vulnerabilities.
 */

const Device = require("../Models/device");
const Vulnerability = require("../Models/vulnerability");
const nvdService = require("../Services/nvdService");

/**
 * Processes uploaded Nmap scan JSON.
 * Converts devices, queries CVEs, and returns results.
 * @param {Request} req
 * @param {Response} res
 */
exports.uploadScan = async (req, res) => {
  try {
    const scanData = req.body;

    // Convert raw JSON into Device objects
    const devices = scanData.map(d => new Device(d));
    const vulnerabilities = [];

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

    res.json({
      devices,
      vulnerabilities
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process scan" });
  }
};