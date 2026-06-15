import type { ReactNode } from 'react'
import type { ServiceStatus } from '../types/status'
import StatusDot from './StatusDot'

export default function Section({ title, subtitle, count, status, children }: { title: string; subtitle?: string; count?: number; status?: ServiceStatus; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display font-bold text-sm uppercase tracking-widest text-tfr-cyan">{title}</h2>
        {count !== undefined && <span className="text-xs px-2 py-0.5 bg-tfr-card border border-tfr-border rounded-full text-tfr-muted">{count}</span>}
        {status && <StatusDot status={status} />}
        {subtitle && <span className="text-xs text-tfr-muted ml-auto truncate hidden sm:block">{subtitle}</span>}
      </div>
      {children}
    </section>
  )
}
