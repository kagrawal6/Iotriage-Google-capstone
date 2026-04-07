/**
 * cpeToLlm.integration.test.js
 * ----------------------------
 * Integration tests: CPE string → NVD CVE lookup → Vulnerability → LLM mitigation.
 * External HTTP calls (NVD API, CISA KEV, Gemini) are mocked via Module._load.
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const nvdServicePath = path.resolve(__dirname, "../Services/nvdService.js");
const llmServicePath = path.resolve(__dirname, "../Services/llmService.js");

// ── NVD response helpers ───────────────────────────────────────────────────

function makeNvdVuln({ id, description, score, severity, status = "Analyzed" }) {
  return {
    cve: {
      id,
      vulnStatus: status,
      descriptions: [{ lang: "en", value: description }],
      metrics: {
        cvssMetricV31: [{ cvssData: { baseScore: score, baseSeverity: severity } }],
      },
      published: "2023-01-01T00:00:00.000",
      lastModified: "2023-06-01T00:00:00.000",
      configurations: [],
      vendorComments: [],
    },
  };
}

function makeNvdResponse(vulns) {
  return { data: { totalResults: vulns.length, vulnerabilities: vulns } };
}

// ── Module mock loader factory ─────────────────────────────────────────────

function loadServicesWithMocks({ nvdVulns = [], mitigationJson = null, cisaVulns = [] } = {}) {
  // Clear cached modules so mocks take effect
  delete require.cache[nvdServicePath];
  delete require.cache[llmServicePath];

  const original = Module._load;

  const defaultMitigation = mitigationJson || {
    mitigations: nvdVulns.map(v => ({
      cveId: v.cve.id,
      deviceIp: "192.168.1.1",
      riskSummary: `Risk for ${v.cve.id}`,
      priority: v.cve.metrics.cvssMetricV31[0].cvssData.baseSeverity,
      steps: ["Apply patch", "Restart service"],
      verification: "Check version number",
      ransomwareWarning: null,
    })),
  };

  Module._load = function patchedLoader(request, parent, isMain) {
    if (request === "axios") {
      return {
        get: async (url) => {
          // CISA KEV endpoint
          if (url.includes("cisa.gov")) {
            return { data: { vulnerabilities: cisaVulns } };
          }
          // NVD API endpoint — return 0ms delay by not calling sleep
          return makeNvdResponse(nvdVulns);
        },
      };
    }

    if (request === "@google/generative-ai") {
      return {
        GoogleGenerativeAI: class {
          getGenerativeModel() {
            return {
              generateContent: async () => ({
                response: { text: () => JSON.stringify(defaultMitigation) },
              }),
            };
          }
        },
      };
    }

    return original(request, parent, isMain);
  };

  const nvdService = require(nvdServicePath);
  const llmService = require(llmServicePath);

  function cleanup() {
    Module._load = original;
    delete require.cache[nvdServicePath];
    delete require.cache[llmServicePath];
  }

  return { nvdService, llmService, cleanup };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Integration: CPE → NVD → Vulnerability → LLM mitigation", () => {

  it("full pipeline returns mitigation steps for a CVE found via CPE", async () => {
    const { nvdService, llmService, cleanup } = loadServicesWithMocks({
      nvdVulns: [
        makeNvdVuln({
          id: "CVE-2023-1234",
          description: "Remote code execution in ExampleLib",
          score: 9.8,
          severity: "CRITICAL",
        }),
      ],
    });

    try {
      // Step 1: CPE → NVD
      const cves = await nvdService.fetchCVEs("cpe:2.3:a:example:lib:1.0.0:*:*:*:*:*:*:*");
      assert.equal(cves.length, 1);
      assert.equal(cves[0].cveId, "CVE-2023-1234");
      assert.equal(cves[0].cvss.severity, "CRITICAL");

      // Step 2: NVD result → Vulnerability shape (mimic scanController)
      const Vulnerability = require("../Models/vulnerability");
      const vulns = cves.map(cve => new Vulnerability({ ...cve, deviceIp: "192.168.1.1" }));
      assert.equal(vulns[0].deviceIp, "192.168.1.1");
      assert.equal(vulns[0].severity, "CRITICAL");

      // Step 3: Vulnerability → LLM mitigation
      const mitigations = await llmService.createMitigationSteps(vulns);
      assert.equal(mitigations.length, 1);
      assert.equal(mitigations[0].cveId, "CVE-2023-1234");
      assert.deepEqual(mitigations[0].steps, ["Apply patch", "Restart service"]);
      assert.equal(mitigations[0].priority, "CRITICAL");
      assert.equal(mitigations[0].verification, "Check version number");
    } finally {
      cleanup();
    }
  });

  it("pipeline handles multiple CVEs from a single CPE", async () => {
    const { nvdService, llmService, cleanup } = loadServicesWithMocks({
      nvdVulns: [
        makeNvdVuln({ id: "CVE-2023-0001", description: "Vuln A", score: 7.5, severity: "HIGH" }),
        makeNvdVuln({ id: "CVE-2023-0002", description: "Vuln B", score: 5.0, severity: "MEDIUM" }),
      ],
    });

    try {
      const cves = await nvdService.fetchCVEs("cpe:2.3:a:vendor:product:2.0:*:*:*:*:*:*:*");
      assert.equal(cves.length, 2);

      const Vulnerability = require("../Models/vulnerability");
      const vulns = cves.map(cve => new Vulnerability({ ...cve, deviceIp: "10.0.0.5" }));

      const mitigations = await llmService.createMitigationSteps(vulns);
      assert.equal(mitigations.length, 2);

      const ids = mitigations.map(m => m.cveId);
      assert.ok(ids.includes("CVE-2023-0001"));
      assert.ok(ids.includes("CVE-2023-0002"));
    } finally {
      cleanup();
    }
  });

  it("pipeline returns empty when NVD finds no CVEs for a CPE", async () => {
    const { nvdService, llmService, cleanup } = loadServicesWithMocks({ nvdVulns: [] });

    try {
      const cves = await nvdService.fetchCVEs("cpe:2.3:a:safe:product:1.0:*:*:*:*:*:*:*");
      assert.equal(cves.length, 0);

      const mitigations = await llmService.createMitigationSteps(cves);
      assert.deepEqual(mitigations, []);
    } finally {
      cleanup();
    }
  });

  it("CISA KEV data is included in LLM prompt when CVE is in the catalog", async () => {
    const capturedPrompts = [];

    const { nvdService, llmService, cleanup } = loadServicesWithMocks({
      nvdVulns: [
        makeNvdVuln({ id: "CVE-2023-9999", description: "Known exploited vuln", score: 9.0, severity: "CRITICAL" }),
      ],
      cisaVulns: [
        {
          cveID: "CVE-2023-9999",
          vendorProject: "Acme",
          product: "Router",
          shortDescription: "Used in the wild",
          requiredAction: "Patch immediately",
          knownRansomwareCampaignUse: "Known",
        },
      ],
    });

    // Override generateContent to capture the prompt
    const origLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === "@google/generative-ai") {
        return {
          GoogleGenerativeAI: class {
            getGenerativeModel() {
              return {
                generateContent: async (prompt) => {
                  capturedPrompts.push(prompt);
                  return {
                    response: {
                      text: () => JSON.stringify({
                        mitigations: [{
                          cveId: "CVE-2023-9999",
                          deviceIp: "192.168.1.1",
                          riskSummary: "Critical exploited vuln",
                          priority: "CRITICAL",
                          steps: ["Patch immediately per CISA"],
                          verification: "Verify patch applied",
                          ransomwareWarning: "Known ransomware use",
                        }],
                      }),
                    },
                  };
                },
              };
            }
          },
        };
      }
      return origLoad(request, parent, isMain);
    };

    try {
      const cves = await nvdService.fetchCVEs("cpe:2.3:a:acme:router:1.0:*:*:*:*:*:*:*");
      const Vulnerability = require("../Models/vulnerability");
      const vulns = cves.map(cve => new Vulnerability({ ...cve, deviceIp: "192.168.1.1" }));
      const mitigations = await llmService.createMitigationSteps(vulns);

      assert.equal(mitigations.length, 1);
      assert.ok(
        capturedPrompts[0].includes("CISA Known Exploited: YES"),
        "Prompt should include CISA KEV data"
      );
      assert.ok(
        capturedPrompts[0].includes("Patch immediately"),
        "Prompt should include CISA required action"
      );
      assert.equal(mitigations[0].ransomwareWarning, "Known ransomware use");
    } finally {
      Module._load = origLoad;
      cleanup();
    }
  });

  it("LLM fallback is used when Gemini returns invalid JSON", async () => {
    // Override to return bad JSON from Gemini
    delete require.cache[llmServicePath];
    const original = Module._load;

    Module._load = function (request, parent, isMain) {
      if (request === "axios") {
        return { get: async () => ({ data: { vulnerabilities: [] } }) };
      }
      if (request === "@google/generative-ai") {
        return {
          GoogleGenerativeAI: class {
            getGenerativeModel() {
              return {
                generateContent: async () => ({
                  response: { text: () => "not valid json {{" },
                }),
              };
            }
          },
        };
      }
      return original(request, parent, isMain);
    };

    const llmService = require(llmServicePath);

    try {
      const Vulnerability = require("../Models/vulnerability");
      const vuln = new Vulnerability({
        cveId: "CVE-2023-5555",
        description: "Some vulnerability",
        cvss: { score: 6.0, severity: "MEDIUM" },
        deviceIp: "10.0.0.1",
      });

      const mitigations = await llmService.createMitigationSteps([vuln]);
      assert.equal(mitigations.length, 1);
      assert.equal(mitigations[0].cveId, "CVE-2023-5555");
      assert.match(mitigations[0].mitigation, /could not generate specific steps/i);
    } finally {
      Module._load = original;
      delete require.cache[llmServicePath];
    }
  });
});
