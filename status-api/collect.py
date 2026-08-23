#!/usr/bin/env python3
"""
TFR Status Collector
Runs on Oracle (10.10.0.1) as a cron job every 60s.
Writes status.json to OUTPUT_FILE, served by nginx.

Setup:
    pip3 install aiohttp python-dotenv --break-system-packages
    cp .env.example .env && nano .env
    crontab -e
    # Add: * * * * * /usr/bin/python3 /opt/tfr-status/collect.py >> /var/log/tfr-status.log 2>&1
"""

import asyncio
import json
import os
import re
import subprocess
import time
from datetime import datetime, timezone
from typing import Optional

import aiohttp
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ── Config ─────────────────────────────────────────────────────────

OUTPUT_FILE         = os.getenv("OUTPUT_FILE",         "/var/www/status/status.json")
N8N_URL             = os.getenv("N8N_URL",             "https://n8n.techfusionreport.com")
N8N_API_KEY         = os.getenv("N8N_API_KEY",         "")
CF_ACCOUNT_ID       = os.getenv("CF_ACCOUNT_ID",       "")
CF_API_TOKEN        = os.getenv("CF_API_TOKEN",        "")
NOTION_TOKEN        = os.getenv("NOTION_TOKEN",        "")
GITHUB_TOKEN        = os.getenv("GITHUB_TOKEN",        "")
GITHUB_ORG          = os.getenv("GITHUB_ORG",          "TechFusionReport")
TIMEOUT_S           = int(os.getenv("TIMEOUT_S",       "5"))
LAN_WATCHTOWER_URL  = os.getenv(
    "LAN_WATCHTOWER_URL",
    "https://n8n.techfusionreport.com/webhook/lan-status",
)

NOTION_DBS = {
    "Content Catalog v2": os.getenv("NOTION_CONTENT_CATALOG_ID", ""),
    "Topic Queue":        os.getenv("NOTION_TOPIC_QUEUE_ID",     ""),
    "Task Tracker":       os.getenv("NOTION_TASK_TRACKER_ID",    ""),
}

# Public key → node ID (from: sudo wg show wg0 dump)
WG_KEY_MAP: dict[str, str] = {
    "TM9+zkjycn7YESHLsFpb5eMzV/to4KPVm4+r3vJNKQ8=": "hetzner",
    "C9ZIsP34AT+CbmbJS4W8feWbjBhT1yzUCVyiCh3BmBw=": "yoga",
    "h9E/8YBQCMVYW7bnte+IzTRYG+HSaIGEiEnO5+63N2k=": "mbp",
    "qGrN3PkuMDwORHO46YNBfx2vKX6TyB63B1qUyGzxSGU=": "pi",
    "VNFjeWJxbvot8PZ8gWFR7ZySfJ6DdVFKMMBGaNS0YAA=": "s25",
}

# HTTP health checks: (node_id, service_name, url)
SERVICE_CHECKS = [
    ("oracle",  "n8n",            "https://n8n.techfusionreport.com/healthz"),
    ("oracle",  "LibreChat",      "https://chat.techfusionreport.com"),
    ("oracle",  "Portainer",      "https://portainer.techfusionreport.com"),
    ("oracle",  "Uptime Kuma",    "https://uptime.techfusionreport.com"),
    ("oracle",  "Grafana",        "https://grafana.techfusionreport.com/api/health"),
    ("hetzner", "Vaultwarden",    "https://vault.techfusionreport.com"),
    ("hetzner", "Syncthing",      "https://sync.techfusionreport.com"),
    ("hetzner", "Glances",        "https://glances-hetzner.techfusionreport.com"),
    ("pi",      "Home Assistant", "https://ha.techfusionreport.com"),
    ("pi",      "Jellyfin",       "https://jellyfin.techfusionreport.com"),
    ("pi",      "Glances",        "https://glances-pi.techfusionreport.com"),
    ("pi",      "Plex",           "http://10.10.0.6:32400/web"),
]

CF_WORKERS = ["discovery", "enhancement-poller", "publisher-poller"]

# PR tracking is scoped to the repos the TechFusion OS governance model actually
# applies to. tfr-command-center itself is intentionally excluded (see governance
# §10 — the dashboard doesn't track PRs against itself).
GITHUB_PR_REPOS = ["Website", "Automations"]

# Statuses considered "open" in the Master Task Tracker — everything except the
# two terminal states.
TASK_TRACKER_OPEN_STATUSES = ["Not Started", "In Progress", "On Hold", "Blocked"]

# PR template footer fields (see .github/PULL_REQUEST_TEMPLATE.md in Website/Automations).
# Mirrors the negative-lookahead used by Automations' validate-pr-metadata.yml so an
# unfilled template placeholder ("<Claude / ChatGPT / Justin>") reads as missing, not present.
_PR_FOOTER_FIELDS = ("Agent", "Task", "Risk")
_PR_FOOTER_RE = {
    field: re.compile(rf"(?mi)^[ \t]*(?:\*\*)?{field}:(?:\*\*)?[ \t]*(.*)$")
    for field in _PR_FOOTER_FIELDS
}


# ── Helpers ───────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── WireGuard ─────────────────────────────────────────────────────────────

def get_wireguard_peers() -> list[dict]:
    try:
        result = subprocess.run(
            ["sudo", "wg", "show", "wg0", "dump"],
            capture_output=True, text=True, timeout=5,
        )
        peers = []
        lines = result.stdout.strip().split("\n")
        for line in lines[1:]:  # skip interface line
            parts = line.split("\t")
            if len(parts) < 7:
                continue
            pub_key     = parts[0]
            allowed_ips = parts[3]
            latest_hs   = int(parts[4]) if parts[4] != "0" else 0
            rx_bytes    = int(parts[5]) if parts[5] else 0
            tx_bytes    = int(parts[6]) if parts[6] else 0
            connected   = (int(time.time()) - latest_hs) < 180 if latest_hs > 0 else False
            node_id     = WG_KEY_MAP.get(pub_key, pub_key[:12])  # fallback to key prefix

            peers.append({
                "node_id":           node_id,
                "allowed_ips":       allowed_ips,
                "latest_handshake":  datetime.fromtimestamp(latest_hs, timezone.utc).isoformat() if latest_hs > 0 else None,
                "connected":         connected,
                "transfer_rx_bytes": rx_bytes,
                "transfer_tx_bytes": tx_bytes,
            })
        return peers
    except Exception as e:
        print(f"WireGuard check failed: {e}")
        return []


# ── HTTP health checks ────────────────────────────────────────────────────────────

async def check_http(
    session: aiohttp.ClientSession, url: str
) -> tuple[str, Optional[int]]:
    try:
        start = time.monotonic()
        async with session.get(
            url,
            timeout=aiohttp.ClientTimeout(total=TIMEOUT_S),
            allow_redirects=True,
            ssl=False,
        ) as resp:
            latency = int((time.monotonic() - start) * 1000)
            status  = "up" if resp.status < 500 else "down"
            return status, latency
    except Exception:
        return "down", None


async def run_service_checks(
    session: aiohttp.ClientSession,
) -> dict[str, dict[str, dict]]:
    results: dict[str, dict[str, dict]] = {}
    coros   = [check_http(session, url) for _, _, url in SERVICE_CHECKS]
    resolved = await asyncio.gather(*coros)
    for (node, name, _), (status, latency) in zip(SERVICE_CHECKS, resolved):
        results.setdefault(node, {})[name] = {
            "status": status,
            **({("latency_ms"): latency} if latency is not None else {}),
        }
    return results


# ── n8n ───────────────────────────────────────────────────────────────────

async def get_n8n_status(session: aiohttp.ClientSession) -> dict:
    headers = {"X-N8N-API-KEY": N8N_API_KEY} if N8N_API_KEY else {}
    base    = f"{N8N_URL}/api/v1"

    try:
        async with session.get(
            f"{N8N_URL}/healthz", timeout=aiohttp.ClientTimeout(total=TIMEOUT_S)
        ) as r:
            reachable = r.status < 500
    except Exception:
        reachable = False

    if not reachable or not N8N_API_KEY:
        return {"host": N8N_URL, "reachable": reachable, "workflows": []}

    try:
        async with session.get(
            f"{base}/workflows", headers=headers, timeout=aiohttp.ClientTimeout(total=10)
        ) as r:
            workflows = (await r.json()).get("data", [])
    except Exception:
        return {"host": N8N_URL, "reachable": reachable, "workflows": []}

    result_workflows = []
    for wf in workflows:
        entry: dict = {"id": wf["id"], "name": wf["name"], "active": wf.get("active", False)}
        try:
            async with session.get(
                f"{base}/executions?workflowId={wf['id']}&limit=1&includeData=false",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=5),
            ) as r:
                execs = (await r.json()).get("data", [])
                if execs:
                    ex = execs[0]
                    entry["last_execution"] = {
                        "started_at":  ex.get("startedAt"),
                        "finished_at": ex.get("stoppedAt"),
                        "status":      ex.get("status", "unknown"),
                        "duration_ms": ex.get("executionTime"),
                    }
        except Exception:
            pass
        result_workflows.append(entry)

    return {"host": N8N_URL, "reachable": reachable, "workflows": result_workflows}


# ── Cloudflare Workers ─────────────────────────────────────────────────────────────

async def get_worker_status(
    session: aiohttp.ClientSession, worker_name: str
) -> dict:
    base_entry = {"name": f"{worker_name}.js", "status": "unknown"}
    if not CF_API_TOKEN or not CF_ACCOUNT_ID:
        return base_entry

    since = datetime.utcnow().strftime("%Y-%m-%dT00:00:00Z")
    until = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    query = """
query($accountId: String!, $scriptName: String!, $since: String!, $until: String!) {
  viewer {
    accounts(filter: {accountTag: $accountId}) {
      workersInvocationsAdaptive(
        limit: 1
        filter: {scriptName: $scriptName, datetime_geq: $since, datetime_leq: $until}
      ) {
        sum { requests errors }
      }
    }
  }
}
"""
    try:
        async with session.post(
            "https://api.cloudflare.com/client/v4/graphql",
            json={
                "query": query,
                "variables": {
                    "accountId":  CF_ACCOUNT_ID,
                    "scriptName": worker_name,
                    "since":      since,
                    "until":      until,
                },
            },
            headers={
                "Authorization": f"Bearer {CF_API_TOKEN}",
                "Content-Type":  "application/json",
            },
            timeout=aiohttp.ClientTimeout(total=10),
        ) as r:
            data   = await r.json()
            accts  = data.get("data", {}).get("viewer", {}).get("accounts", [])
            inv    = accts[0].get("workersInvocationsAdaptive", []) if accts else []
            totals = inv[0].get("sum", {}) if inv else {}
            reqs   = totals.get("requests", 0)
            errs   = totals.get("errors", 0)
            rate   = round(errs / reqs, 4) if reqs > 0 else 0.0
            return {
                "name":         f"{worker_name}.js",
                "status":       "error" if rate > 0.05 else "healthy",
                "requests_24h": reqs,
                "errors_24h":   errs,
                "error_rate":   rate,
            }
    except Exception as e:
        print(f"CF worker {worker_name} failed: {e}")
        return base_entry


# ── Notion content catalog counts ────────────────────────────────────────────────────────────

async def get_content_catalog(session: aiohttp.ClientSession) -> dict:
    default = {"pending": 0, "in_review": 0, "published": 0, "total": 0}
    db_id   = NOTION_DBS.get("Content Catalog v2", "")
    if not NOTION_TOKEN or not db_id:
        return default

    headers = {
        "Authorization":  f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type":   "application/json",
    }

    status_map = {
        "pending":   ["Draft", "Pending"],
        "in_review": ["In Review"],
        "published": ["Published"],
    }

    counts: dict[str, int] = {k: 0 for k in status_map}

    for bucket, values in status_map.items():
        cursor = None
        while True:
            body: dict = {
                "page_size": 100,
                "filter": {
                    "or": [
                        {"property": "Status", "status": {"equals": v}}
                        for v in values
                    ]
                },
            }
            if cursor:
                body["start_cursor"] = cursor
            try:
                async with session.post(
                    f"https://api.notion.com/v1/databases/{db_id}/query",
                    headers=headers,
                    json=body,
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as r:
                    data = await r.json()
                    counts[bucket] += len(data.get("results", []))
                    if data.get("has_more"):
                        cursor = data.get("next_cursor")
                    else:
                        break
            except Exception as e:
                print(f"Notion count ({bucket}) failed: {e}")
                break

    total = sum(counts.values())
    return {**counts, "total": total}


# ── Master Task Tracker (Notion) ───────────────────────────────────────────

def _notion_text_value(prop: Optional[dict]) -> Optional[str]:
    """Read the plain-text value out of a title/rich_text/select/status Notion property."""
    if not prop:
        return None
    ptype = prop.get("type")
    if ptype in ("title", "rich_text"):
        parts = prop.get(ptype) or []
        text  = "".join(p.get("plain_text", "") for p in parts)
        return text or None
    if ptype == "select":
        sel = prop.get("select")
        return sel.get("name") if sel else None
    if ptype == "status":
        st = prop.get("status")
        return st.get("name") if st else None
    return None


async def get_task_tracker(session: aiohttp.ClientSession) -> list[dict]:
    """Open rows (Status not Done/Abandoned) from the ⚡ TFR Task Tracker data source.
    NOTION_TASK_TRACKER_ID must point at that specific data source — the Command
    Center is TFR-scoped, same as the GitHub PR tracking above."""
    db_id = NOTION_DBS.get("Task Tracker", "")
    if not NOTION_TOKEN or not db_id:
        return []

    headers = {
        "Authorization":  f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type":   "application/json",
    }

    tasks: list[dict] = []
    cursor = None
    while True:
        body: dict = {
            "page_size": 100,
            "filter": {
                "or": [
                    {"property": "Status", "select": {"equals": s}}
                    for s in TASK_TRACKER_OPEN_STATUSES
                ]
            },
        }
        if cursor:
            body["start_cursor"] = cursor
        try:
            async with session.post(
                f"https://api.notion.com/v1/databases/{db_id}/query",
                headers=headers,
                json=body,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                if r.status != 200:
                    print(f"Task Tracker query failed: HTTP {r.status}")
                    break
                data = await r.json()
        except Exception as e:
            print(f"Task Tracker query failed: {e}")
            break

        for page in data.get("results", []):
            props = page.get("properties", {})
            tasks.append({
                "id":           page.get("id"),
                "url":          page.get("url"),
                "task":         _notion_text_value(props.get("Task")),
                "status":       _notion_text_value(props.get("Status")),
                "owner":        _notion_text_value(props.get("Owner")),
                "active_agent": _notion_text_value(props.get("Active Agent")),
                "risk":         _notion_text_value(props.get("Risk")),
                "pr":           _notion_text_value(props.get("PR")),
            })

        if data.get("has_more"):
            cursor = data.get("next_cursor")
        else:
            break

    return tasks


# ── GitHub Pull Requests ────────────────────────────────────────────────────

def _parse_pr_footer(body: str) -> dict:
    """Extract Agent/Task/Risk from a PR body's metadata footer (see PR template).
    A field stays None if it's missing, empty, or still the unfilled template
    placeholder (e.g. "<Claude / ChatGPT / Justin>") — the same case the Automations
    validate-pr-metadata.yml check rejects, so this never reports a placeholder as
    real data."""
    parsed: dict[str, Optional[str]] = {f.lower(): None for f in _PR_FOOTER_FIELDS}
    for field, pattern in _PR_FOOTER_RE.items():
        m = pattern.search(body or "")
        if not m:
            continue
        value = m.group(1).strip().strip("*").strip()
        if value and not value.startswith("<"):
            parsed[field.lower()] = value
    return parsed


async def get_github_prs(session: aiohttp.ClientSession) -> list[dict]:
    """Open PRs across Website + Automations (not tfr-command-center — see governance §10),
    with each PR's Agent/Task/Risk footer parsed out for display."""
    if not GITHUB_TOKEN:
        return []

    headers = {
        "Authorization":        f"Bearer {GITHUB_TOKEN}",
        "Accept":               "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    prs: list[dict] = []
    for repo in GITHUB_PR_REPOS:
        try:
            async with session.get(
                f"https://api.github.com/repos/{GITHUB_ORG}/{repo}/pulls",
                headers=headers,
                params={"state": "open", "per_page": "50", "sort": "updated", "direction": "desc"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as r:
                if r.status != 200:
                    print(f"GitHub PR fetch failed for {repo}: HTTP {r.status}")
                    continue
                pulls = await r.json()
        except Exception as e:
            print(f"GitHub PR fetch failed for {repo}: {e}")
            continue

        for pr in pulls:
            footer = _parse_pr_footer(pr.get("body") or "")
            prs.append({
                "repo":       repo,
                "number":     pr["number"],
                "title":      pr["title"],
                "url":        pr["html_url"],
                "author":     (pr.get("user") or {}).get("login"),
                "draft":      pr.get("draft", False),
                "created_at": pr.get("created_at"),
                "updated_at": pr.get("updated_at"),
                **footer,
            })

    prs.sort(key=lambda p: p.get("updated_at") or "", reverse=True)
    return prs


# ── LAN Watchtower ────────────────────────────────────────────────────────────────

async def get_lan_watchtower(session: aiohttp.ClientSession) -> dict:
    """Fetch sanitized LAN probe state from the n8n read endpoint."""
    default = {
        "healthy": None,
        "incident_open": False,
        "failure_count": 0,
        "probe_online": False,
        "last_seen": None,
        "probe": None,
        "wifi_signal_dbm": None,
        "checks": [],
        "generated_at": now_iso(),
    }
    if not LAN_WATCHTOWER_URL:
        return default
    try:
        async with session.get(
            LAN_WATCHTOWER_URL,
            timeout=aiohttp.ClientTimeout(total=TIMEOUT_S),
            ssl=False,
        ) as r:
            if r.status == 200:
                return await r.json()
            print(f"LAN Watchtower returned HTTP {r.status}")
            return default
    except Exception as e:
        print(f"LAN Watchtower fetch failed: {e}")
        return default


# ── Node manifest ─────────────────────────────────────────────────────────────────

def build_nodes(svc_results: dict, wg_peers: list[dict]) -> list[dict]:
    peer_connected = {p["node_id"]: p["connected"] for p in wg_peers}

    nodes_def = [
        {
            "id": "oracle", "label": "Oracle ARM64",
            "role": "WireGuard Hub · n8n · LibreChat",
            "ip_wg": "10.10.0.1", "ip_public": "132.145.140.200",
            "reachable": True,  # we're running on oracle
            "services": ["n8n", "LibreChat", "Portainer", "Uptime Kuma", "Grafana"],
        },
        {
            "id": "hetzner", "label": "Hetzner TFR-Prod",
            "role": "Vaultwarden · Syncthing · Nginx",
            "ip_wg": "10.10.0.2", "ip_public": "116.203.66.43",
            "reachable": peer_connected.get("hetzner", False),
            "services": ["Vaultwarden", "Syncthing", "Glances"],
        },
        {
            "id": "yoga", "label": "Yoga 7i",
            "role": "Mimir · Claude Desktop",
            "ip_wg": "10.10.0.3",
            "reachable": peer_connected.get("yoga", False),
            "services": [],
        },
        {
            "id": "mbp", "label": "MacBook Pro",
            "role": "WireGuard peer · headless",
            "ip_wg": "10.10.0.4",
            "reachable": peer_connected.get("mbp", False),
            "services": [],
        },
        {
            "id": "pi", "label": "Pi 500",
            "role": "Home Assistant · Plex · Jellyfin",
            "ip_wg": "10.10.0.6",
            "reachable": peer_connected.get("pi", False),
            "services": ["Home Assistant", "Jellyfin", "Glances", "Plex"],
        },
        {
            "id": "s25", "label": "S25 Ultra",
            "role": "WireGuard peer · mobile",
            "ip_wg": "10.10.0.5",
            "reachable": peer_connected.get("s25", False),
            "services": [],
        },
    ]

    result = []
    for node in nodes_def:
        node_checks = svc_results.get(node["id"], {})
        services = []
        for name in node["services"]:
            check = node_checks.get(name, {})
            services.append({"name": name, "status": check.get("status", "unknown"), **{k: v for k, v in check.items() if k != "status"}})
        # Static services with no HTTP check
        if node["id"] == "pi":
            services.append({"name": "Pi-hole", "status": "unknown", "note": "port 53, no HTTP check"})
        if node["id"] == "yoga":
            services.append({"name": "Mimir",         "status": "unknown"})
            services.append({"name": "Claude Desktop", "status": "unknown"})

        node_out = {k: v for k, v in node.items() if k != "services"}
        node_out["services"] = services
        result.append(node_out)

    return result


# ── Main ────────────────────────────────────────────────────────────────────

async def collect() -> dict:
    t0 = time.monotonic()

    async with aiohttp.ClientSession() as session:
        svc_task     = run_service_checks(session)
        n8n_task     = get_n8n_status(session)
        worker_tasks = [get_worker_status(session, w) for w in CF_WORKERS]
        cat_task     = get_content_catalog(session)
        lan_task     = get_lan_watchtower(session)
        github_task  = get_github_prs(session)
        tracker_task = get_task_tracker(session)

        (
            svc_results, n8n_status, *worker_statuses, catalog, lan_watchtower,
            github_prs, tracker_tasks,
        ) = await asyncio.gather(
            svc_task, n8n_task, *worker_tasks, cat_task, lan_task, github_task, tracker_task
        )

    wg_peers = get_wireguard_peers()
    nodes    = build_nodes(svc_results, wg_peers)

    elapsed = round((time.monotonic() - t0) * 1000)
    print(f"[{now_iso()}] collected in {elapsed}ms")

    return {
        "generated_at": now_iso(),
        "nodes": nodes,
        "wireguard": {
            "hub":   "oracle",
            "peers": wg_peers,
        },
        "tfr_pipeline": {
            "workers":         list(worker_statuses),
            "content_catalog": catalog,
        },
        "n8n": n8n_status,
        "homelab": {
            "services": [
                {
                    "name": "Home Assistant", "node": "pi", "tunnel": True,
                    **svc_results.get("pi", {}).get("Home Assistant", {"status": "unknown"}),
                },
                {
                    "name": "Jellyfin", "node": "pi", "tunnel": True,
                    **svc_results.get("pi", {}).get("Jellyfin", {"status": "unknown"}),
                },
                {
                    "name": "Plex", "node": "pi", "tunnel": False,
                    **svc_results.get("pi", {}).get("Plex", {"status": "unknown"}),
                },
                {"name": "Pi-hole", "node": "pi", "tunnel": False, "status": "unknown"},
            ],
        },
        "notion": {
            "databases": [
                {
                    "name": "Content Catalog v2",
                    "id":   NOTION_DBS.get("Content Catalog v2", ""),
                    "record_count": catalog.get("total"),
                },
                {"name": "Topic Queue", "id": NOTION_DBS.get("Topic Queue", "")},
                {"name": "Task Tracker", "id": NOTION_DBS.get("Task Tracker", "")},
            ],
        },
        "github": {
            "prs": github_prs,
        },
        "task_tracker": {
            "tasks": tracker_tasks,
        },
        "lan_watchtower": lan_watchtower,
    }


def main():
    data = asyncio.run(collect())
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)
    print(f"Written → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
