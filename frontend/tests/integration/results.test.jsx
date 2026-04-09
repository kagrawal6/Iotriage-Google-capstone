import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { handlers } from "../helpers/msw-handlers";
import { mockScanInput } from "../helpers/mockData";
import { renderApp } from "../helpers/renderApp";

// ── MSW server setup ──
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Helper: upload a file and navigate to results.
 */
async function uploadAndNavigateToResults() {
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

  // Wait for redirect to results
  await waitFor(() => {
    expect(screen.getByText("Scan Results")).toBeInTheDocument();
  });

  return user;
}

describe("ResultsPage", () => {
  it("redirects to /upload when accessed without scan data", () => {
    renderApp("/results");

    expect(screen.getByText("Upload Scan Results")).toBeInTheDocument();
  });

  it("displays summary stats after upload", async () => {
    await uploadAndNavigateToResults();

    expect(screen.getByText("Devices")).toBeInTheDocument();
    expect(screen.getByText("Total CVEs")).toBeInTheDocument();
    expect(screen.getByText(/2 devices found/)).toBeInTheDocument();
    expect(screen.getByText(/2 vulnerabilit/)).toBeInTheDocument();
  });

  it("shows vulnerability cards with CVE IDs", async () => {
    await uploadAndNavigateToResults();

    expect(screen.getByText("CVE-2021-23017")).toBeInTheDocument();
    expect(screen.getByText("CVE-2019-9516")).toBeInTheDocument();
  });

  it("shows severity badges on vulnerability cards", async () => {
    await uploadAndNavigateToResults();

    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("shows mitigation text on vulnerability cards", async () => {
    const user = await uploadAndNavigateToResults();

    const generateButtons = screen.getAllByRole("button", {
      name: /generate mitigation steps/i,
    });
    await user.click(generateButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Update nginx to the latest stable version/i)).toBeInTheDocument();
    });
  });

  it("can switch to the Devices tab and see device cards", async () => {
    const user = await uploadAndNavigateToResults();

    const devicesTab = screen.getByRole("button", { name: /devices/i });
    await user.click(devicesTab);

    expect(screen.getByText("router.local")).toBeInTheDocument();
    expect(screen.getByText("smart-camera")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.1")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.50")).toBeInTheDocument();
  });

  it("shows the 'Ask AI' link that navigates to chat", async () => {
    await uploadAndNavigateToResults();

    const chatLink = screen.getByRole("link", { name: /ask ai/i });
    expect(chatLink).toBeInTheDocument();
    expect(chatLink.getAttribute("href")).toBe("/chat");
  });

  it("shows Results and Chat nav links after upload", async () => {
    await uploadAndNavigateToResults();

    const navLinks = screen.getAllByRole("link");
    const texts = navLinks.map((l) => l.textContent);

    expect(texts).toContain("Results");
    expect(texts).toContain("Chat");
  });
});
