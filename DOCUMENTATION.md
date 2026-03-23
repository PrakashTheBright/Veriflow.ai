# Veriflow.ai — Project Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Prerequisites](#4-prerequisites)
5. [Installation & Setup](#5-installation--setup)
6. [Environment Configuration](#6-environment-configuration)
7. [Database Setup](#7-database-setup)
8. [Running the Application](#8-running-the-application)
9. [Modules](#9-modules)
   - [Dashboard](#91-dashboard)
   - [UI Testing](#92-ui-testing)
   - [API Testing](#93-api-testing)
   - [Create Test Cases](#94-create-test-cases)
   - [Environments](#95-environments)
   - [Reports](#96-reports)
   - [Users](#97-users)
10. [AI Agent Engine](#10-ai-agent-engine)
11. [Test Case Format](#11-test-case-format)
12. [API Reference](#12-api-reference)
13. [Real-Time Communication (WebSocket)](#13-real-time-communication-websocket)
14. [Authentication & Role-Based Access](#14-authentication--role-based-access)
15. [Tech Stack](#15-tech-stack)
16. [Deployment](#16-deployment)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Project Overview

**Veriflow.ai** is an autonomous AI-powered test automation platform for web applications. It enables QA engineers and developers to:

- Execute **browser-based UI tests** using an AI agent backed by Playwright
- Run **REST API tests** using Playwright's API test runner
- **Auto-generate test cases** from documents (PDF, DOCX, plain text) using a Groq LLM
- Monitor test execution in **real time** via WebSocket
- View and download **HTML/JSON reports**
- Manage multi-environment credentials (SIT, UAT, Production)

The platform consists of two primary systems:

| Component | Description |
|-----------|-------------|
| **AI Agent** (`ai-agent/`) | TypeScript engine that reads test case markdown files and drives a Playwright browser to execute UI workflows |
| **Veriflow UI** (`ai-agent/veriflow-ui/`) | Full-stack web application (React + Express) providing the dashboard, test runner UI, report viewer, and test case generator |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                   │
│  Dashboard │ UI Testing │ API Testing │ Reports │ etc.   │
│                                                          │
│  - Vite + React 18 + TailwindCSS                        │
│  - Zustand (state) │ Socket.IO Client (real-time)       │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────────┐
│              Express Backend (Node.js / TypeScript)      │
│                                                          │
│  /api/auth        - JWT authentication                   │
│  /api/tests       - Test execution & status polling      │
│  /api/reports     - Report CRUD & download               │
│  /api/testcases   - AI test case generation              │
│  /api/credentials - Environment credentials              │
│  /api/users       - User management                      │
│                                                          │
│  Socket.IO Server - Emits real-time test progress events │
└───────────┬──────────────────┬──────────────────────────┘
            │                  │
    ┌───────▼──────┐   ┌───────▼──────────────────────┐
    │  PostgreSQL  │   │       AI Agent (spawned       │
    │  Database    │   │       as child process)       │
    │              │   │                               │
    │  - users     │   │  Playwright browser           │
    │  - test_     │   │  Action Executor              │
    │    executions│   │  Orchestrator                 │
    │  - test_case_│   │  Report Generator             │
    │    history   │   └───────────────────────────────┘
    └──────────────┘
```

### Request lifecycle — UI Test execution

1. User clicks **Run** in the browser
2. Frontend calls `POST /api/tests/execute` with `{testId, type:'ui', fileName, environmentUrl}`
3. Backend immediately returns `{executionId}` (non-blocking)
4. Backend spawns the AI Agent as a child process with the test file path and env vars
5. Agent executes Playwright steps and emits stdout progress markers (`[X/Y]`)
6. Backend parses stdout and emits Socket.IO events `test:{testId}:status` to the frontend
7. Agent exits with code `0` (pass) or `1` (fail)
8. Backend writes final status to PostgreSQL and emits the completion socket event
9. Frontend updates the UI card to `Passed` or `Failed`

---

## 3. Project Structure

```
Veriflow.ai/
└── ai-agent/                          # Root workspace
    ├── .env                           # Primary environment variables
    ├── package.json                   # Agent dependencies (Playwright, ts-node…)
    ├── playwright.config.ts           # Playwright config for API tests
    ├── tsconfig.json
    │
    ├── src/                           # AI Agent engine (TypeScript)
    │   ├── index.ts                   # Entry point — CLI runner
    │   ├── config/                    # Config loader (loads .env)
    │   ├── types/                     # Shared TypeScript interfaces
    │   ├── utils/                     # Logger, retry, file helpers
    │   ├── actions/
    │   │   └── action-parser.ts       # Parses .md test case files into actions
    │   ├── agent/
    │   │   ├── core/
    │   │   │   ├── orchestrator.ts    # Main execution loop
    │   │   │   └── state-machine.ts   # Agent state (INIT → EXEC → REPORT)
    │   │   └── executor/
    │   │       └── action-executor.ts # Executes individual browser actions
    │   ├── approvals/
    │   │   └── approval-gateway.ts   # Interactive approval step
    │   ├── browser/
    │   │   ├── actions/               # Low-level Playwright wrappers (click, type…)
    │   │   └── drivers/
    │   │       └── browser-manager.ts # Playwright browser lifecycle
    │   ├── credentials/
    │   │   └── credential-loader.ts  # Loads credentials from files
    │   └── reports/
    │       └── generators/
    │           └── report-service.ts  # Generates HTML + JSON reports
    │
    ├── api-test/                      # Playwright API test specs
    │   ├── *.spec.js                  # Individual Playwright spec files
    │   ├── *.json                     # Test config (maps to spec files)
    │   └── E2E-CompleteWorkflow.spec.js
    │
    ├── test-cases/
    │   ├── approved/                  # Active test cases (loaded by UI Testing module)
    │   ├── disabled/                  # Temporarily disabled test cases
    │   ├── rejected/                  # Rejected test cases
    │   └── Test-case-module/          # AI-generated test case outputs
    │
    ├── helpers/
    │   ├── apiHelpers.js              # Shared API helper functions
    │   └── sharedState.js             # Cross-spec shared state
    │
    ├── reports/output/                # Generated HTML & JSON reports
    ├── Resume_Files/                  # Resume files used in test flows
    └── logs/                          # Agent execution logs
    
    veriflow-ui/                       # Full-stack web application
    ├── package.json
    ├── .env                           # UI-specific env vars (optional)
    ├── vite.config.ts                 # Vite frontend config
    ├── tailwind.config.js
    │
    ├── server/                        # Express backend
    │   ├── index.ts                   # Server entry point (Express + Socket.IO)
    │   ├── tsconfig.json
    │   ├── database/
    │   │   └── init.ts                # PostgreSQL pool + schema creation
    │   ├── middleware/
    │   │   └── moduleAccess.ts        # JWT auth + module-level RBAC
    │   ├── routes/
    │   │   ├── auth.ts                # Login, signup, logout
    │   │   ├── tests.ts               # Test execution + status polling
    │   │   ├── reports.ts             # Report list, view, download
    │   │   ├── testcases.ts           # AI test case generation (Groq)
    │   │   ├── testcaseHistory.ts     # Saved generated test cases
    │   │   ├── credentials.ts         # Environment credentials CRUD
    │   │   └── users.ts               # User management (admin)
    │   └── utils/
    │       └── cleanup.ts             # Auto-cleanup of old executions
    │
    └── src/                           # React frontend
        ├── main.tsx
        ├── App.tsx                    # Routes definition
        ├── config/
        │   └── environments.ts        # Environment type definitions
        ├── hooks/
        │   └── useSocket.ts           # Socket.IO React hook
        ├── services/
        │   └── api.ts                 # Typed API client
        ├── store/
        │   └── authStore.ts           # Zustand auth state
        └── pages/
            ├── LandingPage.tsx
            ├── LoginPage.tsx
            ├── SignupPage.tsx
            ├── Dashboard.tsx
            ├── UITestingPage.tsx
            ├── APITestingPage.tsx
            ├── CreateTestCasesPage.tsx
            ├── EnvironmentsPage.tsx
            ├── ReportsPage.tsx
            └── UsersPage.tsx
```

---

## 4. Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 18.0.0 | Required by both ai-agent and veriflow-ui |
| npm | ≥ 9.x | Bundled with Node.js |
| PostgreSQL | ≥ 14 | Database for users, executions, history |
| Chromium | Latest | Installed via Playwright |

> **Windows note:** Node.js must be on the system `PATH`. If not, prefix commands with `$env:Path = "C:\Program Files\nodejs;" + $env:Path` in PowerShell.

---

## 5. Installation & Setup

### Step 1 — Install AI Agent dependencies

```bash
cd ai-agent
npm install
```

### Step 2 — Install Playwright browsers

```bash
cd ai-agent
npx playwright install chromium
```

### Step 3 — Install Veriflow UI dependencies

```bash
cd ai-agent/veriflow-ui
npm install
```

### Step 4 — Configure environment variables

Copy and edit the primary `.env` file (see [Section 6](#6-environment-configuration)):

```bash
cd ai-agent
# Edit .env with your actual values
```

### Step 5 — Start the application

```bash
cd ai-agent/veriflow-ui
npm run dev
```

This starts both the backend server and the Vite frontend concurrently.

| Service | Default Port |
|---------|-------------|
| Backend (Express + Socket.IO) | `4000` |
| Frontend (Vite) | `3000` |

Open `http://localhost:3000` in your browser.

---

## 6. Environment Configuration

All configuration lives in `ai-agent/.env`. Below is a complete reference:

### Application (UI Credentials)

```env
APP_URL=https://your-app.example.com
APP_USERNAME=your-username
APP_PASSWORD=your-password
```

### Environment-Specific UI Credentials

```env
# SIT
SIT_APP_URL=https://sit.example.com
SIT_APP_USERNAME=sit-username
SIT_APP_PASSWORD=sit-password

# UAT
UAT_APP_URL=https://uat.example.com
UAT_APP_USERNAME=uat-username
UAT_APP_PASSWORD=uat-password

# Production
PROD_APP_URL=https://prod.example.com
PROD_APP_USERNAME=prod-username
PROD_APP_PASSWORD=prod-password
```

### API Test Credentials

```env
# SIT
SIT_API_BASE_URL=https://api-sit.example.com
SIT_API_KEY=your-sit-api-key
SIT_API_CLIENT_ID=your-sit-client-id

# UAT
UAT_API_BASE_URL=https://api-uat.example.com
UAT_API_KEY=your-uat-api-key
UAT_API_CLIENT_ID=your-uat-client-id

# Production
PROD_API_BASE_URL=https://api.example.com
PROD_API_KEY=your-prod-api-key
PROD_API_CLIENT_ID=your-prod-client-id
```

### Database

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=veriflow
DB_USER=postgres
DB_PASSWORD=your-db-password
```

### Authentication

```env
JWT_SECRET=your-long-random-secret-key
```

### AI / LLM (Test Case Generation)

```env
GROQ_API_KEY=your-groq-api-key
```

### Browser Behavior (optional overrides)

```env
UI_TEST_HEADLESS=false          # true = headless mode, false = visible browser
UI_TEST_SLOW_MO=0               # Milliseconds between actions (0 = fastest)
UI_TEST_MAX_RETRIES=1           # Action retry count
UI_TEST_RETRY_DELAY=300         # Delay between retries (ms)
UI_TEST_WAIT_SCALE=0.8          # Scale factor for wait durations in test steps
AGENT_KEEP_BROWSER_OPEN=false   # Keep browser open after test (debug only)
```

---

## 7. Database Setup

The database schema is created automatically on first server start via `initDatabase()` in `server/database/init.ts`. No manual migration is required in development.

### Tables

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `username` | VARCHAR(255) | Unique username |
| `email` | VARCHAR(255) | Unique email address |
| `password_hash` | VARCHAR(255) | bcrypt-hashed password |
| `role` | VARCHAR | `admin` or `user` |
| `created_at` | TIMESTAMP | Creation timestamp |

#### `test_executions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Execution ID (also used as Socket.IO correlation ID) |
| `user_id` | UUID | FK → users |
| `test_name` | VARCHAR | Test case display name |
| `test_type` | VARCHAR | `ui` or `api` |
| `file_name` | VARCHAR | Source file (e.g. `full-assessment-flow.md`) |
| `status` | VARCHAR | `running`, `passed`, `failed` |
| `duration` | INTEGER | Duration in milliseconds |
| `total_actions` | INTEGER | Total steps executed |
| `passed_actions` | INTEGER | Steps that passed |
| `failed_actions` | INTEGER | Steps that failed |
| `report_path` | VARCHAR | Absolute path to HTML report |
| `error_message` | TEXT | Error details on failure |
| `response_data` | JSONB | API response payload (API tests only) |
| `started_at` | TIMESTAMP | Execution start |
| `completed_at` | TIMESTAMP | Execution end |

#### `test_case_history`
Stores AI-generated test cases saved by users from the Create Test Cases module.

---

## 8. Running the Application

### Development (recommended)

```bash
cd ai-agent/veriflow-ui
npm run dev
```

Runs backend (`ts-node-dev`) and frontend (Vite) concurrently with hot reload.

### Run backend only

```bash
cd ai-agent/veriflow-ui
npm run dev:server
```

### Run frontend only

```bash
cd ai-agent/veriflow-ui
npm run dev:client
```

### Production build

```bash
cd ai-agent/veriflow-ui
npm run build
npm run start
```

### Run AI Agent standalone (CLI)

```bash
cd ai-agent
npx ts-node --transpile-only src/index.ts test-cases/approved/full-assessment-flow.md
```

---

## 9. Modules

### 9.1 Dashboard

**Route:** `/dashboard`

Displays a summary of all test executions:
- Total, Passed, Failed, Pending counts
- Recent test execution history (last 5 runs)
- Quick navigation links to UI Testing and API Testing modules

Data is fetched from `GET /api/reports/stats` and `GET /api/reports`.

---

### 9.2 UI Testing

**Route:** `/ui-testing`

Executes browser-based UI test flows using the AI Agent + Playwright.

#### How it works

1. Test cases are loaded from `test-cases/approved/` (`.md` files only)
2. Choose an environment (SIT / UAT / Production) from the dropdown
3. Click **Run** on an individual test or **Run All Tests** to execute all sequentially
4. Real-time progress is streamed via WebSocket
5. Final status updates the card and a toast notification appears
6. Click the expand chevron to view the HTML report inline

#### Test execution controls

| Control | Behaviour |
|---------|-----------|
| Run (▷) button | Runs a single test |
| Run All Tests | Runs all tests **sequentially**, one at a time |
| Reset | Resets all cards to Pending status |
| Environment dropdown | Selects which environment credentials to use |

#### Status flow

```
Pending → Running → Passed
                 → Failed
```

#### Concurrency

Only **one UI test** can run at a time (global lock). A second run request while a test is active returns HTTP 409.

#### Adding/disabling test cases

- **Add:** Place a `.md` file in `test-cases/approved/`
- **Disable:** Move the file to `test-cases/disabled/`
- **Re-enable:** Move the file back to `test-cases/approved/`

---

### 9.3 API Testing

**Route:** `/api-testing`

Executes REST API tests using Playwright's test runner (`npx playwright test`).

#### How it works

1. Test configs are loaded from `api-test/` (`.json` files)
2. Each JSON file maps to a Playwright spec (`.spec.js`) file
3. Results are parsed from Playwright's JSON output

#### Test execution controls

| Control | Behaviour |
|---------|-----------|
| Run (send icon) | Runs a single API test |
| Run All | Runs all API tests **in parallel** (`Promise.all`) |
| Run E2E Flow | Runs all tests **sequentially** (ordered workflow) |
| Reset | Resets all cards to Pending |

#### Environments

API environments store:
- `baseUrl` — API base URL
- `apiKey` — API authentication key
- `clientId` — Client identifier

These are set in the **Environments** module and passed as env vars to the Playwright process.

#### Available API tests

| Test | File | Description |
|------|------|-------------|
| E2E Complete Workflow | `e2e-complete-workflow.json` | Full end-to-end API flow |
| Create Assessment | `create-assessment.json` | Creates a new assessment record |
| Create Candidate | `create-candidate.json` | Creates a candidate profile |
| Add Resume to Candidate | `add-resume-to-candidate.json` | Uploads and links a resume |
| Attach Candidate to Assessment | `attach-candidate-to-assessment.json` | Links candidate to assessment |

---

### 9.4 Create Test Cases

**Route:** `/create-test-cases`

AI-powered test case generation from documents or free-text input.

#### How to use

1. Select test type: **UI Test** or **API Test**
2. Enter a Test Case Name
3. Provide the source:
   - **Upload file** — PDF, DOCX, or TXT document
   - **Paste content** — Paste text directly into the editor
4. Click **Generate** — the backend sends the content to Groq LLM for analysis
5. Review the generated test cases in a tabular view
6. Edit individual cells inline if needed
7. Select fields to include in the export
8. Download as **CSV**, **Markdown**, or **JSON**
9. Click **Save** to persist to history

#### Template fields

**UI Test fields:** Test Case ID, Title, Module, Test Type, Preconditions, Test Data, Test Steps, Expected Result, Actual Result, Status, Feature Name, Priority, Severity, Environment, Build Version, Executed By, Execution Date, Remarks

**API Test fields:** Test Case ID, API Name, HTTP Method, Endpoint URL, Authorization Type, Request Headers, Request Payload, Query/Path Parameters, Expected Status Code, Expected Response Body, Response Time, Database Validation, Actual Response, Status, Remarks

#### History

Previously saved generations are accessible via the **History** button, allowing test cases to be reloaded and re-downloaded.

---

### 9.5 Environments

**Route:** `/environments`

Manages environment configurations for both UI and API testing.

#### Environment types

| Type | Fields |
|------|--------|
| UI | Name, Label, Base URL, Username, Password |
| API | Name, Label, Base URL, API Key, Client ID, Headers |

All environments are stored in the database. On save, they are also persisted to `localStorage` for use by the UI Testing and API Testing pages.

Credentials entered here are served back to the server at execution time and injected as environment variables into the agent/Playwright process.

---

### 9.6 Reports

**Route:** `/reports`

Lists all past test executions with filtering, search, and download.

#### Features

- **Filter** by test type (UI / API) and status (Passed / Failed)
- **Search** by test name
- **View** — opens the HTML report in a new browser tab
- **Download** — saves the HTML report file
- **Delete** — removes the execution record
- **Pagination** — 10 records per page

#### Report stats

The top bar displays:
- Total executions
- Total passed / failed
- Average pass rate (%)

---

### 9.7 Users

**Route:** `/users` *(Admin only)*

Manages user accounts and module-level access control.

#### Features

- View all registered users
- Assign/revoke access to specific modules per user
- Delete users

#### Modules that can be access-controlled

- UI Testing
- API Testing
- Create Test Cases
- Environments
- Reports
- Users

---

## 10. AI Agent Engine

The agent (`ai-agent/src/`) is a standalone TypeScript CLI application that:

1. Reads a markdown test case file
2. Parses it into an ordered list of `Action` objects
3. Launches a Chromium browser via Playwright
4. Executes each action in sequence
5. Generates an HTML + JSON report

### Agent state machine

```
IDLE → INITIALIZING → LOADING_INPUTS → VALIDATING → AWAITING_APPROVAL
    → EXECUTING → REPORTING → CLEANUP → COMPLETED
                              ↓
                           ERROR
```

### Supported action types

| Action | Description |
|--------|-------------|
| `navigate` | Navigate to a URL |
| `click` | Click an element by text or selector |
| `type` | Type text into an input field |
| `upload` | Upload a file via `<input type="file">` |
| `wait` | Wait for a fixed duration or selector |
| `select` | Choose from a dropdown |
| `checkbox` | Click a checkbox |
| `screenshot` | Capture the current viewport |
| `checkVisibleOrLog` | Assert element visibility (non-fatal) |

### Retry logic

Failed actions are retried up to `AGENT_MAX_RETRIES` times (default: 1) with a delay of `AGENT_RETRY_DELAY` ms (default: 300ms).

### Progress reporting

The agent prints step progress to stdout in the format `[X/Y]` where X is the current step and Y is the total. The backend parses this in real-time to emit WebSocket progress events to the frontend.

### Report generation

On completion the agent:
1. Generates `reports/output/<TestName>_<timestamp>.html`
2. Generates `reports/output/<TestName>_<timestamp>.json`
3. Prints `Report generated: <path>` — the backend captures this to store the report path in the database

---

## 11. Test Case Format

UI test cases are written in Markdown (`.md`) with plain-English instructions.

### Example

```markdown
# Full Assessment Flow - Executable Version

## Login
1. navigate to ${APP_URL}
2. click on toggle switch
3. enter username/email ${APP_USERNAME}
4. enter password ${APP_PASSWORD}
5. click on "Sign In"
6. wait 5 seconds

## Create Assessment
7. wait for selector button:has-text("Create Assessment")
8. click on "Create Assessment"

## Upload Resume
9. click on "Resume File"
10. upload file "/path/to/resume.docx"
11. click on "Upload"
12. wait 5 seconds
```

### Variable substitution

| Variable | Resolved from |
|----------|--------------|
| `${APP_URL}` | `APP_URL` env var |
| `${APP_USERNAME}` | `APP_USERNAME` env var |
| `${APP_PASSWORD}` | `APP_PASSWORD` env var |

### Wait syntax

```
wait 5 seconds
wait 500ms
wait 2 seconds
wait for selector button:has-text("Next"):not([disabled])
```

### File upload syntax

```
upload file "C:\path\to\file.docx"
upload file "${RESUME_PATH}"
```

---

## 12. API Reference

All endpoints require a valid **JWT Bearer token** in the `Authorization` header unless noted.

### Authentication

#### `POST /api/auth/login`
```json
Request:  { "email": "user@example.com", "password": "pass" }
Response: { "token": "...", "user": { "id", "username", "email", "role" } }
```

#### `POST /api/auth/signup`
```json
Request:  { "username": "user", "email": "user@example.com", "password": "pass" }
Response: { "token": "...", "user": { ... } }
```

#### `POST /api/auth/logout`
Clears the session.

---

### Tests

#### `GET /api/tests/ui`
Returns all `.md` files from `test-cases/approved/`.
```json
Response: { "testCases": [{ "id", "name", "fileName", "type", "status" }] }
```

#### `GET /api/tests/api`
Returns all `.json` files from `api-test/`.
```json
Response: { "testCases": [{ "id", "name", "fileName", "type", "status" }] }
```

#### `POST /api/tests/execute`
Starts a test execution.
```json
Request: {
  "testId": "ui-1",
  "type": "ui",
  "fileName": "full-assessment-flow.md",
  "environmentUrl": "https://sit.example.com",
  "environmentConfig": { "username": "...", "password": "..." },
  "environmentName": "sit"
}
Response: { "success": true, "executionId": "<uuid>", "message": "Test execution started" }
```

#### `GET /api/tests/execution/:id`
Polls the status of a running or completed execution.
```json
Response: {
  "id": "<uuid>",
  "status": "running|passed|failed",
  "duration": 12345,
  "report_path": "/abs/path/report.html",
  "completed_at": "2026-03-23T10:00:00Z"
}
```

---

### Reports

#### `GET /api/reports`
```
Query params: type, status, search, limit, offset
Response: { "reports": [...], "total": 42 }
```

#### `GET /api/reports/stats`
```json
Response: { "total": 100, "passed": 80, "failed": 20, "avgPassRate": 80 }
```

#### `GET /api/reports/:id`
Returns HTML report as raw text for inline viewing.

#### `GET /api/reports/:id/download`
Initiates file download of the HTML report.

#### `DELETE /api/reports/:id`
Deletes the execution record (and optionally the file).

---

### Test Cases (AI Generation)

#### `POST /api/testcases/generate`
```json
Request: {
  "testCaseName": "Login Flow",
  "testType": "ui",
  "content": "... document text ...",
  "contentSource": "uploaded file"
}
Response: { "testCases": [{ "testCaseId", "testCaseTitle", "testSteps", ... }] }
```

#### `POST /api/testcases/upload`
Accepts multipart file upload (PDF, DOCX, TXT) and returns extracted text.

---

### Credentials / Environments

#### `GET /api/credentials`
Returns all saved environment configurations.

#### `POST /api/credentials`
Creates a new environment.

#### `PUT /api/credentials/:id`
Updates an existing environment.

#### `DELETE /api/credentials/:id`
Deletes an environment.

---

## 13. Real-Time Communication (WebSocket)

The backend uses **Socket.IO** on the same HTTP server (port 4000). The frontend connects via `useSocket` hook.

### Events emitted by backend → frontend

#### `test:{testId}:status`

Emitted during and after execution:

```typescript
{
  status: 'running' | 'passed' | 'failed',
  progress: number,         // 0–100
  executionId: string,      // UUID — used to correlate socket events to a run
  message: string,
  duration?: number,        // ms, on completion
  reportPath?: string       // on completion
}
```

### Stale event protection

The frontend rejects socket events whose `executionId` does not match the one returned by the `POST /api/tests/execute` HTTP response. This prevents results from a previous run from contaminating a new run's UI state.

---

## 14. Authentication & Role-Based Access

### JWT

Tokens are issued on login/signup and must be sent as:
```
Authorization: Bearer <token>
```

Token expiry is configurable via `JWT_SECRET` config. Tokens are stored client-side in `localStorage` under the `veriflow-auth` key.

### Roles

| Role | Capabilities |
|------|-------------|
| `admin` | Full access to all modules including Users management |
| `user` | Access only to modules explicitly granted by admin |

### Module access control

The `checkModuleAccess` middleware (applied to all `/api/*` routes except auth) validates:
1. JWT signature and expiry
2. Whether the user's assigned `modules` array includes the module required by the requested route

---

## 15. Tech Stack

### Frontend

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| TailwindCSS | 3.x | Styling |
| Framer Motion | 11.x | Animations |
| Zustand | 4.x | Global state management |
| Socket.IO Client | 4.x | Real-time WebSocket |
| React Hot Toast | 2.x | Notifications |
| React Router | 6.x | Client-side routing |
| Lucide React | 0.312 | Icons |

### Backend

| Library | Version | Purpose |
|---------|---------|---------|
| Express | 4.x | HTTP server |
| Socket.IO | 4.x | WebSocket server |
| PostgreSQL (`pg`) | 8.x | Database |
| Groq SDK | 0.37 | LLM for test case generation |
| JSON Web Token | 9.x | Authentication |
| bcryptjs | 2.x | Password hashing |
| Helmet | 7.x | HTTP security headers |
| Multer | 2.x | File upload handling |
| Mammoth | 1.x | DOCX → text extraction |
| pdf-parse | 1.x | PDF → text extraction |
| ts-node-dev | 2.x | Dev server with hot reload |

### AI Agent

| Library | Version | Purpose |
|---------|---------|---------|
| Playwright | 1.58.2 | Browser automation |
| TypeScript | 5.x | Type safety |
| Winston | 3.x | Structured logging |
| Zod | 3.x | Schema validation |
| Handlebars | 4.x | HTML report templating |
| Chalk | 4.x | Terminal output styling |
| @faker-js/faker | 10.x | Test data generation |

---

## 16. Deployment

### Production build

```bash
# Build frontend and compile backend
cd ai-agent/veriflow-ui
npm run build

# Start production server
npm run start
```

This compiles:
- React SPA → `veriflow-ui/dist/` (served as static files)
- Express backend → `veriflow-ui/dist/server/`

### Environment variables for production

Ensure all variables from Section 6 are set in the production environment. Key security notes:

- `JWT_SECRET` must be a strong random string (≥ 32 characters)
- `DB_PASSWORD` must be set — the server exits immediately if missing
- `GROQ_API_KEY` is required for the Create Test Cases module

---

## 17. Troubleshooting

### Application won't start — `DB_HOST` or `DB_PASSWORD` not configured

The server exits immediately if required database environment variables are missing.
**Fix:** Ensure `ai-agent/.env` contains `DB_HOST` and `DB_PASSWORD`.

---

### UI test shows "Failed" immediately after clicking Run

**Root cause:** The frontend's 3-second polling detected a stale `running` execution in the database (from a previous server restart) and marked it as failed.

**Fix (already applied):** `activeExecutionIds.delete()` now runs after the DB update completes, eliminating the race window.

---

### Both "Run All" and "Run E2E Flow" buttons showed spinners simultaneously

**Fix (already applied):** Separate `runningAll` and `runningE2E` state variables control each button independently.

---

### Browser not found / Playwright installation error

```bash
cd ai-agent
npx playwright install chromium
```

---

### `Cannot find module 'ts-node'` when running agent

```bash
cd ai-agent
npm install
```

---

### Node.js not found in PowerShell (Windows)

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

---

### Test card stuck on "Running" after server restart

Tests that were in-flight when the server restarted appear as `running` in the DB but are no longer active. The polling endpoint detects this (execution in DB as `running` with no `completed_at` and not in `activeExecutionIds`) and automatically marks them as `failed`.

---

### Port already in use

If port 4000 or 3000 is already occupied:

```powershell
# Find and kill the process on port 4000
netstat -ano | findstr :4000
taskkill /PID <pid> /F
```

---

*Documentation generated: March 23, 2026 | Branch: ModuleEvalution*
