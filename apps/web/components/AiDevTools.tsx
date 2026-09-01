'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import type { AiLogEntry } from '@docsetuai/types';
import {
  Terminal,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Check,
  Search,
  Sparkles,
  Bot,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export function AiDevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [logs, setLogs] = useState<AiLogEntry[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'system'>('request');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch AI logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.getAiLogs();
      if (res && res.data) {
        setLogs(res.data);
        if (res.data.length > 0) {
          setSelectedLogId((prev) => (prev && res.data.some((l) => l.id === prev) ? prev : res.data[0]!.id));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch AI logs:', e);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, [fetchLogs, autoRefresh]);

  const handleClearLogs = async () => {
    try {
      await api.clearAiLogs();
      setLogs([]);
      setSelectedLogId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to clear logs');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAgent = agentFilter === 'all' || log.agent === agentFilter;
      const matchesSearch =
        searchQuery === '' ||
        log.agent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(log.request_payload).toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(log.response_payload).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesAgent && matchesSearch;
    });
  }, [logs, agentFilter, searchQuery]);

  const selectedLog = useMemo(() => {
    return logs.find((l) => l.id === selectedLogId) || filteredLogs[0] || null;
  }, [logs, selectedLogId, filteredLogs]);

  const uniqueAgents = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.agent)));
  }, [logs]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 font-sans ${
        isOpen
          ? isFullScreen
            ? 'h-screen bg-surface-950/98 backdrop-blur-xl border-t border-brand-500/40 shadow-2xl'
            : 'h-[480px] bg-surface-950/95 backdrop-blur-md border-t border-brand-500/30 shadow-2xl'
          : 'h-10 bg-surface-950/90 backdrop-blur border-t border-surface-800'
      }`}
    >
      {/* ── Header / Minimized Bar ────────────────────────────────────────── */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-surface-800/80 select-none bg-surface-900/60">
        <div
          className="flex items-center gap-3 cursor-pointer flex-1"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Terminal size={14} className="text-brand-400" />
              Gemini 3.6 Flash Developer Inspector
            </span>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-brand-950/80 border border-brand-500/30 text-brand-300">
            {logs.length} {logs.length === 1 ? 'call' : 'calls'}
          </span>

          {logs.length > 0 && (
            <span className="hidden sm:inline-block text-[11px] text-slate-500 truncate max-w-md">
              Latest: <span className="text-slate-300 font-mono">{logs[0]?.agent}</span> →{' '}
              <span className="text-brand-400 font-mono">{logs[0]?.action}</span> (
              {logs[0]?.latency_ms}ms)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                  autoRefresh
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : 'bg-surface-800 border-surface-700 text-slate-400'
                }`}
                title="Toggle live telemetry auto-refresh"
              >
                {autoRefresh ? '● Live' : '○ Paused'}
              </button>

              <button
                type="button"
                onClick={handleClearLogs}
                className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-surface-800 transition-colors"
                title="Clear all recorded AI logs"
              >
                <Trash2 size={13} />
              </button>

              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-surface-800 transition-colors"
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Inspector'}
              >
                {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-surface-800 transition-colors"
          >
            {isOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>

      {/* ── Expanded Content Body ─────────────────────────────────────────── */}
      {isOpen && (
        <div className="flex h-[calc(100%-40px)] text-xs">
          {/* Left Column: Log List & Filter */}
          <div className="w-80 md:w-96 border-r border-surface-800/80 flex flex-col bg-surface-950/60">
            {/* Search & Agent Filter Bar */}
            <div className="p-2.5 border-b border-surface-800/80 space-y-2 bg-surface-900/30">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter prompts, agents, responses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700/70 rounded-md pl-7 pr-2.5 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {uniqueAgents.length > 0 && (
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setAgentFilter('all')}
                    className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors ${
                      agentFilter === 'all'
                        ? 'bg-brand-600 text-white font-semibold'
                        : 'bg-surface-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({logs.length})
                  </button>
                  {uniqueAgents.map((agent) => (
                    <button
                      key={agent}
                      type="button"
                      onClick={() => setAgentFilter(agent)}
                      className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors ${
                        agentFilter === agent
                          ? 'bg-brand-600 text-white font-semibold'
                          : 'bg-surface-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {agent}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Log Entries List */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-800/50">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Bot size={24} className="mx-auto mb-2 opacity-30 text-brand-400" />
                  <p className="text-[11px]">No Gemini AI calls recorded yet.</p>
                  <p className="text-[10px] mt-1 text-slate-600">
                    Run an AI task or workflow to inspect prompt payloads in real-time.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isSelected = log.id === selectedLog?.id;
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLogId(log.id)}
                      className={`p-2.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-brand-950/40 border-l-2 border-brand-500 text-slate-100'
                          : 'hover:bg-surface-900/40 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`font-semibold font-mono text-[11px] ${
                            isSelected ? 'text-brand-300' : 'text-slate-200'
                          }`}
                        >
                          {log.agent}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                              log.status === 'success'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                                : 'bg-red-950/80 text-red-300 border border-red-800/40'
                            }`}
                          >
                            {log.status === 'success' ? '200 OK' : 'ERR'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5">
                            <Clock size={9} />
                            {log.latency_ms}ms
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        action: <span className="text-slate-400">{log.action}</span>
                      </div>
                      <div className="text-[9px] text-slate-600 mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Log Detail & Inspector */}
          <div className="flex-1 flex flex-col bg-surface-950/90 overflow-hidden">
            {selectedLog ? (
              <>
                {/* Inspector Header & Metadata */}
                <div className="p-3 border-b border-surface-800/80 bg-surface-900/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-brand-950 border border-brand-700/50 rounded font-mono text-brand-300 text-[11px] font-bold">
                      {selectedLog.model}
                    </span>
                    <span className="text-slate-300 font-semibold">{selectedLog.agent}</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-slate-400 font-mono">{selectedLog.action}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          JSON.stringify(
                            {
                              model: selectedLog.model,
                              agent: selectedLog.agent,
                              action: selectedLog.action,
                              system_instruction: selectedLog.system_instruction,
                              request: selectedLog.request_payload,
                              response: selectedLog.response_payload,
                              latency_ms: selectedLog.latency_ms,
                            },
                            null,
                            2,
                          ),
                        )
                      }
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors text-[10px]"
                    >
                      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      {copied ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                </div>

                {/* Sub-tabs: Request, Response, System */}
                <div className="flex border-b border-surface-800/80 bg-surface-950 px-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('request')}
                    className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
                      activeTab === 'request'
                        ? 'border-brand-500 text-brand-300'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Request Prompt &amp; Params
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('response')}
                    className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
                      activeTab === 'response'
                        ? 'border-brand-500 text-brand-300'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Gemini Response Output
                  </button>
                  {selectedLog.system_instruction && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('system')}
                      className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
                        activeTab === 'system'
                          ? 'border-brand-500 text-brand-300'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      System Instruction
                    </button>
                  )}
                </div>

                {/* Tab Content Display */}
                <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed select-text">
                  {activeTab === 'request' && (
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-sans font-bold">
                          Input Payload
                        </div>
                        <pre className="p-3 bg-surface-900 border border-surface-800 rounded-lg text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.request_payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {activeTab === 'response' && (
                    <div className="space-y-4">
                      {selectedLog.error ? (
                        <div>
                          <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1 font-sans font-bold flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Execution Error
                          </div>
                          <pre className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 overflow-x-auto whitespace-pre-wrap">
                            {selectedLog.error}
                          </pre>
                        </div>
                      ) : (
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-sans font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-400" />
                            Model Output ({selectedLog.latency_ms}ms)
                          </div>
                          <pre className="p-3 bg-surface-900 border border-surface-800 rounded-lg text-brand-300 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(selectedLog.response_payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'system' && selectedLog.system_instruction && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-sans font-bold">
                        Agent System Prompt
                      </div>
                      <pre className="p-3 bg-surface-900 border border-surface-800 rounded-lg text-amber-200/90 overflow-x-auto whitespace-pre-wrap">
                        {selectedLog.system_instruction}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-center p-6">
                <div>
                  <Sparkles size={28} className="mx-auto mb-2 text-brand-500/40" />
                  <p>Select an AI call from the left to inspect prompts &amp; model responses.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
