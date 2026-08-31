'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Users, Search, AlertCircle, Building2, Phone, Mail } from 'lucide-react';
import type { Customer } from '@docsetuai/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.getCustomers();
      setCustomers(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users size={14} />
            Data Layer
          </div>
          <h1 className="text-xl font-bold text-slate-100">Customer Directory ({customers.length})</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Customer entities, contact channels, risk ratings, and persistent memory context.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-6 relative">
        <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company name, contact person, email, ID..."
          className="w-full bg-surface-900 border border-surface-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-500">Loading customers...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-xs text-slate-500">No customers found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="card hover:border-surface-700 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block mb-0.5">{c.id}</span>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-400" />
                    {c.company}
                  </h3>
                  <p className="text-xs text-slate-400">{c.name}</p>
                </div>

                <div className="text-right">
                  <span
                    className={`badge text-[10px] ${
                      c.risk_score > 70
                        ? 'badge-red'
                        : c.risk_score > 40
                        ? 'badge-yellow'
                        : 'badge-green'
                    }`}
                  >
                    Risk: {c.risk_score}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1 uppercase font-medium">
                    {c.segment}
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-3 border-t border-surface-800 text-xs text-slate-400">
                <div className="flex items-center gap-2 truncate">
                  <Mail size={12} className="text-slate-500 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-slate-500 shrink-0" />
                  <span>{c.phone}</span>
                </div>
              </div>

              {c.notes && (
                <div className="mt-3 p-2 bg-surface-950 rounded-lg text-[11px] text-amber-300/80 border border-surface-800">
                  <span className="font-semibold">Memory note:</span> {c.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
