# DocSetuAI — Demo Video Script (3-4 Minutes)

**Track**: Taskmaster (All Things Agentic Hackathon)  
**Product**: DocSetuAI — Autonomous AI Business Operations Platform

---

### 0:00–0:30 — Problem & Introduction
- **Visual**: Landing page hero (`Turn business goals into completed work`).
- **Narrator**: "Every company loses hundreds of hours each month chasing overdue payments, following up with stalled accounts, and coordinating repetitive operations across disparate tools. Current AI chatbots can give you advice, but they can't do the work for you. Introducing DocSetuAI: an autonomous AI operations platform that turns plain English business goals into executed, verified work."

---

### 0:30–1:15 — Goal Input & Planning
- **Visual**: Navigate to `/tasks/new` and select the flagship prompt:
  > *"Recover overdue payments from customers whose invoices are more than 7 days overdue."*
- **Click**: `Run AI Task`.
- **Visual**: Redirect to `/tasks/[id]`.
- **Narrator**: "Notice what happens instantly: DocSetuAI doesn't just run a script. Powered by Gemini 2.5, the OrchestratorAgent decomposes this objective into a 9-step plan. In real time, the BillingAgent scans accounts receivable for overdue invoices, and CustomerAgent calculates priority scores based on customer credit risk and overdue amounts."

---

### 1:15–2:00 — Multi-Agent Tool Invocations & Observability
- **Visual**: Expand the tool execution log in the timeline.
- **Narrator**: "Watch the live telemetry stream. BillingAgent calls `get_overdue_invoices()`, discovering 20 delinquent accounts. CustomerAgent retrieves individual payment histories, and CommunicationAgent synthesizes personalized, empathetic reminders tailored to each customer's relationship tier."

---

### 2:00–2:45 — Human-in-the-Loop Approval
- **Visual**: The UI highlights the **Human Approval Required** banner.
- **Narrator**: "Autonomous doesn't mean unaccountable. When it comes to sensitive customer communication, DocSetuAI gates the dispatch. As a finance manager, I can review the drafted emails, see the invoice totals, and either edit, reject, or click 'Approve All'."
- **Action**: Click `Approve All`.
- **Visual**: Status updates to `executing`, CommunicationAgent dispatches emails through the adapter, and FollowupAgent schedules reminders in the calendar.

---

### 2:45–3:30 — Verification, Reporting & Enterprise Observability
- **Visual**: Final Execution Report card pops up with verified metrics.
- **Narrator**: "Finally, the VerificationAgent audits all executed actions to confirm that every approved message was actually sent and follow-ups were recorded. We recovered over ₹1.4M in potential receivables in under 60 seconds with complete audit observability."
- **Visual**: Quick glance at `/activity` audit stream and `/customers` memory.

---

### 3:30–3:45 — Conclusion
- **Visual**: Architecture slide / Docs overview.
- **Narrator**: "DocSetuAI: Powered by Gemini and Google Cloud. Don't just chat about business operations — let AI get them done."
