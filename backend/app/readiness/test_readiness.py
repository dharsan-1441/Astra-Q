"""
Unit tests for the PQC Readiness Assessment Engine module.
"""

import unittest
from app.discovery.models import NormalizedAsset
from app.readiness.scorer import calculate_overall_score, classify_readiness
from app.readiness.rules import evaluate_asset_rules
from app.readiness.models import get_readiness_store, AssetReadinessAssessment, ReadinessSummary


class TestReadinessEngine(unittest.TestCase):

    def test_overall_score_calculation(self):
        # Setup perfect factor scores (100 in all)
        factor_scores = {
            "algorithm": 100.0,
            "tls": 100.0,
            "certificate": 100.0,
            "library": 100.0,
            "hardware": 100.0,
            "software": 100.0,
            "benchmark": 100.0,
        }
        score = calculate_overall_score(factor_scores)
        self.assertEqual(score, 100.0)

        # Setup custom factor scores
        custom_scores = {
            "algorithm": 50.0,      # 50 * 0.25 = 12.50
            "tls": 70.0,            # 70 * 0.20 = 14.00
            "certificate": 40.0,    # 40 * 0.15 = 6.00
            "library": 80.0,        # 80 * 0.15 = 12.00
            "hardware": 100.0,      # 100 * 0.10 = 10.00
            "software": 30.0,       # 30 * 0.10 = 3.00
            "benchmark": 0.0,       # 0 * 0.05 = 0.00
        }
        # Expected: 12.5 + 14.0 + 6.0 + 12.0 + 10.0 + 3.0 + 0 = 57.5
        score = calculate_overall_score(custom_scores)
        self.assertEqual(score, 57.5)

    def test_classify_readiness(self):
        # Test standard classification ranges
        self.assertEqual(classify_readiness(95.0, []), "PQC Ready")
        self.assertEqual(classify_readiness(82.0, []), "Hybrid Ready")
        self.assertEqual(classify_readiness(55.0, []), "Upgrade Required")
        self.assertEqual(classify_readiness(25.0, []), "Legacy Blocker")
        self.assertEqual(classify_readiness(5.0, []), "Unsupported")

        # Test architectural blockers override
        self.assertEqual(
            classify_readiness(95.0, ["Obsolete operating system in use"]),
            "Legacy Blocker",
        )
        self.assertEqual(
            classify_readiness(85.0, ["Legacy hardware security module"]),
            "Legacy Blocker",
        )

    def test_rules_evaluation_classical(self):
        # Create an asset using classical algorithms
        asset = NormalizedAsset(
            id="asset-1",
            name="Classical Server",
            type="server",
            discovery_source="yaml_import",
            metadata={
                "crypto_algorithm": "RSA-2048",
                "tls_version": "1.2",
                "certificate": {"algorithm": "RSA"},
                "legacy": False,
            },
        )
        scores, issues, recommendations, _ = evaluate_asset_rules(asset, [], [])
        
        self.assertEqual(scores["algorithm"], 50.0)
        self.assertEqual(scores["tls"], 70.0)
        self.assertEqual(scores["certificate"], 40.0)
        self.assertIn("Uses classical cryptographic algorithm (RSA)", issues)
        self.assertIn("Upgrade Certificate Chain", recommendations)

    def test_readiness_store(self):
        store = get_readiness_store()
        store.clear()

        # Build dummy assessment
        assessment = AssetReadinessAssessment(
            asset_id="asset-123",
            asset_name="Test Asset",
            asset_type="database",
            readiness_score=85.0,
            classification="Hybrid Ready",
            algorithm_support={"ml_kem_support": False},
            tls_status={},
            certificate_status={},
            library_status={},
            hardware_status={},
            software_status={},
            benchmark_status={},
        )
        summary = ReadinessSummary(
            enterprise_readiness_score=85.0,
            average_readiness=85.0,
            assets_requiring_hybrid=1,
        )

        store.set_results([assessment], summary)

        # Retrieve
        self.assertEqual(len(store.get_all()), 1)
        self.assertEqual(store.get("asset-123").asset_name, "Test Asset")
        self.assertEqual(store.get_summary().enterprise_readiness_score, 85.0)


if __name__ == "__main__":
    unittest.main()
