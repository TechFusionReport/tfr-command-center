"""Resolve private service probes without public-hostname fallbacks."""

import os
from urllib.parse import urlsplit


def internal_service_url(variable: str) -> str:
    """Return a configured HTTP target, or an empty target that reports down.

    Values stay in the deployment environment and are never included in errors.
    Missing/invalid configuration must not silently probe the public login page.
    """
    value = os.getenv(variable, "").strip()
    try:
        target = urlsplit(value)
        host = (target.hostname or "").lower().rstrip(".")
        port = target.port  # Validate the port without logging the URL.
        if (
            target.scheme not in {"http", "https"}
            or not host
            or target.username is not None
            or target.password is not None
            or target.query
            or target.fragment
            or host == "techfusionreport.com"
            or host.endswith(".techfusionreport.com")
        ):
            return ""
    except ValueError:
        return ""
    return value
