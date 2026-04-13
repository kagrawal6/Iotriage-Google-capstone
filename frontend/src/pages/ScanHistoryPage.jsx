import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useScan } from "../context/ScanContext";

/**
 * ScanHistoryPage — Browse, load, rename, and delete past scans.
 */
export default function ScanHistoryPage() {
  const navigate = useNavigate();
  const { scanHistory, activeScanId, loadScan, renameScan, deleteScan, resetAll } = useScan();
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleLoad = (id) => {
    loadScan(id);
    navigate("/results");
  };

  const startEdit = (scan) => {
    setEditingId(scan.id);
    setEditValue(scan.label);
  };

  const commitEdit = (id) => {
    const trimmed = editValue.trim();
    if (trimmed) renameScan(id, trimmed);
    setEditingId(null);
    setEditValue("");
  };

  const handleDelete = (id) => {
    deleteScan(id);
    setConfirmDeleteId(null);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const getSeverityCounts = (vulnerabilities = []) => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const v of vulnerabilities) {
      const sev = (v.severity || v.cvss?.severity || "").toUpperCase();
      if (sev in counts) counts[sev]++;
    }
    return counts;
  };

  if (scanHistory.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm mb-4">No scan history yet.</p>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          Upload your first scan
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Scan History</h1>
          <p className="text-sm text-slate-500">
            {scanHistory.length} scan{scanHistory.length !== 1 ? "s" : ""} stored
            &middot; up to 10 kept (oldest auto-removed)
          </p>
        </div>
        <button
          onClick={() => setConfirmDeleteId("__all__")}
          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Confirm clear-all */}
      {confirmDeleteId === "__all__" && (
        <div className="mb-4 border border-red-200 bg-red-50 rounded-lg p-3 text-sm flex items-center justify-between">
          <span className="text-red-700">Delete all scan history? This cannot be undone.</span>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => { resetAll(); setConfirmDeleteId(null); }}
              className="text-xs bg-red-600 text-white hover:bg-red-700 px-3 py-1 rounded-lg font-medium transition-colors"
            >
              Delete all
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="text-xs border border-slate-300 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Scan list */}
      <div className="space-y-3">
        {scanHistory.map((scan) => {
          const isActive = scan.id === activeScanId;
          const severities = getSeverityCounts(scan.vulnerabilities);
          const isConfirmingDelete = confirmDeleteId === scan.id;
          const isEditing = editingId === scan.id;

          return (
            <div
              key={scan.id}
              className={`bg-white rounded-xl border p-4 text-sm shadow-sm transition-shadow hover:shadow-md ${
                isActive ? "border-slate-900 ring-1 ring-slate-900/10" : "border-slate-200"
              }`}
            >
              {/* Top row: label + active badge */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(scan.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                      <button
                        onClick={() => commitEdit(scan.id)}
                        className="text-xs bg-slate-900 text-white hover:bg-blue-600 px-3 py-1 rounded-lg font-medium transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">{scan.label}</p>
                      {isActive && (
                        <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                  )}

                  {/* Date/time */}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(scan.createdAt)} at {formatTime(scan.createdAt)}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-2 text-xs mb-3">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{scan.devices?.length ?? 0} device{scan.devices?.length !== 1 ? "s" : ""}</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{scan.vulnerabilities?.length ?? 0} CVEs</span>
                {severities.CRITICAL > 0 && (
                  <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">{severities.CRITICAL} critical</span>
                )}
                {severities.HIGH > 0 && (
                  <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">{severities.HIGH} high</span>
                )}
                {(scan.chatHistory?.length ?? 0) > 0 && (
                  <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full">
                    {scan.chatHistory.length} message{scan.chatHistory.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Confirm delete inline */}
              {isConfirmingDelete && (
                <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2">
                  <span>Delete this scan?</span>
                  <button
                    onClick={() => handleDelete(scan.id)}
                    className="bg-red-600 text-white hover:bg-red-700 px-2 py-0.5 rounded-md font-medium transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Actions row */}
              <div className="flex gap-2 flex-wrap">
                {!isActive && (
                  <button
                    onClick={() => handleLoad(scan.id)}
                    className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Load scan
                  </button>
                )}
                {isActive && (
                  <Link
                    to="/results"
                    className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 font-medium transition-colors"
                  >
                    View results &rarr;
                  </Link>
                )}
                {!isEditing && (
                  <button
                    onClick={() => startEdit(scan)}
                    className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Rename
                  </button>
                )}
                {!isConfirmingDelete && (
                  <button
                    onClick={() => setConfirmDeleteId(scan.id)}
                    className="text-xs text-red-400 hover:text-red-600 ml-auto transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}