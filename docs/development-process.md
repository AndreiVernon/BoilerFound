# BoilerFound Development Process

## 1. Repository Architecture

BoilerFound uses one shared repository for its static HTML/CSS/JavaScript frontend, Python/FastAPI backend, tests, and documentation. Related frontend and backend changes can be reviewed together in one pull request.

```text
BoilerFound/
├── README.md                       # Project overview and setup instructions
├── .gitignore                      # Generated files, local data, and secrets
├── .github/
│   ├── ISSUE_TEMPLATE/             # Task and bug-report templates
│   └── workflows/                  # GitHub Actions checks
├── docs/
│   ├── development-process.md      # Team development process
│   ├── Semester_1/                 # Proposal, SDP, and course documents
│   └── implementation/             # Technical notes and test/demo evidence
├── frontend/
│   ├── index.html                  # Page shell: header, footer, and #app mount point
│   ├── app.js                      # Screen rendering, navigation, form state, and API calls
│   └── styles.css                  # Shared colors, fonts, and layout
└── backend/
    ├── app/
    │   ├── main.py                 # FastAPI application setup
    │   ├── routers/                # Endpoints grouped by resource
    │   ├── schemas.py              # Request and response validation
    │   ├── models.py               # Database entities
    │   ├── crud.py                 # Database operations
    │   ├── database.py             # Database connections and sessions
    │   ├── auth.py                 # Authentication and access checks
    │   ├── config.py               # Environment-based settings
    │   └── storage.py              # Image validation and storage
    ├── tests/                      # API tests grouped by requirement
    ├── migrations/                 # Versioned database schema changes
    ├── requirements.txt            # Application dependencies
    ├── requirements-dev.txt        # Development and test dependencies
    └── README.md                   # Backend setup and API instructions
```

This tree defines where project files belong as they are added; it does not indicate that every feature is implemented. Empty directories use an empty `.gitkeep` file so Git tracks them. Remove that placeholder when the directory contains real tracked files.

### Organization rules

- Keep the frontend dependency-free and build-free. Each screen is a render function in `frontend/app.js`; split it into ES modules under `frontend/` when it grows past one flow. All backend requests go through the `API_BASE` setting.
- Keep API endpoints in backend routers, request/response validation in schemas, database entities in models, and database operations in CRUD modules. Split modules by feature when needed.
- Keep backend tests in `backend/tests/`. Use synthetic images and temporary test databases.
- Document API fields, responses, and errors in the backend README and generated OpenAPI documentation. Update callers when an API changes.
- Keep this process, project reference documents, and implementation notes in `docs/`.
- Commit dependency manifests and lockfiles. Exclude credentials, private user data, local uploads/databases, virtual environments, `node_modules/`, build output, and generated test reports.

### References

- [MDN: Dealing with files](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Environment_setup/Dealing_with_files) guides the layout of a static HTML/CSS/JavaScript site.
- [FastAPI: Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/) guides modular backend organization using routers.
- [pytest: Good Integration Practices](https://docs.pytest.org/en/stable/explanation/goodpractices.html) guides test organization and isolated execution.

## 2. Branching and Workflow Model

The team uses a lightweight branch-and-pull-request workflow based on [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow). All students work in branches within the team repository; personal forks are not used.

| Branch | Purpose |
| --- | --- |
| `main` | Stable, reviewed shared version of the project |
| `prototype` | Temporary integration branch for the prototype milestone |
| `feature/<short-description>` | One feature or integration task, such as `feature/found-item-frontend` |
| `fix/<short-description>` | One defect correction, such as `fix/required-photo-validation` |
| `docs/<short-description>` | Documentation changes, such as `docs/development-process` |
| `chore/<short-description>` | Tooling, dependencies, or configuration maintenance |

Branch names use lowercase words separated by hyphens. Use a short description of the task rather than a student's name. Link the relevant GitHub issue in the pull request; an issue number may also be included in the branch name.

The historical `Gustavo_genAI_acitivity` branch was an exception for an individual GenAI assignment. It was renamed to `feature/found-item-frontend`. This exception does not apply to new team work.

### Workflow

1. Create or select a GitHub issue describing the task, its owner, acceptance criteria, and relevant SDP requirement IDs.
2. Fetch the latest remote changes and check the working tree before creating a task branch.
3. During prototype development, branch from `prototype` and target it in the pull request. Other work branches from and targets `main`, unless the team agrees on a milestone integration branch.
4. Make focused commits and push meaningful progress at the end of each working session. Use descriptive messages such as `feat: add found-report submission` or `fix: reject blank locations`.
5. Open a pull request, run applicable checks, and obtain teammate review before merging.
6. Merge the completed prototype into `main` through a milestone pull request. Remove task or milestone branches only after they are merged and no other work depends on them.

Do not commit feature changes directly to shared branches or force-push shared history. Preserve each contributor's authorship when reusing existing work.

## 3. Code Development and Review Policy

### Tasks and development frequency

- Track work through GitHub issues with an owner, scope, acceptance criteria, and a testing plan.
- Use the project-board statuses **Todo → In progress → In review → Done**. Review progress and blockers during regular team meetings.
- Keep each task and pull request small enough for a teammate to review. Split unrelated work into separate tasks.
- Push progress after each working session. Open a draft pull request early for multi-session tasks or changes another teammate depends on.

### Pull requests and approval

Every pull request includes:

- A summary of the problem and resulting behavior.
- The related issue and applicable requirement IDs.
- The intended target branch.
- Tests/checks performed and their actual results.
- Screenshots or a short demonstration for interface changes.
- Known limitations and follow-up work.

Request review when acceptance criteria are met and applicable checks pass. A teammate other than the author must approve before merging into `main` or `prototype`. Reviewers aim to respond within two working days and communicate delays.

Reviewers check scope, correctness, readability, API compatibility, tests, and data/access handling. They manually try changed user flows when practical. Resolve review conversations and obtain renewed approval after material changes to behavior, API contracts, or security controls.

### CI and validation

| Change | Required checks |
| --- | --- |
| Frontend behavior or interface | Manual click-through of the changed flow at desktop and mobile widths, and comparison with Figma |
| Backend behavior | Relevant pytest tests, including meaningful validation and access-control failure cases |
| Frontend/backend integration | Applicable frontend/backend checks and a flow tested against the real local API |
| Documentation or folder structure only | Markdown readability, valid paths/references, and consistency between the documented and actual structure |
| Dependencies or CI configuration | Affected checks/jobs and dependency consistency |

Run checks on the current changes before final review. GitHub Actions runs the relevant suites for pull requests and shared-branch pushes once the corresponding application and workflow are present. Do not claim tests passed if they were not run or only passed on an earlier revision.

All applicable checks must pass before merging. Explain failures or skipped checks and resolve them before approval. Documentation-only changes do not require unrelated application tests.

### Merging and completion

- After approval and passing applicable checks, the author or a designated teammate merges the pull request.
- Use a merge commit to preserve original commits and contribution history.
- A task is done when its acceptance criteria are met, checks pass, review is approved, documentation is updated, and the pull request is merged into its intended shared branch.
- Fix or revert a broken merged change through a reviewed pull request; do not reset shared history.
- Apply the same review policy to changes to this development process.

Shared-branch rules require pull requests, at least one non-author approval, resolved conversations, and passing applicable checks. Configure enforcement according to [GitHub's protected-branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches). Path-filtered jobs must not be required on changes where they cannot run; use an always-running aggregate status if one mandatory check is needed for every pull request.
