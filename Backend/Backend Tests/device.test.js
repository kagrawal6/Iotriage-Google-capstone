/**
 * device.test.js
 * --------------
 * Tests for Device model: building device objects from the shape produced
 * by network_scan_script.py (scan_results.json).
 */

const { describe, it } = require("node:test");
const assert = require("node:assert");
const Device = require("../Models/device");

/** Tests for the Device model built from network_scan_script.py scan output. */
describe("Device (from network_scan_script.py output)", () => {
  /** Construction from a single device object (snake_case → camelCase, defaults). */
  describe("constructor", () => {
    /** Verifies each scan_results.json field maps to the correct instance property. */
    it("maps scan_results.json fields to instance (camelCase)", () => {
      const raw = {
        ip_address: "192.168.1.1",
        mac_address: "AA:BB:CC:DD:EE:01",
        device_name: "router.local",
        device_type: "router",
        os_matches: [],
        open_ports: [],
      };
      const device = new Device(raw);
      assert.strictEqual(device.ipAddress, "192.168.1.1");
      assert.strictEqual(device.macAddress, "AA:BB:CC:DD:EE:01");
      assert.strictEqual(device.deviceName, "router.local");
      assert.strictEqual(device.deviceType, "router");
      assert.deepStrictEqual(device.osMatches, []);
      assert.deepStrictEqual(device.openPorts, []);
    });

    /** When given an empty object, all string fields become "Unknown", arrays become []. */
    it("uses defaults when fields are missing", () => {
      const device = new Device({});
      assert.strictEqual(device.ipAddress, "Unknown");
      assert.strictEqual(device.macAddress, "Unknown");
      assert.strictEqual(device.deviceName, "Unknown");
      assert.strictEqual(device.deviceType, "Unknown");
      assert.deepStrictEqual(device.osMatches, []);
      assert.deepStrictEqual(device.openPorts, []);
    });

    /** When called with no argument, constructor still produces valid device with defaults. */
    it("uses defaults when given no argument", () => {
      const device = new Device();
      assert.strictEqual(device.ipAddress, "Unknown");
      assert.deepStrictEqual(device.osMatches, []);
      assert.deepStrictEqual(device.openPorts, []);
    });

    /** Null or non-array os_matches/open_ports are normalized to empty arrays. */
    it("treats non-array os_matches and open_ports as empty arrays", () => {
      const device = new Device({
        ip_address: "10.0.0.1",
        os_matches: null,
        open_ports: "not-an-array",
      });
      assert.deepStrictEqual(device.osMatches, []);
      assert.deepStrictEqual(device.openPorts, []);
    });
  });

  /** Extraction of CPE strings from os_matches and open_ports for NVD lookup. */
  describe("getCPEs", () => {
    /** Ports/OS entries without cpe or with empty cpe do not add to the result. */
    it("returns empty array when no CPEs in os_matches or open_ports", () => {
      const device = new Device({
        os_matches: [],
        open_ports: [{ port: 80, service: "http" }],
      });
      assert.deepStrictEqual(device.getCPEs(), []);
    });

    /** OS matches with cpe as array (network_scan_script.py format) are flattened into one list. */
    it("collects CPEs from os_matches when cpe is an array (script format)", () => {
      const device = new Device({
        os_matches: [
          { name: "Linux 4.x", accuracy: "95", cpe: ["cpe:2.3:o:linux:linux_kernel:4.15:*:*:*:*:*:*:*"] },
          { name: "Linux 3.x", accuracy: "90", cpe: ["cpe:2.3:o:linux:linux_kernel:3.2:*:*:*:*:*:*:*"] },
        ],
        open_ports: [],
      });
      const cpes = device.getCPEs();
      assert.strictEqual(cpes.length, 2);
      assert.ok(cpes.includes("cpe:2.3:o:linux:linux_kernel:4.15:*:*:*:*:*:*:*"));
      assert.ok(cpes.includes("cpe:2.3:o:linux:linux_kernel:3.2:*:*:*:*:*:*:*"));
    });

    /** Single string cpe in an OS match is returned as a one-element array. */
    it("collects CPEs from os_matches when cpe is a single string", () => {
      const device = new Device({
        os_matches: [{ name: "Linux", accuracy: "95", cpe: "cpe:2.3:o:linux:linux_kernel:5.0:*:*:*:*:*:*:*" }],
        open_ports: [],
      });
      assert.deepStrictEqual(device.getCPEs(), ["cpe:2.3:o:linux:linux_kernel:5.0:*:*:*:*:*:*:*"]);
    });

    /** Open ports with cpe as array (script format) contribute all CPE strings. */
    it("collects CPEs from open_ports when cpe is an array (script format)", () => {
      const device = new Device({
        os_matches: [],
        open_ports: [
          { port: 80, protocol: "tcp", service: "http", cpe: ["cpe:2.3:a:nginx:nginx:1.18.0:*:*:*:*:*:*:*"] },
          { port: 443, protocol: "tcp", service: "https", cpe: ["cpe:2.3:a:nginx:nginx:1.18.0:*:*:*:*:*:*:*"] },
        ],
      });
      const cpes = device.getCPEs();
      assert.strictEqual(cpes.length, 2);
      assert.ok(cpes.every((c) => c.startsWith("cpe:2.3:a:nginx")));
    });

    /** Single string cpe on a port is returned as a one-element array. */
    it("collects CPEs from open_ports when cpe is a single string", () => {
      const device = new Device({
        os_matches: [],
        open_ports: [{ port: 22, protocol: "tcp", service: "ssh", cpe: "cpe:2.3:a:openssh:openssh:8.2:*:*:*:*:*:*:*" }],
      });
      assert.deepStrictEqual(device.getCPEs(), ["cpe:2.3:a:openssh:openssh:8.2:*:*:*:*:*:*:*"]);
    });

    /** Result includes CPEs from both OS matches and every open port. */
    it("combines CPEs from both os_matches and open_ports", () => {
      const device = new Device({
        os_matches: [{ name: "Linux", accuracy: "95", cpe: ["cpe:2.3:o:linux:linux_kernel:4.15:*:*:*:*:*:*:*"] }],
        open_ports: [{ port: 80, service: "http", cpe: ["cpe:2.3:a:nginx:nginx:1.18.0:*:*:*:*:*:*:*"] }],
      });
      const cpes = device.getCPEs();
      assert.strictEqual(cpes.length, 2);
      assert.ok(cpes.some((c) => c.includes("linux_kernel")));
      assert.ok(cpes.some((c) => c.includes("nginx")));
    });

    /** Empty strings, null, and non-string values in cpe arrays are ignored. */
    it("skips empty or non-string CPEs", () => {
      const device = new Device({
        os_matches: [
          { name: "A", cpe: [] },
          { name: "B", cpe: ["", "cpe:2.3:o:linux:linux_kernel:4.15:*:*:*:*:*:*:*", null] },
        ],
        open_ports: [{ port: 80, cpe: "" }],
      });
      assert.deepStrictEqual(device.getCPEs(), ["cpe:2.3:o:linux:linux_kernel:4.15:*:*:*:*:*:*:*"]);
    });
  });
});
