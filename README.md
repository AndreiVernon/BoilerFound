# BoilerFound

BoilerFound helps the Purdue community reconnect lost belongings with their owners.

The prototype implements the **Found Item Report** flow: a Purdue community member reports an item they found, gets Purdue Police guidance for wallets, IDs, and payment cards, submits a photo and where they found it, and sees where to leave the item.

1. Home: start a found-item report.
2. Item type: sensitive items get Purdue Police guidance; other items continue.
3. Found report: photo and found location are required; drop-off, description, and an owner-only question are optional.
4. Thank you: shows the drop-off location and the report ID saved by the backend.

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

Open http://localhost:8081. Opening `index.html` directly from disk does not work because the backend only accepts requests from the origins in `BOILERFOUND_CORS_ORIGINS` (port 8081 by default). The page needs an internet connection for Google Fonts.

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
