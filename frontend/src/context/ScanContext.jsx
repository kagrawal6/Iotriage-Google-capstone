import { createContext, useContext, useState } from "react";
import useStorage from "../storage/useStorage";

/**
 * ScanContext
 * -----------
 * Shared state for scan results across pages.
 *
 * Scan history is stored as an array of scan entries, each with:
 *   { id, createdAt, label, expertiseMode, devices, vulnerabilities, chatHistory, deviceChats }
 *
 * expertiseMode is one of: "beginner" | "intermediate" | "expert"
 * It is set at upload time and used by the backend to tailor LLM output language.
 *
 * activeScanId tracks which scan is currently being viewed.
 * History is capped at MAX_HISTORY scans (oldest dropped on overflow).
 */

const MAX_HISTORY = 10;

const ScanContext = createContext(null);

// ─── helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function buildLabel(devices = []) {
  const count = devices.length;
  const now = new Date();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${count} device${count !== 1 ? "s" : ""} · ${date} ${time}`;
}

// ─── provider ─────────────────────────────────────────────────────────────────

export function ScanProvider({ children }) {
  const [scanHistory, setScanHistory] = useStorage("scanHistory", []);
  const [activeScanId, setActiveScanId] = useStorage("activeScanId", null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── derived active scan ──────────────────────────────────────────────────
  const activeScan = scanHistory.find((s) => s.id === activeScanId) || null;
  const scanResults = activeScan
    ? { devices: activeScan.devices, vulnerabilities: activeScan.vulnerabilities }
    : null;
  const chatHistory = activeScan?.chatHistory || [];
  const deviceChats = activeScan?.deviceChats || {};

  /**
   * The expertise mode for the currently active scan.
   * Falls back to "intermediate" for scans stored before this field existed.
   */
  const expertiseMode = activeScan?.expertiseMode || "intermediate";

  // ── internal updater for the active scan entry ───────────────────────────
  const updateActiveScan = (updater) => {
    setScanHistory((prev) =>
      prev.map((s) => (s.id === activeScanId ? { ...s, ...updater(s) } : s))
    );
  };

  // ── store a new scan (called after successful upload) ────────────────────
  /**
   * @param {object} results        - { devices, vulnerabilities } from the backend
   * @param {string} mode           - "beginner" | "intermediate" | "expert"
   */
  const storeScanResults = (results, mode = "intermediate") => {
    setError(null);
    const id = generateId();
    const devices = results.devices || [];
    const vulnerabilities = results.vulnerabilities || [];

    const newEntry = {
      id,
      createdAt: new Date().toISOString(),
      label: buildLabel(devices),
      expertiseMode: mode,
      devices,
      vulnerabilities,
      chatHistory: [],
      deviceChats: {},
    };

    setScanHistory((prev) => {
      const updated = [newEntry, ...prev];
      return updated.slice(0, MAX_HISTORY);
    });
    setActiveScanId(id);
  };

  // ── load a historical scan as the active one ─────────────────────────────
  const loadScan = (id) => {
    setActiveScanId(id);
    setError(null);
  };

  // ── rename a scan entry ──────────────────────────────────────────────────
  const renameScan = (id, label) => {
    setScanHistory((prev) =>
      prev.map((s) => (s.id === id ? { ...s, label } : s))
    );
  };

  // ── delete a single scan entry ───────────────────────────────────────────
  const deleteScan = (id) => {
    setScanHistory((prev) => prev.filter((s) => s.id !== id));
    if (activeScanId === id) {
      setScanHistory((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        setActiveScanId(remaining[0]?.id || null);
        return remaining;
      });
    }
  };

  // ── global chat (for ChatWindow) ─────────────────────────────────────────
  const addChatMessage = (role, content) => {
    updateActiveScan((s) => ({
      chatHistory: [...(s.chatHistory || []), { role, content }],
    }));
  };

  const updateLastChatMessage = (content) => {
    updateActiveScan((s) => {
      const updated = [...(s.chatHistory || [])];
      updated[updated.length - 1] = { ...updated[updated.length - 1], content };
      return { chatHistory: updated };
    });
  };

  // ── per-device chat (for DeviceCard) ─────────────────────────────────────
  const getDeviceChat = (ip) => deviceChats[ip] || [];

  const addDeviceChatMessage = (ip, role, content) => {
    updateActiveScan((s) => ({
      deviceChats: {
        ...(s.deviceChats || {}),
        [ip]: [...((s.deviceChats || {})[ip] || []), { role, content }],
      },
    }));
  };

  const updateLastDeviceChatMessage = (ip, content) => {
    updateActiveScan((s) => {
      const history = [...((s.deviceChats || {})[ip] || [])];
      history[history.length - 1] = { ...history[history.length - 1], content };
      return { deviceChats: { ...(s.deviceChats || {}), [ip]: history } };
    });
  };

  // ── clear everything ──────────────────────────────────────────────────────
  const resetAll = () => {
    setScanHistory([]);
    setActiveScanId(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <ScanContext.Provider
      value={{
        scanResults,
        chatHistory,
        deviceChats,
        expertiseMode,
        // history
        scanHistory,
        activeScanId,
        // state flags
        isLoading,
        error,
        // setters
        setIsLoading,
        setError,
        // actions
        storeScanResults,
        loadScan,
        renameScan,
        deleteScan,
        // chat
        addChatMessage,
        updateLastChatMessage,
        getDeviceChat,
        addDeviceChatMessage,
        updateLastDeviceChatMessage,
        resetAll,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScan must be used within <ScanProvider>");
  return ctx;
}