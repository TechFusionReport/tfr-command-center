import type { ContentCatalog } from '../../types/status'

export default function ContentCatalogBar({ stats }: { stats: ContentCatalog }) {
  const pct = (n: number) => stats.total > 0 ? (n / stats.total) * 100 : 0
  return (
    <div className="bg-tfr-card border border-tfr-border rounded-lg px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-tfr-muted font-medium uppercase tracking-wider">Content Catalog v2</span>
        <span className="text-xs text-tfr-muted">{stats.total.toLocaleString()} total</span>
      </div>
      <div className="h-1.5 bg-tfr-border rounded-full overflow-hidden flex mb-3">
        <div className="bg-status-up h-full transition-all"      style={{ width: `${pct(stats.published)}%` }} />
        <div className="bg-status-unknown h-full transition-all" style={{ width: `${pct(stats.in_review)}%` }} />
        <div className="bg-tfr-muted/40 h-full transition-all"  style={{ width: `${pct(stats.pending)}%` }} />
      </div>
      <div className="flex gap-4 flex-wrap">
        {([['Published', stats.published, 'text-status-up'], ['In review', stats.in_review, 'text-status-unknown'], ['Pending', stats.pending, 'text-tfr-muted']] as const).map(([label, value, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`text-lg font-display font-bold ${color}`}>{value}</span>
            <span className="text-xs text-tfr-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
