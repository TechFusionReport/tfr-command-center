"""Sanitized Prometheus summary for the public Status payload."""

from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import quote


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def unavailable(reason: str) -> dict:
    return {
        "generated_at": _now_iso(),
        "status": "unavailable",
        "stale": False,
        "reason": reason,
        "targets": {"total": 0, "healthy": 0, "down": 0},
        "alerts": {"firing": 0},
        "components": [],
    }


def sanitize_targets(active_targets: list[dict], public_jobs: set[str]) -> dict:
    healthy = sum(1 for target in active_targets if target.get("health") == "up")
    total = len(active_targets)
    by_job: dict[str, list[str]] = {}
    for target in active_targets:
        job = target.get("labels", {}).get("job")
        if job and job in public_jobs:
            by_job.setdefault(job, []).append(target.get("health", "unknown"))
    components = [
        {
            "name": job,
            "status": "up" if states and all(state == "up" for state in states) else "degraded",
        }
        for job, states in sorted(by_job.items())
    ]
    return {
        "targets": {"total": total, "healthy": healthy, "down": total - healthy},
        "components": components,
    }


async def collect_prometheus(session, base_url: str, timeout_s: int, public_jobs: set[str]) -> dict:
    if not base_url:
        return unavailable("not_configured")
    base = base_url.rstrip("/")
    try:
        async with session.get(f"{base}/api/v1/targets?state=active", timeout=timeout_s) as response:
            if response.status != 200:
                return unavailable("upstream_error")
            target_body = await response.json()
        alert_query = quote('ALERTS{alertstate="firing"}', safe="")
        async with session.get(f"{base}/api/v1/query?query={alert_query}", timeout=timeout_s) as response:
            if response.status != 200:
                return unavailable("upstream_error")
            alert_body = await response.json()
        if target_body.get("status") != "success" or alert_body.get("status") != "success":
            return unavailable("invalid_response")

        target_summary = sanitize_targets(
            target_body.get("data", {}).get("activeTargets", []),
            public_jobs,
        )
        firing = len(alert_body.get("data", {}).get("result", []))
        status = "healthy"
        if target_summary["targets"]["total"] == 0:
            status = "unavailable"
        elif target_summary["targets"]["down"] or firing:
            status = "degraded"
        return {
            "generated_at": _now_iso(),
            "status": status,
            "stale": False,
            **target_summary,
            "alerts": {"firing": firing},
        }
    except Exception:
        return unavailable("unreachable")
