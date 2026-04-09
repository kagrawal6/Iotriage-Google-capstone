import { http, HttpResponse } from "msw";
import { mockScanResponse, mockChatResponse, mockMitigationResponse } from "./mockData";

/**
 * MSW request handlers that mock the IoTriage backend API.
 * Used in integration tests to avoid hitting the real backend.
 */
export const handlers = [
  // POST /api/upload — returns mock scan results
  http.post("/api/upload", async ({ request }) => {
    const body = await request.json();

    // Validate body is an array
    if (!Array.isArray(body)) {
      return HttpResponse.json(
        { error: "Expected an array of device objects" },
        { status: 400 }
      );
    }

    return HttpResponse.json(mockScanResponse);
  }),

  // POST /api/chat — returns mock AI response
  http.post("/api/chat", async ({ request }) => {
    const { chatHistory, message } = await request.json();

    if (!message) {
      return HttpResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    return HttpResponse.json(mockChatResponse);
  }),

  // POST /api/mitigation — returns one vulnerability mitigation plan
  http.post("/api/mitigation", async ({ request }) => {
    const { vulnerability } = await request.json();

    if (!vulnerability?.cveId) {
      return HttpResponse.json(
        { error: "cveId is required" },
        { status: 400 }
      );
    }

    return HttpResponse.json(mockMitigationResponse);
  }),
];

/**
 * Error-state handlers for testing error scenarios.
 */
export const errorHandlers = [
  http.post("/api/upload", () => {
    return HttpResponse.json(
      { error: "Failed to process scan" },
      { status: 500 }
    );
  }),

  http.post("/api/chat", () => {
    return HttpResponse.json(
      { error: "LLM request failed" },
      { status: 500 }
    );
  }),

  http.post("/api/mitigation", () => {
    return HttpResponse.json(
      { error: "Failed to generate mitigation" },
      { status: 500 }
    );
  }),
];
