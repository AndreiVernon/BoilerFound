# Found Item Report implementation

## Routes and responsibilities

| Route | Purpose |
| --- | --- |
| `/` | Two report actions; lost reporting is visibly unavailable. |
| `/found` | Sensitive-item decision with inline police instructions, or continue. |
| `/found/report` | Photo upload, found location, optional drop-off, description, and ownership question. |
| `/found/thank-you?id=…` | Retrieve the saved report and show its actual location; return home. |

Expo Router owns navigation. Shared components and design tokens live in `frontend/src/components` and `frontend/src/theme.ts`. `DraftProvider` keeps entered fields when navigating back within the app. Refreshing an unfinished form clears that draft; completed reports persist.

`model.ts` contains domain types and validation independent of UI. The report repository exposes `save(report)` and `get(id)`; the web adapter uses IndexedDB and native uses AsyncStorage. A future authenticated FastAPI adapter can replace these adapters while preserving the screen structure. Backend validation, authorization, secure shared image storage, idempotency, and an API-generated report ID are required before production use. Local records are not encrypted application storage and are not shared with other users.

The form blocks missing photos, blank/whitespace locations, and invalid field lengths. Web uploads check JPEG/PNG signatures, decoding, and the 10 MB size limit, rather than relying on extensions. Upload replacement and read/save errors preserve valid existing entries. Double-click submission is guarded; success navigation happens only after storage commits. A confirmation URL without an existing saved record never displays success.

Found location is required; drop-off location is optional to follow this assignment's two required fields. The confirmation labels an entered drop-off as “Leave it at”; otherwise it labels the original location as “Found at” and asks for a staffed drop-off. It never silently treats the discovery location as the pickup desk.

## Figma comments reviewed

Reviewed all returned file comments on the final prototype. Applied the relevant suggestions:

- **Consistent primary action** (`2003168132`): gold primary buttons throughout; secondary actions use outlines.
- **Caption proximity** (`2003164537`): each home caption is inside its own action.
- **Required fields and recovery** (`2003170715`): explicit labels and inline messages; errors and back navigation preserve entries.
- **Police contact information** (`2003172843`, `2002948413`): inline sensitive-item guidance includes the [official contact page](https://www.purdue.edu/ehps/police/contact/index.php).
- **Optional ownership question** (`2003173201`, `2003166778`): helper text explains that desk staff still verify ownership if no question is provided. This field is not treated as authentication or proof of ownership.
- **Photo quality** (`2002826200`): web uploads show a nonblocking resolution warning below 640 × 480. Automated blur detection remains outside this assignment.

Deferred: report update/return actions, claims and review states, notification history, authentication, and verified official drop-off dropdowns. These require additional flows or authoritative backend data. The suggestion to remove required-photo labeling was not applied because explicit requirements help first-time users. Suggestions to permit anonymous submissions do not establish a production authentication policy; this assignment does not implement login.

## Verification

Playwright exercises actual pages at desktop and mobile viewports, with isolated browser storage per test. Fixtures contain a synthetic water-bottle image, not a user's photo. Tests cover HTTP readiness, routing and back navigation, both required fields independently and together, whitespace, invalid and oversized uploads, draft retention, successful persistent saves, optional fields, failed storage, confirmation refresh, and home return.

Run commands from the root README. CI stores failure screenshots/traces in the Playwright artifact. Native Android/iOS testing and shared backend integration remain future work.
