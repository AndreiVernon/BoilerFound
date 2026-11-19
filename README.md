# BoilerFound

BoilerFound helps the Purdue community reconnect lost belongings with their owners.

The prototype implements the **Found Item Report** flow: a Purdue community member reports an item they found, gets Purdue Police guidance for wallets, IDs, and payment cards, submits a photo and where they found it, and sees where to leave the item.

1. Home: start a found-item report.
2. Item type: wallets, IDs, and payment cards are handled by Purdue Police, so the app shows hand-off guidance and ends without saving a report. Other items continue.
3. Found report: photo and found location are required. Drop-off location (the staffed desk where the finder will leave the item), description, and a verification question are optional. The verification question is something only the real owner could answer (e.g. "What's written on the inside tag?"); it is stored privately with the report for checking future claims.
4. Thank you: confirms the report ID saved by the backend and reminds the finder where the item goes: the drop-off location, or the found location if none was given.

### Run locally

Commands are for Windows PowerShell. On macOS/Linux, use `python3` and `.venv/bin/python` in place of `python` and `.\.venv\Scripts\python.exe`.

Start the backend (Python 3.12+):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

In a second terminal, serve the frontend from the repo root:

```powershell
python -m http.server 8081 -d frontend
```

Open http://localhost:8081. The backend creates its SQLite database and upload folder on first start; no other setup is needed.

- There is no sign-in yet. The page sends requests to `http://127.0.0.1:8000` (uvicorn's default) as the backend's built-in test user Alice. Change `API_BASE` or `DEV_AUTH_TOKEN` at the top of `frontend/app.js` to use another address or one of the test users listed in [`backend/README.md`](backend/README.md).
- Opening `index.html` directly from disk does not work. The backend only accepts browser requests from the origins in `BOILERFOUND_CORS_ORIGINS`, a JSON list that defaults to `["http://localhost:8081", "http://127.0.0.1:8081"]`. Set it as an environment variable or in `backend/.env` to serve the page elsewhere.
- Without internet access the page falls back to system fonts, since its fonts load from Google Fonts.

### Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

See [`backend/README.md`](backend/README.md) for the API contract and [`docs/implementation/found-item-flow.md`](docs/implementation/found-item-flow.md) for how the frontend is structured and its known limitations.

The UI is based on the [Figma final prototype](https://www.figma.com/design/LACVTkIlbslyo5x2L4oDDA/BoilerFound-UI-UX?node-id=87-310).

## Team

Andrei Vernon \
Gustavo Santana \
Thomas Wang \
Abhigyan Doshi
