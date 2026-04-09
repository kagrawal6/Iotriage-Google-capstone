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
 * Requests mitigation guidance for a single vulnerability.
 *
 * @param {Object} vulnerability - { cveId, description, severity, cvssScore, deviceIp }
 * @returns {Promise<Object|null>} mitigation payload from backend
 */
export async function fetchMitigation(vulnerability) {
  const res = await fetch(`${API_BASE}/mitigation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vulnerability }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Mitigation request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.mitigation || null;
}

/**
 * Sends a chat message (with full conversation history) to the backend LLM.
 * Includes optional scan context so backend can ground AI answers.
 *
 * @param {Array<{role: string, content: string}>} chatHistory
 * @param {string} message - The new user message
 * @param {Object|null} scanContext - Optional scan data ({ devices, vulnerabilities })
 * @param {function(string): void} onChunk - Called with each text chunk as it arrives
 * @returns {Promise<void>}
 */
export async function sendChatMessage(chatHistory, message, scanContext = null, onChunk) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatHistory, message, scanContext }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Chat request failed (HTTP ${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while(true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });

    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;

      const parsed = JSON.parse(payload);
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.text) onChunk(parsed.text);
    }
  }
}
