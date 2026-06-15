export default function Header({ generatedAt, loading, onRefresh }: { generatedAt?: string; loading: boolean; onRefresh: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-tfr-border bg-tfr-dark/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-xl tracking-tight text-tfr-cyan">TFR</span>
          <span className="text-tfr-border text-lg">|</span>
          <span className="text-sm font-medium text-white/70 hidden sm:block">Command Center</span>
        </div>
        <div className="flex items-center gap-4">
          {generatedAt && <span className="text-xs text-tfr-muted hidden md:block">Updated {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          <button onClick={onRefresh} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-tfr-border rounded-md hover:border-tfr-cyan/40 hover:text-tfr-cyan transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
    </header>
  )
}
