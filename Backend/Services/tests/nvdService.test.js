const nvdService = require("../nvdService");
const axios = require("axios");

jest.mock("axios");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid NVD vulnerability object. */
function makeVuln({
  id = "CVE-2021-00001",
  description = "A test vulnerability",
  score = 7.5,
  severity = "HIGH",
  cvssVersion = "31",
  published = "2021-01-01T00:00:00.000",
  lastModified = "2021-06-01T00:00:00.000",
  vulnStatus = "Analyzed",
  configurations = [],
  vendorComments = []
} = {}) {
  const metricsKey = `cvssMetricV${cvssVersion}`;
  return {
    cve: {
      id,
      vulnStatus,
      descriptions: [{ lang: "en", value: description }],
      metrics: {
        [metricsKey]: [{ cvssData: { baseScore: score, baseSeverity: severity } }]
      },
      published,
      lastModified,
      configurations,
      vendorComments
    }
  };
}

/** Wrap vulns in a standard NVD API response envelope. */
function makeResponse(vulns) {
  return { data: { totalResults: vulns.length, vulnerabilities: vulns } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("nvdService.fetchCVEs", () => {
  beforeEach(() => jest.clearAllMocks());

  // --- Basic normalisation ---------------------------------------------------

  test("normalises a single Analyzed CVE into the expected shape", async () => {
    axios.get.mockResolvedValue(
      makeResponse([
        makeVuln({
          id: "CVE-2021-45105",
          description: "Apache Log4j2 vulnerability",
          score: 5.9,
          severity: "MEDIUM",
          published: "2021-12-14T19:15:07.733",
          lastModified: "2025-10-27T17:35:56.240",
          vendorComments: [
            { organization: "apache", comment: "Fix released", lastModified: "2021-12-15" }
          ]
        })
      ])
    );

    const results = await nvdService.fetchCVEs(
      "cpe:2.3:a:apache:log4j:2.16.0:*:*:*:*:*:*:*"
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      cveId: "CVE-2021-45105",
      description: "Apache Log4j2 vulnerability",
      cvss: { version: "3.1", score: 5.9, severity: "MEDIUM" },
      published: "2021-12-14T19:15:07.733",
      lastModified: "2025-10-27T17:35:56.240",
      vendorComments: [
        { organization: "apache", comment: "Fix released", lastModified: "2021-12-15" }
      ]
    });
    // references field must not exist (it is commented out in the service)
    expect(results[0]).not.toHaveProperty("references");
  });

  test("returns empty array when NVD returns no vulnerabilities", async () => {
    axios.get.mockResolvedValue(makeResponse([]));
    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*");
    expect(results).toEqual([]);
  });

  // --- vulnStatus filter -----------------------------------------------------

  test("keeps only CVEs with vulnStatus=Analyzed", async () => {
    axios.get.mockResolvedValue(
      makeResponse([
        makeVuln({ id: "CVE-ANALYZED",  vulnStatus: "Analyzed"  }),
        makeVuln({ id: "CVE-DEFERRED",  vulnStatus: "Deferred"  }),
        makeVuln({ id: "CVE-MODIFIED",  vulnStatus: "Modified"  }),
        makeVuln({ id: "CVE-AWAITING",  vulnStatus: "Awaiting Analysis" })
      ])
    );

    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:prod:1.0:*:*:*:*:*:*:*");

    expect(results).toHaveLength(1);
    expect(results[0].cveId).toBe("CVE-ANALYZED");
  });

  // --- AND-config wildcard filter --------------------------------------------

  test("discards CVE where our CPE only matched a fully-wildcarded AND node with a specific sibling", async () => {
    // Our query is for an OS.  NVD returned a CVE whose AND config has:
    //   Node 0: wildcard OS (matched us)
    //   Node 1: specific Apache app (we cannot confirm this is on the device)
    const wildcardsAndApache = [
      {
        operator: "AND",
        nodes: [
          {
            cpeMatch: [{ criteria: "cpe:2.3:o:*:*:*:*:*:*:*:*:*:*:*", vulnerable: false }]
          },
          {
            cpeMatch: [{ criteria: "cpe:2.3:a:apache:httpd:2.4.51:*:*:*:*:*:*:*", vulnerable: true }]
          }
        ]
      }
    ];

    axios.get.mockResolvedValue(
      makeResponse([makeVuln({ id: "CVE-FALSE-POSITIVE", configurations: wildcardsAndApache })])
    );

    const results = await nvdService.fetchCVEs("cpe:2.3:o:linux:linux_kernel:5.4:*:*:*:*:*:*:*");

    expect(results).toHaveLength(0);
  });

  test("keeps CVE where our OS is specifically named in an AND node (not a wildcard)", async () => {
    // Node 0: specifically names linux 5.4 — our device is explicitly listed
    // Node 1: specific Apache app
    const specificOsAndApache = [
      {
        operator: "AND",
        nodes: [
          {
            cpeMatch: [{ criteria: "cpe:2.3:o:linux:linux_kernel:5.4:*:*:*:*:*:*:*", vulnerable: false }]
          },
          {
            cpeMatch: [{ criteria: "cpe:2.3:a:apache:httpd:2.4.51:*:*:*:*:*:*:*", vulnerable: true }]
          }
        ]
      }
    ];

    axios.get.mockResolvedValue(
      makeResponse([makeVuln({ id: "CVE-REAL-MATCH", configurations: specificOsAndApache })])
    );

    const results = await nvdService.fetchCVEs("cpe:2.3:o:linux:linux_kernel:5.4:*:*:*:*:*:*:*");

    expect(results).toHaveLength(1);
    expect(results[0].cveId).toBe("CVE-REAL-MATCH");
  });

  test("keeps CVE where ALL nodes in an AND config are wildcarded (applies to every device)", async () => {
    // Both nodes are wildcards — NVD is saying everyone is affected, so keep it
    const allWildcards = [
      {
        operator: "AND",
        nodes: [
          { cpeMatch: [{ criteria: "cpe:2.3:o:*:*:*:*:*:*:*:*:*:*:*", vulnerable: false }] },
          { cpeMatch: [{ criteria: "cpe:2.3:a:*:*:*:*:*:*:*:*:*:*:*", vulnerable: true  }] }
        ]
      }
    ];

    axios.get.mockResolvedValue(
      makeResponse([makeVuln({ id: "CVE-UNIVERSAL", configurations: allWildcards })])
    );

    const results = await nvdService.fetchCVEs("cpe:2.3:o:linux:linux_kernel:5.4:*:*:*:*:*:*:*");

    expect(results).toHaveLength(1);
    expect(results[0].cveId).toBe("CVE-UNIVERSAL");
  });

  // --- CVSS version priority ------------------------------------------------

  test("prefers CVSS 4.0 over older versions", async () => {
    const vuln = makeVuln({ score: 3.0, severity: "LOW", cvssVersion: "31" });
    // Inject a v4 score on top of the v3.1 already set by makeVuln
    vuln.cve.metrics.cvssMetricV40 = [{ cvssData: { baseScore: 9.8, baseSeverity: "CRITICAL" } }];

    axios.get.mockResolvedValue(makeResponse([vuln]));
    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*");

    expect(results[0].cvss).toEqual({ version: "4.0", score: 9.8, severity: "CRITICAL" });
  });

  test("falls back to CVSS 2.0 when no newer score exists", async () => {
    const vuln = makeVuln({});
    vuln.cve.metrics = {
      cvssMetricV2: [{ cvssData: { baseScore: 6.4 }, baseSeverity: "MEDIUM" }]
    };

    axios.get.mockResolvedValue(makeResponse([vuln]));
    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*");

    expect(results[0].cvss.version).toBe("2.0");
    expect(results[0].cvss.score).toBe(6.4);
  });

  test("returns null score when no CVSS metrics exist", async () => {
    const vuln = makeVuln({});
    vuln.cve.metrics = {};

    axios.get.mockResolvedValue(makeResponse([vuln]));
    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*");

    expect(results[0].cvss).toEqual({ version: null, score: null, severity: null });
  });

  // --- Sorting --------------------------------------------------------------

  test("sorts results by CVSS score descending", async () => {
    axios.get.mockResolvedValue(
      makeResponse([
        makeVuln({ id: "CVE-LOW",      score: 3.1, severity: "LOW"      }),
        makeVuln({ id: "CVE-CRITICAL", score: 9.8, severity: "CRITICAL" }),
        makeVuln({ id: "CVE-MEDIUM",   score: 5.5, severity: "MEDIUM"   })
      ])
    );

    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*");

    expect(results.map((r) => r.cveId)).toEqual(["CVE-CRITICAL", "CVE-MEDIUM", "CVE-LOW"]);
  });

  test("breaks score ties using severity rank then lastModified date", async () => {
    axios.get.mockResolvedValue(
      makeResponse([
        makeVuln({ id: "CVE-OLD-HIGH",    score: 7.5, severity: "HIGH", lastModified: "2020-01-01T00:00:00.000" }),
        makeVuln({ id: "CVE-RECENT-HIGH", score: 7.5, severity: "HIGH", lastModified: "2024-01-01T00:00:00.000" })
      ])
    );

    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*");

    expect(results[0].cveId).toBe("CVE-RECENT-HIGH");
  });

  // --- HTTP error handling --------------------------------------------------

  test("returns empty array when NVD responds with 404", async () => {
    axios.get.mockRejectedValue({ response: { status: 404 } });

    await expect(
      nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*")
    ).resolves.toEqual([]);
  });

  test("throws a clear message when NVD responds with 429", async () => {
    axios.get.mockRejectedValue({ response: { status: 429 } });

    await expect(
      nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*")
    ).rejects.toThrow("NVD rate limit exceeded");
  });

  test("throws with HTTP status details for other API errors", async () => {
    axios.get.mockRejectedValue({
      response: { status: 500, statusText: "Internal Server Error", data: "server blew up" }
    });

    await expect(
      nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*")
    ).rejects.toThrow("NVD request failed: HTTP 500");
  });

  // --- Description fallback -------------------------------------------------

  test("falls back to first description when no English entry exists", async () => {
    const vuln = makeVuln({});
    vuln.cve.descriptions = [{ lang: "fr", value: "Description en français" }];

    axios.get.mockResolvedValue(makeResponse([vuln]));
    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*");

    expect(results[0].description).toBe("Description en français");
  });

  test("uses placeholder when no descriptions exist", async () => {
    const vuln = makeVuln({});
    vuln.cve.descriptions = [];

    axios.get.mockResolvedValue(makeResponse([vuln]));
    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*");

    expect(results[0].description).toBe("No description available");
  });

  // --- Vendor comment deduplication -----------------------------------------

  test("deduplicates identical vendor comments", async () => {
    const dupeComment = { organization: "vendor", comment: "same text", lastModified: "2021-01-01" };
    const vuln = makeVuln({ vendorComments: [dupeComment, dupeComment] });

    axios.get.mockResolvedValue(makeResponse([vuln]));
    const results = await nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*");

    expect(results[0].vendorComments).toHaveLength(1);
  });
});