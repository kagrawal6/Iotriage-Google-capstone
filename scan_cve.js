const NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";

/**
 * Extracts best available CVSS score+severity from NVD metrics v1, v2, v3.0/1
 */
function extractCvss(metrics = {}) {
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

/**
 * NVD lookup: given a CPE 2.3 string, returns a compact list of CVEs.
 * - Limits results to `maxToReturn` for demo/perf
 * - Uses pagination so you can expand later
 */
async function getCvesByCpe(cpeName, { apiKey = null, maxToReturn = 25 } = {}) {
  if (!cpeName || typeof cpeName !== "string") {
    throw new Error("cpeName must be a non-empty string");
  }

  const collected = [];
  let startIndex = 0;
  const resultsPerPage = Math.min(maxToReturn, 50);

  while (collected.length < maxToReturn) {
    const url = new URL(NVD_BASE);
    url.searchParams.set("cpeName", cpeName);
    url.searchParams.set("resultsPerPage", String(resultsPerPage));
    url.searchParams.set("startIndex", String(startIndex));
    if (apiKey) url.searchParams.set("apiKey", apiKey);

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: { "accept": "application/json" }
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`NVD request failed: HTTP ${resp.status} ${resp.statusText} ${text.slice(0, 200)}`);
    }

    const data = await resp.json();
    const vulns = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];

    for (const v of vulns) {
      const cve = v?.cve || {};
      const cveId = cve.id || null;

      // description 
      const descArr = Array.isArray(cve.descriptions) ? cve.descriptions : [];
      const description =
        descArr.find(d => d?.lang === "en")?.value ??
        descArr[0]?.value ??
        null;

      const { score, severity, version } = extractCvss(cve.metrics || {});

      collected.push({
        cveId,
        description,
        cvss: { version, score, severity },
        published: cve.published || null,
        lastModified: cve.lastModified || null
      });

      if (collected.length >= maxToReturn) break;
    }

    const total = Number(data.totalResults || 0);
    startIndex += vulns.length;

    // stop if no more data
    if (vulns.length === 0 || startIndex >= total) break;
  }

  return collected;
}

// Example - TODO modify to take cpe from json file 
async function demo() {
  const cpe = "cpe:2.3:a:apache:log4j:2.14.1:*:*:*:*:*:*:*"; // example
  const apiKey = process.env.NVD_API_KEY || null; // with API key you get higher rate tlimits - TODO 

  const results = await getCvesByCpe(cpe, { apiKey, maxToReturn: 10 });
  console.log(`Found ${results.length} CVEs for CPE: ${cpe}`);
  console.log(results.slice(0, 3)); // show first 3 for now 
}

if (require.main === module) {
  demo().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { getCvesByCpe };
