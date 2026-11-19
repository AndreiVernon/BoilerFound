# BoilerFound

BoilerFound helps the Purdue community reconnect lost belongings with their owners.

The first implementation is the **Found Item Report** flow in [`frontend/`](frontend):

1. Home: choose lost or found (lost reporting is marked Coming soon).
2. Item type: sensitive items receive Purdue Police guidance; other items continue.
3. Found report: photo and found location are required; other fields are optional.
4. Thank you: confirms the saved report and returns to home.

### Run locally

Install Node.js 22.13 or newer, then run:

```powershell
cd frontend
npm ci
npm run web
```

Open http://localhost:8081. Use `npm start` for the Expo native development server.

Found reporting requires the FastAPI backend. In another terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The frontend defaults to `http://localhost:8000` and the backend's existing public `dev-token-alice` account in development builds. For another host, set `EXPO_PUBLIC_API_URL` before starting Expo. `EXPO_PUBLIC_DEV_AUTH_TOKEN` selects a different development token. These Expo variables are public configuration, never places for secrets. Production builds require explicit authentication configuration; real user sign-in is future work. On a physical phone, use your computer's reachable LAN address instead of `localhost`; native device testing has not yet been performed.

### Checks and tests

```powershell
cd frontend
npm run typecheck
npm run lint
npx playwright install chromium
npm test
npm run build:web
```

Install the backend development dependencies above before running browser tests. Playwright starts an isolated real FastAPI server on port 8002 and Expo on port 8083, using temporary SQLite/image storage rather than your development data. If using a Python environment outside `backend/.venv`, set `BOILERFOUND_TEST_PYTHON` to its executable. The tests exercise desktop/mobile navigation, required fields, actual multipart submission and image bytes, confirmation refresh, and API failure/retry behavior. Run `npm run test:ui` for interactive debugging, or `npx playwright show-report` for the HTML report. CI runs integration tests when frontend or backend files change.

### Current scope

The existing found-item frontend submits to FastAPI, which persists reports in SQLite and photos in the backend upload directory. Confirmation retrieves the stored report using its server-generated ID, including after a browser refresh. Drafts survive in-app back navigation and request errors, but not a refresh of an unfinished form. Production authentication, AI matching, email, claims, and found-report editing are future work. This is a local prototype using public development accounts, not a deployed Purdue service. Native builds have not yet been device-tested.

The UI follows the [Figma final prototype](https://www.figma.com/design/LACVTkIlbslyo5x2L4oDDA/BoilerFound-UI-UX?node-id=87-310) using Purdue gold `#CEB888`, black `#101010`, Inter body text, and Headland One headings. See [`docs/implementation/found-item-flow.md`](docs/implementation/found-item-flow.md) for structure, design-comment decisions, and future integration points.

## Team

Andrei Vernon \
Gustavo Santana \
Thomas Wang \
Abhigyan Doshi
