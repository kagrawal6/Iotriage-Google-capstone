/**
 * constants.js
 * ------------
 * Central configuration constants for API endpoints and settings.
 */

module.exports = {
  // CISA KEV (Known Exploited Vulnerabilities) Catalog — public, no key needed
  CISA_KEV_URL:
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",

  // Google Gemini LLM Configuration
  GEMINI_MODEL: "gemini-2.5-flash",
  GEMINI_MAX_OUTPUT_TOKENS: 65536,
  GEMINI_TEMPERATURE: 0.3, // Low temperature for factual, consistent output
};