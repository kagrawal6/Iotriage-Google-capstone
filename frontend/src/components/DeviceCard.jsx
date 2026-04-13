import { Link } from "react-router-dom";

/**
 * DeviceCard — Beginner-friendly summary card that links to the device detail page.
 */
export default function DeviceCard({ device, allVulnerabilities = [] }) {
  const ip = device.ipAddress || device.ip_address || "";
  const deviceVulns = allVulnerabilities.filter(
    (v) => v.deviceIp === ip || v.device_ip === ip
  );

  const hasCritical = deviceVulns.some(
    (v) => (v.severity || v.cvss?.severity || "").toUpperCase() === "CRITICAL"
  );
  const hasHigh = deviceVulns.some(
    (v) => (v.severity || v.cvss?.severity || "").toUpperCase() === "HIGH"
  );

  const ports = device.openPorts || device.open_ports || [];
  const osName = (device.osMatches || device.os_matches || [])[0]?.name;

  // Status config — plain language safety level
  const status = deviceVulns.length === 0
    ? { label: "Secure", color: "bg-green-500", ring: "ring-green-200", text: "text-green-700", bg: "bg-green-50", border: "border-green-200", message: "No known security issues" }
    : hasCritical
      ? { label: "Critical Risk", color: "bg-red-500", ring: "ring-red-200", text: "text-red-700", bg: "bg-red-50", border: "border-red-200", message: "Needs immediate attention" }
      : hasHigh
        ? { label: "High Risk", color: "bg-orange-500", ring: "ring-orange-200", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", message: "Review recommended" }
        : { label: "Medium Risk", color: "bg-amber-500", ring: "ring-amber-200", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", message: "Minor issues found" };

  return (
    <Link
      to={`/results/device/${encodeURIComponent(ip)}`}
      className="bg-white rounded-xl border border-slate-200 text-sm flex flex-col shadow-sm hover:shadow-md transition-all group block"
    >
      <div className="p-4">
        {/* Top: Device icon + name + type */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center shrink-0`}>
            <svg className={`w-5 h-5 ${status.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 truncate">
              {device.deviceName || device.device_name || "Unknown Device"}
            </p>
            <p className="text-xs text-slate-400">
              {device.deviceType || device.device_type || "Device"}{osName ? ` · ${osName}` : ""}
            </p>
          </div>
        </div>

        {/* Quick stats in plain language */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-slate-50 rounded-lg px-2.5 py-2">
            <p className="text-slate-400">Security issues</p>
            <p className="font-semibold text-slate-700">{deviceVulns.length} found</p>
          </div>
          <div className="bg-slate-50 rounded-lg px-2.5 py-2">
            <p className="text-slate-400">Open ports</p>
            <p className="font-semibold text-slate-700">{ports.length} {ports.length === 1 ? "port" : "ports"}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">Tap to see full details & fixes</p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
            View
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}