/**
 * scanController.js
 *
 * Handles all logic related to network scanning and device discovery.
 *
 * Responsibilities:
 * - Trigger the Python + Nmap scanner
 * - Parse scan output (JSON)
 * - Extract device information (IP, vendor, product, version, ports)
 * - Store devices using the device model
 * - Return discovered devices to the frontend
 *
 * This controller does NOT:
 * - Query vulnerability databases
 * - Call AI/LLMs
 * - Process CVE data
 *
 */

const { exec } = require("child_process");
const deviceModel = require("../Models/deviceModel");

// Run the Python Nmap scanner
exports.runScan = async (req, res) => {
  // Clear previous scan data
  deviceModel.clearDevices();

  // Example: call Python script that runs nmap
  exec("python scanner.py", (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: "Scan failed" });
    }

    // Parse JSON output from Python
    const rawData = JSON.parse(stdout);

    // Convert raw scan output into device objects
    const devices = exports.parseScanOutput(rawData);

    // Save devices
    deviceModel.saveDevices(devices);

    // Return devices to frontend
    res.json(devices);
  });
};

// Convert Nmap JSON into clean device objects
exports.parseScanOutput = (rawJson) => {
  // TODO: parse nmap output into device objects
  return rawJson.map(d => ({
    ip: d.ip,
    vendor: d.vendor,
    product: d.product,
    version: d.version,
    ports: d.ports
  }));
};

// Return stored devices
exports.getDevices = (req, res) => {
  const devices = deviceModel.getAllDevices();
  res.json(devices);
};