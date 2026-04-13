# IoTriage

Scan your network with Nmap, look up CVEs, and get AI remediation help in a web UI.

**Parts:** Python scanner (`network_scan_script.py` or optional `gui_app.py`) → upload `scan_results.json` → React frontend → Express backend (NVD + Gemini).

## Setup

- Node 18+, Nmap on your PATH, Python 3.10+ if you use the script directly.

Put secrets in **`Backend/.env`**:

```
GEMINI_API_KEY=...
NVD_API_KEY=...
```

(`NVD_API_KEY` is optional; helps with NVD rate limits.)

## Run locally

**Backend** — `cd Backend`, `npm install`, `node app.js` (port 3000).

**Frontend** — `cd frontend`, `npm install`, `npm run dev` (Vite proxies `/api` to the backend).

**Windows scanner** — With both running, use **Download NetworkScannerWizard.exe** on the homepage. For a public deploy, serve frontend and backend together so downloads and API calls still work.

**Python scan** — `pip install python-nmap cpe`, then `python network_scan_script.py`. Needs admin for OS detection. Outputs `scan_results.json`; upload it in the app.

## Tests

`cd frontend && npm test` · `cd Backend && npm test`
