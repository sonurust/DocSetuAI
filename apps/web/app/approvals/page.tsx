'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { ApprovalCard } from '../../components/ApprovalCard';
import { CheckSquare, RotateCw, CheckCircle2, Filter } from 'lucide-react';
import type { Approval } from '@docsetuai/types';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await api.getApprovals(filter === 'all' ? undefined : filter);
      setApprovals(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await api.approveApproval(id);
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection:') || undefined;
    setActionLoading(true);
    try {
      await api.rejectApproval(id, reason);
      await fetchApprovals();
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
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Approve all failed');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <CheckSquare size={14} />
            Human-in-the-Loop Gate
          </div>
          <h1 className="text-xl font-bold text-slate-100">Approvals Queue</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review and gate sensitive autonomous agent operations before external dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleApproveAll}
              disabled={actionLoading}
              className="btn-success text-xs py-2 px-3 shadow-md"
            >
              <CheckCircle2 size={14} />
              Approve All ({pendingCount})
            </button>
          )}

          <button
            onClick={fetchApprovals}
            className="btn-secondary text-xs py-2 px-3"
            title="Refresh"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-surface-800 pb-3">
        <Filter size={14} className="text-slate-500 mr-1" />
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-brand-600 text-white'
                : 'bg-surface-900 text-slate-400 hover:text-slate-200 border border-surface-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading approvals...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="card text-center py-16">
          <CheckSquare size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No {filter !== 'all' ? filter : ''} approvals</p>
          <p className="text-xs text-slate-500 mt-1">
            When agents require human authorization, actions will appear here for review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
  );
}
