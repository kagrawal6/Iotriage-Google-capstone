import { Link, Navigate } from "react-router-dom";
import { useScan } from "../context/ScanContext";
import DeviceCard from "../components/DeviceCard";

/**
 * ResultsPage — Displays devices and vulnerabilities from scan analysis.
 */
export default function ResultsPage() {
  const { scanResults } = useScan();

  if (!scanResults) {
    return <Navigate to="/upload" replace />;
  }

  const { devices = [], vulnerabilities = [] } = scanResults;

  const criticalCount = vulnerabilities.filter(
    (v) => (v.severity || v.cvss?.severity || "").toUpperCase() === "CRITICAL"
  ).length;
  const highCount = vulnerabilities.filter(
    (v) => (v.severity || v.cvss?.severity || "").toUpperCase() === "HIGH"
  ).length;
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Scan Results</h1>
          <p className="text-sm text-slate-500">
            {devices.length} device{devices.length !== 1 ? "s" : ""} found
            &middot; {vulnerabilities.length} vulnerabilit
            {vulnerabilities.length !== 1 ? "ies" : "y"} detected
          </p>
        </div>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 bg-[#1a73e8] !text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1765cc] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Ask AI About Results
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1a73e8] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{devices.length}</p>
              <p className="text-xs text-slate-500">Devices</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#f9ab00] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{vulnerabilities.length}</p>
              <p className="text-xs text-slate-500">Total CVEs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-xs text-slate-500">Critical</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{highCount}</p>
              <p className="text-xs text-slate-500">High</p>
            </div>
          </div>
        </div>
      </div>

      {/* Devices Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h2 className="text-lg font-bold text-slate-900">
            Devices ({devices.length})
          </h2>
        </div>
        {devices.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center bg-white rounded-xl border border-slate-200">
            No devices found.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {devices.map((device, i) => (
              <DeviceCard
                key={(device.ipAddress || device.ip_address) + "-" + i}
                device={device}
                allVulnerabilities={vulnerabilities}
              />
            ))}
          </div>
        )}
      </section>

      {/* Tip */}
      <p className="text-xs text-slate-400 text-center mt-2">
        Click a device card to view its vulnerabilities and chat with AI.
      </p>
    </div>
  );
}