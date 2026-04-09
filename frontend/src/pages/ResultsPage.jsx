import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useScan } from "../context/ScanContext";
import { fetchMitigation } from "../services/api";
import DeviceCard from "../components/DeviceCard";
import VulnerabilityCard from "../components/VulnerabilityCard";

/**
 * ResultsPage — Displays devices and vulnerabilities from scan analysis.
 */
export default function ResultsPage() {
  const { scanResults, updateVulnerabilityMitigation } = useScan();
  const [activeTab, setActiveTab] = useState("vulnerabilities");
  const [loadingMitigations, setLoadingMitigations] = useState({});
  const [mitigationErrors, setMitigationErrors] = useState({});

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

  const tabClass = (tab) =>
    `px-4 py-2 text-sm border-b-2 ${
      activeTab === tab
        ? "border-black font-bold"
        : "border-transparent text-gray-500 hover:text-black"
    }`;

  const getVulnKey = (vuln) => `${vuln.cveId}::${vuln.deviceIp || "unknown"}`;

  const handleGenerateMitigation = async (vuln) => {
    const key = getVulnKey(vuln);
    if (!vuln?.cveId || loadingMitigations[key] || vuln.mitigation) return;

    setLoadingMitigations((prev) => ({ ...prev, [key]: true }));
    setMitigationErrors((prev) => ({ ...prev, [key]: null }));

    try {
      const mitigation = await fetchMitigation(vuln);
      if (mitigation) {
        updateVulnerabilityMitigation(vuln, mitigation);
      }
    } catch (err) {
      setMitigationErrors((prev) => ({ ...prev, [key]: err.message || "Failed to load mitigation" }));
    } finally {
      setLoadingMitigations((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1">Scan Results</h1>
          <p className="text-sm text-gray-500">
            {devices.length} device{devices.length !== 1 ? "s" : ""} found
            &middot; {vulnerabilities.length} vulnerabilit
            {vulnerabilities.length !== 1 ? "ies" : "y"} detected
          </p>
        </div>
        <Link
          to="/chat"
          className="text-sm underline text-gray-600 hover:text-black"
        >
          Ask AI About Results
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6 text-center text-sm">
        <div className="border border-gray-200 rounded p-3">
          <p className="text-2xl font-bold">{devices.length}</p>
          <p className="text-xs text-gray-500">Devices</p>
        </div>
        <div className="border border-gray-200 rounded p-3">
          <p className="text-2xl font-bold">{vulnerabilities.length}</p>
          <p className="text-xs text-gray-500">Total CVEs</p>
        </div>
        <div className="border border-gray-200 rounded p-3">
          <p className="text-2xl font-bold">{criticalCount}</p>
          <p className="text-xs text-gray-500">Critical</p>
        </div>
        <div className="border border-gray-200 rounded p-3">
          <p className="text-2xl font-bold">{highCount}</p>
          <p className="text-xs text-gray-500">High</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <button
          className={tabClass("vulnerabilities")}
          onClick={() => setActiveTab("vulnerabilities")}
        >
          Vulnerabilities ({vulnerabilities.length})
        </button>
        <button
          className={tabClass("devices")}
          onClick={() => setActiveTab("devices")}
        >
          Devices ({devices.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "vulnerabilities" && (
        <div className="space-y-3">
          {vulnerabilities.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No vulnerabilities found.
            </p>
          ) : (
            vulnerabilities.map((vuln, i) => (
              <VulnerabilityCard
                key={vuln.cveId + "-" + i}
                vulnerability={vuln}
                isGenerating={Boolean(loadingMitigations[getVulnKey(vuln)])}
                generationError={mitigationErrors[getVulnKey(vuln)] || null}
                onGenerateMitigation={() => handleGenerateMitigation(vuln)}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "devices" && (
        <div className="grid md:grid-cols-2 gap-3">
          {devices.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center col-span-2">
              No devices found.
            </p>
          ) : (
            devices.map((device, i) => (
              <DeviceCard
                key={(device.ipAddress || device.ip_address) + "-" + i}
                device={device}
                allVulnerabilities={vulnerabilities}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}