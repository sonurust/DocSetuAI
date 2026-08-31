'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Activity as ActivityIcon, RotateCw, Search } from 'lucide-react';
import type { Activity } from '@docsetuai/types';

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchActivities = useCallback(async () => {
    try {
      const res = await api.getActivity();
      setActivities(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 3000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  const filtered = activities.filter(
    (a) =>
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase()) ||
      (a.task_id && a.task_id.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ActivityIcon size={14} />
            Live Observability
          </div>
          <h1 className="text-xl font-bold text-slate-100">Audit &amp; Telemetry Stream</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time feed of every autonomous agent action, tool invocation, and decision point.
          </p>
        </div>

        <button
          onClick={fetchActivities}
          className="btn-secondary text-xs py-2 px-3 self-start sm:self-auto"
        >
          <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-6 relative">
        <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by agent, task ID, action type..."
          className="w-full bg-surface-900 border border-surface-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Activity Timeline */}
      <div className="card divide-y divide-surface-800/60 p-0 overflow-hidden">
        {loading && activities.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading audit feed...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No events found matching your filter.</div>
        ) : (
          filtered.map((act) => (
            <div key={act.id} className="p-4 hover:bg-surface-850/50 transition-colors flex items-start gap-4">
              <div className="text-slate-500 font-mono text-[11px] shrink-0 pt-0.5">
                {new Date(act.created_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>

              <div className="shrink-0 mt-0.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    act.type.includes('completed') || act.type === 'email_sent' || act.type === 'approval_received'
                      ? 'bg-emerald-400'
                      : act.type === 'error' || act.type === 'task_failed'
                      ? 'bg-red-400'
                      : act.type === 'approval_requested'
                      ? 'bg-amber-400'
                      : 'bg-brand-400'
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200">{act.description}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-800 text-slate-400">
                    {act.type}
                  </span>
                  {act.task_id && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-950/60 text-brand-400 border border-brand-800/40">
                      {act.task_id}
                    </span>
                  )}
                </div>

                {act.metadata && Object.keys(act.metadata).length > 0 && (
                  <pre className="text-[11px] font-mono bg-surface-950 p-2 rounded-md text-slate-400 overflow-x-auto mt-2 border border-surface-800">
                    {JSON.stringify(act.metadata, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
