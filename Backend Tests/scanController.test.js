/**
 * scanController.test.js
 * ----------------------
 * Tests for parsing scan_results.json (network_scan_script.py output)
 * into Device objects (parseScanToDevices).
 */

const { describe, it } = require("node:test");
const assert = require("node:assert");
const { parseScanToDevices } = require("../Backend/Controllers/scanController");

/** Tests for converting scan_results.json array into Device instances. */
describe("parseScanToDevices (scan_results.json → Device objects)", () => {
  /** Valid array of one device object yields one Device with correct ip and name. */
  it("returns Device instances for valid scan array", () => {
    const scanData = [
      {
        ip_address: "192.168.1.1",
        mac_address: "AA:BB:CC:DD:EE:01",
        device_name: "router.local",
        device_type: "router",
        os_matches: [],
        open_ports: [],
      },
    ];
    const devices = parseScanToDevices(scanData);
    assert.strictEqual(devices.length, 1);
    assert.strictEqual(devices[0].ipAddress, "192.168.1.1");
    assert.strictEqual(devices[0].deviceName, "router.local");
  });

  /** Each element in the scan array becomes one Device; order is preserved. */
  it("returns multiple devices when array has multiple elements", () => {
    const scanData = [
      { ip_address: "192.168.1.1", device_name: "router", os_matches: [], open_ports: [] },
      { ip_address: "192.168.1.50", device_name: "camera", os_matches: [], open_ports: [] },
    ];
    const devices = parseScanToDevices(scanData);
    assert.strictEqual(devices.length, 2);
    assert.strictEqual(devices[0].ipAddress, "192.168.1.1");
    assert.strictEqual(devices[1].ipAddress, "192.168.1.50");
  });

  /** Null body throws with message expecting a JSON array. */
  it("throws when scanData is null", () => {
    assert.throws(
      () => parseScanToDevices(null),
      { message: "Invalid scan format: expected a JSON array of device objects" }
    );
  });

  /** Undefined body throws with message expecting a JSON array. */
  it("throws when scanData is undefined", () => {
    assert.throws(
      () => parseScanToDevices(undefined),
      { message: "Invalid scan format: expected a JSON array of device objects" }
    );
  });

  /** Plain object or string (e.g. malformed request) throws with invalid-format message. */
  it("throws when scanData is not an array", () => {
    assert.throws(
      () => parseScanToDevices({}),
      { message: "Invalid scan format: expected a JSON array of device objects" }
    );
    assert.throws(
      () => parseScanToDevices("not an array"),
      { message: "Invalid scan format: expected a JSON array of device objects" }
    );
  });

  /** Array with a null element throws and reports the index. */
  it("throws when an element is null", () => {
    const scanData = [
      { ip_address: "192.168.1.1", os_matches: [], open_ports: [] },
      null,
    ];
    assert.throws(
      () => parseScanToDevices(scanData),
      { message: "Invalid device at index 1: expected an object" }
    );
  });

  /** Array with a non-object element (e.g. string) throws and reports the index. */
  it("throws when an element is not an object", () => {
    const scanData = [
      { ip_address: "192.168.1.1", os_matches: [], open_ports: [] },
      "string",
    ];
    assert.throws(
      () => parseScanToDevices(scanData),
      { message: "Invalid device at index 1: expected an object" }
    );
  });

  /** Parsed devices are full Device instances: getCPEs() returns OS and port CPEs. */
  it("returns devices with working getCPEs", () => {
    const scanData = [
      {
        ip_address: "192.168.1.1",
        os_matches: [{ name: "Linux", accuracy: "95", cpe: ["cpe:2.3:o:linux:linux_kernel:4.15:*:*:*:*:*:*:*"] }],
        open_ports: [{ port: 80, cpe: "cpe:2.3:a:nginx:nginx:1.18.0:*:*:*:*:*:*:*" }],
      },
    ];
    const devices = parseScanToDevices(scanData);
    const cpes = devices[0].getCPEs();
    assert.strictEqual(cpes.length, 2);
    assert.ok(cpes.some((c) => c.includes("linux_kernel")));
    assert.ok(cpes.some((c) => c.includes("nginx")));
  });
});
