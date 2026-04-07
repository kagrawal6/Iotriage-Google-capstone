// Handles scan upload and on-demand mitigation requests

const Device = require("../Models/device");
const Vulnerability = require("../Models/vulnerability");
const nvdService = require("../Services/nvdService");
const llmService = require("../Services/llmService");


// Converts raw scan JSON array into Device objects
function parseScanToDevices(scanData) {
  if (scanData == null || !Array.isArray(scanData)) {
    throw new Error("Invalid scan format: expected a JSON array of device objects");
  }

  const devices = [];
  for (let i = 0; i < scanData.length; i++) {
    const d = scanData[i];
    if (d == null || typeof d !== "object") {
      throw new Error(`Invalid device at index ${i}: expected an object`);
    }
    devices.push(new Device(d));
  }
  return devices;
}

exports.parseScanToDevices = parseScanToDevices;

// POST /api/upload — parses scan JSON, looks up CVEs, returns results
exports.uploadScan = async (req, res) => {
  try {
    const scanData = req.body;

    const devices = parseScanToDevices(scanData);

    // Build all (device, cpe) pairs then fetch all CVEs in parallel
    const lookups = devices.flatMap(device =>
      device.getCPEs().map(cpe => ({ device, cpe }))
    );

    const results = await Promise.all(
      lookups.map(({ device, cpe }) =>
        nvdService.fetchCVEs(cpe).then(cves => ({ device, cves }))
      )
    );

    const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const vulnerabilities = results
      .flatMap(({ device, cves }) =>
        cves.map(cve => new Vulnerability({ ...cve, deviceIp: device.ipAddress }))
      )
      .sort((a, b) => {
      const rankA = severityRank[(a.severity || "").toUpperCase()] ?? 0;
      const rankB = severityRank[(b.severity || "").toUpperCase()] ?? 0;
      if (rankA !== rankB) return rankB - rankA;
      return (b.cvssScore ?? -1) - (a.cvssScore ?? -1);
    });

    res.json({
      devices,
      vulnerabilities
    });

  } catch (err) {
    console.error(err);
    const isBadRequest =
      err.message && err.message.startsWith("Invalid ");
    const status = isBadRequest ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to process scan" });
  }
};

// POST /api/mitigation — calls LLM for a single vulnerability on demand
exports.getMitigation = async (req, res) => {
  try {
    const vuln = req.body;
    if (!vuln || !vuln.cveId) {
      return res.status(400).json({ error: "Invalid request: cveId is required" });
    }

    const mitigations = await llmService.createMitigationSteps([vuln]);
    const result = mitigations[0] || null;

    if (!result) {
      return res.status(500).json({ error: "Failed to generate mitigation" });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate mitigation" });
  }
};