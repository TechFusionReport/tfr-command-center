import type { Node, WireGuardPeer } from '../../types/status'
import ServiceBadge from './ServiceBadge'

const NODE_ACCENT: Record<string, string> = {
  oracle: 'border-tfr-cyan/30', hetzner: 'border-orange-500/30', yoga: 'border-purple-500/30',
  mbp: 'border-green-500/30', pi: 'border-red-500/30', s25: 'border-yellow-500/30',
}
const NODE_ICON: Record<string, string> = {
  oracle: '🔵', hetzner: '🟠', yoga: '🟣', mbp: '🟢', pi: '🔴', s25: '🟡',
}

export default function NodeCard({ node, peer }: { node: Node; peer?: WireGuardPeer }) {
  const connected = peer ? peer.connected : node.reachable
  const accent    = NODE_ACCENT[node.id] ?? 'border-tfr-border'

  return (
    <div className={`bg-tfr-card border rounded-lg p-4 flex flex-col gap-3 ${accent}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{NODE_ICON[node.id]}</span>
            <h3 className="font-display font-bold text-white text-base leading-tight truncate">{node.label}</h3>
          </div>
          <p className="text-xs text-tfr-muted mt-0.5 truncate">{node.role}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
          connected ? 'bg-status-up/10 text-status-up' : 'bg-status-down/10 text-status-down'
        }`}>{connected ? 'online' : 'offline'}</span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="text-xs font-mono text-tfr-muted">WG {node.ip_wg}</span>
        {node.ip_public && <span className="text-xs font-mono text-tfr-muted">{node.ip_public}</span>}
      </div>

      {peer && (
        <div className="text-xs text-tfr-muted">
          {peer.latest_handshake ? `Handshake ${fmtAge(peer.latest_handshake)}` : 'No handshake recorded'}
          {peer.transfer_rx_bytes !== undefined && <span className="ml-2 text-tfr-muted/60">↓{fmtBytes(peer.transfer_rx_bytes)} ↑{fmtBytes(peer.transfer_tx_bytes ?? 0)}</span>}
        </div>
      )}

      {node.services.length > 0 ? (
        <div className="border-t border-tfr-border/50 pt-2">
          {node.services.map(s => <ServiceBadge key={s.name} service={s} />)}
        </div>
      ) : (
        <p className="text-xs text-tfr-muted italic">No services tracked</p>
      )}
    </div>
  )
}

function fmtAge(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`
  return `${(bytes / 1024 ** 3).toFixed(2)}GB`
}
