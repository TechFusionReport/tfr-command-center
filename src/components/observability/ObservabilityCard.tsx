import type { PublicObservability } from '../../types/status'

export default function ObservabilityCard({ data }: { data: PublicObservability }) {
  const statusClass = data.status === 'healthy'
    ? 'text-status-up'
    : data.status === 'degraded'
      ? 'text-status-unknown'
      : 'text-status-down'

  return (
    <div className="bg-tfr-card border border-tfr-border rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-tfr-muted">Prometheus</p>
          <p className={`font-display text-xl font-bold capitalize ${statusClass}`}>{data.status}</p>
        </div>
        <p className="text-xs text-tfr-muted">Sanitized aggregate</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Targets" value={data.targets.total} />
        <Metric label="Healthy" value={data.targets.healthy} />
        <Metric label="Alerts" value={data.alerts.firing} />
      </div>
      {data.components.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {data.components.map(component => (
            <span key={component.name} className="text-xs border border-tfr-border rounded px-2 py-1">
              {component.name} · {component.status}
            </span>
          ))}
        </div>
      )}
      {data.status === 'unavailable' && (
        <p className="text-xs text-tfr-muted mt-3">Metrics are unavailable; health is not being assumed.</p>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string, value: number }) {
  return (
    <div>
      <p className="text-xs text-tfr-muted">{label}</p>
      <p className="text-2xl font-display font-bold text-white">{value}</p>
    </div>
  )
}
