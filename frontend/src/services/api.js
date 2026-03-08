/**
 * api.js
 * ------
 * Service layer for communicating with the IoTriage backend.
 * All API calls go through the Vite dev proxy → http://localhost:3000
 */

const API_BASE = "/api";

/**
 * Uploads parsed Nmap scan JSON to the backend for analysis.
 * The backend expects the body to be a raw JSON array of device objects.
 *
 * @param {Array<Object>} scanJson - Array of device objects from scan_results.json
 * @returns {Promise<{devices: Array, vulnerabilities: Array}>}
 */
export async function uploadScan(scanJson) {
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scanJson),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Upload failed (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Sends a chat message (with full conversation history) to the backend LLM.
 * Placeholder for Gemini AI integration.
 *
 * @param {Array<{role: string, content: string}>} chatHistory
 * @param {string} message - The new user message
 * @returns {Promise<{reply: string}>}
 */
export async function sendChatMessage(chatHistory, message) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatHistory, message }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Chat request failed (HTTP ${res.status})`);
  }

  return res.json();
}
