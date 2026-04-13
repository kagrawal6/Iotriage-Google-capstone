/**
 * nvdService.js
 * -------------
 * Handles communication with the National Vulnerability Database (NVD).
 *
 * Responsibilities:
 *  - Query the NVD CVE API using a CPE string
 *  - For versioned CPEs, use virtualMatchString + versionStart/versionEnd
 *  - Normalize CVE records into a simplified internal structure
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
const CVE_LOOKBACK_YEARS = 10;

function buildNvdQueryParams(cpe, startIndex, resultsPerPage) {
  const { part, vendor, product, version } = parseCpe23(cpe);
  const hasConcreteVersion = version && version !== "*" && version !== "-";

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - CVE_LOOKBACK_YEARS);

  const params = {
    startIndex,
    resultsPerPage,
    pubStartDate: cutoff.toISOString().replace(/\.\d{3}Z$/, ".000"),
  };

  if (hasConcreteVersion) {
    params.cpeName = `cpe:2.3:${part}:${vendor}:${product}:${version}`;
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
    // references: dedupeByUrl(getReferences(cve)),
    vendorComments: dedupeComments(getVendorComments(cve))
  };
}

/**
 * Check whether a CPE criteria string matches our queried CPE.
 * Compares part, vendor, and product — treats "*" as a wildcard that matches
 * anything.  Version matching is left to NVD (it already filtered by version
 * via cpeName / versionStart / versionEnd in the API query).
 */
function cpeMatchesQuery(criteria, queriedCpe) {
  if (!criteria || !queriedCpe) return false;
  const c = criteria.split(":");
  const q = queriedCpe.split(":");
  // indices: 0=cpe, 1=2.3, 2=part, 3=vendor, 4=product
  if (c.length < 5 || q.length < 5) return false;

  const partMatch    = c[2] === "*" || q[2] === "*" || c[2] === q[2];
  const vendorMatch  = c[3] === "*" || q[3] === "*" || c[3] === q[3];
  const productMatch = c[4] === "*" || q[4] === "*" || c[4] === q[4];

  return partMatch && vendorMatch && productMatch;
}

/**
 * Determine whether a CVE should be discarded because our queried CPE only
 * matched as a non-vulnerable platform — not as the actual broken component.
 *
 * Uses the `vulnerable` flag that NVD sets on every cpeMatch entry:
 *   - vulnerable: true  → this component has the bug
 *   - vulnerable: false → this component is just a required platform / environment
 *
 * NVD configuration tree structure:
 *   configurations[]            ← array of independent rules (implicitly OR'd)
 *     └─ nodes[]                ← array of groups (AND or OR'd together)
 *          └─ cpeMatch[]        ← individual CPE entries with { criteria, vulnerable }
 *
 * We discard when:
 *   1. Our CPE matches at least one entry with vulnerable: false
 *   2. The same CVE has at least one entry (anywhere) with vulnerable: true
 *   3. Our CPE does NOT also match any entry with vulnerable: true
 *
 * If all three hold, our device is just the platform and the real vulnerability
 * is in some other component we can't verify.
 */
function shouldDiscardPlatformMatch(cve, queriedCpe) {
  const configurations = Array.isArray(cve.configurations) ? cve.configurations : [];

  let matchedAsNotVulnerable = false; // our CPE matched a vulnerable:false entry
  let matchedAsVulnerable = false;    // our CPE matched a vulnerable:true entry
  let anyVulnerableExists = false;    // any entry at all with vulnerable:true

  for (const config of configurations) {
    const nodes = Array.isArray(config.nodes) ? config.nodes : [];
    for (const node of nodes) {
      const matches = Array.isArray(node.cpeMatch) ? node.cpeMatch : [];
      for (const m of matches) {
        if (m.vulnerable === true) {
          anyVulnerableExists = true;
          if (cpeMatchesQuery(m.criteria, queriedCpe)) {
            matchedAsVulnerable = true;
          }
        } else if (m.vulnerable === false) {
          if (cpeMatchesQuery(m.criteria, queriedCpe)) {
            matchedAsNotVulnerable = true;
          }
        }
      }
    }
  }

  // Discard: we matched only as a platform, and the real vuln is something else
  if (matchedAsNotVulnerable && anyVulnerableExists && !matchedAsVulnerable) {
    console.log(
      `[NVD Filter] Discarding ${cve.id} — queried CPE matched as vulnerable:false (platform only)`
    );
    return true;
  }

  return false;
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * NVD rate limits: 5 requests / 30 s without an API key, 50 / 30 s with one.
 * We wait between paginated requests to stay well inside both limits.
 * On a 429 we back off and retry once before giving up.
 */
async function nvdGet(url, params, headers, isAuthenticated) {
  const INTER_PAGE_DELAY_MS = isAuthenticated ? 700 : 6500; // ~50/30s vs ~4/30s
  const MAX_RETRIES = 1; // TODO: re-enable retry (set back to 2)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = 35_000 * attempt;
        console.warn(`[NVD] 429 received — waiting ${backoff / 1000}s before retry ${attempt}`);
        await sleep(backoff);
      }

      const response = await axios.get(url, { headers, params });

      // Successful response — wait before next call to respect rate limits
      await sleep(INTER_PAGE_DELAY_MS);
      return response;
    } catch (err) {
      // axios throws on non-2xx — check if it's a 429 we can retry
      if (err.response?.status === 429 && attempt < MAX_RETRIES - 1) {
        console.warn(`[NVD] 429 on attempt ${attempt + 1}/${MAX_RETRIES}`);
        continue; // retry after backoff on next iteration
      }
      // Not a 429, or out of retries — let it bubble up
      throw err;
    }
  }
}

async function getCvesByCpe(
  cpe,
  {
    apiKey = null,
    maxToReturn = 25,
    maxToFetch = 50,
    resultsPerPage = 50
  } = {}
) {
  if (!cpe || typeof cpe !== "string") {
    throw new Error("cpe must be a non-empty string");
  }

  const isAuthenticated = Boolean(apiKey);
  const cves = [];
  let startIndex = 0;
  const perPage = Math.min(resultsPerPage, maxToFetch);

  while (cves.length < maxToFetch) {
    const params = buildNvdQueryParams(cpe, startIndex, perPage);
    const headers = {
      accept: "application/json",
      ...(apiKey ? { apiKey } : {})
    };

    const response = await nvdGet(NVD_BASE, params, headers, isAuthenticated);

    const data = response.data || {};
    const vulns = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];
    const total = Number(data.totalResults || 0);

    for (const vuln of vulns) {
      const cveId = vuln?.cve?.id || "unknown";
      const status = vuln?.cve?.vulnStatus;

      // Only keep CVEs that have been fully reviewed by NVD.
      // "Deferred" entries are deprioritized (often older/less critical);
      // other statuses like "Modified" or "Awaiting Analysis" are incomplete.
      // TODO: keep modified but depriotize?
      if (status !== "Analyzed" && status !== "Modified") {
        console.log(`[NVD Filter] Skipping ${cveId} — vulnStatus: ${status}`);
        continue;
      }

      // Discard CVEs where our CPE only matched as a non-vulnerable platform
      // (vulnerable: false) and the real bug is in another component
      // (vulnerable: true) that we can't verify.
      if (shouldDiscardPlatformMatch(vuln?.cve || {}, cpe)) continue;

      const normalized = normalizeCve(vuln);
      if (!normalized) continue;

      cves.push(normalized);

      if (cves.length >= maxToFetch) break;
    }

    startIndex += vulns.length;

    if (vulns.length === 0 || startIndex >= total) break;
  }

  const ranked = sortCves(cves);
  return selectTopVulnerabilities(ranked, maxToReturn);
}

function selectTopVulnerabilities(cves, limit = 10) {
  return cves.slice(0, limit);
}

exports.fetchCVEs = async (cpe) => {
  // Skip CPEs with no concrete version — without one, NVD has no filter to apply
  const { version } = parseCpe23(cpe);
  if (!version || version === "*" || version === "-") {
    console.log(`[NVD] Skipping versionless CPE: ${cpe}`);
    return [];
  }

  console.log("Querying NVD for:", cpe);

  try {
    return await getCvesByCpe(cpe, {
      apiKey: process.env.NVD_API_KEY || null,
      maxToReturn: 10,
      maxToFetch: 20,
      resultsPerPage: 20
    });
  } catch (err) {
    const status = err.response?.status;

    // NVD returns 404 when no CVEs match the query — treat as empty result
    if (status === 404) {
      console.log(`[NVD] No CVEs found for ${cpe} (404)`);
      return [];
    }

    // Rate limit — bubble up with a clear message
    if (status === 429) {
      throw new Error(
        "NVD rate limit exceeded. Set NVD_API_KEY for a higher quota (50 req/30 s)."
      );
    }

    // No response at all — network error, timeout, DNS failure, etc.
    if (!err.response) {
      console.error(`[NVD] Network error for ${cpe}:`, err.message);
      throw new Error(`NVD request failed: ${err.message || "network error (no response)"}`);
    }

    const statusText = err.response?.statusText || "";
    const data = err.response?.data || "";

    throw new Error(
      `NVD request failed: HTTP ${status} ${statusText} ${String(data).slice(0, 200)}`
    );
  }
};