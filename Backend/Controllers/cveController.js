/**
 * cveController.js
 * -----------------
 * Provides access to vulnerability data stored in memory.
 */

const vulnerabilityModel = require("../Models/vulnerabilityModel");

/**
 * Returns all stored vulnerabilities.
 * @param {Request} req
 * @param {Response} res
 */
exports.getVulnerabilities = (req, res) => {
  res.json(vulnerabilityModel.getAllVulnerabilities());
};