import { useStatus } from './hooks/useStatus'
import Header from './components/Header'
import Section from './components/Section'
import NodeCard from './components/nodes/NodeCard'
import PeerTable from './components/wireguard/PeerTable'
import WorkerCard from './components/pipeline/WorkerCard'
import ContentCatalogBar from './components/pipeline/ContentCatalogBar'
import WorkflowTable from './components/n8n/WorkflowTable'
import ServiceGrid from './components/homelab/ServiceGrid'
import LanWatchtowerCard from './components/lan/LanWatchtowerCard'
import PullRequestTable from './components/github/PullRequestTable'
import TaskTrackerTable from './components/tasks/TaskTrackerTable'
import ObservabilityCard from './components/observability/ObservabilityCard'

export default function App() {
  const { data, error, loading, stale, refetch } = useStatus()

  return (
    <div className="min-h-screen bg-tfr-dark font-body">
      <Header generatedAt={data?.generated_at} loading={loading} onRefresh={refetch} />

      {stale && error && (
        <div className="mx-4 mt-2 px-4 py-2 bg-status-unknown/10 border border-status-unknown/30 rounded text-status-unknown text-sm">
          API unreachable — showing last known state. {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center h-64 text-tfr-muted text-sm">Loading status…</div>
      )}

      {!loading && error && !data && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-status-down text-sm">{error}</p>
          <button onClick={refetch} className="px-4 py-1.5 text-sm border border-tfr-border rounded hover:border-tfr-cyan/50 transition-colors">Retry</button>
        </div>
      )}

      {data && (
        <main className="max-w-7xl mx-auto px-4 pb-16 space-y-8 mt-6">
          <Section title="Mesh Nodes" count={data.nodes.length}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.nodes.map(node => (
                <NodeCard key={node.id} node={node} peer={data.wireguard.peers.find(p => p.node_id === node.id)} />
              ))}
            </div>
          </Section>

          <Section title="WireGuard Mesh" subtitle={`Hub: ${data.wireguard.hub} (10.10.0.1)`}>
            <PeerTable peers={data.wireguard.peers} nodes={data.nodes} />
          </Section>

          <Section title="TFR Pipeline" subtitle="Cloudflare Workers · Content Catalog">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {data.tfr_pipeline.workers.map(w => <WorkerCard key={w.name} worker={w} />)}
            </div>
            <ContentCatalogBar stats={data.tfr_pipeline.content_catalog} />
          </Section>

          <Section title="n8n Workflows" subtitle={data.n8n.reachable ? data.n8n.host : `${data.n8n.host} — unreachable`} status={data.n8n.reachable ? 'up' : 'down'}>
            <WorkflowTable workflows={data.n8n.workflows} />
          </Section>

          {data.observability && (
            <Section title="Platform Observability" subtitle="Prometheus · public-safe aggregate">
              <ObservabilityCard data={data.observability} />
            </Section>
          )}

          <Section title="Homelab Services">
            <ServiceGrid services={data.homelab.services} nodes={data.nodes} />
          </Section>

          {data.lan_watchtower && (
            <Section title="Home Network" subtitle="LAN Watchtower · Pi 500 probe">
              <LanWatchtowerCard data={data.lan_watchtower} />
            </Section>
          )}

          {data.github && (
            <Section title="Open Pull Requests" subtitle="Website · Automations" count={data.github.prs.length}>
              <PullRequestTable prs={data.github.prs} />
            </Section>
          )}

          {data.task_tracker && (
            <Section title="Task Tracker" subtitle="Master Task Tracker · open tasks" count={data.task_tracker.tasks.length}>
              <TaskTrackerTable tasks={data.task_tracker.tasks} />
            </Section>
          )}

          <Section title="Notion Databases">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.notion.databases.map(db => (
                <div key={db.id} className="bg-tfr-card border border-tfr-border rounded-lg px-4 py-3">
                  <p className="text-xs text-tfr-muted font-medium uppercase tracking-wider mb-1">{db.name}</p>
                  <p className="text-2xl font-display font-bold text-white">{db.record_count?.toLocaleString() ?? '—'}</p>
                  {db.last_updated && <p className="text-xs text-tfr-muted mt-1">Updated {formatRelative(db.last_updated)}</p>}
                </div>
              ))}
            </div>
          </Section>
        </main>
      )}
    </div>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
