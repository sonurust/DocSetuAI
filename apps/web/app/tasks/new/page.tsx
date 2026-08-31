'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { Bot, Sparkles, ArrowRight, CheckCircle2, Shield, Play } from 'lucide-react';

const EXAMPLE_TEMPLATES = [
  {
    title: 'Recover Overdue Payments (Flagship Demo)',
    goal: 'Recover overdue payments from customers whose invoices are more than 7 days overdue.',
    badge: 'Recommended Demo',
    color: 'border-brand-500/50 bg-brand-950/20 text-brand-400',
  },
  {
    title: 'Follow Up with Inactive Accounts',
    goal: 'Identify and reach out to high-value customers who have had no activity for over 60 days.',
    badge: 'Operations',
    color: 'border-surface-700 bg-surface-900/50 text-slate-300',
  },
  {
    title: 'High-Risk Account Review & Escalation',
    goal: 'Analyze customers with risk scores above 75 and overdue balances exceeding ₹50,000 for immediate escalation.',
    badge: 'Risk & Audit',
    color: 'border-surface-700 bg-surface-900/50 text-slate-300',
  },
  {
    title: 'Month-End Revenue Collection Sprint',
    goal: 'Draft tailored reminders for all open invoices due within 3 days and seek approval to dispatch.',
    badge: 'Finance',
    color: 'border-surface-700 bg-surface-900/50 text-slate-300',
  },
];

function NewTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoParam = searchParams?.get('demo') === 'true';

  const [goal, setGoal] = useState(
    isDemoParam
      ? 'Recover overdue payments from customers whose invoices are more than 7 days overdue.'
      : '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || goal.length < 10) {
      setError('Please provide a descriptive business goal (at least 10 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create task
      const created = await api.createTask(goal.trim());
      const taskId = created.data.id;

      // 2. Trigger async execution
      await api.runTask(taskId);

      // 3. Navigate to live execution timeline
      router.push(`/tasks/${taskId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start AI task. Please ensure the API is running.');
      setLoading(false);
    }
  };

  const handleSelectTemplate = (selectedGoal: string) => {
    setGoal(selectedGoal);
    setError(null);
  };

  return (
    <>
      {/* Task Creation Form */}
      <form onSubmit={handleSubmit} className="card border-surface-700/80 bg-surface-900/90 mb-8 shadow-xl">
        <div className="mb-4">
          <label htmlFor="goal-input" className="block text-sm font-medium text-slate-200 mb-2">
            What should DocSetuAI get done?
          </label>
          <textarea
            id="goal-input"
            rows={4}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Recover overdue payments from customers whose invoices are more than 7 days overdue."
            className="w-full bg-surface-950 border border-surface-700 rounded-xl p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-sans leading-relaxed"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-surface-800">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-400" />
              Human-in-the-loop enabled
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-brand-400" />
              Auto verification
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || !goal.trim()}
              className="btn-primary px-5 py-2.5 text-sm font-medium shadow-lg shadow-brand-600/20"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Initiating Agents...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Run AI Task
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Suggested Templates */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Bot size={16} className="text-brand-400" />
          Pre-built Business Goal Templates
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXAMPLE_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectTemplate(tmpl.goal)}
              className={`text-left p-4 rounded-xl border transition-all duration-150 hover:border-brand-500 hover:scale-[1.01] ${
                goal === tmpl.goal
                  ? 'border-brand-500 bg-brand-950/30'
                  : 'border-surface-800 bg-surface-900/60 hover:bg-surface-850'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tmpl.color}`}>
                  {tmpl.badge}
                </span>
                <span className="text-xs text-slate-500">Use Template →</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1.5">{tmpl.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{tmpl.goal}</p>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function NewTaskPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles size={14} />
          Autonomous Agent Taskmaster
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Create AI Business Task</h1>
        <p className="text-sm text-slate-400 mt-1">
          Provide a high-level operational goal. The agent orchestrator will create a multi-step plan, coordinate specialized agents, call tools, request approvals, and verify outcomes.
        </p>
      </div>

      <Suspense fallback={<div className="card text-center py-12 text-xs text-slate-500">Loading form...</div>}>
        <NewTaskForm />
      </Suspense>
    </div>
  );
}
