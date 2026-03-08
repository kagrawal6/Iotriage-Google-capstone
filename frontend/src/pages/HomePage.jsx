import { Link } from "react-router-dom";

/**
 * HomePage — Functional landing page with instructions.
 */
export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">IoTriage</h1>
      <p className="text-gray-600 mb-8">
        Scan your local network for IoT devices, identify known vulnerabilities
        (CVEs), and get AI-powered remediation guidance.
      </p>

      <hr className="my-6 border-gray-200" />

      {/* How It Works */}
      <h2 className="text-lg font-bold mb-4">How It Works</h2>
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-8">
        <li>
          <strong>Scan your network</strong> — Run the IoTriage scanner (requires
          Nmap) on your local machine. It discovers devices, open ports,
          services, and OS info on your subnet.
        </li>
        <li>
          <strong>Upload results</strong> — Upload the generated{" "}
          <code>scan_results.json</code> file on the{" "}
          <Link to="/upload" className="underline">
            Upload page
          </Link>
          . The backend parses devices, extracts CPEs, and queries the NVD for
          known CVEs.
        </li>
        <li>
          <strong>Review &amp; remediate</strong> — View vulnerabilities with
          severity ratings and mitigation steps. Use the AI chat for deeper
          guidance.
        </li>
      </ol>

      <hr className="my-6 border-gray-200" />

      {/* Quick Start */}
      <h2 className="text-lg font-bold mb-4">Quick Start</h2>
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-8">
        <li>
          Install Nmap from{" "}
          <a
            href="https://nmap.org/download"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            nmap.org
          </a>{" "}
          and ensure it is in your system PATH.
        </li>
        <li>
          Download and run the scanner as Administrator. It will output{" "}
          <code>scan_results.json</code>.
        </li>
        <li>
          Go to{" "}
          <Link to="/upload" className="underline">
            Upload
          </Link>{" "}
          and upload the JSON file.
        </li>
        <li>Review the results and use the AI chat for remediation advice.</li>
      </ol>

      <hr className="my-6 border-gray-200" />

      {/* Download Section */}
      <h2 className="text-lg font-bold mb-4" id="download">
        Download Scanner
      </h2>
      <p className="text-sm text-gray-600 mb-3">
        The scanner is a desktop application that scans your local subnet using
        Nmap. Requires administrator/root privileges for OS detection.
      </p>
      <button
        disabled
        className="border border-gray-300 bg-gray-100 text-gray-400 px-4 py-2 text-sm rounded cursor-not-allowed"
      >
        Download IoTriageScanner.exe (coming soon)
      </button>
      <p className="text-xs text-gray-400 mt-2">
        Windows only &middot; Requires Nmap &middot;{" "}
        <a
          href="https://nmap.org/download"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Get Nmap
        </a>
      </p>

      <div className="mt-4 text-xs text-gray-500 border border-gray-200 rounded p-3">
        <strong>System Requirements:</strong> Windows 10+ &middot; Nmap
        installed &middot; Administrator recommended
      </div>

      <hr className="my-6 border-gray-200" />

      <div className="text-center">
        <Link
          to="/upload"
          className="inline-block border border-gray-400 hover:border-black text-black px-6 py-2 rounded text-sm font-medium"
        >
          Go to Upload
        </Link>
      </div>
    </div>
  );
}
