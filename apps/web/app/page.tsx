import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle, Zap, Shield, BarChart3, GitBranch } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Autonomous Planning',
    description: 'Give the AI a goal in plain English. It breaks down the work, creates a step-by-step plan, and begins execution immediately.',
  },
  {
    icon: Bot,
    title: 'Multi-Agent Execution',
    description: 'Specialized agents handle billing analysis, customer profiling, communication drafting, and follow-up scheduling in parallel.',
  },
  {
    icon: Shield,
    title: 'Human-in-the-Loop',
    description: 'Sensitive actions require your approval before execution. Review, edit, or reject any AI-generated communication.',
  },
  {
    icon: CheckCircle,
    title: 'Verified Results',
    description: 'After execution, a verification agent audits results and generates a complete execution report with outcome metrics.',
  },
  {
    icon: BarChart3,
    title: 'Full Observability',
    description: 'See every tool call, agent decision, and system action in real time. Nothing happens in a black box.',
  },
  {
    icon: GitBranch,
    title: 'Persistent Memory',
    description: 'Agents remember previous customer interactions, preferences, and outcomes to make smarter decisions over time.',
  },
];

const WORKFLOWS = [
  'Recover overdue payments from customers',
  'Follow up with inactive customers',
  'Handle high-priority support tickets',
  'Prepare weekly sales follow-up',
  'Identify customers at risk of churn',
];

const STEPS = [
  { step: '01', label: 'Describe Goal', desc: 'Enter your business objective in plain English' },
  { step: '02', label: 'AI Plans', desc: 'Gemini analyses the goal and creates an execution plan' },
  { step: '03', label: 'Agents Execute', desc: 'Specialized agents call tools and process data autonomously' },
  { step: '04', label: 'You Approve', desc: 'Review sensitive actions before they are executed' },
  { step: '05', label: 'Verified Results', desc: 'Execution is verified and a final report is generated' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-950">
      {/* Nav */}
      <nav className="border-b border-surface-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-100">DocSetuAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-secondary text-xs py-1.5 px-3">
              Dashboard
            </Link>
            <Link href="/tasks/new" className="btn-primary text-xs py-1.5 px-3">
              Start an AI Task
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-900/40 border border-brand-800/50 rounded-full text-xs text-brand-400 font-medium mb-8">
          <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
          Autonomous AI Agents · Google Gemini · All Things Agentic Hackathon
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-slate-100 leading-tight mb-6">
          Turn business goals<br />
          <span className="text-brand-500">into completed work.</span>
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI agents that plan, execute, verify, and report business operations.
          Describe what you need done. DocSetuAI handles the rest.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link href="/tasks/new" className="btn-primary px-6 py-3 text-base">
            Start an AI Task
            <ArrowRight size={18} />
          </Link>
          <Link href="/dashboard" className="btn-secondary px-6 py-3 text-base">
            View Dashboard
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-600">
          <span>✓ No real data required</span>
          <span>✓ Demo mode built-in</span>
          <span>✓ Powered by Gemini 2.5</span>
        </div>
      </section>

      {/* Workflow examples */}
      <section className="border-y border-surface-800 py-6 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap gap-3 justify-center">
            {WORKFLOWS.map((w) => (
              <span key={w} className="px-3 py-1.5 bg-surface-900 border border-surface-800 rounded-full text-xs text-slate-400">
                {w}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-slate-100 mb-12 text-center">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
          {STEPS.map(({ step, label, desc }, i) => (
            <div key={step} className="text-center">
              <div className="w-10 h-10 bg-surface-900 border border-surface-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xs font-bold text-brand-500">{step}</span>
              </div>
              <div className="text-sm font-semibold text-slate-200 mb-1">{label}</div>
              <div className="text-xs text-slate-500">{desc}</div>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:flex justify-end mt-4 -mr-3 relative">
                  <div className="absolute right-0 top-[-28px] w-full border-t border-dashed border-surface-800" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-slate-100 mb-12 text-center">Enterprise-ready capabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card">
              <div className="w-9 h-9 bg-brand-900/40 border border-brand-800/30 rounded-lg flex items-center justify-center mb-3">
                <Icon size={18} className="text-brand-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1.5">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-surface-800 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">Ready to see it in action?</h2>
        <p className="text-slate-400 mb-8 text-sm">
          Run the demo workflow and watch agents recover overdue payments autonomously.
        </p>
        <Link href="/tasks/new" className="btn-primary px-8 py-3 text-base">
          Run Demo
          <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>DocSetuAI · All Things Agentic Hackathon 2026</span>
          <span>Powered by Google Gemini &amp; Google Cloud</span>
        </div>
      </footer>
    </div>
  );
}
