/**
 * device.js
 * ----------
 * Represents a single network device from scan_results.json (output of
 * network_scan_script.py). Each device has identity (IP, name, type),
 * OS guesses (os_matches), and listening services (open_ports). CPEs from
 * both are used to look up known vulnerabilities (CVEs) in the NVD.
 */

class Device {
  /**
   * Constructs a Device from one element of the scan_results.json array.
   * Fields match the Python script: snake_case in JSON, camelCase on the instance.
   *
   * @param {Object} deviceData - One device object from scan_results.json
   * @param {string} [deviceData.ip_address]
   * @param {string} [deviceData.mac_address]
   * @param {string} [deviceData.device_name]
   * @param {string} [deviceData.device_type]
   * @param {Array} [deviceData.os_matches] - { name, accuracy, cpe[] }
   * @param {Array} [deviceData.open_ports] - { port, protocol, service, product, version, cpe[] }
   */
  constructor({
    ip_address,
    mac_address,
    device_name,
    device_type,
    os_matches,
    open_ports
  } = {}) {
    this.ipAddress = ip_address ?? "Unknown";
    this.macAddress = mac_address ?? "Unknown";
    this.deviceName = device_name ?? "Unknown";
    this.deviceType = device_type ?? "Unknown";
    this.osMatches = Array.isArray(os_matches) ? os_matches : [];
    this.openPorts = Array.isArray(open_ports) ? open_ports : [];
  }

  /**
   * Collects all CPE (Common Platform Enumeration) strings for this device.
   * CPEs identify OS and software so we can query NVD for CVEs. Sources:
   * - os_matches: OS guesses from Nmap (each match can have multiple CPEs).
   * - open_ports: each listening service can have one or more CPEs (e.g. product version).
   * Handles CPE stored as array (network_scan_script.py) or single string.
   *
   * @returns {Array<string>} Flat list of CPE strings for NVD lookup
   */
  getCPEs() {
    const cpes = [];

    // OS detection: Nmap may return several OS candidates, each with CPE list
    for (const os of this.osMatches) {
      if (!os || !os.cpe) continue;
      const cpeList = Array.isArray(os.cpe) ? os.cpe : [os.cpe];
      for (const cpe of cpeList) {
        if (cpe && typeof cpe === "string") cpes.push(cpe);
      }
    }

    // Open ports: each port's service/product can have one or more CPEs
    for (const port of this.openPorts) {
      if (!port || !port.cpe) continue;
      const cpeList = Array.isArray(port.cpe) ? port.cpe : [port.cpe];
      for (const cpe of cpeList) {
        if (cpe && typeof cpe === "string") cpes.push(cpe);
      }
    }

    return cpes;
  }
}

module.exports = Device;