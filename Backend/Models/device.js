/**
 * device.js
 * ----------
 * Represents a network device parsed from an Nmap scan.
 * Provides helper methods for extracting vulnerability identifiers (CPEs).
 */

class Device {
  /**
   * Constructs a Device object from raw Nmap JSON data.
   * @param {Object} deviceData - Raw device object from scan JSON
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
   * Extracts all CPE identifiers from OS matches and open ports.
   * Used to query the vulnerability database (NVD).
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

module.exports = Device;