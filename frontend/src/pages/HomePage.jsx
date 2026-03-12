import { Link } from "react-router-dom";

/**
 * HomePage — Functional landing page with instructions.
 */
export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 bg-white/95 rounded-xl shadow-sm mt-6">
      <h1 className="text-2xl font-bold mb-2">IoTriage</h1>
      <p className="text-gray-600 mb-8">
        Scan your home network for smart devices, see which ones could be at
        risk, and get guidance on how to mitigate security vulnerabilities.
      </p>

      <hr className="my-6 border-gray-200" />

      {/* How It Works */}
      <h2 className="text-lg font-bold mb-4">How It Works</h2>
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-8">
        <li>
          <strong>Scan your Wi‑Fi</strong> — Run the IoTriage scanner on your
          computer. It looks at your Wi‑Fi network and finds the devices
          connected to it (for example: router, laptop, phone, smart camera).
        </li>
        <li>
          <strong>Upload results</strong> — Upload the generated{" "}
          <code>scan_results.json</code> file on the{" "}
          <Link to="/upload" className="underline">
            Upload page
          </Link>
          . IoTriage turns that file into a list of devices and checks each one
          for known vulnerabilities.
        </li>
        <li>
          <strong>Review &amp; fix issues</strong> — You get a simple overview
          of which devices may be risky, how serious each issue is, and clear
          step‑by‑step suggestions on what to do. You can also chat with the AI
          to ask questions in your own words.
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
          className="inline-block bg-[#174ea6] hover:bg-[#185abc] text-white px-7 py-2.5 rounded-full text-base font-bold shadow-md"
        >
          Go to Upload
        </Link>
      </div>
    </div>
  );
}
