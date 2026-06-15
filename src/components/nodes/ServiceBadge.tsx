import type { Service } from '../../types/status'

const STATUS_COLOR = { up: 'text-status-up', down: 'text-status-down', unknown: 'text-status-unknown' }
const DOT_COLOR    = { up: 'bg-status-up',   down: 'bg-status-down',   unknown: 'bg-status-unknown' }

export default function ServiceBadge({ service }: { service: Service }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-tfr-border/50 last:border-0 group">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[service.status]}`} />
        <span className="text-sm text-white/80 truncate">{service.name}</span>
        {service.note && <span className="text-xs text-tfr-muted truncate hidden group-hover:block">— {service.note}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {service.latency_ms !== undefined && <span className="text-xs text-tfr-muted">{service.latency_ms}ms</span>}
        <span className={`text-xs font-medium ${STATUS_COLOR[service.status]}`}>{service.status}</span>
      </div>
    </div>
  )
}
