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
      className="max-w-3xl mx-auto px-4 py-6 flex flex-col bg-white/95 rounded-xl shadow-sm mt-6"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold">AI Chat</h1>
          <p className="text-xs text-gray-500">
            {vulnerabilities.length} vulnerabilities across {devices.length}{" "}
            devices
          </p>
        </div>
        <Link to="/results" className="text-sm underline text-gray-500">
          Back to Results
        </Link>
      </div>

      {/* Gemini placeholder notice */}
      <div className="border border-gray-300 bg-gray-50 rounded px-3 py-2 mb-3 text-xs text-gray-600">
        <strong>Note:</strong> Gemini AI integration pending. Chat currently
        returns stub responses from the backend.
      </div>

      {/* Chat window */}
      <div className="flex-1 border border-gray-200 rounded overflow-hidden flex flex-col">
        <ChatWindow />
      </div>
    </div>
  );
}
