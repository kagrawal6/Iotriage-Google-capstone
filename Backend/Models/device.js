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
   * Collects CPE (Common Platform Enumeration) strings for this device.
   * CPEs identify OS and software so we can query NVD for CVEs.
   *
   * OS matches: only the single highest-accuracy match is used to avoid
   * flooding NVD with redundant lookups for every OS candidate Nmap guessed.
   *
   * Open ports: all CPEs are included since each represents a distinct
   * service/product version actually listening on the device.
   *
   * Handles CPE stored as array or single string. Deduplicates the result.
   *
   * @returns {Array<string>} Flat deduplicated list of CPE strings for NVD lookup
   */
  getCPEs() {
    const cpes = new Set();

    // OS detection: use only the highest-accuracy OS match
    if (this.osMatches.length > 0) {
      const bestMatch = this.osMatches.reduce((best, current) =>
        parseInt(current.accuracy, 10) > parseInt(best.accuracy, 10) ? current : best
      );

      if (bestMatch.cpe) {
        const cpeList = Array.isArray(bestMatch.cpe) ? bestMatch.cpe : [bestMatch.cpe];
        for (const cpe of cpeList) {
          if (cpe && typeof cpe === "string") cpes.add(cpe);
        }
      }
    }

    // Open ports: include all CPEs — each is a distinct service/product
    for (const port of this.openPorts) {
      if (!port || !port.cpe) continue;
      const cpeList = Array.isArray(port.cpe) ? port.cpe : [port.cpe];
      for (const cpe of cpeList) {
        if (cpe && typeof cpe === "string") cpes.add(cpe);
      }
    }

    return [...cpes];
  }
}

module.exports = Device;