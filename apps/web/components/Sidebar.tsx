'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Zap,
  CheckSquare,
  Activity,
  Users,
  FileText,
  BotMessageSquare,
  Info,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/tasks/new', label: 'New Task', icon: Zap },
  { href: '/approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/activity', label: 'Observability', icon: Activity },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/about', label: 'About & Cloud', icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-surface-900 border-r border-surface-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-surface-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <BotMessageSquare className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">DocSetuAI</div>
            <div className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Operations Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (pathname.startsWith(href) && href !== '/dashboard');
          return (
            <Link
              key={href}
              href={href}
              className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Icon size={16} className={isActive ? 'text-brand-400' : 'text-slate-500'} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-800">
        <div className="text-xs text-slate-500">
          <span className="font-mono text-emerald-400 font-semibold">cloud</span> mode · Gemini 3.6 Flash
        </div>
      </div>
    </aside>
  );
}
