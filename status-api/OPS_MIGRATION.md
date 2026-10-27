# Oracle collector migration checklist

This PR adds the snapshot sender. It does **not** yet change the live collector, webhook, Access, or cron. Do not merge/deploy as complete.

1. Rotate WireGuard peer identifiers currently committed in public `status-api/collect.py` if their exposure is unacceptable. Move WG_KEY_MAP to protected Oracle environment. Public peer keys are identifiers, not WireGuard private keys.
2. Move node WireGuard/public IPs, probe targets, and LAN Watchtower URL into protected Oracle environment. Remove any hardcoded credentials and URLs from public source; review old Git history.
3. Probe internal WireGuard/Docker targets with strict expected health status/body; reject redirects, Access HTML, and 401/403 as healthy. Remove dead LibreChat check.
4. Require authentication on the LAN Watchtower source webhook, or move it to an internal endpoint. Fail closed when unauthorized.
5. Configure `OPS_MONITORING_INGEST_URL`, `OPS_INGEST_CF_CLIENT_ID`, `OPS_INGEST_CF_CLIENT_SECRET`, `OPS_MONITORING_INGEST_SECRET` in Oracle protected environment. The Access token must belong to a dedicated Service Auth app for the ingest path, and the bearer secret must differ.
6. Run collector then `push_snapshot.py` every 5 minutes, with locked-down log output. Ensure `OUTPUT_FILE` matches collector output.
7. Verify unauthorized POST rejected, valid POST accepted, stale after 15 minutes, and dashboard data persists when Oracle goes offline.
8. Only after all checks pass, retire public status/status-api routes and old Pages project. Keep collector internal.

IMPORTANT: The current Worker sanitizes snapshot fields before KV storage; Oracle sender transmits the raw snapshot through TLS to the Access-protected Worker. Do not enable sender before the dedicated Access Service Auth policy is active.
