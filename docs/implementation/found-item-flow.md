# Found Item Report implementation

## Routes and responsibilities

| Route | Purpose |
| --- | --- |
| `/` | Two report actions; lost reporting is visibly unavailable. |
| `/found` | Sensitive-item decision with inline police instructions, or continue. |
| `/found/report` | Photo upload, found location, optional drop-off, description, and ownership question. |
| `/found/thank-you?id=…` | Retrieve the saved report and show its actual location; return home. |

Expo Router owns navigation. Shared components and design tokens live in `frontend/src/components` and `frontend/src/theme.ts`. `DraftProvider` keeps entered fields when navigating back within the app. Refreshing an unfinished form clears that draft; completed reports persist.

`model.ts` contains domain types and validation independent of UI. The report repository now exposes `save(draft)` and `get(id)` through a shared FastAPI adapter. Both platforms send multipart data to `POST /found-reports`; the API validates and stores the photo/fields and returns a server-generated report ID. Confirmation reads `GET /found-reports/{id}`. Backend SQLite and the existing local image store replace the earlier device-local report storage. The backend reuses its development-token authentication and requires report ownership for reads, including image downloads.

The form blocks missing photos, blank/whitespace locations, and invalid field lengths. Web uploads check JPEG/PNG signatures, decoding, and the 10 MB size limit, rather than relying on extensions. The API independently validates fields, image signatures, size, and access. Failed submissions preserve the draft. Double-click submission is guarded; success navigation happens only after a `201` response. Confirmation distinguishes missing reports from server errors and provides retry for a failed API read. Request timeouts do not silently save to another store.

Found location is required; drop-off location is optional to follow this assignment's two required fields. The confirmation labels an entered drop-off as “Leave it at”; otherwise it labels the original location as “Found at” and asks for a staffed drop-off. It never silently treats the discovery location as the pickup desk.

## Figma comments reviewed

Reviewed all returned file comments on the final prototype. Applied the relevant suggestions:

- **Consistent primary action** (`2003168132`): gold primary buttons throughout; secondary actions use outlines.
- **Caption proximity** (`2003164537`): each home caption is inside its own action.
- **Required fields and recovery** (`2003170715`): explicit labels and inline messages; errors and back navigation preserve entries.
- **Police contact information** (`2003172843`, `2002948413`): inline sensitive-item guidance includes the [official contact page](https://www.purdue.edu/ehps/police/contact/index.php).
- **Optional ownership question** (`2003173201`, `2003166778`): helper text explains that desk staff still verify ownership if no question is provided. This field is not treated as authentication or proof of ownership.
- **Photo quality** (`2002826200`): web uploads show a nonblocking resolution warning below 640 × 480. Automated blur detection remains outside this assignment.

Deferred: report update/return actions, claims and review states, notification history, production authentication, and verified official drop-off dropdowns. These require additional flows or authoritative backend data. The suggestion to remove required-photo labeling was not applied because explicit requirements help first-time users. The prototype uses the backend's existing development accounts; it does not implement user login. Police guidance remains inline on the item-type screen, as in the existing frontend.

## Verification

Playwright exercises actual pages at desktop and mobile viewports against a real test API with temporary SQLite/image storage. Fixtures contain a synthetic water-bottle image, not a user's photo. Happy-path tests verify the API's `201` response, persisted fields, and downloaded image bytes. Failure tests simulate unavailable endpoints and verify draft preservation, confirmation error states, and successful retry. Backend tests additionally check owner access, rejected payloads, image cleanup, and persistence across server restart.

Run commands from the root README. CI stores the Playwright report and browser-test artifacts, including confirmation screenshots. Native Android/iOS testing, production authentication, request idempotency across network retries, and cloud storage/deployment remain future work.
