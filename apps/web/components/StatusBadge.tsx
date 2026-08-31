import type { TaskStatus, ApprovalStatus, AgentStatus } from '@docsetuai/types';

interface StatusBadgeProps {
  status: TaskStatus | ApprovalStatus | AgentStatus | string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dot?: string }> = {
  // Task statuses
  pending:           { label: 'Pending',           className: 'badge-gray', dot: 'bg-slate-500' },
  planning:          { label: 'Planning',           className: 'badge-blue', dot: 'bg-brand-400' },
  executing:         { label: 'Executing',          className: 'badge-blue', dot: 'bg-brand-400' },
  awaiting_approval: { label: 'Awaiting Approval',  className: 'badge-yellow', dot: 'bg-amber-400' },
  completed:         { label: 'Completed',          className: 'badge-green', dot: 'bg-emerald-400' },
  failed:            { label: 'Failed',             className: 'badge-red', dot: 'bg-red-400' },
  cancelled:         { label: 'Cancelled',          className: 'badge-gray', dot: 'bg-slate-500' },
  // Approval statuses
  approved:          { label: 'Approved',           className: 'badge-green' },
  rejected:          { label: 'Rejected',           className: 'badge-red' },
  // Agent statuses
  idle:              { label: 'Idle',               className: 'badge-gray' },
  running:           { label: 'Running',            className: 'badge-blue' },
  // Invoice
  overdue:           { label: 'Overdue',            className: 'badge-red' },
  paid:              { label: 'Paid',               className: 'badge-green' },
  sent:              { label: 'Sent',               className: 'badge-blue' },
  draft:             { label: 'Draft',              className: 'badge-gray' },
  partial:           { label: 'Partial',            className: 'badge-yellow' },
  success:           { label: 'Success',            className: 'badge-green' },
  active:            { label: 'Active',             className: 'badge-blue' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge-gray' };
  const isAnimated = status === 'executing' || status === 'planning' || status === 'running';

  return (
    <span className={`${config.className} ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : ''}`}>
      {config.dot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${config.dot} ${isAnimated ? 'animate-pulse' : ''}`}
        />
      )}
      {config.label}
    </span>
  );
}
