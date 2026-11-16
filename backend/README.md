# BoilerFound backend

FastAPI service for BoilerFound, a lost-and-found app for Purdue that matches lost-item reports with
photos of found items. So far it covers lost-item reports: submitting them (requirement FR-101) and
editing or closing them (FR-102). Requirement IDs refer to our Software Development Plan,
[docs/Semester_1/SDP.pdf](../docs/Semester_1/SDP.pdf). Found reports, matching, and notifications
are not built yet.

## Setup

Requires Python 3.12+. All commands in this README are run from `backend/` with the venv active.

```bash
cd backend   # from the repo root
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

Interactive API docs are at http://127.0.0.1:8000/docs. On startup the app creates a SQLite database
at `backend/boilerfound.db` if it doesn't exist (restarts keep existing data) and stores uploaded
images in `backend/uploads/`. Both are gitignored.

## Auth (placeholder)

We haven't picked Firebase or Cognito yet, so the API accepts a fixed set of dev tokens:

| User  | Header                                 |
|-------|----------------------------------------|
| Alice | `Authorization: Bearer dev-token-alice` |
| Bob   | `Authorization: Bearer dev-token-bob`   |
| Carol | `Authorization: Bearer dev-token-carol` |

The three users are created in the database when the server starts. Their emails are
`alice@example.com`, `bob@example.com` and `carol@example.com`.

In the `/docs` page, click **Authorize** and paste just the token (e.g. `dev-token-alice`).

These tokens are public. Set `BOILERFOUND_ENABLE_DEV_AUTH=false` anywhere that isn't a local machine.
Until a real provider is added, that makes every endpoint except `/health` return `401`, so the API
is unusable outside local development for now. When the real provider is chosen, only
`get_current_user` in `app/auth.py` should need to change.

## Endpoints

| Method | Path                       | Description                                                       |
|--------|----------------------------|-------------------------------------------------------------------|
| GET    | `/health`                  | Liveness check, no auth                                           |
| GET    | `/me`                      | The authenticated user: `id`, `email`, `display_name`              |
| POST   | `/lost-reports`            | Create a report. `multipart/form-data`: `description`, `location`, optional `image`. Returns `201` and the report |
| GET    | `/lost-reports`            | List of your reports, newest first. Optional `?status=open` or `?status=closed` |
| GET    | `/lost-reports/{id}`       | One of your reports                                               |
| PATCH  | `/lost-reports/{id}`       | JSON with any of `description`, `location`, `status`. Returns the updated report |
| GET    | `/lost-reports/{id}/image` | The report's image file                                           |

Rules:

- `description` is 5–1,000 characters and `location` is 1–150, after trimming surrounding whitespace.
- Images must be JPEG or PNG, at most 10 MB by default. The type is checked from the file's bytes,
  not its name. Images can't be changed after the report is created.
- Every endpoint except `/health` needs the `Authorization` header, including the image endpoint.
  A plain `<img src="...">` can't send that header, so a frontend has to fetch the image with the
  header and display the result.
- Only the report's owner can view or edit it. Anyone else gets `403`.
- Status is `open` or `closed`. Close a report with `PATCH {"status": "closed"}` and reopen it with
  `{"status": "open"}`; there is no delete. Closed reports are kept but will
  be excluded from matching once it's built.
- Error codes: `401` for missing or invalid tokens, `403` for someone else's report, `404` for an
  unknown report id or a report with no image, `422` for bad fields, `413` for images over the size
  limit, `415` for files that aren't JPEG or PNG.

Example:

```bash
curl -X POST http://127.0.0.1:8000/lost-reports \
  -H "Authorization: Bearer dev-token-alice" \
  -F "description=Blue Hydro Flask with a Purdue sticker" \
  -F "location=WALC 2nd floor" \
  -F "image=@bottle.jpg"
```

Response (`201`). Use `id` in the other `/lost-reports/{id}` endpoints:

```json
{
  "id": "8c0519fc-5fff-492d-8d54-6cbcf8bd5404",
  "owner_id": "3e8bf01f-bf6a-43a0-9896-3663a326a9de",
  "description": "Blue Hydro Flask with a Purdue sticker",
  "location": "WALC 2nd floor",
  "status": "open",
  "created_at": "2026-11-16T04:35:20.416640Z",
  "updated_at": "2026-11-16T04:35:20.416644Z",
  "image_url": "/lost-reports/8c0519fc-5fff-492d-8d54-6cbcf8bd5404/image"
}
```

`image_url` is `null` when no image was uploaded.

## Configuration

Settings come from environment variables (or a `backend/.env` file), all prefixed with `BOILERFOUND_`:

| Variable                       | Default                     |
|--------------------------------|-----------------------------|
| `BOILERFOUND_DATABASE_URL`     | SQLite file `boilerfound.db` in `backend/` |
| `BOILERFOUND_UPLOAD_DIR`       | `uploads/` in `backend/`    |
| `BOILERFOUND_MAX_IMAGE_BYTES`  | `10485760` (10 MB)          |
| `BOILERFOUND_ENABLE_DEV_AUTH`  | `true`                      |

`BOILERFOUND_DATABASE_URL` is a SQLAlchemy URL, e.g. `sqlite:///C:/data/boilerfound.db` (three
slashes, then an absolute path). Only SQLite works today; using Postgres will also need a driver such
as `psycopg` added to `requirements.txt`.

The defaults are absolute paths inside `backend/`, so they don't depend on where you start the server.
A relative path you set yourself, in `BOILERFOUND_UPLOAD_DIR` or after `sqlite:///`, is resolved from
the current directory. Environment variables take precedence over `.env`.

## Tests

```bash
pytest
```

Tests are organized by requirement (`tests/test_fr101_*.py`, `tests/test_fr102_*.py`). The SDP lists
a test method for each requirement, such as "submit 10 valid reports and verify unique IDs", and each
file's docstring quotes the method it implements. Each test gets its own temporary database and
uploads folder.

GitHub Actions runs the suite on Python 3.12 and 3.14 whenever a push to `main` or a pull request
changes files under `backend/` or `.github/workflows/backend-tests.yml`.
