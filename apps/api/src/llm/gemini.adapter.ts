/**
 * Google ADK-powered Gemini adapter.
 *
 * Uses @google/adk v2 — LlmAgent + InMemoryRunner + runEphemeral for
 * stateless single-turn calls (plan generation, message composition, chat).
 *
 * Authentication: GOOGLE_API_KEY env var is read automatically by the
 * @google/genai backend that ADK delegates to.
 *
 * Model string: plain Gemini model name as configured (e.g. "gemini-2.0-flash").
 */

import { LlmAgent, InMemoryRunner, isFinalResponse } from '@google/adk';
import { config } from '@docsetuai/config';
import type { LLMAdapter } from './llm.interface';
import type { AgentPlan, LLMMessage } from '@docsetuai/types';
import { MockLLMAdapter } from './mock.adapter';
import { v4 as uuid } from 'uuid';

// ── Shared runner builder ─────────────────────────────────────────────────────

function makeRunner(agentName: string, instruction: string): InMemoryRunner {
  const agent = new LlmAgent({
    name: agentName,
    model: config.gemini_model,   // e.g. "gemini-2.0-flash"
    instruction,
  });
  return new InMemoryRunner({ agent, appName: 'docsetuai' });
}

// ── Helper: single-turn ephemeral call, returns final text ───────────────────
async function runOnce(runner: InMemoryRunner, text: string): Promise<string> {
  let result = '';
  for await (const event of runner.runEphemeral({
    userId: 'system',
    newMessage: { parts: [{ text }] },
  })) {
    if (isFinalResponse(event) && event.content?.parts) {
      for (const part of event.content.parts) {
        if (typeof part.text === 'string') result += part.text;
      }
    }
  }
  return result.trim();
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class GeminiAdapter implements LLMAdapter {
  private readonly fallback: MockLLMAdapter;

  constructor() {
    this.fallback = new MockLLMAdapter();

    if (!config.google_api_key) {
      console.warn('[ADK] GOOGLE_API_KEY not set — falling back to mock adapter');
    } else {
      // Expose key to process.env for @google/genai backend
      process.env['GOOGLE_API_KEY'] = config.google_api_key;
      console.log(`[ADK] Initialised with model "${config.gemini_model}"`);
    }
  }

  // ── generatePlan ────────────────────────────────────────────────────────────
  async generatePlan(goal: string): Promise<AgentPlan> {
    if (!config.google_api_key) return this.fallback.generatePlan(goal);

    try {
      const runner = makeRunner(
        'DocSetuAI_Planner',
        `You are the OrchestratorAgent for DocSetuAI, an autonomous accounts-receivable platform.
Given a business goal, produce a deterministic JSON execution plan using exactly these agents in order:
BillingAgent, CustomerAgent, CommunicationAgent, ApprovalAgent, FollowupAgent, VerificationAgent.

Output ONLY valid JSON — no markdown fences, no extra text:
{
  "goal_summary": "<one sentence>",
  "estimated_duration_ms": <number>,
  "steps": [
    { "id": "<uuid>", "label": "<action description>", "agent": "<AgentName>", "status": "pending" }
  ]
}`,
      );

      const raw = await runOnce(runner, goal);
      // Strip any accidental markdown formatting if present
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned) as AgentPlan;

      // Guarantee fresh UUIDs regardless of model output
      parsed.steps = parsed.steps.map((s) => ({
        ...s,
        id: uuid(),
        status: 'pending' as const,
      }));

      return parsed;
    } catch (err) {
      console.warn('[ADK] generatePlan failed, using fallback:', (err as Error).message);
      return this.fallback.generatePlan(goal);
    }
  }

  // ── generatePaymentMessage ──────────────────────────────────────────────────
  async generatePaymentMessage(
    params: Parameters<LLMAdapter['generatePaymentMessage']>[0],
  ): Promise<string> {
    if (!config.google_api_key) return this.fallback.generatePaymentMessage(params);

    try {
      const runner = makeRunner(
        'DocSetuAI_MessageComposer',
        `You write professional payment reminder emails for DocSetuAI.
Rules:
- Tone scales with days overdue: ≤7 days = empathetic; 8–14 = firm; 15–30 = urgent; >30 = escalation.
- Always cite the exact invoice ID and amount.
- Do NOT include a subject line, salutation header, or markdown formatting.
- Output only the raw email body text.`,
      );

      const prompt = [
        `Customer: ${params.customerName} (${params.company})`,
        `Invoice: ${params.invoiceId}`,
        `Amount due: ${params.amount} ${params.currency}`,
        `Days overdue: ${params.daysOverdue}`,
        params.previousInteractions?.length
          ? `Prior interactions: ${params.previousInteractions.join('; ')}`
          : null,
        '',
        'Write the payment reminder email body now.',
      ]
        .filter(Boolean)
        .join('\n');

      const message = await runOnce(runner, prompt);
      if (!message) throw new Error('Empty response from model');
      return message;
    } catch (err) {
      console.warn('[ADK] generatePaymentMessage failed, using fallback:', (err as Error).message);
      return this.fallback.generatePaymentMessage(params);
    }
  }

  // ── chat ────────────────────────────────────────────────────────────────────
  async chat(messages: LLMMessage[]): Promise<string> {
    if (!config.google_api_key || !messages.length) {
      return this.fallback.chat(messages);
    }

    try {
      const runner = makeRunner(
        'DocSetuAI_Chat',
        'You are the DocSetuAI assistant. Answer questions about accounts-receivable, invoices, customers, and workflows concisely and accurately.',
      );

      const fullPrompt = messages
        .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
        .join('\n');

      return await runOnce(runner, fullPrompt);
    } catch (err) {
      console.warn('[ADK] chat failed, using fallback:', (err as Error).message);
      return this.fallback.chat(messages);
    }
  }
}
