# BoilerFound

BoilerFound helps the Purdue community reconnect lost belongings with their owners.

The prototype implements the **Found Item Report** flow: a Purdue community member reports an item they found, gets Purdue Police guidance for wallets, IDs, and payment cards, submits a photo and where they found it, and sees where to leave the item.

1. Home: start a found-item report.
2. Item type: for wallets, IDs, and payment cards, the app shows Purdue Police hand-off guidance and ends without saving a report. Other items continue.
3. Found report: photo and found location are required. Drop-off location, description, and a verification question are optional. The verification question is something only the real owner could answer (e.g. "What's written on the inside tag?"); it is stored privately with the report for checking future claims.
4. Thank you: shows where to leave the item (the drop-off location, or the found location if no drop-off was given) and the report ID saved by the backend.

### Run locally

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

- The page sends requests to `http://127.0.0.1:8000` (uvicorn's default) as the backend's built-in test user Alice. Change `API_BASE` or `DEV_AUTH_TOKEN` at the top of `frontend/app.js` to use another address or test user.
- Opening `index.html` directly from disk does not work. The backend only accepts browser requests from the origins listed in `BOILERFOUND_CORS_ORIGINS` (port 8081 by default), set as an environment variable or in `backend/.env`.
- The page needs an internet connection for Google Fonts.

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
