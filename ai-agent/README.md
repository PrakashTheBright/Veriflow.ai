# AI Web Automation Agent

A VS Code-based AI agent for web application automation using Node.js, TypeScript, and Playwright.

## Features

- 🎭 **Playwright Integration** - Full browser automation with Chromium
- ✅ **Approval Workflow** - Test cases require explicit approval before execution
- 🔐 **Secure Credentials** - Credentials loaded from external files (never hardcoded)
- 📄 **Action Files** - Test cases defined in YAML or JSON format
- 📊 **Report Generation** - HTML and JSON reports with screenshots
- 🔄 **Retry Logic** - Configurable retries with exponential backoff
- 📸 **Screenshots** - Automatic screenshots on failure and configurable captures

## Project Structure

```
ai-agent/
├── src/
│   ├── agent/           # Core agent logic
│   │   ├── core/        # Orchestrator and state machine
│   │   └── executor/    # Action execution engine
│   ├── browser/         # Playwright integration
│   │   ├── actions/     # Atomic browser operations
│   │   └── drivers/     # Browser lifecycle management
│   ├── actions/         # Action file parser
│   ├── approvals/       # Approval gateway
│   ├── credentials/     # Credential loader
│   ├── reports/         # Report generation
│   ├── config/          # Configuration management
│   ├── types/           # TypeScript interfaces
│   └── utils/           # Utilities (logger, retry, file ops)
├── test-cases/
│   ├── pending/         # Test cases awaiting approval
│   ├── approved/        # Approved test cases
│   └── rejected/        # Rejected test cases
├── credentials/         # Credential files (gitignored)
├── reports/output/      # Generated reports
└── logs/                # Execution logs
```

## Quick Start

### 1. Install Dependencies

```bash
cd ai-agent
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Configure Credentials

Copy the example credentials file and add your actual credentials:

```bash
cp credentials/credentials.example.json credentials/credentials.json
```

### 4. Create Environment File

```bash
cp .env.example .env
```

### 5. Run the Agent

```bash
npm run dev test-cases/approved/login-flow.yaml
```

## Usage

### Running Test Cases

```bash
# Interactive mode (default - requires approval)
npm run dev test-cases/approved/login-flow.yaml

# Headless mode
npm run dev test-cases/approved/login-flow.yaml --headless

# Auto-approve (not recommended for production)
npm run dev test-cases/approved/login-flow.yaml --auto-approve
```

### VS Code Tasks

Use `Ctrl+Shift+P` → "Tasks: Run Task" to access:
- **Install Dependencies** - npm install
- **Build Agent** - Compile TypeScript
- **Run Agent (Interactive)** - Run with approval prompt
- **Run Agent (Headless)** - Run without browser UI
- **Install Playwright Browsers** - Download Chromium

## Test Case Format

### YAML Example

```yaml
id: tc-login-001
name: User Login Flow
description: Verify login functionality
priority: high
tags: [smoke, login]

actions:
  - type: navigate
    description: Go to login page
    url: https://example.com/login

  - type: type
    description: Enter username
    selector: "#username"
    credentialKey: demo.username

  - type: click
    description: Click login
    selector: "#login-button"

expectedOutcome: User should be logged in
```

### Supported Actions

| Action | Description |
|--------|-------------|
| `navigate` | Navigate to URL |
| `click` | Click element |
| `type` | Type text (supports credentials) |
| `select` | Select dropdown option |
| `wait` | Wait for duration |
| `waitForSelector` | Wait for element |
| `screenshot` | Capture screenshot |
| `assertText` | Verify text content |
| `assertVisible` | Verify visibility |
| `assertUrl` | Verify URL |
| `hover` | Hover over element |
| `pressKey` | Press keyboard key |
| `scroll` | Scroll page/element |

## Agent Lifecycle

```
IDLE → INITIALIZING → LOADING_INPUTS → VALIDATING → AWAITING_APPROVAL
                                                           ↓
                                               [User Approves/Rejects]
                                                           ↓
COMPLETED ← REPORTING ← EXECUTING          or          ABORTED
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_HEADLESS` | `false` | Run browser without UI |
| `BROWSER_SLOW_MO` | `50` | Slow down actions (ms) |
| `BROWSER_TIMEOUT` | `30000` | Default timeout (ms) |
| `AGENT_AUTO_APPROVE` | `false` | Skip approval prompt |
| `AGENT_MAX_RETRIES` | `3` | Max retry attempts |
| `LOG_LEVEL` | `info` | Logging level |

## Reports

Reports are generated in `reports/output/` after each execution:
- **HTML Report** - Visual report with charts and screenshots
- **JSON Report** - Machine-readable execution data

## Security Best Practices

1. **Never commit credentials** - Use `.gitignore` for credential files
2. **Use credential keys** - Reference credentials by key, not value
3. **Review before approval** - Always review test cases before approving
4. **Disable auto-approve** - Never use `--auto-approve` in production

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Project Type Definitions

All types are centralized in `src/types/` for consistency.

## License

MIT
