import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ScanProvider } from "../../src/context/ScanContext";
import App from "../../src/App";

/**
 * Helper to render the full app in tests with a given initial route.
 * Uses MemoryRouter so we can control navigation without a real browser.
 */
export function renderApp(initialRoute = "/") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ScanProvider>
        <App />
      </ScanProvider>
    </MemoryRouter>
  );
}
