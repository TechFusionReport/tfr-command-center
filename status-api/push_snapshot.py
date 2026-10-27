#!/usr/bin/env python3
"""Push an existing collector snapshot to the Access-gated Worker ingest route.

Configure via protected Oracle environment, never in the repository.
Schedule every five minutes after collect.py writes the snapshot.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

def main():
    endpoint = os.environ.get("OPS_MONITORING_INGEST_URL", "")
    client_id = os.environ.get("OPS_INGEST_CF_CLIENT_ID", "")
    client_secret = os.environ.get("OPS_INGEST_CF_CLIENT_SECRET", "")
    bearer = os.environ.get("OPS_MONITORING_INGEST_SECRET", "")
    snapshot_file = Path(os.environ.get("OUTPUT_FILE", "/var/www/status/status.json"))
    if not all((endpoint, client_id, client_secret, bearer)):
        raise RuntimeError("Missing protected ingest configuration")
    if not endpoint.startswith("https://") or not endpoint.endswith("/ops/api/monitoring/ingest"):
        raise RuntimeError("Invalid ingest endpoint")
    snapshot = json.loads(snapshot_file.read_text())
    generated = datetime.fromisoformat(snapshot["generated_at"].replace("Z", "+00:00"))
    age = (datetime.now(timezone.utc) - generated).total_seconds()
    if age < -60 or age > 600:
        raise RuntimeError("Collector snapshot is not fresh; refusing to push")
    payload = json.dumps(snapshot, separators=(",", ":")).encode()
    request = Request(endpoint, data=payload, method="POST", headers={
        "Content-Type": "application/json",
        "CF-Access-Client-Id": client_id,
        "CF-Access-Client-Secret": client_secret,
        "Authorization": "Bearer " + bearer,
    })
    try:
        with urlopen(request, timeout=15) as response:
            if response.status != 202:
                raise RuntimeError("Unexpected ingest response status")
    except (HTTPError, URLError) as exc:
        raise RuntimeError("Monitoring ingest failed; check protected service logs") from None
    print("Monitoring snapshot accepted")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
