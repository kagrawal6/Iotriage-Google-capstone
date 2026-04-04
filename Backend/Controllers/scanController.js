/**
 * ScanController.js
 * -----------------
 * Handles uploaded Nmap scan JSON (scan_results.json) and processes devices,
 * vulnerabilities, and mitigations.
 */

const Device = require("../Models/device");
const Vulnerability = require("../Models/vulnerability");
const nvdService = require("../Services/nvdService");
const llmService = require("../Services/llmService");


/**
 * Parses scan_results.json (array of device objects) into Device instances.
 * The file is produced by network_scan_script.py: one object per host found
 * on the network, with ip_address, mac_address, device_name, device_type,
 * os_matches (OS guesses + CPEs), and open_ports (listening services + CPEs).
 *
 * @param {*} scanData - Request body (must be array of device objects)
 * @returns {Device[]} Array of Device instances ready for CVE lookup
 * @throws {Error} If scanData is null, not an array, or any element is invalid
 */
function parseScanToDevices(scanData) {
  // Reject missing or non-array body so we don't call .map() on undefined
  if (scanData == null || !Array.isArray(scanData)) {
    throw new Error("Invalid scan format: expected a JSON array of device objects");
  }

  const devices = [];
  for (let i = 0; i < scanData.length; i++) {
    const d = scanData[i];
    // Each element must be an object; Device constructor expects named fields
    if (d == null || typeof d !== "object") {
      throw new Error(`Invalid device at index ${i}: expected an object`);
    }
    devices.push(new Device(d));
  }
  return devices;
}

exports.parseScanToDevices = parseScanToDevices;

/**
 * POST /api/upload — Processes uploaded Nmap scan JSON (scan_results.json).
 * Flow: parse body → Device objects → CPEs per device → NVD CVE lookup →
 * LLM mitigations → return { devices, vulnerabilities }.
 *
 * @param {Request} req - req.body is the parsed scan_results.json array
 * @param {Response} res - JSON with devices and vulnerabilities (or 400/500 error)
 */
exports.uploadScan = async (req, res) => {
  try {
    const scanData = req.body;

    // Step 1: Convert raw JSON array into Device objects (validates shape)
    const devices = parseScanToDevices(scanData);

    // Step 2: Collect all CVEs across every device CPE, keyed by "cveId|deviceIp"
    // to avoid duplicate entries for the same CVE on the same device.
    const vulnMap = new Map();

    for (const device of devices) {
      const cpes = device.getCPEs();

      for (const cpe of cpes) {
        const cves = await nvdService.fetchCVEs(cpe);

        for (const cve of cves) {
          const key = `${cve.cveId}|${device.ipAddress}`;
          if (!vulnMap.has(key)) {
            vulnMap.set(key, new Vulnerability({ ...cve, deviceIp: device.ipAddress }));
          }
        }
      }
    }

    // Step 3: Collect all vulnerabilities sorted by severity (Critical → High → Medium → Low)
    const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    let vulnerabilities = Array.from(vulnMap.values()).sort((a, b) => {
      const rankA = severityRank[(a.severity || "").toUpperCase()] ?? 0;
      const rankB = severityRank[(b.severity || "").toUpperCase()] ?? 0;
      if (rankA !== rankB) return rankB - rankA;
      return (b.cvssScore ?? -1) - (a.cvssScore ?? -1);
    });

    // Step 4: Ask LLM for mitigation steps per CVE
    const mitigations = await llmService.createMitigationSteps(vulnerabilities);

    // Step 5: Attach mitigation text to each vulnerability for the response
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
    // Validation errors (bad scan format) → 400; server/NVD/LLM errors → 500
    const isBadRequest =
      err.message && err.message.startsWith("Invalid ");
    const status = isBadRequest ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to process scan" });
  }
};