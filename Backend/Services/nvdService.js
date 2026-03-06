/**
 * nvdService.js
 * -------------
 * Handles communication with the National Vulnerability Database (NVD).
 */

const axios = require("axios");

/**
 * Fetches CVEs associated with a given CPE string.
 * @param {string} cpe - CPE identifier
 * @returns {Promise<Array<Object>>} List of CVE objects
 */
exports.fetchCVEs = async (cpe) => {
  console.log("Querying NVD for:", cpe);

  // TODO: Replace with real NVD API call
  return [
    {
      cveId: "CVE-2023-1234",
      description: "Example vulnerability",
      severity: "HIGH"
    }
  ];
};