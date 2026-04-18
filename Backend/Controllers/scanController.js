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

// Runs async tasks in small batches with a delay between batches
async function batchedPromiseAll(items, batchSize, delayMs, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}

// POST /api/upload — parses scan JSON, looks up CVEs, returns results
exports.uploadScan = async (req, res) => {
  try {
    const scanData = req.body;

    const devices = parseScanToDevices(scanData);

    const lookups = devices.flatMap(device =>
      device.getCPEs().map(cpe => ({ device, cpe }))
    );

    const hasKey = Boolean(process.env.NVD_API_KEY);
    const batchSize = hasKey ? 10 : 4;
    const batchDelayMs = hasKey ? 2000 : 7000;

    console.log(`[Scan] ${devices.length} devices, ${lookups.length} CPEs, key=${hasKey}, batchSize=${batchSize}`);
    const t0 = Date.now();

    const results = await batchedPromiseAll(
      lookups,
      batchSize,
      batchDelayMs,
      ({ device, cpe }) => nvdService.fetchCVEs(cpe).then(cves => ({ device, cves }))
    );

    console.log(`[Scan] NVD lookups done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

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

    // Step 3b: Enrich each vulnerability with the best OS match from its device.
    // This lets the LLM write mitigation steps for the specific detected device
    // rather than hedging across every possible Apple/Linux/Windows variant.
    const deviceMap = new Map(
      devices.map((d) => [d.ipAddress || d.ip_address, d])
    );

    vulnerabilities = vulnerabilities.map((vuln) => {
      const device = deviceMap.get(vuln.deviceIp);
      const osMatches = device?.osMatches || device?.os_matches || [];

      const bestOs =
        osMatches.length > 0
          ? osMatches.reduce((a, b) =>
              parseInt(b.accuracy) > parseInt(a.accuracy) ? b : a
            )
          : null;

      return {
        ...vuln,
        bestOsName: bestOs?.name || null,
        bestOsAccuracy: bestOs ? parseInt(bestOs.accuracy) : null,
        deviceType: device?.deviceType || device?.device_type || null,
      };
    });

    // Step 4: Ask LLM for mitigation steps per CVE.
    // expertiseMode is sent by the frontend upload form ("beginner" | "intermediate" | "expert").
    const expertiseMode = req.body?.expertiseMode || "intermediate";
    const mitigations = await llmService.createMitigationSteps(vulnerabilities, expertiseMode);

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