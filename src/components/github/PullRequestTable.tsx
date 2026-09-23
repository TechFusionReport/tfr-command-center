import type { GitHubPR } from '../../types/status'

const RISK_STYLES: Record<string, string> = {
  Low:    'bg-status-up/10 text-status-up',
  Medium: 'bg-status-unknown/10 text-status-unknown',
  High:   'bg-status-down/10 text-status-down',
}

export default function PullRequestTable({ prs }: { prs: GitHubPR[] }) {
  if (prs.length === 0) {
    return (
      <div className="bg-tfr-card border border-tfr-border rounded-lg px-4 py-6 text-center text-tfr-muted text-sm">
        No open pull requests.
      </div>
    )
  }

  return (
    <div className="bg-tfr-card border border-tfr-border rounded-lg overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-tfr-border text-xs text-tfr-muted uppercase tracking-wider">
            <th className="text-left px-4 py-2.5 font-medium">Pull Request</th>
            <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Agent</th>
            <th className="text-left px-4 py-2.5 font-medium">Risk</th>
            <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Task</th>
            <th className="text-right px-4 py-2.5 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {prs.map(pr => (
            <tr key={`${pr.repo}-${pr.number}`} className="border-b border-tfr-border/50 last:border-0 hover:bg-tfr-card2/50 transition-colors">
              <td className="px-4 py-3">
                <a href={pr.url} target="_blank" rel="noreferrer" className="font-medium text-white text-sm hover:text-tfr-cyan transition-colors">
                  {pr.repo} #{pr.number}
                </a>
                <p className="text-xs text-tfr-muted mt-0.5 truncate max-w-xs">{pr.title}</p>
                {pr.draft && <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-tfr-muted/10 text-tfr-muted">draft</span>}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-tfr-muted text-xs">
                {pr.agent ?? '—'}
              </td>
              <td className="px-4 py-3">
                {pr.risk
                  ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_STYLES[pr.risk] ?? 'bg-tfr-muted/10 text-tfr-muted'}`}>{pr.risk}</span>
                  : <span className="text-xs text-tfr-muted">—</span>}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-tfr-muted text-xs">
                {renderTask(pr.task)}
              </td>
              <td className="px-4 py-3 text-tfr-muted text-xs text-right">
                {fmtRelative(pr.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderTask(task: string | null | undefined) {
  if (!task) return '—'
  if (/^https?:\/\//.test(task)) {
    return <a href={task} target="_blank" rel="noreferrer" className="text-tfr-cyan hover:underline">Tracker ↗</a>
  }
  return <span className="truncate max-w-[10rem] inline-block align-bottom">{task}</span>
}

function fmtRelative(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
