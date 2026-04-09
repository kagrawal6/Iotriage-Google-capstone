import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers, errorHandlers } from "../helpers/msw-handlers";
import { mockScanInput, mockScanResponse, mockMitigationResponse } from "../helpers/mockData";
import { uploadScan, fetchMitigation } from "../../src/services/api";

// ── MSW server setup ──
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("API Service Layer", () => {
  describe("uploadScan()", () => {
    it("sends scan data and returns devices + vulnerabilities", async () => {
      const result = await uploadScan(mockScanInput);

      expect(result).toEqual(mockScanResponse);
      expect(result.devices).toHaveLength(2);
      expect(result.vulnerabilities).toHaveLength(2);
    });

    it("returns devices with correct structure", async () => {
      const result = await uploadScan(mockScanInput);

      const device = result.devices[0];
      expect(device.ipAddress).toBe("192.168.1.1");
      expect(device.macAddress).toBe("AA:BB:CC:DD:EE:01");
      expect(device.deviceName).toBe("router.local");
      expect(device.openPorts).toHaveLength(2);
    });

    it("returns vulnerabilities with CVE IDs and no pre-generated mitigation", async () => {
      const result = await uploadScan(mockScanInput);

      const vuln = result.vulnerabilities[0];
      expect(vuln.cveId).toBe("CVE-2021-23017");
      expect(vuln.severity).toBe("HIGH");
      expect(vuln.deviceIp).toBe("192.168.1.1");
      expect(vuln.mitigation).toBeUndefined();
    });

    it("throws an error when backend returns 500", async () => {
      server.use(...errorHandlers);

      await expect(uploadScan(mockScanInput)).rejects.toThrow(/failed/i);
    });
  });

  describe("fetchMitigation()", () => {
    it("returns mitigation for one vulnerability", async () => {
      const result = await fetchMitigation({
        cveId: "CVE-2021-23017",
        severity: "HIGH",
        description: "Nginx resolver issue",
        deviceIp: "192.168.1.1",
      });

      expect(result).toEqual(mockMitigationResponse.mitigation);
      expect(result.cveId).toBe("CVE-2021-23017");
    });

    it("throws an error when backend returns 500", async () => {
      server.use(...errorHandlers);

      await expect(fetchMitigation({ cveId: "CVE-2021-23017" })).rejects.toThrow(/failed/i);
    });
  });
});
