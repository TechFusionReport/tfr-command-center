import type { StatusResponse } from '../types/status'

export const MOCK_STATUS: StatusResponse = {
  generated_at: new Date().toISOString(),
  nodes: [
    { id: 'oracle',  label: 'Oracle ARM64',      role: 'WireGuard Hub · n8n · LibreChat',    ip_wg: '10.10.0.1', ip_public: '132.145.140.200', reachable: true,
      services: [
        { name: 'n8n',           url: 'https://n8n.techfusionreport.com',       status: 'up', latency_ms: 42 },
        { name: 'LibreChat',     url: 'https://librechat.techfusionreport.com', status: 'up', latency_ms: 55 },
        { name: 'Portainer',     url: 'https://portainer.techfusionreport.com', status: 'up', latency_ms: 38 },
        { name: 'Uptime Kuma',   url: 'https://uptime.techfusionreport.com',    status: 'up', latency_ms: 31 },
        { name: 'Grafana',       url: 'https://grafana.techfusionreport.com',   status: 'up', latency_ms: 67 },
        { name: 'Home Assistant',                                                status: 'up', latency_ms: 110 },
      ] },
    { id: 'hetzner', label: 'Hetzner TFR-Prod',  role: 'Vaultwarden · Syncthing · Nginx',  ip_wg: '10.10.0.2', ip_public: '116.203.66.43', reachable: true,
      services: [
        { name: 'Vaultwarden',    url: 'https://vault.techfusionreport.com', status: 'up', latency_ms: 28 },
        { name: 'Syncthing',                                                   status: 'up', latency_ms: 15 },
        { name: 'Nginx Proxy Mgr',                                             status: 'up', latency_ms: 22 },
        { name: 'Glances',                                                     status: 'up', latency_ms: 19 },
      ] },
    { id: 'yoga',    label: 'Yoga 7i',            role: 'Mimir · Claude Desktop',           ip_wg: '10.10.0.3', reachable: true,
      services: [{ name: 'Mimir', status: 'up' }, { name: 'Claude Desktop', status: 'up' }] },
    { id: 'mbp',     label: 'MacBook Pro',         role: 'WireGuard peer · headless',        ip_wg: '10.10.0.4', reachable: false, services: [] },
    { id: 'pi',      label: 'Pi 500',              role: 'Pi-hole · Plex · Threadfin',      ip_wg: '10.10.0.6', reachable: true,
      services: [
        { name: 'Pi-hole',   status: 'up',      note: 'port 53 conflict pending fix' },
        { name: 'Plex',      status: 'up',      latency_ms: 88 },
        { name: 'Threadfin', status: 'up',      latency_ms: 44 },
        { name: 'Jellyfin',  status: 'unknown', note: 'LAN only' },
      ] },
    { id: 's25',     label: 'S25 Ultra',           role: 'WireGuard peer · mobile',          ip_wg: '10.10.0.5', reachable: false, services: [] },
  ],
  wireguard: {
    hub: 'oracle',
    peers: [
      { node_id: 'hetzner', allowed_ips: '10.10.0.2/32', latest_handshake: new Date(Date.now() - 45000).toISOString(),   connected: true,  transfer_rx_bytes: 1024000, transfer_tx_bytes: 512000 },
      { node_id: 'yoga',    allowed_ips: '10.10.0.3/32', latest_handshake: new Date(Date.now() - 30000).toISOString(),   connected: true,  transfer_rx_bytes: 2048000, transfer_tx_bytes: 768000 },
      { node_id: 'mbp',     allowed_ips: '10.10.0.4/32', latest_handshake: new Date(Date.now() - 900000).toISOString(),  connected: false, transfer_rx_bytes: 4096,    transfer_tx_bytes: 2048 },
      { node_id: 'pi',      allowed_ips: '10.10.0.6/32', latest_handshake: new Date(Date.now() - 60000).toISOString(),   connected: true,  transfer_rx_bytes: 512000,  transfer_tx_bytes: 256000 },
      { node_id: 's25',     allowed_ips: '10.10.0.5/32', latest_handshake: undefined, connected: false, transfer_rx_bytes: 469900, transfer_tx_bytes: 0 },
    ],
  },
  tfr_pipeline: {
    workers: [
      { name: 'discovery.js',          status: 'healthy', requests_24h: 1440, errors_24h: 0,  error_rate: 0.00,  last_deployed: new Date(Date.now() - 86400000 * 2).toISOString() },
      { name: 'enhancement-poller.js', status: 'healthy', requests_24h: 288,  errors_24h: 2,  error_rate: 0.007 },
      { name: 'publisher-poller.js',   status: 'error',   requests_24h: 144,  errors_24h: 12, error_rate: 0.083, last_error: 'GitHub push failed: 422 Unprocessable Entity' },
    ],
    content_catalog: { pending: 8, in_review: 3, published: 247, total: 258 },
  },
  n8n: {
    host: 'https://n8n.techfusionreport.com',
    reachable: true,
    workflows: [
      { id: 'B6FSzN6yDED1tIvP', name: 'Coloring Book Generator',    active: true,  last_execution: { started_at: new Date(Date.now() - 3600000).toISOString(),  status: 'success', duration_ms: 12400 } },
      { id: 'VFZKuoBSfDrz8DFs', name: 'Topic Research',             active: true,  last_execution: { started_at: new Date(Date.now() - 21600000).toISOString(), status: 'success', duration_ms: 4200 } },
      { id: 'feed-aggregator',  name: 'Feed Aggregator (discovery)', active: false, last_execution: { started_at: new Date(Date.now() - 900000).toISOString(),  status: 'error',   duration_ms: 800,  error_message: 'KV write timeout' } },
      { id: 'memory-update',    name: 'Memory Update Webhook',       active: true,  last_execution: { started_at: new Date(Date.now() - 1800000).toISOString(), status: 'success', duration_ms: 320 } },
    ],
  },
  homelab: {
    services: [
      { name: 'Home Assistant', node: 'oracle', tunnel: true,  status: 'up',      latency_ms: 110 },
      { name: 'Plex',           node: 'pi',     tunnel: true,  status: 'up',      latency_ms: 88 },
      { name: 'Threadfin',      node: 'pi',     tunnel: true,  status: 'up',      latency_ms: 44 },
      { name: 'Jellyfin',       node: 'pi',     tunnel: false, status: 'unknown', note: 'LAN only' },
      { name: 'Pi-hole',        node: 'pi',     tunnel: false, status: 'up',      note: 'port 53 conflict pending' },
    ],
  },
  notion: {
    databases: [
      { name: 'Content Catalog v2', id: 'content-catalog', record_count: 258, last_updated: new Date(Date.now() - 1800000).toISOString() },
      { name: 'Topic Queue',        id: 'topic-queue',      record_count: 42 },
      { name: 'Task Tracker',       id: 'task-tracker',     record_count: 31 },
    ],
  },
  observability: {
    generated_at: new Date().toISOString(),
    status: 'healthy',
    stale: false,
    targets: { total: 8, healthy: 8, down: 0 },
    alerts: { firing: 0 },
    components: [
      { name: 'website', status: 'up' },
      { name: 'techfusion-api', status: 'up' },
    ],
  },
  github: {
    prs: [
      {
        repo: 'Automations', number: 54, title: 'fix: read GITHUB_EVENT_PATH directly in PR metadata check',
        url: 'https://github.com/TechFusionReport/Automations/pull/54', author: 'TechFusionReport',
        draft: false,
        created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 60000).toISOString(),
        agent: 'Claude', task: 'N/A — hotfix', risk: 'Low',
      },
      {
        repo: 'Website', number: 19, title: 'feat: add Entertainment subcategory pages',
        url: 'https://github.com/TechFusionReport/Website/pull/19', author: 'TechFusionReport',
        draft: true,
        created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 3600000).toISOString(),
        agent: 'ChatGPT', task: 'https://app.notion.com/p/example-task', risk: 'Low',
      },
    ],
  },
  task_tracker: {
    tasks: [
      {
        id: 'mock-task-1', url: 'https://app.notion.com/p/example-task-1',
        task: 'Rotate n8n API key (Command Center collector)',
        status: 'In Progress', owner: 'Justin', active_agent: 'Claude', risk: 'Medium', pr: null,
      },
      {
        id: 'mock-task-2', url: 'https://app.notion.com/p/example-task-2',
        task: 'Provision Oracle 100GB block volume for Immich',
        status: 'Blocked', owner: 'Justin', active_agent: 'Unclaimed', risk: 'Medium', pr: null,
      },
      {
        id: 'mock-task-3', url: 'https://app.notion.com/p/example-task-3',
        task: 'Add IDEOGRAM_API_KEY to Oracle n8n env',
        status: 'Not Started', owner: 'Justin', active_agent: 'Unclaimed', risk: 'Low', pr: null,
      },
    ],
  },
}
