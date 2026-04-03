/**
 * testNvd.js
 * Simple script to test the NVD service without Jest.
 */

const nvdService = require("../nvdService");

async function run() {
  try {
    // const cpe = "cpe:2.3:a:apache:log4j:2.16.0:*:*:*:*:*:*:*";
    const cpe = "cpe:2.3:o:google:android:5.1.1";

    console.log("Querying CVEs for:", cpe);

    const results = await nvdService.fetchCVEs(cpe);

    console.log("\n=== CVE Results ===\n");
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();