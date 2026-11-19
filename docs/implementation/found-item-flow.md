# Found Item Report implementation

## Screens

| Screen | Purpose |
| --- | --- |
| `home` | Single action: report a found item. |
| `found-choice` | Sensitive-item decision: wallet/ID/payment card, or something else. |
| `sensitive` | Purdue Police hand-off guidance; returns home. |
| `found` | Required photo and found location; optional drop-off, description, and owner-only question. |
| `found-success` | Shows the drop-off (or found) location and report ID returned by the API. |

The frontend is a static page (`frontend/index.html`, `app.js`, `styles.css`) with no build step. `app.js` keeps one in-memory `state` object and re-renders the current screen on change; buttons navigate through `data-go` attributes. Entered fields survive back navigation and failed submissions, but not a page refresh.

## API integration

Submitting the form sends `multipart/form-data` to `POST /found-reports` with `location`, `drop_off`, `description`, `question`, and `image`. The backend validates every field and the image bytes (JPEG/PNG, 10 MB max), stores the report in SQLite and the photo in `backend/uploads/`, and returns the saved report with a server-generated ID. The confirmation screen displays the values the server returned. The full contract is in [backend/README.md](../../backend/README.md).

The page authenticates with the backend's public `dev-token-alice` placeholder token. `API_BASE` and `DEV_AUTH_TOKEN` at the top of `app.js` set the server and account.

Failures keep the user's entries and show an inline message: unreachable server, `401`, `413` (photo too large), `415` (not JPEG/PNG), and `422` (missing or too-long fields). The submit button is disabled while a request is in flight.

## Known limitations

- No sign-in screen; every report belongs to the dev account Alice.
- The confirmation is not refetchable: refreshing it returns to home. The report itself persists and can be read with `GET /found-reports/{id}`.
- Sensitive-item routing is a frontend choice only; the API does not classify items.
- Browser-side validation is limited to `required` and `maxlength`; image type and size are only checked by the server.
- Matching, claims, notifications, and editing found reports are future work.

## Verification

Backend: `pytest` in `backend/` (85 tests, including the found-report suite, CORS, owner access, and image cleanup). Frontend: run both servers per the root README and click through the flow, including a failed submission with the backend stopped.
