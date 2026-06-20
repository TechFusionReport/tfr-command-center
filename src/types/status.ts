export type ServiceStatus = 'up' | 'down' | 'unknown'
export type WorkerStatus  = 'healthy' | 'error' | 'unknown'
export type ExecStatus    = 'success' | 'error' | 'running' | 'waiting'

export interface Service {
  name: string
  url?: string
  status: ServiceStatus
  latency_ms?: number
  note?: string
}

export type NodeId = 'oracle' | 'hetzner' | 'yoga' | 'mbp' | 'pi' | 's25'

export interface Node {
  id: NodeId
  label: string
  role: string
  ip_wg: string
  ip_public?: string
  reachable: boolean
  services: Service[]
}

export interface WireGuardPeer {
  node_id: NodeId
  allowed_ips: string
  latest_handshake?: string
  connected: boolean
  transfer_rx_bytes?: number
  transfer_tx_bytes?: number
}

export interface WireGuardMesh {
  hub: NodeId
  peers: WireGuardPeer[]
}

export type WorkerName = 'discovery.js' | 'enhancement-poller.js' | 'publisher-poller.js'

export interface CloudflareWorker {
  name: WorkerName
  status: WorkerStatus
  last_deployed?: string
  requests_24h?: number
  errors_24h?: number
  error_rate?: number
  last_error?: string
}

export interface ContentCatalog {
  pending: number
  in_review: number
  published: number
  total: number
}

export interface TFRPipeline {
  workers: CloudflareWorker[]
  content_catalog: ContentCatalog
}

export interface N8NExecution {
  started_at: string
  finished_at?: string
  status: ExecStatus
  duration_ms?: number
  error_message?: string
}

export interface N8NWorkflow {
  id: string
  name: string
  active: boolean
  last_execution?: N8NExecution
}

export interface N8NStatus {
  host: string
  reachable: boolean
  workflows: N8NWorkflow[]
}

export interface HomelabService {
  name: string
  url?: string
  node: NodeId
  tunnel?: boolean
  status: ServiceStatus
  latency_ms?: number
  note?: string
}

export interface HomelabStatus {
  services: HomelabService[]
}

export interface NotionDatabase {
  name: string
  id: string
  record_count?: number
  last_updated?: string
}

export interface NotionStatus {
  databases: NotionDatabase[]
}

export interface LanCheck {
  name: string
  ok: boolean
  required: boolean
  latency_avg_ms: number | null
  packet_loss_pct: number | null
}

export interface LanWatchtower {
  healthy: boolean | null
  incident_open: boolean
  failure_count: number
  probe_online: boolean
  last_seen: string | null
  probe: string | null
  wifi_signal_dbm: number | null
  checks: LanCheck[]
  generated_at: string
}

export interface StatusResponse {
  generated_at: string
  nodes: Node[]
  wireguard: WireGuardMesh
  tfr_pipeline: TFRPipeline
  n8n: N8NStatus
  homelab: HomelabStatus
  notion: NotionStatus
  lan_watchtower?: LanWatchtower
}
