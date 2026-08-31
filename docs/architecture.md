# DocSetuAI — System Architecture

DocSetuAI is an **Autonomous AI Business Operations Platform** built for the **All Things Agentic Hackathon** (Taskmaster Track).

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend["Presentation Layer (Next.js 14)"]
        UI_Landing["Landing Page"]
        UI_Dashboard["Operations Dashboard"]
        UI_TaskRunner["Task Creation & Execution"]
        UI_Approvals["Human-in-the-Loop Gate"]
        UI_Audit["Observability & Audit"]
    end

    subgraph API_Gateway["DocSetuAI API & Agent Host (Cloud Run / Node.js)"]
        Router["REST Router & Event Stream"]
        Orchestrator["OrchestratorAgent"]
        
        subgraph SubAgents["Specialized Sub-Agents"]
            BillingAgent["BillingAgent (Invoice Analysis)"]
            CustomerAgent["CustomerAgent (Risk & Priority Scoring)"]
            CommAgent["CommunicationAgent (LLM Message Synthesis)"]
            FollowupAgent["FollowupAgent (Escalation Scheduler)"]
            VerificationAgent["VerificationAgent (Audit & Output Check)"]
        end

        subgraph ToolRegistry["Agent Tool Layer"]
            T1["get_overdue_invoices()"]
            T2["get_customer_history()"]
            T3["calculate_priority()"]
            T4["generate_payment_message()"]
            T5["request_human_approval()"]
            T6["send_email()"]
            T7["create_followup()"]
            T8["verify_execution()"]
        end

        LLM_Adapter["LLM Adapter Interface"]
    end

    subgraph Google_AI["Google Cloud Intelligence"]
        Gemini["Gemini 2.5 Flash / Pro"]
    end

    subgraph Persistence["State & Messaging"]
        Firestore["Firestore / In-Memory State Store"]
        PubSub["Google Cloud Pub/Sub"]
    end

    %% Flow connections
    Frontend <-->|REST API / Async Events| Router
    Router --> Orchestrator
    Orchestrator --> SubAgents
    SubAgents --> ToolRegistry
    CommAgent --> LLM_Adapter
    Orchestrator --> LLM_Adapter
    LLM_Adapter --> Gemini

    ToolRegistry --> Persistence
    Orchestrator --> Persistence
```

---

## 2. Autonomous Agent Execution Loop

DocSetuAI implements a closed-loop agentic workflow:

```text
Business Goal (Natural Language)
       ↓
Understand (Goal Intent Parsing)
       ↓
Plan (Gemini Generates Execution Plan Steps)
       ↓
Execute (Specialized Agents & Tool Calls)
       ↓
Observe (Telemetry & Activity Stream Recorded)
       ↓
Gate (Human-in-the-Loop Approval for Sensitive Actions)
       ↓
Dispatch (Execution through External/Demo Adapters)
       ↓
Verify (VerificationAgent Audits All Post-Conditions)
       ↓
Report (Structured Outcome Metrics & ROI Summary)
```

---

## 3. Specialized Agents & Responsibilities

| Agent | Responsibility | Primary Tools Used |
|---|---|---|
| **OrchestratorAgent** | Breaks high-level business goals into plans, manages sub-agent lifecycle, and controls the approval gate. | `generate_plan()`, `request_human_approval()`, `verify_execution()` |
| **BillingAgent** | Queries accounts receivable ledgers, detects overdue invoices, computes aging days. | `get_overdue_invoices()`, `get_invoice()`, `get_invoices_by_customer()` |
| **CustomerAgent** | Extracts customer profiles, assesses credit risk score, calculates collection priority index. | `get_customer()`, `get_customer_history()`, `calculate_customer_priority()` |
| **CommunicationAgent** | Crafts personalized, tone-appropriate communication using Gemini based on customer history and urgency. | `generate_payment_message()`, `send_email()` |
| **FollowupAgent** | Schedules future touchpoints and escalations based on overdue thresholds and payment risk tiers. | `create_followup()` |
| **VerificationAgent** | Validates that all approved messages reached adapters, records audits, and computes recovered cash flow. | `verify_execution()`, `save_activity()` |

---

## 4. Google Cloud Services Mapping

- **Google Gemini (2.5 Flash)**: Complex goal reasoning, multi-step planning, and dynamic contextual email drafting.
- **Google Cloud Run**: Serverless container runtime hosting the web frontend and API microservices.
- **Google Cloud Firestore**: Structured persistence for customer profiles, memory context, and immutable audit trails.
- **Google Cloud Pub/Sub**: Asynchronous task event distribution for decoupled, fault-tolerant background agent execution.
