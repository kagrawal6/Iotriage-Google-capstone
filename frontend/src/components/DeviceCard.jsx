import { useState, useRef, useEffect } from "react";
import { useScan } from "../context/ScanContext";
import { sendChatMessage } from "../services/api";

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

/**
 * DeviceCard — Displays a single scanned device.
 */
export default function DeviceCard({ device, allVulnerabilities = [] }) {
  const { getDeviceChat, addDeviceChatMessage } = useScan();
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const ip = device.ipAddress || device.ip_address || "";
  const messages = getDeviceChat(ip);
  const deviceVulns = allVulnerabilities.filter(
    (v) => v.deviceIp === ip || v.device_ip === ip
  );

  useEffect(() => {
    if (chatOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen, isSending]);

  const handleSend = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    addDeviceChatMessage(ip, "user", message);
    setInput("");
    setIsSending(true);

    try {
      const historyForBackend = [
        ...messages,
        { role: "user", content: message },
      ];

      const { reply } = await sendChatMessage(
        historyForBackend,
        message,
        { devices: [device], vulnerabilities: deviceVulns }
      );
      addDeviceChatMessage(ip, "assistant", reply);
    } catch (err) {
      addDeviceChatMessage(ip, "assistant", `Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded text-sm flex flex-col">
      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-bold">
              {device.deviceName || device.device_name || "Unknown Device"}
            </p>
            <p className="text-gray-500 text-xs">{ip}</p>
          </div>
          <span className="text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded">
            {device.deviceType || device.device_type || "Unknown"}
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-2">
          MAC: {device.macAddress || device.mac_address || "N/A"}
        </p>

        {(device.osMatches || device.os_matches || []).length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium mb-1">OS Matches:</p>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {(device.osMatches || device.os_matches).slice(0, 3).map((os, i) => (
                <li key={i}>{os.name} ({os.accuracy}%)</li>
              ))}
            </ul>
          </div>
        )}

        {(device.openPorts || device.open_ports || []).length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium mb-1">Open Ports:</p>
            <div className="flex flex-wrap gap-1">
              {(device.openPorts || device.open_ports).map((port, i) => (
                <span key={i} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                  {port.port}/{port.protocol}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {deviceVulns.length} vulnerabilit{deviceVulns.length !== 1 ? "ies" : "y"}
            {messages.length > 0 && (
              <span className="ml-2 text-gray-300">
                · {messages.length} message{messages.length !== 1 ? "s" : ""}
              </span>
            )}
          </span>
          <button
            onClick={() => setChatOpen((o) => !o)}
            className="text-xs border border-gray-300 hover:border-black px-2 py-1 rounded transition-colors"
          >
            {chatOpen ? "Close chat" : messages.length > 0 ? "Continue chat" : "Ask AI about device"}
          </button>
        </div>
      </div>

      {/* Chat pane */}
      {chatOpen && (
        <div className="border-t border-gray-200 flex flex-col" style={{ height: "280px" }}>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-4">
                Ask anything about this device or its vulnerabilities.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded px-2.5 py-1.5 text-xs ${
                    msg.role === "user"
                      ? "bg-gray-100 text-black"
                      : "border border-gray-200 text-gray-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {msg.role === "assistant" ? normalizeText(msg.content) : msg.content}
                  </p>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-400">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-gray-200 p-2 flex gap-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this device..."
              disabled={isSending}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-black disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="border border-gray-300 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed text-black px-3 py-1.5 rounded text-xs"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}