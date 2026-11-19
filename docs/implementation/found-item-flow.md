# Found Item Report implementation

## Screens

Each name is a key in the `screens` object in `app.js` and the value buttons use in `data-go` to navigate there.

| Screen | Purpose |
| --- | --- |
| `home` | Single action: report a found item. |
| `found-choice` | Sensitive-item decision: wallet/ID/payment card, or something else. |
| `sensitive` | Purdue Police hand-off guidance; returns home. |
| `found` | Required photo and found location; optional drop-off, description, and verification question (something only the real owner could answer, stored privately for checking future claims). |
| `found-success` | Shows the drop-off (or found) location and report ID returned by the API. |

The frontend is a static page (`frontend/index.html`, `app.js`, `styles.css`) with no build step. `app.js` keeps one in-memory `state` object and re-renders the current screen on change; buttons navigate through `data-go` attributes. Entered fields survive back navigation and failed submissions, but not a page refresh.

## API integration

Submitting the form sends `multipart/form-data` to `POST /found-reports` with `location` (found location, required), `image` (photo, required), `drop_off`, `description`, and `question` (verification question). The form's `maxlength` values match the backend's limits. The backend validates every field and the image bytes (JPEG/PNG, 10 MB max), stores the report in SQLite and the photo in `backend/uploads/`, and returns the saved report with a server-generated ID. The confirmation screen displays the values the server returned. The full contract is in [backend/README.md](../../backend/README.md).

There is no sign-in yet. The backend seeds three test users whose bearer tokens are hardcoded and documented in the backend README, and the page sends `Authorization: Bearer dev-token-alice` as test user Alice. `API_BASE` (default `http://127.0.0.1:8000`) and `DEV_AUTH_TOKEN` at the top of `app.js` set the server and account.

Failures keep the user's entries and show an inline message: unreachable server, `401` (token rejected), `413` (photo too large), `415` (not JPEG/PNG), and `422` (missing or too-long fields). The submit button is disabled while a request is in flight.

## Known limitations

- No sign-in screen; every report belongs to test user Alice.
- The confirmation is not refetchable: refreshing it returns to home. The report itself persists, and the user who submitted it can read it with `GET /found-reports/{id}`.
- Sensitive-item routing is a frontend choice only; the API does not classify items.
- Browser-side validation is limited to `required` and `maxlength`; image type and size are only checked by the server.
- Matching, claims, notifications, and editing found reports are future work.

## Verification

Backend: `pytest` in `backend/`. The found-report tests cover field and image validation, CORS, restricting each report to the user who submitted it, and deleting the uploaded photo when saving the report fails. Frontend: run both servers per the root README and click through the flow, including a failed submission with the backend stopped.
