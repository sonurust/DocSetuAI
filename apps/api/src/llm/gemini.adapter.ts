/**
 * Pure Google Gemini 3.6 Flash Adapter.
 *
 * Uses @google/adk v2 with Google Gemini 3.6 Flash for all reasoning,
 * plan generation, message drafting, and conversational interactions.
 *
 * All requests and responses are captured in real-time by aiLogStore.
 */

import { LlmAgent, InMemoryRunner, isFinalResponse } from '@google/adk';
import { config } from '@docsetuai/config';
import type { LLMAdapter } from './llm.interface';
import type { AgentPlan, LLMMessage } from '@docsetuai/types';
import { aiLogStore } from '../store/aiLogStore';
import { v4 as uuid } from 'uuid';

// ── Shared runner builder ─────────────────────────────────────────────────────

function makeRunner(agentName: string, instruction: string): InMemoryRunner {
  const agent = new LlmAgent({
    name: agentName,
    model: config.gemini_model,   // pinned to "gemini-3.6-flash"
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
  constructor() {
    if (!config.google_api_key) {
      throw new Error(
        'GOOGLE_API_KEY is required for GeminiAdapter. Please set GOOGLE_API_KEY in your environment or .env file.',
      );
    }
    // Expose key to process.env for @google/genai backend
    process.env['GOOGLE_API_KEY'] = config.google_api_key;
    console.log(`[Gemini] Initialised pure Gemini adapter with model "${config.gemini_model}"`);
  }

  // ── generatePlan ────────────────────────────────────────────────────────────
  async generatePlan(goal: string): Promise<AgentPlan> {
    const startTime = Date.now();
    const systemInstruction = `You are the OrchestratorAgent for DocSetuAI, an autonomous accounts-receivable platform.
Given a business goal, produce a deterministic JSON execution plan using exactly these agents in order:
BillingAgent, CustomerAgent, CommunicationAgent, ApprovalAgent, FollowupAgent, VerificationAgent.

Output ONLY valid JSON — no markdown fences, no extra text:
{
  "goal_summary": "<one sentence>",
  "estimated_duration_ms": <number>,
  "steps": [
    { "id": "<uuid>", "label": "<action description>", "agent": "<AgentName>", "status": "pending" }
  ]
}`;

    try {
      const runner = makeRunner('DocSetuAI_Planner', systemInstruction);
      const raw = await runOnce(runner, goal);
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned) as AgentPlan;

      parsed.steps = parsed.steps.map((s) => ({
        ...s,
        id: uuid(),
        status: 'pending' as const,
      }));

      aiLogStore.log({
        agent: 'OrchestratorAgent',
        action: 'generate_plan',
        model: config.gemini_model,
        system_instruction: systemInstruction,
        request_payload: { goal },
        response_payload: parsed,
        latency_ms: Date.now() - startTime,
        status: 'success',
      });

      return parsed;
    } catch (err: any) {
      aiLogStore.log({
        agent: 'OrchestratorAgent',
        action: 'generate_plan',
        model: config.gemini_model,
        system_instruction: systemInstruction,
        request_payload: { goal },
        response_payload: null,
        latency_ms: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });

      console.error('[Gemini] generatePlan error:', err.message);
      throw new Error(`Gemini plan generation failed: ${err.message}`);
    }
  }

  // ── generatePaymentMessage ──────────────────────────────────────────────────
  async generatePaymentMessage(
    params: Parameters<LLMAdapter['generatePaymentMessage']>[0],
  ): Promise<string> {
    const startTime = Date.now();
    const systemInstruction = `You write professional payment reminder emails for DocSetuAI.
Rules:
- Tone scales with days overdue: ≤7 days = empathetic; 8–14 = firm; 15–30 = urgent; >30 = escalation.
- Always cite the exact invoice ID and amount.
- Do NOT include a subject line, salutation header, or markdown formatting.
- Output only the raw email body text.`;

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

    try {
      const runner = makeRunner('DocSetuAI_MessageComposer', systemInstruction);
      const message = await runOnce(runner, prompt);
      if (!message) throw new Error('Empty response from Gemini model');

      aiLogStore.log({
        agent: 'CommunicationAgent',
        action: 'generate_payment_message',
        model: config.gemini_model,
        system_instruction: systemInstruction,
        request_payload: params,
        response_payload: { message },
        latency_ms: Date.now() - startTime,
        status: 'success',
      });

      return message;
    } catch (err: any) {
      aiLogStore.log({
        agent: 'CommunicationAgent',
        action: 'generate_payment_message',
        model: config.gemini_model,
        system_instruction: systemInstruction,
        request_payload: params,
        response_payload: null,
        latency_ms: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });

      console.error('[Gemini] generatePaymentMessage error:', err.message);
      throw new Error(`Gemini message drafting failed: ${err.message}`);
    }
  }

  // ── chat ────────────────────────────────────────────────────────────────────
  async chat(messages: LLMMessage[]): Promise<string> {
    if (!messages.length) return '';

    const startTime = Date.now();
    const systemInstruction =
      'You are the DocSetuAI assistant. Answer questions about accounts-receivable, invoices, customers, and workflows concisely and accurately.';

    try {
      const runner = makeRunner('DocSetuAI_Chat', systemInstruction);
      const fullPrompt = messages
        .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
        .join('\n');

      const response = await runOnce(runner, fullPrompt);

      aiLogStore.log({
        agent: 'ChatAgent',
        action: 'chat',
        model: config.gemini_model,
        system_instruction: systemInstruction,
        request_payload: { messages },
        response_payload: { response },
        latency_ms: Date.now() - startTime,
        status: 'success',
      });

      return response;
    } catch (err: any) {
      aiLogStore.log({
        agent: 'ChatAgent',
        action: 'chat',
        model: config.gemini_model,
        system_instruction: systemInstruction,
        request_payload: { messages },
        response_payload: null,
        latency_ms: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });

      console.error('[Gemini] chat error:', err.message);
      throw new Error(`Gemini chat failed: ${err.message}`);
    }
  }
}
