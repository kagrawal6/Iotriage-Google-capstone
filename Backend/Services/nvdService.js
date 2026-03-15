/**
 * nvdService.js
 * -------------
 * Handles communication with the National Vulnerability Database (NVD).
 *
 * Responsibilities:
 *  - Query the NVD CVE API using a CPE string
 *  - For versioned CPEs, use virtualMatchString + versionStart/versionEnd
 *  - Normalize CVE records into a simplified internal structure
 *  - Deduplicate CVEs with the same ID
 *  - Select the best CVSS score if multiple exist
 *  - Rank vulnerabilities by severity/score/date
 *  - Return the top N vulnerabilities
 */

const axios = require("axios");

const NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";

/**
 * Parse a CPE 2.3 string into its main components.
 * Example:
 * cpe:2.3:a:apache:log4j:2.16.0:*:*:*:*:*:*:*
 */
function parseCpe23(cpe) {
  if (!cpe || typeof cpe !== "string") {
    throw new Error("cpe must be a non-empty string");
  }

  const parts = cpe.split(":");
  if (parts.length < 6 || parts[0] !== "cpe" || parts[1] !== "2.3") {
    throw new Error(`Invalid CPE 2.3 string: ${cpe}`);
  }

  return {
    part: parts[2] || "*",
    vendor: parts[3] || "*",
    product: parts[4] || "*",
    version: parts[5] || "*"
  };
}

/**
 * Build NVD query params.
 *
 * - Concrete version (e.g. 2.6)  → cpeName = cpe:2.3:part:vendor:product:version
 *   NVD accepts partial cpeName strings up to the version component.
 * - Wildcard / missing version    → virtualMatchString = full 13-component CPE
 *   virtualMatchString does prefix matching and doesn't require dictionary membership.
 */
function buildNvdQueryParams(cpe, startIndex, resultsPerPage) {
  const { part, vendor, product, version } = parseCpe23(cpe);
  const hasConcreteVersion = version && version !== "*" && version !== "-";

  const params = { startIndex, resultsPerPage };

  if (hasConcreteVersion) {
    params.cpeName = `cpe:2.3:${part}:${vendor}:${product}:${version}`;
  } else {
    params.virtualMatchString = `cpe:2.3:${part}:${vendor}:${product}:*:*:*:*:*:*:*`;
  }

  return params;
}

function extractCvss(metrics = {}) {
  const v4 = metrics.cvssMetricV40?.[0]?.cvssData || metrics.cvssMetric4?.[0]?.cvssData;
  if (v4?.baseScore != null) {
    return {
      version: "4.0",
      score: v4.baseScore,
      severity: v4.baseSeverity ?? null
    };
  }

  const v31 = metrics.cvssMetricV31?.[0]?.cvssData;
  if (v31?.baseScore != null) {
    return {
      version: "3.1",
      score: v31.baseScore,
      severity: v31.baseSeverity ?? null
    };
  }

  const v30 = metrics.cvssMetricV30?.[0]?.cvssData;
  if (v30?.baseScore != null) {
    return {
      version: "3.0",
      score: v30.baseScore,
      severity: v30.baseSeverity ?? null
    };
  }

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

function getDescription(cve = {}) {
  const descriptions = Array.isArray(cve.descriptions) ? cve.descriptions : [];
  return (
    descriptions.find((d) => d?.lang === "en")?.value ||
    descriptions[0]?.value ||
    "No description available"
  );
}

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

function pickBetterCvss(current, incoming) {
  if (!current) return incoming;
  return compareCvss(current, incoming) > 0 ? incoming : current;
}

function getReferences(cve = {}) {
  return Array.isArray(cve.references)
    ? cve.references.map((ref) => ({
        url: ref.url || null,
        source: ref.source || null,
        tags: Array.isArray(ref.tags) ? ref.tags : []
      }))
    : [];
}

function getVendorComments(cve = {}) {
  return Array.isArray(cve.vendorComments)
    ? cve.vendorComments.map((comment) => ({
        organization: comment.organization || null,
        comment: comment.comment || null,
        lastModified: comment.lastModified || null
      }))
    : [];
}

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

function dedupeByUrl(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.url || JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeComments(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item?.organization || ""}|${item?.comment || ""}|${item?.lastModified || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
    // references: dedupeByUrl([...(existing.references || []), ...(incoming.references || [])]),
    // vendorComments: dedupeComments([
    //  ...(existing.vendorComments || []),
    //  ...(incoming.vendorComments || [])
    //])
  };
}

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

async function getCvesByCpe(
  cpe,
  {
    apiKey = null,
    maxToReturn = 25,
    maxToFetch = 100,
    resultsPerPage = 50
  } = {}
) {
  if (!cpe || typeof cpe !== "string") {
    throw new Error("cpe must be a non-empty string");
  }

  const byId = new Map();
  let startIndex = 0;
  const perPage = Math.min(resultsPerPage, maxToFetch);

  while (byId.size < maxToFetch) {
    const params = buildNvdQueryParams(cpe, startIndex, perPage);

    const response = await axios.get(NVD_BASE, {
      headers: {
        accept: "application/json",
        ...(apiKey ? { apiKey } : {})
      },
      params
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
  return selectTopVulnerabilities(ranked, maxToReturn);
}

function selectTopVulnerabilities(cves, limit = 10) {
  return cves.slice(0, limit);
}

exports.fetchCVEs = async (cpe) => {
  console.log("Querying NVD for:", cpe);

  try {
    return await getCvesByCpe(cpe, {
      apiKey: process.env.NVD_API_KEY || null,
      maxToReturn: 10,
      maxToFetch: 100,
      resultsPerPage: 50
    });
  } catch (err) {
    const status = err.response?.status;

    // NVD returns 404 when no CVEs match the query — treat as empty result
    if (status === 404) {
      console.log(`[NVD] No CVEs found for ${cpe} (404)`);
      return [];
    }

    const statusText = err.response?.statusText || "";
    const data = err.response?.data || "";

    throw new Error(
      `NVD request failed: HTTP ${status} ${statusText} ${String(data).slice(0, 200)}`
    );
  }
};