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

### Checks and tests

```powershell
cd frontend
npm run typecheck
npm run lint
npx playwright install chromium
npm test
npm run build:web
```

Playwright starts localhost automatically if needed. It tests desktop and mobile Chromium, including server availability, navigation, sensitive-item guidance, missing photo/location, whitespace-only location, invalid uploads, successful submission, saved confirmation after refresh, draft preservation, and storage failure. Run `npm run test:ui` for interactive test debugging, or `npx playwright show-report` for the HTML report. GitHub Actions runs checks on frontend pushes and pull requests.

### Current scope

This is a local frontend implementation. Reports and photos persist in the browser's IndexedDB (AsyncStorage on native), on this device only. Drafts survive in-app back navigation and validation errors, but not a browser refresh. Authentication, a shared backend/database, matching, email, claims, and report management are future work. The confirmation deliberately says the report is saved locally rather than claiming it is published campus-wide. Native builds have not yet been device-tested.

The UI follows the [Figma final prototype](https://www.figma.com/design/LACVTkIlbslyo5x2L4oDDA/BoilerFound-UI-UX?node-id=87-310) using Purdue gold `#CEB888`, black `#101010`, Inter body text, and Headland One headings. See [`docs/implementation/found-item-flow.md`](docs/implementation/found-item-flow.md) for structure, design-comment decisions, and future integration points.

## Team

Andrei Vernon \
Gustavo Santana \
Thomas Wang \
Abhigyan Doshi
