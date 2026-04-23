import { useParams, Link, Navigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useScan } from "../context/ScanContext";
import { sendChatMessage } from "../services/api";
import VulnerabilityCard from "../components/VulnerabilityCard";

const normalizeText = (text) =>
  String(text || "")
    .replace(/\*\*/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s*/g, "")
        .replace(/^\s*[-*•]\s+/g, "• ")
        .trimEnd()
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export default function DeviceDetailPage() {
  const { ip } = useParams();
  const decodedIp = decodeURIComponent(ip);
  const { scanResults, getDeviceChat, addDeviceChatMessage, updateLastDeviceChatMessage } = useScan();

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const messagesEndRef = useRef(null);

  if (!scanResults) return <Navigate to="/upload" replace />;

  const { devices = [], vulnerabilities = [] } = scanResults;

  const device = devices.find(
    (d) => (d.ipAddress || d.ip_address) === decodedIp
  );

  if (!device) return <Navigate to="/results" replace />;

  const deviceVulns = vulnerabilities.filter(
    (v) => v.deviceIp === decodedIp || v.device_ip === decodedIp
  );

  const messages = getDeviceChat(decodedIp);

  const criticalCount = deviceVulns.filter(
    (v) => (v.severity || v.cvss?.severity || "").toUpperCase() === "CRITICAL"
  ).length;
  const highCount = deviceVulns.filter(
    (v) => (v.severity || v.cvss?.severity || "").toUpperCase() === "HIGH"
  ).length;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    addDeviceChatMessage(decodedIp, "user", message);
    setInput("");
    setIsSending(true);
    addDeviceChatMessage(decodedIp, "assistant", "Thinking…");

    try {
      const historyForBackend = [
        ...messages,
        { role: "user", content: message },
      ];
      let streamedText = "";

      await sendChatMessage(
        historyForBackend,
        message,
        { devices: [device], vulnerabilities: deviceVulns },
        (chunk) => {
          streamedText += chunk;
          updateLastDeviceChatMessage(decodedIp, streamedText);
        }
      );
    } catch (err) {
      updateLastDeviceChatMessage(decodedIp, `Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        to="/results"
        className="inline-flex items-center gap-1.5 text-sm text-[#1a73e8] hover:text-[#1765cc] mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Results
      </Link>

      {/* Device Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {device.deviceName || device.device_name || "Unknown Device"}
            </h1>
            <p className="text-sm text-slate-500 font-mono mt-1">{decodedIp}</p>
          </div>
          <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {device.deviceType || device.device_type || "Unknown"}
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">MAC Address</p>
            <p className="text-slate-700 font-mono">{device.macAddress || device.mac_address || "N/A"}</p>
          </div>

          {(device.osMatches || device.os_matches || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">OS Matches</p>
              <ul className="text-slate-700 space-y-0.5">
                {(device.osMatches || device.os_matches).slice(0, 3).map((os, i) => (
                  <li key={i} className="flex items-center gap-1 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    {os.name} <span className="text-slate-400">({os.accuracy}%)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(device.openPorts || device.open_ports || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Open Ports</p>
              <div className="flex flex-wrap gap-1.5">
                {(device.openPorts || device.open_ports).map((port, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                    {port.port}/{port.protocol}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vulnerability Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-900">{deviceVulns.length}</p>
          <p className="text-xs text-slate-500">Total CVEs</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
          <p className="text-xs text-slate-500">Critical</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-600">{highCount}</p>
          <p className="text-xs text-slate-500">High</p>
        </div>
      </div>

      {/* Vulnerabilities List */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Vulnerabilities
        </h2>
        {deviceVulns.length === 0 ? (
          <div className="text-sm text-slate-400 py-8 text-center bg-white rounded-xl border border-slate-200">
            No vulnerabilities found for this device.
          </div>
        ) : (
          <div className="space-y-3">
            {deviceVulns.map((vuln, i) => (
              <VulnerabilityCard key={vuln.cveId + "-" + i} vulnerability={vuln} />
            ))}
          </div>
        )}
      </section>

      {/* Floating Chat Button + Panel */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="mb-3 w-96 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col" style={{ height: "420px" }}>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-[#1a73e8] text-white">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white text-[#1a73e8] flex items-center justify-center text-xs font-bold">AI</div>
                <span className="text-sm font-medium">Ask about this device</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white hover:text-white/80 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm">Ask anything about this device or its vulnerabilities.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-[#188038] text-white flex items-center justify-center text-xs font-bold mr-2 shrink-0 mt-0.5">
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-[#1a73e8] text-white"
                        : "bg-slate-50 border border-slate-200 text-slate-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.role === "assistant" ? normalizeText(msg.content) : msg.content}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="border-t border-slate-200 p-3 flex gap-2 bg-slate-50/50">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this device..."
                disabled={isSending}
                className="flex-1 border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="bg-[#1a73e8] text-white hover:bg-[#1765cc] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="w-14 h-14 rounded-full bg-[#1a73e8] text-white shadow-lg hover:bg-[#1765cc] transition-colors flex items-center justify-center"
        >
          {chatOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
