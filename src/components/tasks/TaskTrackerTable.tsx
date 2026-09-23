import type { TaskTrackerItem } from '../../types/status'

const STATUS_STYLES: Record<string, string> = {
  'Not Started': 'bg-tfr-muted/10 text-tfr-muted',
  'In Progress': 'bg-tfr-cyan/10 text-tfr-cyan',
  'On Hold':     'bg-status-unknown/10 text-status-unknown',
  'Blocked':     'bg-status-down/10 text-status-down',
}

const RISK_STYLES: Record<string, string> = {
  Low:    'bg-status-up/10 text-status-up',
  Medium: 'bg-status-unknown/10 text-status-unknown',
  High:   'bg-status-down/10 text-status-down',
}

export default function TaskTrackerTable({ tasks }: { tasks: TaskTrackerItem[] }) {
  if (tasks.length === 0) {
    return (
      <div className="bg-tfr-card border border-tfr-border rounded-lg px-4 py-6 text-center text-tfr-muted text-sm">
        No open tasks.
      </div>
    )
  }

  return (
    <div className="bg-tfr-card border border-tfr-border rounded-lg overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-tfr-border text-xs text-tfr-muted uppercase tracking-wider">
            <th className="text-left px-4 py-2.5 font-medium">Task</th>
            <th className="text-left px-4 py-2.5 font-medium">Status</th>
            <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Owner</th>
            <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Active Agent</th>
            <th className="text-left px-4 py-2.5 font-medium">Risk</th>
            <th className="text-right px-4 py-2.5 font-medium hidden md:table-cell">PR</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.id} className="border-b border-tfr-border/50 last:border-0 hover:bg-tfr-card2/50 transition-colors">
              <td className="px-4 py-3">
                <a href={task.url} target="_blank" rel="noreferrer" className="font-medium text-white text-sm hover:text-tfr-cyan transition-colors">
                  {task.task ?? 'Untitled'}
                </a>
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${task.status ? STATUS_STYLES[task.status] ?? 'bg-tfr-muted/10 text-tfr-muted' : 'bg-tfr-muted/10 text-tfr-muted'}`}>
                  {task.status ?? 'unknown'}
                </span>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-tfr-muted text-xs">{task.owner ?? '—'}</td>
              <td className="px-4 py-3 hidden sm:table-cell text-tfr-muted text-xs">{task.active_agent ?? 'Unclaimed'}</td>
              <td className="px-4 py-3">
                {task.risk
                  ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_STYLES[task.risk] ?? 'bg-tfr-muted/10 text-tfr-muted'}`}>{task.risk}</span>
                  : <span className="text-xs text-tfr-muted">—</span>}
              </td>
              <td className="px-4 py-3 text-right hidden md:table-cell">
                {task.pr && /^https?:\/\//.test(task.pr)
                  ? <a href={task.pr} target="_blank" rel="noreferrer" className="text-tfr-cyan hover:underline text-xs">PR ↗</a>
                  : <span className="text-tfr-muted text-xs">{task.pr ?? '—'}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
