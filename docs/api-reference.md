# DocSetuAI API Reference

**Base URL:** `http://localhost:4000` (local) | `https://<cloud-run-url>` (production)  
**Content-Type:** `application/json`  
**Auth:** None (open — add API key middleware for production)

---

## Health

### `GET /health`

Returns server status and runtime mode.

**Response:**
```json
{
  "status": "ok",
  "runtime_mode": "demo",
  "timestamp": "2026-09-01T07:00:00.000Z"
}
```

---

## Tasks

### `GET /api/tasks`

List all tasks with live stats.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "TASK-ABC12345",
      "goal": "Recover overdue payments...",
      "status": "completed",
      "created_at": "2026-09-01T07:00:00.000Z",
      "started_at": "2026-09-01T07:00:01.000Z",
      "completed_at": "2026-09-01T07:01:04.000Z",
      "created_by": "user",
      "plan": [...],
      "result": {...}
    }
  ],
  "stats": {
    "active_agents": 1,
    "tasks_running": 1,
    "completed_today": 2,
    "awaiting_approval": 3,
    "total_tasks": 5
  }
}
```

---

### `GET /api/tasks/stats`

Lightweight stats-only endpoint for the dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "active_agents": 1,
    "tasks_running": 0,
    "completed_today": 5,
    "awaiting_approval": 2,
    "total_tasks": 10
  }
}
```

---

### `GET /api/tasks/:id`

Full task detail including execution log, approvals, and activity.

**Response:**
```json
{
  "success": true,
  "data": {
    "task": { ...Task },
    "executions": [ ...AgentExecution[] ],
    "approvals": [ ...Approval[] ],
    "activities": [ ...Activity[] ]
  }
}
```

---

### `POST /api/tasks`

Create a new task. Does **not** start execution automatically.

**Body:**
```json
{
  "goal": "Recover overdue payments from customers whose invoices are more than 7 days overdue.",
  "created_by": "admin"
}
```

Validation: `goal` must be 10–1000 characters.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "TASK-ABC12345",
    "goal": "...",
    "status": "pending",
    ...
  }
}
```

---

### `POST /api/tasks/:id/run`

Starts the orchestrator pipeline in the background. Returns immediately; poll `GET /api/tasks/:id` for progress.

**Response:**
```json
{
  "success": true,
  "data": { ...Task },
  "message": "Task execution started"
}
```

**Errors:**
- `400` — Task is not in `pending` status
- `404` — Task not found

---

### `POST /api/tasks/:id/cancel`

Cancels a task. Note: the running orchestrator does **not** abort mid-execution currently — the status is updated but the background promise continues until the next natural checkpoint.

**Response:**
```json
{ "success": true, "data": { ...Task (status: "cancelled") } }
```

---

## Approvals

### `GET /api/approvals`

List all approvals. Filter by status with query param.

**Query params:** `?status=pending|approved|rejected`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "task_id": "TASK-ABC12345",
      "customer_id": "CUS-1000",
      "action": "send_payment_reminder",
      "payload": {
        "customer": { "id": "CUS-1000", "name": "...", "company": "...", "email": "..." },
        "invoice": { "id": "INV-2000", "amount": 48500, "currency": "INR", "days_overdue": 12 },
        "message": "Dear Rajesh Kumar, ...",
        "channel": "email"
      },
      "status": "pending",
      "requested_at": "2026-09-01T07:00:30.000Z"
    }
  ]
}
```

---

### `GET /api/approvals/:id`

Single approval by ID.

---

### `POST /api/approvals/:id/approve`

Approve a pending action. Unblocks the orchestrator approval gate.

**Body (optional):**
```json
{ "approved_by": "admin@company.com" }
```

**Response:**
```json
{
  "success": true,
  "data": { ...Approval (status: "approved", approved_at: "...", approved_by: "...") }
}
```

**Errors:** `400` if already resolved, `404` if not found.

---

### `POST /api/approvals/:id/reject`

Reject a pending action.

**Body:**
```json
{
  "approved_by": "admin@company.com",
  "reason": "Tone is too aggressive for this customer"
}
```

---

### `POST /api/approvals/approve-all`

Batch approve all pending approvals. Useful for the demo workflow.

**Response:**
```json
{ "success": true, "data": [...Approval[]], "count": 14 }
```

---

## Agents

### `GET /api/agents`

Returns the static agent registry with live status.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "orchestrator",
      "name": "OrchestratorAgent",
      "description": "Plans and coordinates all sub-agents based on business goals",
      "capabilities": ["goal_parsing", "plan_creation", "agent_coordination", "approval_gating"],
      "model": "gemini-3.6-flash",
      "status": "active"
    },
    { "id": "billing", "name": "BillingAgent", "model": "rule-based", ... },
    { "id": "customer", "name": "CustomerAgent", "model": "rule-based", ... },
    { "id": "communication", "name": "CommunicationAgent", "model": "gemini-3.6-flash", ... },
    { "id": "followup", "name": "FollowupAgent", "model": "rule-based", ... },
    { "id": "verification", "name": "VerificationAgent", "model": "rule-based", ... }
  ]
}
```

### `GET /api/agents/:id`

Single agent detail.

---

## Activity

### `GET /api/activity`

Activity feed, newest first. Optionally filtered to a task.

**Query params:** `?task_id=TASK-ABC12345`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "task_id": "TASK-ABC12345",
      "type": "email_sent",
      "description": "Email sent to Acme Industries",
      "metadata": { "customer_id": "CUS-1000", "invoice_id": "INV-2000" },
      "created_at": "2026-09-01T07:01:00.000Z"
    }
  ]
}
```

**Activity types:**
`task_created`, `task_started`, `task_completed`, `task_failed`, `agent_started`, `agent_completed`, `tool_called`, `approval_requested`, `approval_received`, `email_sent`, `followup_created`, `verification_completed`, `error`

---

## Customers

### `GET /api/customers`

All 50 seeded customers.

### `GET /api/customers/:id`

Single customer. Returns `404` if not found.

---

## Invoices

### `GET /api/invoices`

All 75 invoices. Filter by status: `?status=overdue|paid|sent|draft`.

### `GET /api/invoices/overdue`

Overdue invoices only. Filter by minimum days: `?min_days=7`.

### `GET /api/invoices/:id`

Single invoice.

---

## Error Responses

All errors return:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "status": 400
}
```

Common status codes:
- `400` — Validation error or invalid state transition
- `404` — Resource not found
- `500` — Unexpected server error (details logged server-side only)
