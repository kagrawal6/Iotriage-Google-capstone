import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers, errorHandlers } from "../helpers/msw-handlers";
import { mockScanInput, mockScanResponse, mockChatResponse } from "../helpers/mockData";
import { uploadScan, sendChatMessage } from "../../src/services/api";

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

    it("returns vulnerabilities with CVE IDs and mitigations", async () => {
      const result = await uploadScan(mockScanInput);

      const vuln = result.vulnerabilities[0];
      expect(vuln.cveId).toBe("CVE-2021-23017");
      expect(vuln.severity).toBe("HIGH");
      expect(vuln.deviceIp).toBe("192.168.1.1");
      expect(vuln.mitigation).toBeTruthy();
    });

    it("throws an error when backend returns 500", async () => {
      server.use(...errorHandlers);

      await expect(uploadScan(mockScanInput)).rejects.toThrow(/failed/i);
    });
  });

  describe("sendChatMessage()", () => {
    it("sends a message and returns AI reply", async () => {
      const history = [{ role: "user", content: "Hello" }];
      const result = await sendChatMessage(history, "What is CVE-2021-23017?");

      expect(result).toEqual(mockChatResponse);
      expect(result.reply).toContain("CVE-2021-23017");
    });

    it("throws an error when backend returns 500", async () => {
      server.use(...errorHandlers);

      await expect(
        sendChatMessage([], "Hello")
      ).rejects.toThrow(/failed/i);
    });
  });
});
