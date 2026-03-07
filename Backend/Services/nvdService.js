/**
 * nvdService.js
 * -------------
 * Handles communication with the National Vulnerability Database (NVD).
 */

const axios = require("axios");

const NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const NVD_API_KEY = "41efb0c3-9d9b-43de-9c6d-e8333e5bd998"

function extractCvss(metrics = {}) {


  // v4
  const v4 = metrics.cvssMetricV40?.[0]?.cvssData || metrics.cvssMetric4?.[0]?.cvssData;
  if (v4?.baseScore != null) {
    return { version: "4.0", score: v4.baseScore, severity: v4.baseSeverity ?? null };
  }
  // v3.1
  const v31 = metrics.cvssMetricV31?.[0]?.cvssData;
  if (v31?.baseScore != null) {
    return { version: "3.1", score: v31.baseScore, severity: v31.baseSeverity ?? null };
  }

  // v3.0
  const v30 = metrics.cvssMetricV30?.[0]?.cvssData;
  if (v30?.baseScore != null) {
    return { version: "3.0", score: v30.baseScore, severity: v30.baseSeverity ?? null };
  }

  // v2
  const v2 = metrics.cvssMetricV2?.[0]?.cvssData;
  if (v2?.baseScore != null) {
    // v2 doesn’t always have "baseSeverity" - TODO: how to compute it ?
    return { version: "2.0", score: v2.baseScore, severity: null };
  }

  return { version: null, score: null, severity: null };
}


function getDescription(cve = {}) {
  const descriptions = Array.isArray(cve.description) ? cve.description : [];
  return (
    descriptions.find((d) => d?.lang === "en")?.value ||
    descriptions[0]?.value ||
    "No description available"
  );

}


function severityRank(severity){
  switch((severity || "").toUpperCase()){
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
  const versionOrder = {
    "4.0": 4,
    "3.1": 3,
    "3.0": 2,
    "2.0": 1,
    null: 0
  };

  const aVer = versionOrder[a?.version ?? null] ?? 0; // cool so you fall back to null if a's version not present
  const bVer = versionOrder[a?.version ?? null] ?? 0;


  if (aVersion !== bVersion) return bVersion - aVersion;

  const aScore = a?.score ?? -1; 
  const bScore = b?.score ?? -1;
  if (aScore !== bScore) return bScore - aScore;

  const aSeverity = severityRank(a?.severity);
  const bSeverity = severityRank(b?.severity);
  return bSeverity - aSeverity;

}


function betterCvss(current, incoming) {
  if (!current) return incoming;
  return compareCvss(current, incoming) > 0 ? incoming : current;
}


function filterVersions(){

}

/**
 * NVD lookup: given a CPE 2.3 string, returns a compact list of CVEs.
 * TODO - change return results to more fields
 * TODO - ad pagination support as well
 */
async function getCvesByCpe(cpeName, { apiKey = null, maxToReturn = 25 } = {}) {
  if (!cpeName || typeof cpeName !== "string") {
    throw new Error("cpeName must be a non-empty string");
  }

  const collected = [];
  let startIndex = 0;
  const resultsPerPage = Math.min(maxToReturn, 50); // TODO - later do pagination

  while (collected.length < maxToReturn) {
    const url = new URL(NVD_BASE);
    url.searchParams.set("cpeName", cpeName);
    url.searchParams.set("resultsPerPage", String(resultsPerPage));
    url.searchParams.set("startIndex", String(startIndex));
    // if (apiKey) url.searchParams.set("apiKey", apiKey);

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: { "accept": "application/json", "apiKey": apiKey ?? "" }
    });



    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`NVD request failed: HTTP ${resp.status} ${resp.statusText} ${text.slice(0, 200)}`);
    }

    const data = await resp.json();
    const vulns = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];

    for (const v of vulns) {
      const cve = v?.cve || {}; // access v if it is not null/undefined else empty object
      const cveId = cve.id || null;

      // description 
      const description = cve.descriptions.find(d => d.lang === "en")?.value || cve.descriptions[0]?.value;

      const { score, severity, version } = extractCvss(cve.metrics || {});

      collected.push({
        cveId,
        description,
        cvss: { version, score, severity },
        published: cve.published || null,
        lastModified: cve.lastModified || null
      });

      if (collected.length >= maxToReturn) break;

    // collected.push(v?.descriptions||null);
    }

    

    const total = Number(data.totalResults || 0);
    startIndex += vulns.length;

    // stop if no more data
    if (vulns.length === 0 || startIndex >= total) break;
  }

  return collected;
}

/**
 * Fetches CVEs associated with a given CPE string.
 * @param {string} cpe - CPE identifier
 * @returns {Promise<Array<Object>>} List of CVE objects
 */
exports.fetchCVEs = async (cpe) => {
  console.log("Querying NVD for:", cpe);

  return getCvesByCpe(cpe, {
    apiKey: NVD_API_KEY || null,
    maxToReturn: 25,
    maxToFetch: 100,
    resultsPerPage: 50
  });
};