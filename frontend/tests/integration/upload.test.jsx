import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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

describe("UploadPage", () => {
  it("renders the upload page with file dropzone", () => {
    renderApp("/upload");

    expect(screen.getByText("Upload Scan Results")).toBeInTheDocument();
    // scan_results.json appears in both the description and the dropzone — use getAllByText
    expect(screen.getAllByText(/scan_results\.json/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("file-dropzone")).toBeInTheDocument();
  });

  it("shows the Analyze button as disabled when no file is selected", () => {
    renderApp("/upload");

    const button = screen.getByRole("button", { name: /analyze/i });
    expect(button).toBeDisabled();
  });

  it("accepts a valid JSON file and shows a preview", async () => {
    const user = userEvent.setup();
    renderApp("/upload");

    const fileContent = JSON.stringify(mockScanInput);
    const file = new File([fileContent], "scan_results.json", {
      type: "application/json",
    });

    const input = screen.getByTestId("file-input");
    await user.upload(input, file);

    // Should show preview with device count
    await waitFor(() => {
      expect(screen.getByText(/2 device/)).toBeInTheDocument();
    });

    // Analyze button should now be enabled
    const button = screen.getByRole("button", { name: /analyze/i });
    expect(button).not.toBeDisabled();
  });

  it("rejects invalid JSON content even with .json extension", async () => {
    const user = userEvent.setup();
    renderApp("/upload");

    // File has .json extension but invalid JSON content
    const file = new File(["this is not valid json {{{"], "bad_data.json", {
      type: "application/json",
    });

    const input = screen.getByTestId("file-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/could not parse/i);
    });
  });

  it("rejects a JSON file that is not an array", async () => {
    const user = userEvent.setup();
    renderApp("/upload");

    const file = new File(['{"notAnArray": true}'], "scan_results.json", {
      type: "application/json",
    });

    const input = screen.getByTestId("file-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/array/);
    });
  });

  it("submits to the backend and redirects to results on success", async () => {
    const user = userEvent.setup();
    renderApp("/upload");

    // Upload a valid file
    const fileContent = JSON.stringify(mockScanInput);
    const file = new File([fileContent], "scan_results.json", {
      type: "application/json",
    });

    const input = screen.getByTestId("file-input");
    await user.upload(input, file);

    // Click Analyze
    const button = screen.getByRole("button", { name: /analyze/i });
    await user.click(button);

    // Should redirect to results page
    await waitFor(() => {
      expect(screen.getByText("Scan Results")).toBeInTheDocument();
    });
  });

  it("shows an error when the backend returns 500", async () => {
    // Override handlers with error handlers
    server.use(...errorHandlers);

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

    // Should show error message
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/failed/i);
    });
  });
});
