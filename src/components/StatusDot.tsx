import type { ServiceStatus, WorkerStatus } from '../types/status'

type AnyStatus = ServiceStatus | WorkerStatus | 'connected' | 'disconnected'

const COLOR: Record<AnyStatus, string> = {
  up: 'bg-status-up', healthy: 'bg-status-up', connected: 'bg-status-up',
  down: 'bg-status-down', error: 'bg-status-down', disconnected: 'bg-status-down',
  unknown: 'bg-status-unknown',
}

const LABEL: Record<AnyStatus, string> = {
  up: 'up', healthy: 'healthy', connected: 'connected',
  down: 'down', error: 'error', disconnected: 'disconnected', unknown: 'unknown',
}

export default function StatusDot({ status, pulse = false, size = 'sm' }: { status: AnyStatus; pulse?: boolean; size?: 'sm' | 'md' }) {
  const color = COLOR[status] ?? 'bg-status-idle'
  const sz    = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`relative flex ${sz}`}>
        {pulse && status === 'up' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-40`} />}
        <span className={`relative inline-flex rounded-full ${sz} ${color}`} />
      </span>
      <span className="text-xs font-medium text-tfr-muted capitalize">{LABEL[status] ?? status}</span>
    </span>
  )
}
