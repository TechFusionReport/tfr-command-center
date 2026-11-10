"""Offline regression tests for private probes and the public result contract."""

import ast
import asyncio
import json
import os
from pathlib import Path
import time
from types import SimpleNamespace
from typing import Optional
import unittest
from unittest.mock import patch

from internal_targets import internal_service_url

SOURCE = Path(__file__).with_name("collect.py")
CONFIG = {
    ("oracle", "Uptime Kuma"): "UPTIME_KUMA_INTERNAL_URL",
    ("hetzner", "Syncthing"): "SYNCTHING_INTERNAL_URL",
    ("hetzner", "Glances"): "GLANCES_HETZNER_INTERNAL_URL",
}
TARGETS = {
    "UPTIME_KUMA_INTERNAL_URL": "http://uptime.internal.invalid:3001",
    "SYNCTHING_INTERNAL_URL": "http://sync.internal.invalid:8384",
    "GLANCES_HETZNER_INTERNAL_URL": "http://glances.internal.invalid:61208",
}


def collector_definitions(environment):
    # Execute the real table and probe functions without loading deployment .env,
    # running main(), or importing unrelated collectors/dependencies.
    tree = ast.parse(SOURCE.read_text())
    selected = [
        node for node in tree.body
        if (
            isinstance(node, ast.Assign)
            and any(isinstance(name, ast.Name) and name.id == "SERVICE_CHECKS"
                    for name in node.targets)
        ) or (
            isinstance(node, ast.AsyncFunctionDef)
            and node.name in {"check_http", "run_service_checks"}
        )
    ]
    namespace = {
        "internal_service_url": internal_service_url,
        "asyncio": asyncio,
        "time": time,
        "Optional": Optional,
        "TIMEOUT_S": 5,
        "aiohttp": SimpleNamespace(
            ClientSession=object,
            ClientTimeout=lambda **kwargs: kwargs,
        ),
    }
    with patch.dict(os.environ, environment, clear=True):
        exec(compile(ast.Module(body=selected, type_ignores=[]), str(SOURCE), "exec"),
             namespace)
    return namespace


class Response:
    def __init__(self, status):
        self.status = status

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False


class Session:
    def __init__(self, status=200):
        self.status = status
        self.urls = []

    def get(self, url, **kwargs):
        self.urls.append(url)
        return Response(self.status)


class InternalServiceChecksTest(unittest.TestCase):
    def test_selected_checks_use_configured_targets_and_keep_identities(self):
        checks = collector_definitions(TARGETS)["SERVICE_CHECKS"]
        selected = {(node, name): url for node, name, url in checks
                    if (node, name) in CONFIG}
        self.assertEqual(selected, {key: TARGETS[variable]
                                    for key, variable in CONFIG.items()})
        self.assertEqual(len(checks), 12)
        for url in selected.values():
            self.assertNotIn("techfusionreport.com", url)

    def test_unconfigured_checks_have_no_public_fallback(self):
        checks = collector_definitions({})["SERVICE_CHECKS"]
        self.assertEqual(
            {(node, name): url for node, name, url in checks
             if (node, name) in CONFIG},
            {key: "" for key in CONFIG},
        )

    def test_public_or_invalid_configuration_is_rejected(self):
        for value in [
            "https://uptime.techfusionreport.com",
            "https://sync.techfusionreport.com",
            "https://glances-hetzner.techfusionreport.com",
            "https://SYNC.TECHFUSIONREPORT.COM./",
            "https://techfusionreport.com",
            "file:///private-service",
            "http://",
            "http://service.internal.invalid:bad",
            "http://[",
            "http://user@service.internal.invalid",
            "http://service.internal.invalid/?private=value",
            "http://service.internal.invalid/#private",
        ]:
            with self.subTest(value=value), patch.dict(os.environ, {"PROBE_URL": value}):
                self.assertEqual(internal_service_url("PROBE_URL"), "")

    def test_response_status_policy_and_result_shape_are_unchanged(self):
        definitions = collector_definitions(TARGETS)
        for code, expected in [(200, "up"), (302, "up"), (401, "up"),
                               (404, "up"), (500, "down")]:
            with self.subTest(code=code):
                session = Session(code)
                result = asyncio.run(definitions["run_service_checks"](session))
                for (node, name), variable in CONFIG.items():
                    self.assertIn(TARGETS[variable], session.urls)
                    self.assertEqual(set(result[node][name]), {"status", "latency_ms"})
                    self.assertEqual(result[node][name]["status"], expected)
                    self.assertIsInstance(result[node][name]["latency_ms"], int)
                serialized = json.dumps(result)
                for target in TARGETS.values():
                    self.assertNotIn(target, serialized)

    def test_missing_target_reports_down_without_a_request(self):
        definitions = collector_definitions({})
        session = Session()
        self.assertEqual(
            asyncio.run(definitions["check_http"](session, "")),
            ("down", None),
        )
        self.assertEqual(session.urls, [])
        result = asyncio.run(definitions["run_service_checks"](session))
        for node, name in CONFIG:
            self.assertEqual(result[node][name], {"status": "down"})
        self.assertNotIn("", session.urls)


if __name__ == "__main__":
    unittest.main()
