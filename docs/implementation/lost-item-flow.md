# Lost Item Report implementation

## Pages

The frontend is a static page (`frontend/index.html`, `app.js`, `styles.css`) with no build step. Pages are selected by the URL hash, so the browser's back button and page refresh work on every page. Each page loads its data from the API when it opens.

| Route | Page | API calls |
| --- | --- | --- |
| `#/` | Home: what the app does and how it works | — |
| `#/report` | New lost report: description, last-seen location, optional photo | `POST /lost-reports` |
| `#/reports` | My reports, with status badges | `GET /lost-reports` |
| `#/reports/{id}` | Report page; its main panel depends on the report's state (below) | `GET /lost-reports/{id}`, `GET /lost-reports/{id}/matches` |
| `#/reports/{id}/edit` | Edit description and location | `PATCH /lost-reports/{id}` |
| `#/reports/{id}/claim/{foundId}` | Verify: answer the finder's question | `POST /lost-reports/{id}/claim` |

The report page shows one of four states:

- **Possible matches** ("Is this yours?"): each found item's photo, description, where and when it was found, with "Not mine" and "This is mine".
- **Looking for matches**: no current matches, with "Check again" and a link to edit the report.
- **It's yours!**: after a successful claim, the pickup location, a Maps link, and "I picked it up", which closes the report.
- **Report closed**: with a button to reopen it.

Photos come from authenticated image endpoints, so `app.js` fetches them with the `Authorization` header and displays them as blob URLs.

## Configuration

`API_BASE` (default `http://127.0.0.1:8000`) and `DEV_AUTH_TOKEN` (default `dev-token-alice`) at the top of `app.js` set the server and test user. There is no sign-in yet.

## Design choices

- Playfair Display is used only for page and card titles; all other text, including the "BF" logo mark, uses DM Sans.
- Content is left-aligned in one 1080 px column. Wide screens use a main panel plus a side panel (the report summary or tips), which stack on screens narrower than 820 px.
- Matches never show the finder's identity or drop-off location; the pickup location appears only after a correct answer.

## Known limitations

- Matching is keyword overlap between descriptions. It ignores photos, so "black umbrella" won't match a found item described only as "dark brolly". Image-based matching (e.g. CLIP embeddings) is the planned replacement.
- "Not mine" only hides a match until the page is reloaded; it isn't saved.
- Wrong answers aren't rate-limited, so a determined guesser could keep trying.
- In the demo data, the brand engraved on the found umbrella's handle is partly visible in its photo, which hints at the answer to the finder's question.
- Every request is made as test user Alice.

## Verification

- Backend: `pytest` in `backend/`. `tests/test_matching_and_claims.py` covers match ranking and privacy, wrong and correct answers, claim errors, match-image access, and the demo seed running the full flow.
- Frontend: run `python -m app.demo_seed`, start both servers, and walk through report → match → wrong answer → correct answer → pickup → close at desktop and phone widths. Then report an unrelated item to check the "Looking for matches" state.
