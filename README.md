# IoTriage

**Scan your network, look up CVEs, and get AI-powered remediation guidance — all in one web UI.**

🔗 [GitHub Repository](https://github.com/kagrawal6/Iotriage-Google-capstone)

---

## Overview

IoTriage is a full-stack security tool that combines network scanning, vulnerability lookup, and AI-assisted remediation into a single workflow. Here's how the pieces fit together:

1. **Scanner** — A Python script (`network_scan_script.py`) or optional GUI (`gui_app.py`) runs Nmap against your local network and outputs `scan_results.json`. A prebuilt Windows executable (`NetworkScannerWizard.exe`) is also available from the homepage.
2. **Frontend** — A React/Vite app where you upload `scan_results.json`, browse discovered devices, and view CVEs.
3. **Backend** — An Express.js server that queries the [NVD API](https://nvd.nist.gov/) for CVE data and the [Gemini API](https://ai.google.dev/) for AI remediation suggestions.

---

## Setup

### Prerequisites

- **Node.js** 18+
- **Nmap** installed and on your `PATH`
- **Python 3.10+** (only needed if running the scanner script directly)

### Environment Variables

Create a `.env` file in the `Backend/` directory:

```env
GEMINI_API_KEY=your_gemini_key_here
NVD_API_KEY=your_nvd_key_here   # Optional — helps avoid NVD rate limits
```

---

## Running Locally

### Backend

```bash
cd Backend
npm install
node app.js
# Runs on port 3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Vite proxies /api requests to the backend automatically
```

### Scanner (Windows)

With both the frontend and backend running, click **Download NetworkScannerWizard.exe** on the homepage.

### Scanner (Python — all platforms)

```bash
pip install python-nmap cpe
python network_scan_script.py
```

> ⚠️ Requires admin/root privileges for OS detection. Outputs `scan_results.json` — upload this file in the app.

### Public Deployment

Serve the frontend and backend together (e.g., via a reverse proxy) so that file downloads and `/api` calls continue to work correctly.

---

## Running Tests

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd Backend && npm test
```

---

## What Works

- Network scanning via Nmap with OS and service detection
- Parsing scan results and displaying discovered devices in the UI
- CVE lookup via the NVD API based on detected software/services
- AI remediation suggestions powered by Gemini
- Windows GUI wizard for easy scanning without using the terminal
- File upload workflow for bringing scan results into the web app


---

## What's Next

- Add user authentication 
- Support scheduled/automated scans without manual file uploads
- Improve CVE matching accuracy using CPE data more precisely
- Add export options (PDF report, CSV) for scan results
