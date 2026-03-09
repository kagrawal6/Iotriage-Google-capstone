/**
 * nvdService.js
 * -------------
 * Handles communication with the National Vulnerability Database (NVD).
 * 
 * Responsibilities:
 *  - Query the NVD CVE API using a CPE string
 *  - Normalize CVE records into a simplified internal structure
 *  - Deduplicate CVEs with the same ID
 *  - Select the best CVSS score if multiple exist
 *  - Rank vulnerabilities by severity/score/date
 *  - Return the top N vulnerabilities
 */

const axios = require("axios");

/**
 * Base endpoint for the NVD CVE API
 */
const NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const NVD_API_KEY = "41efb0c3-9d9b-43de-9c6d-e8333e5bd998"


/**
 * Extract the best CVSS score available.
 * 
 * CVEs may contain multiple scoring versions:
 *  - CVSS v4
 *  - CVSS v3.1
 *  - CVSS v3.0
 *  - CVSS v2
 * 
 * We prefer the most recent version available.
 */
function extractCvss(metrics = {}) {
  // CVSS v4
  const v4 = metrics.cvssMetricV40?.[0]?.cvssData || metrics.cvssMetric4?.[0]?.cvssData;
  if (v4?.baseScore != null) {
    return {
      version: "4.0",
      score: v4.baseScore,
      severity: v4.baseSeverity ?? null
    };
  }

  // CVSS v3.1
  const v31 = metrics.cvssMetricV31?.[0]?.cvssData;
  if (v31?.baseScore != null) {
    return {
      version: "3.1",
      score: v31.baseScore,
      severity: v31.baseSeverity ?? null
    };
  }

  // CVSS v3.0
  const v30 = metrics.cvssMetricV30?.[0]?.cvssData;
  if (v30?.baseScore != null) {
    return {
      version: "3.0",
      score: v30.baseScore,
      severity: v30.baseSeverity ?? null
    };
  }

  // CVSS v2
  const v2Data = metrics.cvssMetricV2?.[0]?.cvssData;
  const v2Metric = metrics.cvssMetricV2?.[0];
  if (v2Data?.baseScore != null) {
    return {
      version: "2.0",
      score: v2Data.baseScore,
      severity: v2Metric?.baseSeverity ?? null
    };
  }

  return { version: null, score: null, severity: null };
}

/**
 * Extract the best description from the CVE.
 * Prefer English descriptions if available.
 */
function getDescription(cve = {}) {
  const descriptions = Array.isArray(cve.descriptions) ? cve.descriptions : [];

  return (
    descriptions.find((d) => d?.lang === "en")?.value ||
    descriptions[0]?.value ||
    "No description available"
  );
}

/**
 * Convert severity string into numeric ranking.
 * Used for sorting vulnerabilities.
 */
function severityRank(severity) {
  switch ((severity || "").toUpperCase()) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

/**
 * Compare two CVSS records to determine which is "better".
 * 
 * Ranking rules:
 * 1. Prefer newer CVSS versions
 * 2. Prefer higher base scores
 * 3. Prefer higher severity
 */
function compareCvss(a, b) {
  const versionOrder = { "4.0": 4, "3.1": 3, "3.0": 2, "2.0": 1, null: 0 };

  const aVersion = versionOrder[a?.version ?? null] ?? 0;
  const bVersion = versionOrder[b?.version ?? null] ?? 0;
  if (aVersion !== bVersion) return bVersion - aVersion;

  const aScore = a?.score ?? -1;
  const bScore = b?.score ?? -1;
  if (aScore !== bScore) return bScore - aScore;

  return severityRank(b?.severity) - severityRank(a?.severity);
}

/**
 * Choose the better CVSS record between two options.
 */
function pickBetterCvss(current, incoming) {
  if (!current) return incoming;
  return compareCvss(current, incoming) > 0 ? incoming : current;
}

/**
 * Extract references from the CVE record.
 * These usually include vendor advisories, patches, etc.
 */
function getReferences(cve = {}) {
  return Array.isArray(cve.references)
    ? cve.references.map((ref) => ({
        url: ref.url || null,
        source: ref.source || null,
        tags: Array.isArray(ref.tags) ? ref.tags : []
      }))
    : [];
}

/**
 * Extract vendor comments if available.
 */
function getVendorComments(cve = {}) {
  return Array.isArray(cve.vendorComments)
    ? cve.vendorComments.map((comment) => ({
        organization: comment.organization || null,
        comment: comment.comment || null,
        lastModified: comment.lastModified || null
      }))
    : [];
}

/**
 * Convert raw NVD vulnerability into normalized object.
 */
function normalizeCve(vuln) {
  const cve = vuln?.cve || {};
  const cveId = cve.id || null;
  if (!cveId) return null;

  return {
    cveId,
    description: getDescription(cve),
    cvss: extractCvss(cve.metrics || {}),
    published: cve.published || null,
    lastModified: cve.lastModified || null,
    // references: getReferences(cve),
    vendorComments: getVendorComments(cve)
  };
}

/**
 * Merge duplicate CVEs (same CVE ID).
 * Ensures we keep the best score and latest metadata.
 */
function mergeCve(existing, incoming) {
  if (!existing) return incoming;

  return {
    ...existing,
    description:
      existing.description && existing.description !== "No description available"
        ? existing.description
        : incoming.description,

    cvss: pickBetterCvss(existing.cvss, incoming.cvss),

    published: existing.published || incoming.published,

    lastModified:
      new Date(existing.lastModified || 0) > new Date(incoming.lastModified || 0)
        ? existing.lastModified
        : incoming.lastModified,

    references: [...(existing.references || []), ...(incoming.references || [])],
    vendorComments: [...(existing.vendorComments || []), ...(incoming.vendorComments || [])]
  };
}

/**
 * Sort CVEs by importance.
 */
function sortCves(cves) {
  return cves.sort((a, b) => {
    const scoreA = a.cvss?.score ?? -1;
    const scoreB = b.cvss?.score ?? -1;
    if (scoreA !== scoreB) return scoreB - scoreA;

    const sevA = severityRank(a.cvss?.severity);
    const sevB = severityRank(b.cvss?.severity);
    if (sevA !== sevB) return sevB - sevA;

    const dateA = new Date(a.lastModified || a.published || 0).getTime();
    const dateB = new Date(b.lastModified || b.published || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * Query NVD for CVEs related to a CPE string.
 */
async function getCvesByCpe(
  cpeName,
  {
    apiKey = null,
    maxToReturn = 25,
    maxToFetch = 100,
    resultsPerPage = 50
  } = {}
) {
  if (!cpeName || typeof cpeName !== "string") {
    throw new Error("cpeName must be a non-empty string");
  }

  const byId = new Map();
  let startIndex = 0;
  const perPage = Math.min(resultsPerPage, maxToFetch);

  while (byId.size < maxToFetch) {
    const response = await axios.get(NVD_BASE, {
      headers: {
        accept: "application/json",
        ...(apiKey ? { apiKey } : {})
      },
      params: {
        cpeName,
        startIndex,
        resultsPerPage: perPage
      }
    });

    const data = response.data || {};
    const vulns = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];
    const total = Number(data.totalResults || 0);

    for (const vuln of vulns) {
      const normalized = normalizeCve(vuln);
      if (!normalized) continue;

      const existing = byId.get(normalized.cveId);
      byId.set(normalized.cveId, mergeCve(existing, normalized));

      if (byId.size >= maxToFetch) break;
    }

    startIndex += vulns.length;

    if (vulns.length === 0 || startIndex >= total) break;
  }

  const ranked = sortCves(Array.from(byId.values()));
  return ranked.slice(0, maxToReturn);
}

/**
 * Public function used by controllers.
 */
exports.fetchCVEs = async (cpe) => {
  console.log("Querying NVD for:", cpe);

  try {
    return await getCvesByCpe(cpe, {
      apiKey: process.env.NVD_API_KEY || null,
      maxToReturn: 25,
      maxToFetch: 100,
      resultsPerPage: 50
    });
  } catch (err) {
    const status = err.response?.status;
    const statusText = err.response?.statusText || "";
    const data = err.response?.data || "";

    throw new Error(
      `NVD request failed: HTTP ${status} ${statusText} ${String(data).slice(0, 200)}`
    );
  }
};