# BoilerFound Team Development Process

**Team:** Andrei Vernon, Gustavo Santana, Thomas Wang, and Abhigyan Doshi  
**Applies to:** the prototype assignment and subsequent course development  
**Process owner:** the whole team; changes require a reviewed pull request

## 1. Purpose and working scope

BoilerFound is a lost-and-found web/mobile application for Purdue students and staff. Users submit lost or found reports, review possible AI matches, and follow campus pickup procedures. AI suggestions do not establish ownership.

Our process keeps tasks small, makes review practical for a four-person team, and leaves evidence of who implemented and tested each change. We use one shared repository, GitHub issues, pull requests, and automated checks. We do not require daily ceremonies, separate personal repositories, or a permanent `develop` branch.

For this prototype, our chosen flow is **Found Item Report**: home → item-type decision → found report with a required photo and found location → confirmation and return home. Sensitive items receive Purdue Police guidance. We will connect submission and confirmation to the backend so the flow includes a meaningful API call.

As of this process's initial preparation:

- `origin/main` contains the FastAPI lost-report backend, SQLite persistence, image storage, development authentication, and backend tests.
- `Gustavo_genAI_acitivity` contains the Expo found-report frontend and browser tests. It is not yet integrated into `main`.
- The existing frontend saves reports on the device. Found-report API endpoints and frontend/backend integration remain to be implemented.
- Full AI matching, notifications, production identity integration, and cloud deployment are later tasks, not prerequisites for this prototype.

## 2. Repository architecture

We use a **monorepo**: related frontend, backend, tests, and documentation stay together so one pull request can update an API and its caller.

The following is the target combined layout. `frontend/` already exists on the earlier activity branch and will enter the integration branch through review. Entries marked **planned** are added when their corresponding work begins; they are not claims of implemented functionality.

```text
BoilerFound/
├── README.md                       # Project overview and local setup entry point
├── .gitignore                      # Exclude secrets and generated/runtime files
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── task.md                 # Scope, owner, requirements, acceptance criteria
│   ├── pull_request_template.md    # Summary, checks, reviewer checklist
│   └── workflows/
│       ├── backend-tests.yml       # Python API checks
│       └── frontend.yml            # Frontend checks; comes with frontend integration
├── doc/
│   └── development-process.md      # This single authoritative process document
├── docs/
│   ├── Semester_1/                 # Proposal, SDP, and course reference materials
│   └── implementation/             # Feature notes and prototype evidence
├── frontend/                       # Expo / React Native / TypeScript
│   ├── src/
│   │   ├── app/                    # Expo Router screens and navigation layouts
│   │   ├── components/             # Reusable controls and screen elements
│   │   ├── features/found/         # Found-report state, validation, storage/API adapter
│   │   └── theme.ts                # Purdue colors and shared font definitions
│   ├── assets/                     # Local images and Figma assets
│   ├── tests/                      # Playwright flows and synthetic test fixtures
│   ├── package.json
│   ├── package-lock.json           # Commit for reproducible dependency installation
│   └── playwright.config.ts
└── backend/                        # Python / FastAPI
    ├── app/
    │   ├── main.py                 # Application setup and router registration
    │   ├── routers/                # HTTP endpoints grouped by resource
    │   ├── schemas.py              # Request/response validation
    │   ├── models.py               # Database entities
    │   ├── crud.py                 # Database operations
    │   ├── database.py             # Engine and database sessions
    │   ├── auth.py                 # Identity and access dependencies
    │   ├── config.py               # Environment-based configuration
    │   └── storage.py              # Image validation and file storage
    ├── tests/                      # pytest API tests, grouped by requirement
    ├── migrations/                 # Planned when versioned schema migrations are added
    ├── requirements.txt
    ├── requirements-dev.txt
    └── README.md                   # Backend setup, endpoints, and configuration
```

### Placement and dependency rules

- Keep route files focused on navigation and screen behavior. Put reusable validation, state, and API access outside `frontend/src/app/`; every ordinary file there represents a route.
- Keep HTTP handling in backend routers, data validation in schemas, and persistence in database/model/CRUD modules. Split these modules by feature when their size makes navigation difficult; do not create empty layers prematurely.
- Put tests near the application they validate, using synthetic photos and temporary test databases. Add cross-service flow tests to the frontend suite once a real backend is connected.
- Keep API request and response names documented in the backend README/OpenAPI schema. Frontend/backend changes must agree on required fields, status values, errors, and image handling.
- Keep `doc/` for the required process file and retain existing `docs/` materials to preserve their links. Do not move course documents merely to make the names uniform.
- Never commit `.env` secrets, credentials, real user photos, local databases/uploads, virtual environments, `node_modules`, builds, or test reports. Provide placeholder configuration examples when needed.

### Architecture references

- [Expo Router core concepts](https://docs.expo.dev/router/basics/core-concepts/): explains route files and navigation layouts. We keep screens in `src/app/` and shared code elsewhere.
- [FastAPI: Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/): describes organizing applications across modules and `APIRouter` instances. This guides the backend's router-based structure.
- [pytest: Good Integration Practices](https://docs.pytest.org/en/stable/explanation/goodpractices.html): informs test organization and repeatable test execution.

These sources guide our structure; they do not prescribe a universal folder layout. The monorepo and the separation of `doc/` and `docs/` are team choices suited to this repository and assignment.

## 3. Branching and workflow model

We use a lightweight branch-and-PR workflow based on [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow), with a temporary integration branch for the prototype milestone.

| Branch | Purpose | New work starts from | Merge destination |
| --- | --- | --- | --- |
| `main` | Stable, reviewed baseline suitable for a team demonstration | Not used for direct development | Receives reviewed milestone/task PRs |
| `prototype` | Shared integration of the selected prototype flow | Latest reviewed `main`, when the milestone begins | `main`, through a milestone PR |
| `feature/<issue-number>-<short-description>` | One product behavior or integration task | `prototype` during the prototype; otherwise `main` | Its starting integration branch |
| `fix/<issue-number>-<short-description>` | A reproducible defect and its correction | Branch containing the defect | Its starting integration branch |
| `docs/<short-description>` | Documentation/process work | Relevant common branch | Its starting integration branch |
| `chore/<issue-number>-<short-description>` | Tooling, configuration, or dependency maintenance | Relevant common branch | Its starting integration branch |

Examples: `feature/12-found-report-api`, `fix/18-missing-photo-error`, `docs/development-process`, and `chore/21-api-ci`.

Use lowercase words and hyphens, without spaces. Product, bug, and maintenance branches include their actual GitHub issue number; do not invent issue numbers. Documentation branches may omit a number, but their PR must still describe the task. Each issue has a named owner and a teammate reviewer. Students work in branches **inside the team repository**, not personal forks.

### Historical individual-activity exception

The earlier branch **`Gustavo_genAI_acitivity`** (the exact existing spelling, sometimes referred to as Gustavo_genai_activity) was an exception for the individual GenAI activity. Its personal name and direct commits predate this shared process. Preserve its history; do not rename it or fabricate earlier reviews. Future team work follows the conventions above. Bring its existing frontend into `prototype` through a reviewed PR before building additional frontend tasks.

### Starting and updating a task

1. Check the issue and target branch, then fetch `origin` and check `git status`. Commit intended work or safely set it aside before switching; never discard a teammate's changes.
2. Create a task branch from the current remote integration branch. During the prototype, for example: `git switch -c feature/12-found-report-api origin/prototype`.
3. Commit coherent changes with messages such as `feat: add found-report submission endpoint` or `fix: reject blank found locations`.
4. Push meaningful progress at the end of a working session, or sooner when a teammate depends on it. A broken intermediate change may be pushed to a task branch, but must be identified in a draft PR and cannot be merged.
5. Fetch before requesting final review and resolve conflicts with the target branch. Prefer merging the target into shared task branches; do not rewrite published team history or force-push common branches.
6. After the prototype is reviewed and merged into `main`, retire the milestone branch after confirming no open PRs depend on it. Later routine tasks target `main`; create another temporary integration branch only for a milestone that needs it.

## 4. Task tracking and implementation

Use one repository-linked GitHub Project board named **BoilerFound Development**, with **Todo → In progress → In review → Done**. GitHub Project creation and settings are separate setup actions; the template files alone do not create this board.

Every task must describe its problem, owner, relevant SDP requirement IDs (when applicable), acceptance criteria, and testing plan. Use `.github/ISSUE_TEMPLATE/task.md`. Keep tasks small enough for one focused PR, usually one or a few working sessions. Split a task when its scope becomes difficult for one teammate to review.

- Move to **In progress** when implementation begins and link the task branch or draft PR.
- Move to **In review** when the implementation meets its acceptance criteria and the PR is ready.
- Move to **Done** only after merging, completing applicable checks, and updating documentation. A task merged into `prototype` is complete there; the milestone PR tracks release into `main`.
- Record blockers in the issue and raise them at the next team check-in. Check the board during existing team meetings; no additional daily meeting is required.
- Each student makes their own substantive contributions with their own author identity. Record actual work in the course contribution table. An AI agent must not impersonate another student or create artificial contribution history.

## 5. Pull requests, reviews, and merging

Use `.github/pull_request_template.md` for every task PR and milestone PR. Explain the resulting behavior, link the issue, list validation performed, and include UI evidence when screens change. Explicitly say which parts are mocked, device-local, or incomplete.

### Frequency and approval

- Open a draft PR early for multi-session work or API changes that another teammate will consume. Request review when the acceptance criteria and applicable checks pass.
- Keep one primary task per PR. Request a teammate's review promptly; reviewers should respond within two working days where possible, and flag delays to the team.
- Require **at least one approval from a teammate other than the author** before merging into `prototype` or `main`. The author cannot approve their own work.
- Resolve review comments and obtain renewed approval after material changes to behavior, API contracts, or security controls. Minor wording fixes need not restart the entire review, but tell the reviewer what changed.
- A reviewer checks correctness, scope, readability, requirements, tests, and data/access handling. They manually try changed UI flows when practical, rather than treating green CI as complete evidence.
- After approval, the author or a designated teammate may merge. Do not bypass review to meet a deadline; reduce scope or notify the team instead.

### Merge policy

- No direct commits to common branches after this process is adopted, except their initial creation from an existing reviewed baseline.
- Use **Create a merge commit** for task PRs and milestone PRs. This preserves each student's original commits and the review history. Keep commits meaningful; do not manufacture contributions.
- Delete a merged task branch after confirming no other task depends on it. Keep commits and PRs as the audit trail.
- If a merged change breaks the common branch, open a focused fix or revert PR, get a teammate review, and rerun relevant checks. Do not reset or force-push the common branch.
- Process changes also require a documentation PR. This file remains the single source of team workflow policy.

### GitHub enforcement

The repository owner/administrator should configure branch rules for `main` and `prototype`: require PRs, one non-author approval, resolved conversations, and renewed approval after material changes; block force pushes and branch deletion where supported. Enable merge commits. Follow [GitHub's protected-branch guidance](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

All applicable CI results must pass before merging. Current workflows filter by changed paths, so do not require a workflow globally if it will never run on documentation-only PRs. If the owner wants one mandatory CI status for every PR, first add an always-running aggregate check that correctly handles skipped application jobs. Until settings are verified, these are team-enforced rules, not a claim that GitHub already blocks every violation.

## 6. CI, testing, and definition of done

Run checks appropriate to changed behavior before final review. State what was run and its actual result; do not label a test passed because it passed on an older commit.

| Change | Required validation |
| --- | --- |
| Frontend behavior or UI | `npm run typecheck`, `npm run lint`, `npm run build:web`, and applicable Playwright desktop/mobile tests from `frontend/`; manually compare changed screens with Figma |
| Backend behavior | `pytest` from `backend/` using the development requirements; cover the relevant requirement and meaningful failure paths |
| API integration | Both applicable suites plus an end-to-end run against the real local backend; verify request fields, upload behavior, responses, and failure recovery |
| Documentation only | Check Markdown rendering, relative paths, commands, references, branch naming, and agreement with actual repository state; application tests are not required for prose-only edits |
| CI/dependency changes | Validate the configuration and run the affected jobs/checks; include dependency/configuration changes and lockfiles together |

The backend workflow runs on backend-changing PRs and pushes to `main` and `prototype`. The existing frontend workflow enters through the frontend integration PR and must run for relevant PRs and integration-branch pushes. Keep job names distinct. Do not merge a failed run or an unexplained skipped required check; investigate and rerun after the cause is corrected.

For found reporting, cover successful submission, required photo/location errors, invalid uploads, navigation, server/storage failures, and confirmation without an existing report. Use fresh test records and temporary storage. Browser mobile emulation does not replace native-device testing; report that limitation.

A task is done when its acceptance criteria are met, the relevant checks pass on the PR's current changes, a teammate approves, documentation is current, and the PR is merged into its intended common branch. Screenshots, test results, known limitations, and actual student contributions should be available for the prototype demonstration.

## 7. Adopting this process for the prototype

Complete these setup actions before treating the prototype assignment as finished:

- [ ] Review and merge `docs/development-process` into `main` through a PR using the new template.
- [ ] Create the repository-linked Project board and assign initial issues and reviewers.
- [ ] Configure or verify the common-branch rules described above; record any unavailable enforcement in the setup issue.
- [ ] Create `prototype` from the latest `origin/main` after the process PR merges.
- [ ] Review the existing frontend in a PR from `Gustavo_genAI_acitivity` into `prototype`, preserving the individual-activity exception and original authorship.
- [ ] Confirm that frontend and backend CI run for relevant PRs and integration pushes.
- [ ] Create issue-linked task branches for found-report API endpoints, frontend API integration, and integration tests. Define the API contract before parallel implementation.
- [ ] Review and merge each task into `prototype`; demonstrate all chosen-flow screens and at least one real API call.
- [ ] Prepare the narrated demo, implementation notes, contribution entries, and an accurate 2–3 sentence GenAI statement.
- [ ] Review the complete prototype and merge the milestone PR into `main`.

These are setup/milestone checks, not claims that they have already been completed. Update their status with links to the actual issues and PRs as the team performs them.

## 8. Brightspace submission and ongoing use

Submit a clickable URL to this file in the team repository:

- **Initial review branch:** [development process on docs/development-process](https://github.com/AndreiVernon/BoilerFound/blob/docs/development-process/doc/development-process.md)
- **Canonical URL after the reviewed merge:** [development process on main](https://github.com/AndreiVernon/BoilerFound/blob/main/doc/development-process.md)

The `main` URL becomes valid when the process PR merges. Use the merged version for the final assignment submission, and optionally include a commit permalink so the graded version is fixed. The file must be accompanied by actual use of the issue/PR templates, branch conventions, reviews, and checks; merely committing this document does not complete adoption.

The prototype submission also needs the chosen flow description, Figma link, API description, implementation experience, next steps, repository/demo links, and honest contribution and GenAI statements. Keep that prototype evidence in `docs/implementation/` rather than duplicating this workflow policy.

### GenAI disclosure for this process document

Codex drafted this development-process document and its supporting issue/PR templates using the team's proposal, SDP, prototype assignment, existing code, and discussion with Gustavo. Team members must review and approve the proposed workflow and record the actual use of GenAI in their final assignment statement; this draft does not claim that review has already occurred.
