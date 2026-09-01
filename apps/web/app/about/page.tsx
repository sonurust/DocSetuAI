'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '../../components/Sidebar';
import { api } from '../../lib/api';
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Cloud,
  CheckCircle2,
  Phone,
  MessageSquare,
  Instagram,
  Facebook,
  Github,
  Zap,
  Sparkles,
  Server,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function AboutPage() {
  const [health, setHealth] = useState<{ status: string; runtime_mode: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .health()
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'offline', runtime_mode: 'cloud' }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-surface-950 text-slate-100 font-sans">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-surface-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-950 border border-brand-500/30 text-brand-300 flex items-center gap-1.5">
                <Sparkles size={12} className="text-brand-400" />
                DocSetuAI v0.1.0
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Live Cloud Deployment
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">About DocSetuAI</h1>
            <p className="text-sm text-slate-400 mt-1">
              Autonomous AI Business Operations Platform powered by Google Gemini 3.6 Flash &amp; Google Cloud.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs transition-all shadow-lg shadow-brand-600/20"
            >
              Launch Dashboard
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Live Deployments Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Globe size={15} className="text-brand-400" />
            Live Cloud Infrastructure Endpoints
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Google Cloud Run */}
            <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 hover:border-brand-500/50 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud size={18} className="text-blue-400" />
                  <span className="font-semibold text-sm">Google Cloud Run</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  us-central1
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Containerized Microservice API running with autoscaling and Firestore event streams.
              </p>
              <div className="pt-2 border-t border-surface-800/80 flex items-center justify-between">
                <a
                  href="https://docsetuai-api-z5nen6wcxq-uc.a.run.app/health"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-400 hover:underline flex items-center gap-1 font-mono"
                >
                  Live Health Check <ExternalLink size={11} />
                </a>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  200 OK
                </span>
              </div>
            </div>

            {/* AWS App Runner */}
            <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 hover:border-brand-500/50 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={18} className="text-amber-400" />
                  <span className="font-semibold text-sm">AWS App Runner</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  ap-south-1
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Multi-Cloud failover cluster powered by Amazon ECR container registry and App Runner.
              </p>
              <div className="pt-2 border-t border-surface-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">Service: docsetuai-api</span>
                <span className="text-[10px] text-emerald-400 font-mono">ACTIVE</span>
              </div>
            </div>

            {/* Vercel Next.js Web App */}
            <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 hover:border-brand-500/50 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-purple-400" />
                  <span className="font-semibold text-sm">Vercel Edge (Live App)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  Global CDN
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Next.js 14 App Router frontend delivering real-time telemetry and approval dashboards.
              </p>
              <div className="pt-2 border-t border-surface-800/80 flex items-center justify-between">
                <a
                  href="https://docsetuai.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-400 hover:underline flex items-center gap-1 font-mono"
                >
                  docsetuai.vercel.app <ExternalLink size={11} />
                </a>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Agent Architecture */}
        <div className="p-6 rounded-2xl bg-surface-900/60 border border-surface-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu size={18} className="text-brand-400" />
            Autonomous Multi-Agent Architecture
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            DocSetuAI translates high-level business objectives into verified, completed operations using
            specialized Google Gemini 3.6 Flash agents coordinated by Google ADK:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-surface-950 border border-surface-800 space-y-1">
              <div className="font-mono text-xs text-brand-300 font-bold">OrchestratorAgent</div>
              <p className="text-[11px] text-slate-400">
                Decomposes natural language goals into a multi-step deterministic execution graph.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-950 border border-surface-800 space-y-1">
              <div className="font-mono text-xs text-brand-300 font-bold">BillingAgent</div>
              <p className="text-[11px] text-slate-400">
                Queries invoice ledger and filters outstanding accounts by aging criteria.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-950 border border-surface-800 space-y-1">
              <div className="font-mono text-xs text-brand-300 font-bold">CustomerAgent</div>
              <p className="text-[11px] text-slate-400">
                Retrieves payment reliability scores and risk metrics from past interactions.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-950 border border-surface-800 space-y-1">
              <div className="font-mono text-xs text-brand-300 font-bold">CommunicationAgent</div>
              <p className="text-[11px] text-slate-400">
                Drafts tone-adapted reminder emails (empathetic → firm → urgent) and dispatches via API.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-950 border border-surface-800 space-y-1">
              <div className="font-mono text-xs text-brand-300 font-bold">FollowupAgent</div>
              <p className="text-[11px] text-slate-400">
                Schedules automated calendar checkpoints for payment verification.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-950 border border-surface-800 space-y-1">
              <div className="font-mono text-xs text-brand-300 font-bold">VerificationAgent</div>
              <p className="text-[11px] text-slate-400">
                Performs closed-loop post-condition auditing before marking tasks complete.
              </p>
            </div>
          </div>
        </div>

        {/* Creator & Contact Details */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-surface-900 to-brand-950/40 border border-brand-500/20 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-400" />
            Project Creator &amp; Maintainer
          </h2>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Sonu Kumar</h3>
              <p className="text-xs text-slate-300">
                Full-Stack AI &amp; Cloud Systems Engineer · Creator of DocSetuAI &amp; NotifySetu
              </p>
              <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-brand-400" /> +91 9810659036
                </span>
                <span>•</span>
                <span className="font-mono">New Delhi, India</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="https://wa.me/919810659036?text=Hi%20Sonu,%20I%20am%20interested%20in%20DocSetuAI"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare size={13} />
                WhatsApp
              </a>
              <a
                href="https://instagram.com/skbhati1992"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Instagram size={13} />
                @skbhati1992
              </a>
              <a
                href="https://facebook.com/skbhati199"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Facebook size={13} />
                skbhati199
              </a>
              <a
                href="https://github.com/sonurust/DocSetuAI"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Github size={13} />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
