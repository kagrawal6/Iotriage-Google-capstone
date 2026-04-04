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
        <p className="text-gray-400 text-sm mb-4">No scan history yet.</p>
        <Link
          to="/upload"
          className="text-sm underline text-gray-600 hover:text-black"
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
          <h1 className="text-xl font-bold mb-1">Scan History</h1>
          <p className="text-sm text-gray-500">
            {scanHistory.length} scan{scanHistory.length !== 1 ? "s" : ""} stored
            &middot; up to 10 kept (oldest auto-removed)
          </p>
        </div>
        <button
          onClick={() => setConfirmDeleteId("__all__")}
          className="text-xs text-red-500 hover:text-red-700 underline"
        >
          Clear all
        </button>
      </div>

      {/* Confirm clear-all */}
      {confirmDeleteId === "__all__" && (
        <div className="mb-4 border border-red-200 bg-red-50 rounded p-3 text-sm flex items-center justify-between">
          <span className="text-red-700">Delete all scan history? This cannot be undone.</span>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => { resetAll(); setConfirmDeleteId(null); }}
              className="text-xs border border-red-400 text-red-600 hover:bg-red-100 px-3 py-1 rounded"
            >
              Delete all
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="text-xs border border-gray-300 px-3 py-1 rounded"
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
              className={`border rounded p-4 text-sm ${
                isActive ? "border-black" : "border-gray-200"
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
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-black"
                      />
                      <button
                        onClick={() => commitEdit(scan.id)}
                        className="text-xs border border-gray-400 hover:border-black px-2 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400 hover:text-black"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{scan.label}</p>
                      {isActive && (
                        <span className="text-xs border border-black px-1.5 py-0.5 rounded font-medium shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                  )}

                  {/* Date/time */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(scan.createdAt)} at {formatTime(scan.createdAt)}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                <span>{scan.devices?.length ?? 0} device{scan.devices?.length !== 1 ? "s" : ""}</span>
                <span>{scan.vulnerabilities?.length ?? 0} CVEs</span>
                {severities.CRITICAL > 0 && (
                  <span className="font-medium text-gray-700">{severities.CRITICAL} critical</span>
                )}
                {severities.HIGH > 0 && (
                  <span>{severities.HIGH} high</span>
                )}
                {(scan.chatHistory?.length ?? 0) > 0 && (
                  <span className="text-gray-400">
                    {scan.chatHistory.length} chat message{scan.chatHistory.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Confirm delete inline */}
              {isConfirmingDelete && (
                <div className="mb-3 text-xs text-red-600 flex items-center gap-2">
                  <span>Delete this scan?</span>
                  <button
                    onClick={() => handleDelete(scan.id)}
                    className="border border-red-400 text-red-600 hover:bg-red-50 px-2 py-0.5 rounded"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-gray-500 hover:text-black"
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
                    className="text-xs border border-gray-400 hover:border-black px-3 py-1 rounded"
                  >
                    Load scan
                  </button>
                )}
                {isActive && (
                  <Link
                    to="/results"
                    className="text-xs border border-black px-3 py-1 rounded hover:bg-black hover:text-white transition-colors"
                  >
                    View results →
                  </Link>
                )}
                {!isEditing && (
                  <button
                    onClick={() => startEdit(scan)}
                    className="text-xs text-gray-500 hover:text-black underline"
                  >
                    Rename
                  </button>
                )}
                {!isConfirmingDelete && (
                  <button
                    onClick={() => setConfirmDeleteId(scan.id)}
                    className="text-xs text-red-400 hover:text-red-600 underline ml-auto"
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