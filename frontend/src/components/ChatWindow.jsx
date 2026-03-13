import { useState } from "react";
import { useScan } from "../context/ScanContext";
import { sendChatMessage } from "../services/api";

const normalizeAssistantText = (text) =>
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
 * ChatWindow — Chat interface. Placeholder for Gemini AI integration.
 */
export default function ChatWindow() {
  const { chatHistory, addChatMessage, scanResults } = useScan();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    addChatMessage("user", message);
    setInput("");
    setIsSending(true);

    try {
      const historyForBackend = [
        ...chatHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: message },
      ];

      const scanContext = scanResults
        ? {
            devices: scanResults.devices || [],
            vulnerabilities: scanResults.vulnerabilities || [],
          }
        : null;

      const { reply } = await sendChatMessage(
        historyForBackend,
        message,
        scanContext
      );
      addChatMessage("assistant", reply);
    } catch (err) {
      addChatMessage("assistant", `Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatHistory.length === 0 && (
          <div className="text-center text-gray-400 py-10 text-sm">
            <p className="mb-1">Ask about your scan results.</p>
            <p className="text-xs">
              Example: &quot;What is the most critical vulnerability?&quot;
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] rounded px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-gray-100 text-black"
                  : "border border-gray-200 text-gray-700"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">
                {msg.role === "assistant"
                  ? normalizeAssistantText(msg.content)
                  : msg.content}
              </p>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="border-t border-gray-200 p-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            scanResults
              ? "Ask about your vulnerabilities..."
              : "Upload a scan first"
          }
          disabled={!scanResults || isSending}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-black disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!scanResults || !input.trim() || isSending}
          className="border border-gray-400 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed text-black px-4 py-2 rounded text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}
