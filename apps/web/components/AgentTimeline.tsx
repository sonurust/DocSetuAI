import type { PlanStep, AgentExecution, Activity } from '@docsetuai/types';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

interface AgentTimelineProps {
  plan?: PlanStep[];
  executions: AgentExecution[];
  activities: Activity[];
}

const STEP_ICONS = {
  pending: <Circle size={16} className="text-slate-600" />,
  running: <Loader2 size={16} className="text-brand-400 animate-spin" />,
  completed: <CheckCircle2 size={16} className="text-emerald-400" />,
  failed: <XCircle size={16} className="text-red-400" />,
  skipped: <Circle size={16} className="text-slate-600 opacity-40" />,
};

const AGENT_COLORS: Record<string, string> = {
  OrchestratorAgent: 'text-brand-400',
  BillingAgent: 'text-amber-400',
  CustomerAgent: 'text-violet-400',
  CommunicationAgent: 'text-emerald-400',
  FollowupAgent: 'text-sky-400',
  VerificationAgent: 'text-rose-400',
};

function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function AgentTimeline({ plan = [], executions, activities }: AgentTimelineProps) {
  return (
    <div className="space-y-6">
      {/* Plan steps */}
      {plan.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Execution Plan
          </h3>
          <div className="space-y-1">
            {plan.map((step, i) => (
              <div key={step.id} className="flex items-center gap-3 py-2">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-600 w-4 text-right">{i + 1}</span>
                  <span>{STEP_ICONS[step.status]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${step.status === 'completed' ? 'text-slate-300' : step.status === 'running' ? 'text-slate-100' : 'text-slate-500'}`}>
                    {step.label}
                  </span>
                </div>
                <span className={`text-xs shrink-0 ${AGENT_COLORS[step.agent] ?? 'text-slate-500'}`}>
                  {step.agent}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tool calls */}
      {executions.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Tool Calls ({executions.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {executions.map((exec) => (
              <div key={exec.id} className="bg-surface-850 border border-surface-800 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${AGENT_COLORS[exec.agent] ?? 'text-slate-400'}`}>
                      {exec.agent}
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="text-xs font-mono text-slate-300">{exec.action}()</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {exec.duration_ms && (
                      <span className="text-xs text-slate-600">{formatDuration(exec.duration_ms)}</span>
                    )}
                    <span className={`text-xs ${exec.status === 'completed' ? 'text-emerald-400' : exec.status === 'failed' ? 'text-red-400' : 'text-brand-400'}`}>
                      {exec.status}
                    </span>
                  </div>
                </div>
                {exec.output && !exec.error && (
                  <div className="text-xs text-slate-500 font-mono">
                    {JSON.stringify(exec.output, null, 0).slice(0, 120)}
                  </div>
                )}
                {exec.error && (
                  <div className="text-xs text-red-400 mt-1">⚠ {exec.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity log */}
      {activities.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Activity Log
          </h3>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs py-1.5 border-b border-surface-800/50 last:border-0">
                <span className="text-slate-600 shrink-0 font-mono">
                  {new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`shrink-0 ${
                  act.type.includes('completed') || act.type === 'email_sent' || act.type === 'approval_received'
                    ? 'text-emerald-400'
                    : act.type === 'error' || act.type === 'task_failed'
                    ? 'text-red-400'
                    : act.type === 'approval_requested'
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}>
                  {act.type === 'error' || act.type === 'task_failed' ? '✗'
                    : act.type.includes('completed') || act.type === 'email_sent' ? '✓'
                    : act.type === 'approval_requested' ? '⚠'
                    : '●'}
                </span>
                <span className="text-slate-300">{act.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
