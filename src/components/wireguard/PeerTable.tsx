import type { WireGuardPeer, Node } from '../../types/status'

export default function PeerTable({ peers, nodes }: { peers: WireGuardPeer[]; nodes: Node[] }) {
  const label = (id: string) => nodes.find(n => n.id === id)?.label ?? id

  return (
    <div className="bg-tfr-card border border-tfr-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-tfr-border text-xs text-tfr-muted uppercase tracking-wider">
            <th className="text-left px-4 py-2.5 font-medium">Node</th>
            <th className="text-left px-4 py-2.5 font-medium">WG IP</th>
            <th className="text-left px-4 py-2.5 font-medium">Status</th>
            <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Last Handshake</th>
            <th className="text-right px-4 py-2.5 font-medium hidden lg:table-cell">↓ / ↑</th>
          </tr>
        </thead>
        <tbody>
          {peers.map(peer => (
            <tr key={peer.node_id} className="border-b border-tfr-border/50 last:border-0 hover:bg-tfr-card2/50 transition-colors">
              <td className="px-4 py-3 font-medium text-white">{label(peer.node_id)}</td>
              <td className="px-4 py-3 font-mono text-tfr-muted text-xs">{peer.allowed_ips}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                  peer.connected ? 'bg-status-up/10 text-status-up' : 'bg-status-down/10 text-status-down'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${peer.connected ? 'bg-status-up' : 'bg-status-down'}`} />
                  {peer.connected ? 'connected' : 'disconnected'}
                </span>
              </td>
              <td className="px-4 py-3 text-tfr-muted text-xs hidden md:table-cell">
                {peer.latest_handshake ? fmtAge(peer.latest_handshake) : '—'}
              </td>
              <td className="px-4 py-3 text-tfr-muted text-xs text-right hidden lg:table-cell">
                {peer.transfer_rx_bytes !== undefined ? `${fmtBytes(peer.transfer_rx_bytes)} / ${fmtBytes(peer.transfer_tx_bytes ?? 0)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
