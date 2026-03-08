import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { handlers, errorHandlers } from "../helpers/msw-handlers";
import { mockScanInput } from "../helpers/mockData";
import { renderApp } from "../helpers/renderApp";

// ── MSW server setup ──
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Helper: upload file, navigate to results, then click to chat page.
 */
async function uploadAndNavigateToChat() {
  const user = userEvent.setup();
  renderApp("/upload");

  const fileContent = JSON.stringify(mockScanInput);
  const file = new File([fileContent], "scan_results.json", {
    type: "application/json",
  });

  const input = screen.getByTestId("file-input");
  await user.upload(input, file);

  const button = screen.getByRole("button", { name: /analyze/i });
  await user.click(button);

  // Wait for results page
  await waitFor(() => {
    expect(screen.getByText("Scan Results")).toBeInTheDocument();
  });

  // Click "Ask AI About Results" link
  const chatLink = screen.getByRole("link", { name: /ask ai/i });
  await user.click(chatLink);

  // Wait for chat page
  await waitFor(() => {
    expect(screen.getByText("AI Chat")).toBeInTheDocument();
  });

  return user;
}

describe("ChatPage", () => {
  it("redirects to /upload when accessed without scan data", () => {
    renderApp("/chat");

    expect(screen.getByText("Upload Scan Results")).toBeInTheDocument();
  });

  it("shows the Gemini integration placeholder notice", async () => {
    await uploadAndNavigateToChat();

    expect(screen.getByText(/Gemini AI integration pending/)).toBeInTheDocument();
  });

  it("shows prompt suggestions when chat is empty", async () => {
    await uploadAndNavigateToChat();

    expect(screen.getByText(/Ask about your scan results/)).toBeInTheDocument();
  });

  it("has a text input and send button", async () => {
    await uploadAndNavigateToChat();

    expect(
      screen.getByPlaceholderText(/ask about your vulnerabilities/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("sends a message and receives an AI response", async () => {
    const user = await uploadAndNavigateToChat();

    const input = screen.getByPlaceholderText(/ask about your vulnerabilities/i);
    await user.type(input, "What is CVE-2021-23017?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // User message should appear
    expect(screen.getByText("What is CVE-2021-23017?")).toBeInTheDocument();

    // AI response should appear
    await waitFor(() => {
      expect(
        screen.getByText(/CVE-2021-23017 is a high-severity vulnerability/)
      ).toBeInTheDocument();
    });
  });

  it("shows error message when chat API fails", async () => {
    const user = await uploadAndNavigateToChat();

    // Override with error handler
    server.use(...errorHandlers);

    const input = screen.getByPlaceholderText(/ask about your vulnerabilities/i);
    await user.type(input, "What should I do?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    // Should show error in chat
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it("has a back-to-results link", async () => {
    await uploadAndNavigateToChat();

    const backLink = screen.getByRole("link", { name: /back to results/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink.getAttribute("href")).toBe("/results");
  });
});
