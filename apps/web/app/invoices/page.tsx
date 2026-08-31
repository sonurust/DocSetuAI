'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { FileText, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { Invoice } from '@docsetuai/types';

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'paid' | 'sent'>('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await api.getInvoices(filter === 'all' ? undefined : filter);
      setInvoices(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filtered = invoices.filter(
    (inv) =>
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_id.toLowerCase().includes(search.toLowerCase()) ||
      (inv.description && inv.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileText size={14} />
            Billing Subsystem
          </div>
          <h1 className="text-xl font-bold text-slate-100">Invoice Ledger ({invoices.length})</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Accounts receivable ledger analyzed by the BillingAgent for overdue detection.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {(['all', 'overdue', 'paid', 'sent'] as const).map((tab) => (
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

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or customer ID..."
            className="w-full bg-surface-900 border border-surface-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-850 border-b border-surface-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-3.5">Invoice ID</th>
                <th className="p-3.5">Customer ID</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5">Overdue Days</th>
                <th className="p-3.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-850/40 transition-colors">
                    <td className="p-3.5 font-mono font-semibold text-slate-200">{inv.id}</td>
                    <td className="p-3.5 font-mono text-slate-400">{inv.customer_id}</td>
                    <td className="p-3.5 font-bold text-slate-100">{formatINR(inv.amount)}</td>
                    <td className="p-3.5">
                      <span
                        className={`badge text-[10px] ${
                          inv.status === 'overdue'
                            ? 'badge-red'
                            : inv.status === 'paid'
                            ? 'badge-green'
                            : 'badge-blue'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{inv.due_date}</td>
                    <td className="p-3.5">
                      {inv.days_overdue > 0 ? (
                        <span className="text-red-400 font-semibold">{inv.days_overdue} days</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 max-w-xs truncate">{inv.description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
