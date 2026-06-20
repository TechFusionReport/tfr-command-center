import { LanWatchtower, LanCheck } from '../../types/status'

interface Props {
  data: LanWatchtower
}

function signalLabel(dbm: number | null): string {
  if (dbm === null) return '—'
  if (dbm >= -60) return `${dbm} dBm (good)`
  if (dbm >= -70) return `${dbm} dBm (fair)`
  return `${dbm} dBm (weak)`
}

function signalColor(dbm: number | null): string {
  if (dbm === null) return 'text-tfr-muted'
  if (dbm >= -60) return 'text-status-up'
  if (dbm >= -70) return 'text-status-unknown'
  return 'text-status-down'
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function CheckRow({ check }: { check: LanCheck }) {
  const dot = check.ok
    ? 'bg-status-up'
    : check.required
    ? 'bg-status-down'
    : 'bg-status-unknown'

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-tfr-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-sm text-white font-mono">{check.name}</span>
        {!check.required && (
          <span className="text-xs text-tfr-muted">(optional)</span>
        )}
      </div>
      <span className="text-xs text-tfr-muted tabular-nums">
        {check.latency_avg_ms !== null ? `${check.latency_avg_ms} ms` : check.ok ? '✓' : '✗'}
      </span>
    </div>
  )
}

export default function LanWatchtowerCard({ data }: Props) {
  const overallOk = data.probe_online && data.healthy !== false && !data.incident_open

  const bannerColor = !data.probe_online
    ? 'bg-status-unknown/10 border-status-unknown/30 text-status-unknown'
    : data.incident_open
    ? 'bg-status-down/10 border-status-down/30 text-status-down'
    : data.healthy === false
    ? 'bg-status-down/10 border-status-down/30 text-status-down'
    : 'bg-status-up/10 border-status-up/30 text-status-up'

  const bannerText = !data.probe_online
    ? 'Probe offline'
    : data.incident_open
    ? `Incident open · ${data.failure_count} consecutive failure${data.failure_count !== 1 ? 's' : ''}`
    : data.healthy === false
    ? `Degraded · ${data.failure_count} failure${data.failure_count !== 1 ? 's' : ''}`
    : 'Healthy'

  return (
    <div className="bg-tfr-card border border-tfr-border rounded-lg overflow-hidden">
      {/* Status banner */}
      <div className={`px-4 py-2 border-b flex items-center justify-between ${bannerColor}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${overallOk ? 'bg-status-up animate-pulse' : 'bg-current'}`} />
          <span className="text-sm font-semibold">{bannerText}</span>
        </div>
        {data.probe && (
          <span className="text-xs opacity-70 font-mono">{data.probe}</span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Meta row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-tfr-muted uppercase tracking-wider mb-1">Last report</p>
            <p className="text-sm text-white">{formatRelative(data.last_seen)}</p>
          </div>
          <div>
            <p className="text-xs text-tfr-muted uppercase tracking-wider mb-1">Wi-Fi signal</p>
            <p className={`text-sm font-mono ${signalColor(data.wifi_signal_dbm)}`}>
              {signalLabel(data.wifi_signal_dbm)}
            </p>
          </div>
        </div>

        {/* Checks */}
        {data.checks.length > 0 && (
          <div>
            <p className="text-xs text-tfr-muted uppercase tracking-wider mb-2">Checks</p>
            <div>
              {data.checks.map(c => (
                <CheckRow key={c.name} check={c} />
              ))}
            </div>
          </div>
        )}

        {data.checks.length === 0 && (
          <p className="text-xs text-tfr-muted italic">No probe data yet — waiting for first report.</p>
        )}
      </div>
    </div>
  )
}
