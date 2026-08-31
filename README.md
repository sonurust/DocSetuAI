# DocSetuAI — Autonomous AI Business Operations Platform

> **Turn business goals into completed work.**  
> Built for the **All Things Agentic Hackathon** (Taskmaster Track).

---

## 🌟 Overview

**DocSetuAI** is an enterprise-grade autonomous AI operations platform powered by **Google Gemini** and **Google Cloud**. It enables businesses to declare high-level operational goals in natural language and orchestrates specialized multi-agent systems to plan, execute tool calls, solicit human approvals, and verify business outcomes.

### Flagship Demo Workflow:
> **"Recover overdue payments from customers whose invoices are more than 7 days overdue."**

---

## 🚀 Key Features

- 🧠 **Autonomous Planning**: Gemini-powered goal decomposition creating step-by-step agent execution plans.
- 🤖 **Multi-Agent Coordination**: Specialized agents (`OrchestratorAgent`, `BillingAgent`, `CustomerAgent`, `CommunicationAgent`, `FollowupAgent`, `VerificationAgent`).
- 🛡️ **Human-in-the-Loop Gate**: Safety gating for sensitive outbound customer communications with single or batch approval.
- 🔍 **Closed-Loop Verification**: Independent auditing of all post-conditions before reporting completion.
- 📊 **Real-Time Observability**: Live telemetry feed recording every tool call, decision point, and state change.
- ⚡ **Zero-Config Demo Mode**: Pre-seeded with 50 realistic enterprise customers and 75 invoices (20 overdue) for offline review.

---

## 🏗️ Architecture

```text
Natural Language Goal
       ↓
Gemini Reasoning & Orchestration
       ↓
BillingAgent (Finds Overdue Invoices)
       ↓
CustomerAgent (Calculates Priority & Risk)
       ↓
CommunicationAgent (Drafts Personalized Reminders)
       ↓
Human-in-the-Loop Approval Gate
       ↓
CommunicationAgent (Dispatches Approved Reminders)
       ↓
FollowupAgent (Schedules Calendar Follow-ups)
       ↓
VerificationAgent (Audits & Verifies Results)
       ↓
Final Outcome & Financial ROI Report
```

---

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js >= 18.18.0
- pnpm (or npm)

### 2. Installation
```bash
# Clone & install dependencies
cd Developer/DocSetuAI
pnpm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```
*(By default `RUNTIME_MODE=demo` is configured. If you have a Google API Key, you can add `GOOGLE_API_KEY=your_key` and set `RUNTIME_MODE=cloud`).*

### 4. Running Locally
```bash
# Run API (Port 4000)
pnpm run dev:api

# Run Web UI (Port 3000)
pnpm run dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

```bash
pnpm test
```

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
```
- Web Application: `http://localhost:3000`
- API Backend: `http://localhost:4000`

---

## 📄 License
MIT License.
