# All Things Agentic Hackathon — Submission Documentation

## 1. Project Overview

- **Project Name**: DocSetuAI
- **Tagline**: Turn business goals into completed work.
- **Track**: Taskmaster (Autonomous Planning, Tool-Calling, and Multi-Step Execution)
- **Repository**: `Developer/DocSetuAI`

---

## 2. Executive Summary

DocSetuAI is an autonomous AI business operations platform that allows enterprises to declare high-level business goals and delegates the entire lifecycle—planning, tool execution, human-in-the-loop validation, and outcome verification—to specialized AI agents.

The flagship workflow autonomously recovers overdue customer receivables:
1. Identifying overdue invoices across accounts receivable ledgers.
2. Assessing customer credit risk and computing collection priority indices.
3. Drafting personalized, empathetic communications using Gemini.
4. Requiring human approval for sensitive customer-facing dispatches.
5. Sending communications and scheduling auto-followups.
6. Verifying execution and providing a structured outcome ROI report.

---

## 3. Google Technology Integration

| Technology | Implementation in DocSetuAI |
|---|---|
| **Google Gemini (2.5 Flash)** | Powers `OrchestratorAgent` for goal decomposition and `CommunicationAgent` for contextual message synthesis. |
| **Google Cloud Run** | Containerized microservice deployment for API backend and Next.js frontend. |
| **Google Cloud Firestore** | Persistent state for customer context, memory, tasks, and immutable audit logs. |
| **Google Cloud Pub/Sub** | Asynchronous task event distribution for decoupled background agent execution. |

---

## 4. Key Differentiators

- **Not a Chatbot**: DocSetuAI is a goal-oriented execution engine that interacts directly with business subsystem tools.
- **Deterministic Verification**: Tasks are only marked complete when a VerificationAgent confirms all post-conditions have been satisfied.
- **Human-in-the-Loop by Design**: High-stakes business actions pause execution at safety gates for human authorization.
- **Zero-Setup Demo Mode**: Includes 50 realistic customers and 75 invoices, allowing judges to evaluate the full end-to-end workflow offline without external API dependencies.
