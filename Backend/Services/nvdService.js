/**
 * nvdService.js
 * --------------
 * Handles communication with the NVD (National Vulnerability Database) API.
 * Given a CPE string, retrieves possible CVEs for that software or OS.
 */

const axios = require("axios");

/**
 * Fetches CVEs from the NVD API for a given CPE string.
 * @param {string} cpe - CPE identifier for software or OS
 * @returns {Array<Object>} List of vulnerability objects
 */
exports.fetchCVEs = async (cpe) => {
  console.log("Querying NVD for:", cpe);

  // Placeholder response (replace with real API call later)
  return [
    {
      cveId: "CVE-2023-1234",
      description: "Example vulnerability",
      severity: "HIGH"
    }
  ];
};