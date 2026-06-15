import type { HomelabService, Node } from '../../types/status'

const STATUS_STYLES = {
  up:      { pill: 'bg-status-up/10 text-status-up',           dot: 'bg-status-up' },
  down:    { pill: 'bg-status-down/10 text-status-down',       dot: 'bg-status-down' },
  unknown: { pill: 'bg-status-unknown/10 text-status-unknown', dot: 'bg-status-unknown' },
}

export default function ServiceGrid({ services, nodes }: { services: HomelabService[]; nodes: Node[] }) {
  const label = (id: string) => nodes.find(n => n.id === id)?.label ?? id
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {services.map(svc => {
        const s = STATUS_STYLES[svc.status]
        return (
          <div key={svc.name} className="bg-tfr-card border border-tfr-border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                <p className="font-medium text-white text-sm truncate">{svc.name}</p>
                {svc.tunnel && <span className="text-xs text-tfr-cyan/70 shrink-0">tunnel</span>}
              </div>
              <p className="text-xs text-tfr-muted mt-0.5 truncate">{label(svc.node)}{svc.note && ` · ${svc.note}`}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.pill}`}>{svc.status}</span>
              {svc.latency_ms !== undefined && <span className="text-xs text-tfr-muted">{svc.latency_ms}ms</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
