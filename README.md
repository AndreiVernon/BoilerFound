# BoilerFound

BoilerFound helps the Purdue community reconnect lost belongings with their owners.

The prototype implements the **Lost Item Report** flow: a Purdue student reports something they lost, reviews found items that match it, proves the item is theirs by answering the finder's question, and sees where to pick it up.

1. Report: describe the item, where it was last seen, and optionally add a photo.
2. Matches: found items that share keywords with the description are shown with their photo and where they were found. If nothing matches, the report waits in a "Looking for matches" state.
3. Verify: the owner answers the question the finder left (e.g. "What brand is the umbrella?"). A wrong answer is rejected.
4. Pickup: a correct answer reveals the pickup location. "I picked it up" closes the report.

"My reports" lists every report with its status; open reports can be edited or closed, and closed ones reopened.

### Run locally

Commands are for Windows PowerShell. On macOS/Linux, use `python3` and `.venv/bin/python` in place of `python` and `.\.venv\Scripts\python.exe`.

Start the backend (Python 3.12+):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m app.demo_seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

`app.demo_seed` resets the local database and uploads to the demo state: no lost reports, and one found item turned in by test user Bob, a black umbrella found next to the WALC printers. Its finder's question is "What brand is the umbrella?" (answer: Balios). Rerun it, with the server stopped, to start the demo over or after a database schema change.

In a second terminal, serve the frontend from the repo root:

```powershell
python -m http.server 8081 -d frontend
```

Open http://localhost:8081. To see a match, report a black umbrella last seen at WALC. To see the "Looking for matches" state, report anything else, such as a water bottle.

- There is no sign-in yet. The page sends requests to `http://127.0.0.1:8000` (uvicorn's default) as the backend's built-in test user Alice. Change `API_BASE` or `DEV_AUTH_TOKEN` at the top of `frontend/app.js` to use another address or one of the test users listed in [`backend/README.md`](backend/README.md).
- Opening `index.html` directly from disk does not work. The backend only accepts browser requests from the origins in `BOILERFOUND_CORS_ORIGINS`, a JSON list that defaults to `["http://localhost:8081", "http://127.0.0.1:8081"]`. Set it as an environment variable or in `backend/.env` to serve the page elsewhere.
- Without internet access the page falls back to system fonts, since its fonts load from Google Fonts.

### Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

See [`backend/README.md`](backend/README.md) for the API contract and [`docs/implementation/lost-item-flow.md`](docs/implementation/lost-item-flow.md) for how the frontend is structured and its known limitations.

The UI is based on the [Figma final prototype](https://www.figma.com/design/LACVTkIlbslyo5x2L4oDDA/BoilerFound-UI-UX?node-id=87-310).

## Team

Andrei Vernon \
Gustavo Santana \
Thomas Wang \
Abhigyan Doshi
