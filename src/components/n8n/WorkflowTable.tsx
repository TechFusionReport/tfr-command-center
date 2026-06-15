import type { N8NWorkflow } from '../../types/status'

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-status-up/10 text-status-up',
  error:   'bg-status-down/10 text-status-down',
  running: 'bg-tfr-cyan/10 text-tfr-cyan',
  waiting: 'bg-tfr-muted/10 text-tfr-muted',
}

export default function WorkflowTable({ workflows }: { workflows: N8NWorkflow[] }) {
  return (
    <div className="bg-tfr-card border border-tfr-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-tfr-border text-xs text-tfr-muted uppercase tracking-wider">
            <th className="text-left px-4 py-2.5 font-medium">Workflow</th>
            <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Active</th>
            <th className="text-left px-4 py-2.5 font-medium">Last Run</th>
            <th className="text-left px-4 py-2.5 font-medium">Result</th>
            <th className="text-right px-4 py-2.5 font-medium hidden md:table-cell">Duration</th>
          </tr>
        </thead>
        <tbody>
          {workflows.map(wf => (
            <tr key={wf.id} className="border-b border-tfr-border/50 last:border-0 hover:bg-tfr-card2/50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-white text-sm">{wf.name}</p>
                {wf.last_execution?.error_message && <p className="text-xs text-status-down mt-0.5 truncate max-w-xs">{wf.last_execution.error_message}</p>}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wf.active ? 'bg-status-up/10 text-status-up' : 'bg-tfr-muted/10 text-tfr-muted'}`}>
                  {wf.active ? 'active' : 'inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-tfr-muted text-xs">
                {wf.last_execution ? fmtRelative(wf.last_execution.started_at) : '—'}
              </td>
              <td className="px-4 py-3">
                {wf.last_execution
                  ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[wf.last_execution.status] ?? ''}`}>{wf.last_execution.status}</span>
                  : <span className="text-xs text-tfr-muted">—</span>}
              </td>
              <td className="px-4 py-3 text-tfr-muted text-xs text-right hidden md:table-cell">
                {wf.last_execution?.duration_ms !== undefined ? fmtDuration(wf.last_execution.duration_ms) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}
