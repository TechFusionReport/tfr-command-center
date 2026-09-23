import json
import unittest

from observability import sanitize_targets, unavailable


class ObservabilitySanitizationTest(unittest.TestCase):
    def test_target_summary_drops_private_labels_and_addresses(self):
        result = sanitize_targets([
            {
                "labels": {
                    "job": "website",
                    "instance": "10.10.0.3:9100",
                    "token": "must-not-leak",
                },
                "health": "up",
                "scrapeUrl": "http://10.10.0.3:9100/metrics",
            },
            {"labels": {"job": "internal-db", "instance": "db:9187"}, "health": "down"},
        ], {"website"})
        self.assertEqual(result, {
            "targets": {"total": 2, "healthy": 1, "down": 1},
            "components": [{"name": "website", "status": "up"}],
        })
        serialized = json.dumps(result)
        self.assertNotIn("10.10.0.3", serialized)
        self.assertNotIn("must-not-leak", serialized)
        self.assertNotIn("internal-db", serialized)

    def test_unavailable_contract_is_explicit(self):
        result = unavailable("not_configured")
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["reason"], "not_configured")
        self.assertEqual(result["targets"], {"total": 0, "healthy": 0, "down": 0})


if __name__ == "__main__":
    unittest.main()
