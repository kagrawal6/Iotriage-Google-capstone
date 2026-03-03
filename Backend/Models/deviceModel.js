/**
 * deviceModel.js
 * ----------------
 * Represents devices discovered from an uploaded Nmap scan JSON file.
 * Converts raw scan data into Device objects and stores them in memory.
 * Provides methods to manage device data for the backend.
 */

class Device {
  /**
   * Creates a Device object from raw Nmap scan JSON.
   * @param {Object} deviceData - A single device entry from scan JSON
   */
  constructor({
    ip_address,
    mac_address,
    device_name,
    device_type,
    os_matches,
    open_ports
  }) {
    this.ipAddress = ip_address;
    this.macAddress = mac_address;
    this.deviceName = device_name;
    this.deviceType = device_type;
    this.osMatches = os_matches || [];
    this.openPorts = open_ports || [];
  }

  /**
   * Extracts all CPE strings from OS matches and open ports.
   * These CPEs are used to query the NVD vulnerability database.
   * @returns {Array<string>} List of CPE strings
   */
  getCPEs() {
    const cpes = [];

    for (const os of this.osMatches) {
      if (os.cpe) cpes.push(...os.cpe);
    }

    for (const port of this.openPorts) {
      if (port.cpe && port.cpe !== "") {
        cpes.push(port.cpe);
      }
    }

    return cpes;
  }
}

class DeviceModel {
  /**
   * Stores all Device objects in memory.
   */
  constructor() {
    this.devices = [];
  }

  /**
   * Adds a single device to memory.
   * @param {Object} deviceData - Raw device JSON
   * @returns {Device} The created Device object
   */
  addDevice(deviceData) {
    const device = new Device(deviceData);
    this.devices.push(device);
    return device;
  }

  /**
   * Adds multiple devices at once.
   * @param {Array<Object>} deviceArray - Array of raw device JSON objects
   */
  addDevices(deviceArray) {
    deviceArray.forEach(d => this.addDevice(d));
  }

  /**
   * Returns all stored devices.
   * @returns {Array<Device>}
   */
  getAllDevices() {
    return this.devices;
  }

  /**
   * Clears all stored devices from memory.
   */
  clearDevices() {
    this.devices = [];
  }
}

module.exports = new DeviceModel();