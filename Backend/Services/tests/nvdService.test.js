const nvdService = require("../nvdService");
const axios = require("axios");

jest.mock("axios");

describe("nvdService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns normalized CVEs from NVD response", async () => {
    axios.get.mockResolvedValue({
      data: {
        totalResults: 1,
        vulnerabilities: [
          {
            cve: {
              id: "CVE-2021-45105",
              descriptions: [
                { lang: "en", value: "Test vulnerability description" }
              ],
              metrics: {
                cvssMetricV31: [
                  {
                    cvssData: {
                      baseScore: 5.9,
                      baseSeverity: "MEDIUM"
                    }
                  }
                ]
              },
              published: "2021-12-14T19:15:07.733",
              lastModified: "2025-10-27T17:35:56.240",
              references: [
                {
                  url: "https://example.com/advisory",
                  source: "vendor",
                  tags: ["Vendor Advisory"]
                }
              ],
              vendorComments: [
                {
                  organization: "apache",
                  comment: "Example comment",
                  lastModified: "2021-12-14"
                }
              ]
            }
          }
        ]
      }
    });

    const result = await nvdService.fetchCVEs(
      "cpe:2.3:a:apache:log4j:2.16.0:*:*:*:*:*:*:*"
    );

    expect(axios.get).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      cveId: "CVE-2021-45105",
      description: "Test vulnerability description",
      cvss: {
        version: "3.1",
        score: 5.9,
        severity: "MEDIUM"
      },
      published: "2021-12-14T19:15:07.733",
      lastModified: "2025-10-27T17:35:56.240",
      references: [
        {
          url: "https://example.com/advisory",
          source: "vendor",
          tags: ["Vendor Advisory"]
        }
      ],
      vendorComments: [
        {
          organization: "apache",
          comment: "Example comment",
          lastModified: "2021-12-14"
        }
      ]
    });
  });

  test("dedupes repeated CVE IDs and keeps better CVSS", async () => {
    axios.get.mockResolvedValue({
      data: {
        totalResults: 2,
        vulnerabilities: [
          {
            cve: {
              id: "CVE-1",
              descriptions: [{ lang: "en", value: "desc" }],
              metrics: {
                cvssMetricV31: [
                  {
                    cvssData: {
                      baseScore: 5.0,
                      baseSeverity: "MEDIUM"
                    }
                  }
                ]
              },
              published: "2021-01-01T00:00:00.000",
              lastModified: "2021-01-01T00:00:00.000",
              references: []
            }
          },
          {
            cve: {
              id: "CVE-1",
              descriptions: [{ lang: "en", value: "desc" }],
              metrics: {
                cvssMetricV31: [
                  {
                    cvssData: {
                      baseScore: 9.0,
                      baseSeverity: "CRITICAL"
                    }
                  }
                ]
              },
              published: "2021-01-01T00:00:00.000",
              lastModified: "2025-01-01T00:00:00.000",
              references: []
            }
          }
        ]
      }
    });

    const result = await nvdService.fetchCVEs(
      "cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*"
    );

    expect(result).toHaveLength(1);
    expect(result[0].cveId).toBe("CVE-1");
    expect(result[0].cvss.score).toBe(9.0);
    expect(result[0].cvss.severity).toBe("CRITICAL");
  });

  test("throws when NVD returns an error", async () => {
    axios.get.mockRejectedValue({
      response: {
        status: 404,
        statusText: "Not Found",
        data: "bad request"
      }
    });

    await expect(
      nvdService.fetchCVEs("cpe:2.3:a:test:test:1.0:*:*:*:*:*:*:*")
    ).rejects.toThrow("NVD request failed");
  });
});