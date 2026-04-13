import { Navigate, Link } from "react-router-dom";
import { useScan } from "../context/ScanContext";
import ChatWindow from "../components/ChatWindow";

/**
 * ChatPage — AI chat interface for asking about scan results.
 * TODO: Integrate with Google Gemini API when ready.
 */
export default function ChatPage() {
  const { scanResults } = useScan();

  if (!scanResults) {
    return <Navigate to="/upload" replace />;
  }

  const { devices = [], vulnerabilities = [] } = scanResults;

  return (
    <div
      className="max-w-3xl mx-auto px-4 py-6 flex flex-col"
      style={{ height: "calc(100vh - 3.5rem)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">AI Chat</h1>
          <p className="text-xs text-slate-500">
            {vulnerabilities.length} vulnerabilities across {devices.length}{" "}
            devices
          </p>
        </div>
        <Link
          to="/results"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Results
        </Link>
      </div>

      {/* Gemini notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3 text-xs text-blue-700 flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong>Gemini AI:</strong> Chat is powered by Google Gemini and grounded in your scan results.
        </span>
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <ChatWindow />
      </div>
    </div>
  );
}
