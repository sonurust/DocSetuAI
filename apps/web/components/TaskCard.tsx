import type { Task } from '@docsetuai/types';
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { ChevronRight, Clock } from 'lucide-react';

interface TaskCardProps {
  task: Task;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/tasks/${task.id}`} className="block group">
      <div className="card hover:border-surface-700 transition-colors duration-150 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono text-slate-500">{task.id}</span>
              <StatusBadge status={task.status} size="sm" />
            </div>
            <p className="text-sm font-medium text-slate-200 line-clamp-2">{task.goal}</p>
            {task.result && (
              <p className="text-xs text-slate-500 mt-1">{task.result.summary}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={12} />
              {timeAgo(task.created_at)}
            </div>
            <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
          </div>
        </div>

        {/* Plan progress bar */}
        {task.plan && task.plan.length > 0 && (
          <div className="mt-3 pt-3 border-t border-surface-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">
                {task.plan.filter((s) => s.status === 'completed').length}/{task.plan.length} steps
              </span>
              {task.result && (
                <span className="text-xs text-slate-500">
                  {Math.round(task.result.execution_time_ms / 1000)}s
                </span>
              )}
            </div>
            <div className="flex gap-0.5">
              {task.plan.map((step) => (
                <div
                  key={step.id}
                  className={`h-1 flex-1 rounded-full ${
                    step.status === 'completed' ? 'bg-emerald-500'
                    : step.status === 'running' ? 'bg-brand-500 animate-pulse'
                    : step.status === 'failed' ? 'bg-red-500'
                    : 'bg-surface-700'
                  }`}
                  title={step.label}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
