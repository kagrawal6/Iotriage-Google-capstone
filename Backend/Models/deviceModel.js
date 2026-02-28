/**
 * deviceModel.js
 *
 * Represents and manages device data discovered from network scans.
 *
 * Responsibilities:
 * - Define the structure of a device (IP, vendor, product, version, ports, OS)
 * - Store devices in memory (or database in the future)
 * - Provide methods to save, retrieve, and clear devices
 *
 * This file does NOT:
 * - Run scans
 * - Call external APIs
 * - Contain business logic
 * 
 */

let devices = [];

// Save devices
exports.saveDevices = (newDevices) => {
  devices = newDevices;
};

// Get all devices
exports.getAllDevices = () => {
  return devices;
};

// Get device by IP
exports.getDeviceByIp = (ip) => {
  return devices.find(d => d.ip === ip);
};

// Clear devices
exports.clearDevices = () => {
  devices = [];
};