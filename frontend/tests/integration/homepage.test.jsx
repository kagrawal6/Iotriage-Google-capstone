import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "../helpers/renderApp";

describe("HomePage", () => {
  it("renders the project title and description", () => {
    renderApp("/");

    expect(screen.getByRole("heading", { name: "IoTriage" })).toBeInTheDocument();
    expect(screen.getByText(/Scan your local network/)).toBeInTheDocument();
  });

  it("displays the how-it-works section", () => {
    renderApp("/");

    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText(/Scan your network/)).toBeInTheDocument();
    expect(screen.getByText(/Upload results/)).toBeInTheDocument();
    expect(screen.getByText(/Review & remediate/)).toBeInTheDocument();
  });

  it("shows the download section with system requirements", () => {
    renderApp("/");

    expect(screen.getByText("Download Scanner")).toBeInTheDocument();
    expect(screen.getByText(/Windows 10/)).toBeInTheDocument();
    expect(screen.getAllByText(/Nmap/).length).toBeGreaterThan(0);
  });

  it("displays the quick start guide", () => {
    renderApp("/");

    expect(screen.getByText("Quick Start")).toBeInTheDocument();
    expect(screen.getByText(/Install Nmap/)).toBeInTheDocument();
  });

  it("has a navigation bar with Home and Upload links", () => {
    renderApp("/");

    const navLinks = screen.getAllByRole("link");
    const hrefs = navLinks.map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/upload");
  });

  it("does NOT show Results or Chat nav links before scan upload", () => {
    renderApp("/");

    const navLinks = screen.getAllByRole("link");
    const texts = navLinks.map((l) => l.textContent);

    expect(texts).not.toContain("Results");
    expect(texts).not.toContain("Chat");
  });
});
