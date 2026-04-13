import { Link } from "react-router-dom";

/**
 * HomePage — Functional landing page with instructions.
 */
export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            IoT Security Scanner
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            Secure Your IoT Network
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
            Scan your local network for IoT devices, identify known
            vulnerabilities (CVEs), and get AI-powered remediation guidance.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Scan
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1 text-white/80 hover:text-white px-4 py-2.5 text-sm font-medium transition-colors"
            >
              Learn more
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Scan</h3>
            <p className="text-sm text-slate-500">
              Run the IoTriage scanner with Nmap to discover devices, open ports,
              services, and OS info on your subnet.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Identify</h3>
            <p className="text-sm text-slate-500">
              Upload results and the backend extracts CPEs and queries the NVD
              for known CVEs with severity ratings.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Remediate</h3>
            <p className="text-sm text-slate-500">
              Get AI-generated mitigation steps and use the chat for deeper
              remediation guidance.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* How It Works */}
        <section id="how-it-works">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Start</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <ol className="space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p className="font-semibold text-slate-900">Install Nmap</p>
                  <p>
                    Download from{" "}
                    <a href="https://nmap.org/download" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      nmap.org
                    </a>{" "}
                    and ensure it is in your system PATH.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p className="font-semibold text-slate-900">Run the Scanner</p>
                  <p>
                    Run the scanner as Administrator. It will output{" "}
                    <code>scan_results.json</code>.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <p className="font-semibold text-slate-900">Upload &amp; Analyze</p>
                  <p>
                    Go to{" "}
                    <Link to="/upload" className="text-blue-600 underline">Upload</Link>{" "}
                    and submit the JSON file. Select which devices to analyze.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">4</span>
                <div>
                  <p className="font-semibold text-slate-900">Review &amp; Remediate</p>
                  <p>
                    View vulnerabilities with severity ratings, generate mitigation steps,
                    and use the AI chat for deeper guidance.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Download Section */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Download Scanner</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-4">
              The scanner is a desktop application that scans your local subnet
              using Nmap. Requires administrator/root privileges for OS detection.
            </p>
            <a
              href="/api/download/scanner"
              download
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 text-sm rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Download NetworkScannerWizard.exe
            </a>
            <p className="text-xs text-slate-400 mt-3">
              Windows only &middot; Requires Nmap &middot;{" "}
              <a href="https://nmap.org/download" target="_blank" rel="noreferrer" className="underline">
                Get Nmap
              </a>
            </p>
            <div className="mt-4 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <strong>System Requirements:</strong> Windows 10+ &middot; Nmap
              installed &middot; Administrator recommended
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
          >
            Get Started
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
