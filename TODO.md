# TODO

- **NVD Service is a stub** — `Backend/Services/nvdService.js` returns hardcoded `CVE-2023-1234` for every CPE instead of querying the real NVD API (working code exists on `integrate-cve-nmap` branch, needs merging).
- **LLM Mitigation is a stub** — `Backend/Services/llmService.js` returns generic `"Apply patches..."` text instead of calling Gemini API for real mitigation generation.
- **LLM Chat is a stub** — `Backend/Services/llmService.js` returns `"This is a placeholder AI response..."` instead of real Gemini-powered chat responses.
- **No environment variables** — No `.env` file exists; will need `NVD_API_KEY` and `GEMINI_API_KEY` when real services are connected.
- **Vulnerability ranking not implemented** — `Backend/Controllers/scanController.js` has a `//TODO: Rank vulnerabilities` placeholder.
- **Scanner EXE not built** — Download button on homepage is disabled; `gui_app.py` exists on `script_gui_wrapper` branch but no packaged `.exe` yet.
- **Chat history not persisted** — Stored in React state only; resets on page refresh (could add `localStorage`).
- **Nmap not in system PATH** — Installed at `C:\Program Files (x86)\Nmap` but not added to PATH; scanner works via the Python venv workaround.
