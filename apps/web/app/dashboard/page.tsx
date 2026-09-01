import Link from 'next/link';
import { api } from '../../lib/api';
import { TaskCard } from '../../components/TaskCard';
import { StatusBadge } from '../../components/StatusBadge';
import { ArrowRight, Bot, CheckCircle2, Clock, AlertTriangle, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  let tasks: Awaited<ReturnType<typeof api.getTasks>>['data'] = [];
  let stats = {
    active_agents: 0,
    tasks_running: 0,
    completed_today: 0,
    awaiting_approval: 0,
    total_tasks: 0,
  };
  let activity: Awaited<ReturnType<typeof api.getActivity>>['data'] = [];

  try {
    const [tasksRes, activityRes] = await Promise.all([
      api.getTasks(),
      api.getActivity(),
    ]);
    tasks = tasksRes.data;
    stats = tasksRes.stats;
    activity = activityRes.data;
  } catch {
    // API may not be running yet
  }

  const STAT_CARDS = [
    { label: 'Active Agents', value: stats.active_agents, icon: Bot, color: 'text-brand-400' },
    { label: 'Tasks Running', value: stats.tasks_running, icon: Zap, color: 'text-amber-400' },
    { label: 'Completed Today', value: stats.completed_today, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Awaiting Approval', value: stats.awaiting_approval, icon: AlertTriangle, color: 'text-amber-400' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Autonomous agent operations dashboard</p>
        </div>
        <Link href="/tasks/new" className="btn-primary">
          <Zap size={15} />
          New Task
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <div className="text-3xl font-bold text-slate-100">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Recent Tasks</h2>
            <span className="text-xs text-slate-500">{stats.total_tasks} total</span>
          </div>

          {tasks.length === 0 ? (
            <div className="card text-center py-12">
              <Bot size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-4">No tasks yet. Give an AI agent a goal.</p>
              <Link href="/tasks/new" className="btn-primary mx-auto">
                Start your first task
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 8).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Recent Activity</h2>
            <Link href="/activity" className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>

          <div className="card">
            {activity.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={24} className="text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activity.slice(0, 12).map((act) => (
                  <div key={act.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-surface-800 last:border-0">
                    <span className={`shrink-0 mt-0.5 ${
                      act.type.includes('completed') || act.type === 'email_sent' ? 'text-emerald-400'
                      : act.type === 'error' || act.type === 'task_failed' ? 'text-red-400'
                      : act.type === 'approval_requested' ? 'text-amber-400'
                      : 'text-slate-500'
                    }`}>
                      {act.type === 'error' || act.type === 'task_failed' ? '✗'
                        : act.type.includes('completed') || act.type === 'email_sent' ? '✓'
                        : act.type === 'approval_requested' ? '⚠'
                        : '●'}
                    </span>
                    <span className="text-slate-400 line-clamp-2">{act.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick action trigger */}
          <div className="mt-4 card border-brand-900/50 bg-brand-950/30">
            <p className="text-xs text-slate-400 mb-3">
              <span className="text-emerald-400 font-medium">Cloud Mode · Gemini 3.6 Flash</span> · Run autonomous workflows across your business operations
            </p>
            <Link href="/tasks/new" className="btn-primary w-full justify-center text-xs">
              Start Autonomous Workflow
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
