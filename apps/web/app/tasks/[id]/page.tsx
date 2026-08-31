'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, type TaskDetailResponse } from '../../../lib/api';
import { StatusBadge } from '../../../components/StatusBadge';
import { AgentTimeline } from '../../../components/AgentTimeline';
import { ApprovalCard } from '../../../components/ApprovalCard';
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Ban,
  ArrowLeft,
  DollarSign,
  Users,
  Mail,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

function formatINR(val?: number) {
  if (typeof val !== 'number') return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params?.id as string;
  const router = useRouter();

  const [data, setData] = useState<TaskDetailResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await api.getTask(taskId);
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task details');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchDetails();

    // Auto-poll while running, planning, or awaiting approval
    const interval = setInterval(() => {
      if (
        data?.task.status === 'planning' ||
        data?.task.status === 'executing' ||
        data?.task.status === 'awaiting_approval' ||
        data?.task.status === 'pending'
      ) {
        fetchDetails();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [fetchDetails, data?.task.status]);

  const handleApprove = async (approvalId: string) => {
    setActionLoading(true);
    try {
      await api.approveApproval(approvalId);
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (approvalId: string) => {
    const reason = prompt('Reason for rejection (optional):') || undefined;
    setActionLoading(true);
    try {
      await api.rejectApproval(approvalId, reason);
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAll = async () => {
    setActionLoading(true);
    try {
      await api.approveAll();
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Batch approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTask = async () => {
    if (!confirm('Are you sure you want to cancel this task?')) return;
    setActionLoading(true);
    try {
      await api.cancelTask(taskId);
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading agent telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="card border-red-800 bg-red-950/20 text-center py-10">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-100 mb-1">Failed to load task</h2>
          <p className="text-xs text-red-300 mb-4">{error || 'Task not found'}</p>
          <button onClick={fetchDetails} className="btn-secondary mx-auto text-xs">
            <RotateCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { task, executions, approvals, activities } = data;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const isExecuting = task.status === 'planning' || task.status === 'executing';
  const isAwaitingApproval = task.status === 'awaiting_approval';
  const isComplete = task.status === 'completed';

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-surface-900 border border-surface-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">{task.id}</span>
              <StatusBadge status={task.status} />
              {isExecuting && (
                <span className="flex items-center gap-1 text-[11px] text-brand-400 animate-pulse font-medium">
                  <Sparkles size={12} /> Real-time Execution
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-slate-100 mt-1 line-clamp-1">{task.goal}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDetails}
            className="btn-secondary py-1.5 px-3 text-xs"
            title="Refresh State"
          >
            <RotateCw size={13} className={isExecuting ? 'animate-spin' : ''} />
            Refresh
          </button>

          {isExecuting && (
            <button
              onClick={handleCancelTask}
              disabled={actionLoading}
              className="btn-danger py-1.5 px-3 text-xs"
            >
              <Ban size={13} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Human Approval Required Alert Box */}
      {isAwaitingApproval && pendingApprovals.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-amber-600/60 bg-amber-950/40 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert size={18} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-200">
                  Human Approval Required ({pendingApprovals.length} action{pendingApprovals.length > 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  The agents have generated personalized communications and are awaiting your authorization to dispatch.
                </p>
              </div>
            </div>

            <button
              onClick={handleApproveAll}
              disabled={actionLoading}
              className="btn-success py-2 px-4 text-xs font-semibold shrink-0 shadow-lg shadow-emerald-950/50"
            >
              <CheckCircle2 size={15} />
              Approve All ({pendingApprovals.length}) &amp; Continue
            </button>
          </div>
        </div>
      )}

      {/* Final Execution Report (when completed) */}
      {isComplete && task.result && (
        <div className="card mb-8 border-emerald-800/80 bg-emerald-950/20 animate-fade-in shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 size={16} />
            Execution Verified &amp; Completed
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Autonomous Operations Report</h2>
          <p className="text-xs text-slate-400 mb-6">{task.result.summary}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-900/90 border border-surface-800 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <DollarSign size={13} className="text-emerald-400" /> Est. Recovery
              </div>
              <div className="text-lg font-bold text-emerald-400">
                {formatINR(task.result.estimated_recovery)}
              </div>
            </div>

            <div className="bg-surface-900/90 border border-surface-800 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <Users size={13} className="text-brand-400" /> Invoices Reviewed
              </div>
              <div className="text-lg font-bold text-slate-100">
                {task.result.invoices_analyzed}
              </div>
            </div>

            <div className="bg-surface-900/90 border border-surface-800 p-3 rounded-lg">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <Mail size={13} className="text-sky-400" /> Messages Sent
              </div>
              <div className="text-lg font-bold text-slate-100">
                {task.result.messages_sent} / {task.result.messages_generated}
              </div>
            </div>

            <div className="bg-surface-900/90 border border-surface-800 p-3 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Total Duration</div>
              <div className="text-lg font-bold text-slate-100">
                {(task.result.execution_time_ms / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Timeline & Tools, Right = Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Plan & Execution Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-800">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-brand-400" />
                <h2 className="text-sm font-semibold text-slate-200">Agent Orchestration &amp; Telemetry</h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {executions.length} tool calls
              </span>
            </div>

            <AgentTimeline
              plan={task.plan}
              executions={executions}
              activities={activities}
            />
          </div>
        </div>

        {/* Approvals Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Approvals ({approvals.length})
            </h2>
            {pendingApprovals.length > 0 && (
              <span className="badge badge-yellow">
                {pendingApprovals.length} pending
              </span>
            )}
          </div>

          {approvals.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-xs text-slate-500">
                {isExecuting
                  ? 'Waiting for agent to produce actionable items...'
                  : 'No approval actions generated for this task.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
