import type { CloudflareWorker } from '../../types/status'

const STATUS_STYLES = {
  healthy: { pill: 'bg-status-up/10 text-status-up',           dot: 'bg-status-up' },
  error:   { pill: 'bg-status-down/10 text-status-down',       dot: 'bg-status-down' },
  unknown: { pill: 'bg-status-unknown/10 text-status-unknown', dot: 'bg-status-unknown' },
}

export default function WorkerCard({ worker }: { worker: CloudflareWorker }) {
  const styles = STATUS_STYLES[worker.status]
  return (
    <div className="bg-tfr-card border border-tfr-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-white font-medium truncate">{worker.name}</span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${styles.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
          {worker.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-tfr-muted mb-0.5">Req / 24h</p>
          <p className="text-lg font-display font-bold text-white">{worker.requests_24h?.toLocaleString() ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-tfr-muted mb-0.5">Error rate</p>
          <p className={`text-lg font-display font-bold ${
            (worker.error_rate ?? 0) > 0.05 ? 'text-status-down' :
            (worker.error_rate ?? 0) > 0    ? 'text-status-unknown' : 'text-white'
          }`}>
            {worker.error_rate !== undefined ? `${(worker.error_rate * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>
      {worker.last_error && (
        <div className="bg-status-down/5 border border-status-down/20 rounded px-3 py-2">
          <p className="text-xs text-status-down font-medium mb-0.5">Last error</p>
          <p className="text-xs text-white/60 break-words">{worker.last_error}</p>
        </div>
      )}
      {worker.last_deployed && (
        <p className="text-xs text-tfr-muted mt-auto">Deployed {fmtRelative(worker.last_deployed)}</p>
      )}
    </div>
  )
}

function fmtRelative(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
