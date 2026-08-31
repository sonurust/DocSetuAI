import type { Approval } from '@docsetuai/types';

interface ApprovalCardProps {
  approval: Approval;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  loading?: boolean;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ApprovalCard({ approval, onApprove, onReject, loading }: ApprovalCardProps) {
  const { payload, status } = approval;
  const isPending = status === 'pending';

  return (
    <div className={`card animate-fade-in ${!isPending ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500">{approval.id.slice(0, 12)}</span>
            <span className={`badge ${status === 'approved' ? 'badge-green' : status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
              {status}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-100">{payload.customer.company}</h3>
          <p className="text-xs text-slate-400">{payload.customer.email}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-slate-100">
            {formatCurrency(payload.invoice.amount, payload.invoice.currency)}
          </div>
          <div className="text-xs text-red-400">{payload.invoice.days_overdue} days overdue</div>
        </div>
      </div>

      {/* Invoice ref */}
      <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
        <span>Invoice</span>
        <span className="font-mono text-slate-400">{payload.invoice.id}</span>
        <span>·</span>
        <span className="capitalize">{payload.channel}</span>
      </div>

      {/* Message preview */}
      <div className="bg-surface-800 rounded-lg p-3 mb-4 border border-surface-700">
        <p className="text-xs text-slate-400 mb-1.5 font-medium">Proposed message:</p>
        <p className="text-xs text-slate-300 whitespace-pre-line line-clamp-5">
          {payload.message}
        </p>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2">
          <button
            id={`approve-${approval.id}`}
            onClick={() => onApprove?.(approval.id)}
            disabled={loading}
            className="btn-success flex-1 justify-center"
          >
            Approve & Send
          </button>
          <button
            id={`reject-${approval.id}`}
            onClick={() => onReject?.(approval.id)}
            disabled={loading}
            className="btn-danger"
          >
            Reject
          </button>
        </div>
      )}

      {!isPending && (
        <div className="text-xs text-slate-500">
          {status === 'approved' ? '✓ Approved' : '✗ Rejected'}
          {approval.approved_by && ` by ${approval.approved_by}`}
          {approval.approved_at && ` · ${new Date(approval.approved_at).toLocaleTimeString()}`}
        </div>
      )}
    </div>
  );
}
