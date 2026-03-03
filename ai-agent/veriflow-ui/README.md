# 🚀 VeriFlow AI

<div align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
</div>

<br />

> **Autonomous UI & API Testing Powered by AI** — A modern SaaS platform that executes test suites in the background and generates comprehensive HTML reports.

---

## ✨ Features

### 🎨 Stunning UI
- **Glassmorphism Design** — Modern glass effects with backdrop blur
- **Dark Theme** — Easy on the eyes with neon accent colors
- **Framer Motion Animations** — Smooth transitions and micro-interactions
- **Fully Responsive** — Works on all screen sizes

### 🔐 Authentication
- **Secure Signup/Login** — Email and password authentication
- **JWT Tokens** — Secure session management
- **PostgreSQL Storage** — Production-ready database

### 🌐 UI Testing
- Execute browser-based tests from `test-cases/approved/`
- Real-time progress tracking with Socket.IO
- Test cases:
  - Create Assessment
  - Send Invite Email
  - Send Reminder IVR
  - Send Reminder Email
  - Extend Interview Expiry

### 🔌 API Testing
- Execute API workflow tests from `api-test/`
- Request/Response preview
- E2E workflow execution
- API endpoints:
  - Create Assessment API
  - Create Candidate API
  - Add Resume API
  - Attach Candidate API
  - Complete E2E Workflow

### 📊 Reports
- View all test execution reports
- Filter by test type (UI/API) and status (Passed/Failed)
- Search reports by name
- View, download, or delete reports
- Detailed statistics and pass rates

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion |
| **State** | Zustand (with persist middleware) |
| **Backend** | Express.js, Socket.IO |
| **Database** | PostgreSQL |
| **Auth** | JWT, bcryptjs |
| **Build** | Vite, TypeScript, PostCSS |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd veriflow-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup PostgreSQL database**
   ```sql
   CREATE DATABASE veriflow;
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000

---

## 📁 Project Structure

```
veriflow-ui/
├── src/
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   ├── services/      # API client
│   ├── store/         # Zustand stores
│   ├── styles/        # Global styles
│   ├── App.tsx        # Root component
│   └── main.tsx       # Entry point
├── server/
│   ├── database/      # Database initialization
│   ├── routes/        # API routes
│   └── index.ts       # Express server
├── index.html         # HTML template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🎯 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/verify` | Verify JWT token |

### Tests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tests/ui` | List UI test cases |
| GET | `/api/tests/api` | List API test cases |
| POST | `/api/tests/execute` | Execute a test |
| GET | `/api/tests/execution/:id` | Get execution status |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | List all reports |
| GET | `/api/reports/stats` | Get report statistics |
| GET | `/api/reports/:id/view` | View HTML report |
| GET | `/api/reports/:id/download` | Download report |
| DELETE | `/api/reports/:id` | Delete report |

---

## 🎨 Design System

### Colors
```css
--neon-blue: #00d4ff
--neon-purple: #a855f7
--neon-pink: #ec4899
--neon-green: #10b981
--neon-cyan: #22d3ee
```

### Glassmorphism
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## 📜 License

MIT © VeriFlow AI

---

<div align="center">
  <p>Built with ❤️ by the VeriFlow AI Team</p>
</div>
