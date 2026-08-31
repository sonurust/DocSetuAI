# DocSetuAI — Comprehensive Test Scenarios & Verification Matrix

**Document Purpose**: Definitive reference of automated, manual, and integration test scenarios for the DocSetuAI autonomous AI operations platform (Taskmaster Hackathon Track).

---

## 1. Overview of Test Categories

| Category | Description | Scope |
|---|---|---|
| **TS-01** | Core Multi-Agent Workflow (Overdue Receivables) | End-to-end goal -> plan -> execution -> approval -> verification |
| **TS-02** | Communication & Email Resilience | Transient SMTP timeouts, exponential backoff retries, delivery telemetry |
| **TS-03** | Human-in-the-Loop Approval Lifecycle | Single approval, batch approval, rejection with reasoning, timeout guards |
| **TS-04** | Dual-Mode Storage (Firestore Native + In-Memory) | Google Cloud Firestore persistence, fallback safety, data consistency |
| **TS-05** | Credit Risk & Customer Scoring | Algorithm validation, days overdue weighting, VIP escalation prioritization |
| **TS-06** | Task Cancellation & Failure Recovery | Aborting in-flight executions, non-blocking asynchronous pipeline |
| **TS-07** | REST API & Validation Contracts | Zod payload schema validation, error codes, HTTP status codes |
| **TS-08** | Frontend Telemetry & UI Interactions | Live execution stepper, activity log stream, approvals inbox |

---

## 2. Detailed Test Scenarios

### TS-01: End-to-End Autonomous Accounts Receivable Workflow

- **Goal**: `"Recover overdue payments from customers whose invoices are more than 7 days overdue."`
- **Preconditions**:
  - Backend API server running on port `4000`.
  - Seed dataset loaded with 50 customers, 75 invoices (20 overdue).
- **Execution Steps**:
  1. Submit `POST /api/tasks` with the goal string.
  2. Verify task is created in `pending` status with a unique ID (`TASK-XXXXXXXX`).
  3. Submit `POST /api/tasks/:id/run` to trigger the OrchestratorAgent.
  4. Poll `GET /api/tasks/:id` to observe the 9-step plan creation and execution:
     - `BillingAgent` -> `find_overdue_invoices` (20 items identified)
     - `CustomerAgent` -> `get_customer_profiles`, `calculate_priority`
     - `CommunicationAgent` -> `generate_payment_messages` via Gemini LLM
  5. Check that task status transitions to `awaiting_approval`.
  6. Submit `POST /api/approvals/approve-all`.
  7. Observe execution resumption:
     - `CommunicationAgent` -> `send_email`
     - `FollowupAgent` -> `create_followup`
     - `VerificationAgent` -> `audit_outcomes`
- **Expected Results**:
  - Final task status: `completed`.
  - Estimated recovery amount calculated: ~`₹15,58,300`.
  - 100% of plan steps marked as `completed`.
  - Audit report populated in `task.result`.

---

### TS-02: Email Delivery & Transient Timeout Resilience

- **Objective**: Verify that transient network/SMTP timeouts do not abort task execution and are recovered automatically via exponential backoff retries.
- **Test Scenarios**:

| Scenario ID | Test Condition | Expected Behavior |
|---|---|---|
| **TS-02.1** | Transient SMTP timeout on Attempt 1 | Caught by retry handler; logged as warning; retried in 200ms with backoff; delivers successfully on Attempt 2. |
| **TS-02.2** | Permanent recipient mailbox error (exceeded max retries) | Logged to Activity stream as error; execution marked failed for single message without crashing overall orchestrator; audit step reports partial success. |
| **TS-02.3** | Custom SMTP / Cloud Provider configured (`SMTP_HOST` / `SENDGRID_API_KEY`) | EmailAdapter routes through configured relay and populates `provider` in `SendEmailResult`. |
| **TS-02.4** | High volume batch dispatch | 20 emails dispatched with staggered pacing to prevent SMTP rate-limiting. |

---

### TS-03: Human-in-the-Loop (HITL) Approvals Queue

- **Objective**: Ensure that autonomous agents never execute sensitive outbound customer actions without explicit authorization.
- **Test Scenarios**:

```
[Agent Generated Message] ──> [Pending Approval Queue]
                                    ├──> [Approve Single] ──> Dispatches specific email
                                    ├──> [Approve All]    ──> Dispatches full batch
                                    └──> [Reject + Reason] ──> Cancels message & logs rejection reason
```

- **Verification Cases**:
  - `GET /api/approvals?status=pending`: Returns exact count of pending items matching overdue customer count.
  - `POST /api/approvals/:id/approve`: Resolves individual approval; triggers activity `approval_received`.
  - `POST /api/approvals/:id/reject` with `{ "reason": "Customer on payment holiday" }`: Rejection reason persisted and visible in audit trail.
  - Duplicate resolution prevention: Calling approve on already resolved approval returns `400 Bad Request`.

---

### TS-04: Dual-Mode Persistence (Google Cloud Firestore + Memory)

- **Objective**: Validate seamless cloud database syncing and graceful offline fallback.
- **Verification Cases**:
  1. **Google Cloud Firestore Native Mode**:
     - When `RUNTIME_MODE=cloud` and Google Cloud credentials are valid:
     - All created tasks, approvals, and activities are saved to collections: `tasks`, `approvals`, `activities`, `customer_memory`.
  2. **In-Memory Graceful Fallback**:
     - When offline or running in mock mode:
     - `taskStore` and `customerStore` operate in memory with zero crash or startup delay.

---

### TS-05: Customer Priority & Credit Risk Scoring

- **Formula**:
  $$\text{Priority Score} = \min(100, (\text{Days Overdue} \times 2) + (\text{Risk Multiplier}) + (\text{Amount Weight}))$$
- **Verification Cases**:

| Customer Tier | Overdue Days | Risk Rating | Expected Priority | Recommended Tone |
|---|---|---|---|---|
| Tier 1 (Strategic) | 1-7 days | Low | Normal / Low (10-35) | Polite & Gentle Reminder |
| Tier 2 (Standard) | 8-20 days | Medium | High (50-75) | Professional & Firm |
| Tier 3 (High Risk) | > 20 days | High / Critical | Urgent (80-100) | Formal Notice & Escalation |

---

### TS-06: Task Lifecycle & Cancellation

- **Verification Cases**:
  - `POST /api/tasks/:id/cancel` during `pending` or `awaiting_approval`: Status transitions to `cancelled`.
  - Calling `POST /api/tasks/:id/cancel` on a `completed` task returns `400 Bad Request`.
  - Task state machine validation prevents invalid transitions (e.g. cannot run a `completed` task).

---

### TS-07: REST API Automated Test Suite (Jest)

To run the complete automated test suite:

```bash
# Run unit & integration tests
pnpm --filter @docsetuai/api test
```

**Test Coverage Summary**:
- `src/__tests__/agents.test.ts`:
  - `OrchestratorAgent` plan generation & step progression
  - `CustomerAgent` priority calculation & memory retrieval
  - `VerificationAgent` outcome metric aggregation
- `src/__tests__/tools.test.ts`:
  - `billing.tools`: `getOverdueInvoices`, `getInvoicesByCustomer`
  - `customer.tools`: `getCustomer`, `getCustomerHistory`, `calculateCustomerPriority`
  - `communication.tools`: `sendEmail` with retry resilience
  - `followup.tools`: `createFollowup`, `getFollowupsByCustomer`

---

## 3. Manual UI Acceptance Checklist

| Screen / Feature | Route | Acceptance Criteria |
|---|---|---|
| **Operations Dashboard** | `/dashboard` | Displays metrics cards (Active Agents, Running Tasks, Awaiting Approvals, Recovered Capital). |
| **New Task Wizard** | `/tasks/new` | Goal input form with pre-built prompt templates; submits without page reload. |
| **Live Task Telemetry** | `/tasks/[id]` | Real-time 9-step progression visualizer; displays active agent badges and output logs. |
| **Approvals Queue** | `/approvals` | Side-by-side message preview with customer history and 1-click Approve / Reject actions. |
| **Audit Stream** | `/activity` | Chronological event stream with color-coded badges and task filters. |
| **Customer Directory** | `/customers` | Filterable list with credit rating, outstanding balance, and memory tags. |
| **Invoice Ledger** | `/invoices` | Accounts receivable ledger with overdue status flags. |
