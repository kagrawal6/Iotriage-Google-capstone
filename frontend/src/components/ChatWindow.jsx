import { useState, useRef, useEffect } from "react";
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
  const { chatHistory, addChatMessage, updateLastChatMessage, scanResults } = useScan();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    addChatMessage("user", message);
    setInput("");
    setIsSending(true);

    // Chat message for AI to stream into
    addChatMessage("assistant", "Thinking…")

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

      let streamedText = "";

      await sendChatMessage(historyForBackend, message, scanContext, (chunk) => {
        streamedText += chunk;
        updateLastChatMessage(streamedText);
      });

    } catch (err) {
      updateLastChatMessage(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatHistory.length === 0 && (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 mb-1">Ask about your scan results.</p>
            <p className="text-xs text-slate-400">
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
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-[#188038] text-white flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0">AI</div>
            )}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-[#1a73e8] text-white"
                  : "bg-white border border-slate-200 text-slate-700 shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {msg.role === "assistant"
                  ? normalizeAssistantText(msg.content)
                  : msg.content}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="border-t border-slate-200 bg-white p-3 flex gap-2"
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
          className="flex-1 border border-slate-200 bg-slate-50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!scanResults || !input.trim() || isSending}
          className="bg-[#1a73e8] text-white hover:bg-[#1765cc] disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
