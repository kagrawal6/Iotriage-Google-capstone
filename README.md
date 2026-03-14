# IoTriage

IoTriage is a network vulnerability scanner for IoT devices. It scans your local network using Nmap, identifies connected devices and their open services, looks up known vulnerabilities (CVEs) via the NVD, and provides AI-powered remediation guidance through a web interface.

The project has three layers:
1. **Scanner** — A Python script (`network_scan_script.py`) that runs Nmap on your local subnet and outputs `scan_results.json`.
2. **Frontend** — A React web app where users upload scan results, view devices and vulnerabilities, and chat with an AI advisor.
3. **Backend** — A Node.js/Express API that parses device data, queries the NVD for CVEs, and generates mitigation steps via an LLM.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Nmap](https://nmap.org/download) installed on your machine
- Python 3.10+ (for the scanner script)

## Running the Backend

```bash
cd Backend
npm install
node app.js
```

Before starting, create a `Backend/.env` file with your Gemini API key:

```
GEMINI_API_KEY=your_key_here
```

You can get a key from [Google AI Studio](https://aistudio.google.com/apikey). The backend starts on `http://localhost:3000`.

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` and proxies `/api` requests to the backend.

## Running the Network Scanner

```bash
python -m venv scanner_env
source scanner_env/bin/activate        # Linux/Mac
scanner_env\bin\activate               # Windows (Git Bash / MSYS2)
# scanner_env\Scripts\activate.ps1     # Windows (PowerShell, if execution policy allows)

pip install python-nmap cpe
python network_scan_script.py
```

The script auto-detects your local IP, scans the `/24` subnet, and saves results to `scan_results.json`. Upload that file through the frontend to analyze your network.

**Note:** OS detection (`-O` flag) requires administrator/root privileges.

## Running Tests

```bash
cd frontend
npm test
```

Runs 34 integration tests covering the API layer, all pages, and the chat flow.
