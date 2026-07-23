"""
Planner unit tests — verifies topological wave scheduling, critical asset
isolation rules, step risk calculations, and PDF generation.
"""

import unittest
from datetime import datetime, timezone

from app.discovery.models import NormalizedAsset
from app.graph.builder import CommunicationEdge
from app.planner.models import MigrationPlan
from app.planner.pdf_exporter import export_plan_to_pdf
from app.planner.risk import calculate_step_risk, determine_duration, determine_strategy
from app.planner.scheduler import schedule_waves
from app.readiness.models import (
    AssetReadinessAssessment,
    AlgorithmSupportStatus,
    TLSStatus,
    CertificateStatus,
    LibraryStatus,
    HardwareStatus,
    SoftwareStatus,
    BenchmarkStatus,
)


class TestPlanner(unittest.TestCase):
    """Test suite covering post-quantum migration scheduling and risk evaluations."""

    def setUp(self) -> None:
        # Define mock assets
        self.asset_a = NormalizedAsset(
            id="asset-a",
            name="Web Portal",
            type="server",
            discovery_source="manual",
            metadata={"criticality": "high", "legacy": False},
        )
        self.asset_b = NormalizedAsset(
            id="asset-b",
            name="Core API Database",
            type="database",
            discovery_source="manual",
            metadata={"criticality": "critical", "legacy": False},
        )
        self.asset_c = NormalizedAsset(
            id="asset-c",
            name="External Payment Gateway",
            type="gateway",
            discovery_source="manual",
            metadata={"criticality": "critical", "legacy": True},
        )

        self.assets = [self.asset_a, self.asset_b, self.asset_c]

        # Define mock readiness assessments
        self.assessments = {
            "asset-a": AssetReadinessAssessment(
                asset_id="asset-a",
                asset_name="Web Portal",
                asset_type="server",
                readiness_score=85.0,
                classification="Hybrid Ready",
                identified_issues=[],
                recommended_actions=[],
                algorithm_support=AlgorithmSupportStatus(ml_kem_support=True, hybrid_support=True),
                tls_status=TLSStatus(tls_version="TLSv1.3", pqc_cipher_availability=True),
                certificate_status=CertificateStatus(rsa_certificates=True),
                library_status=LibraryStatus(openssl_version="3.0.2", oqs_provider=True),
                hardware_status=HardwareStatus(),
                software_status=SoftwareStatus(),
                benchmark_status=BenchmarkStatus(status="Unavailable"),
            ),
            "asset-b": AssetReadinessAssessment(
                asset_id="asset-b",
                asset_name="Core API Database",
                asset_type="database",
                readiness_score=95.0,
                classification="PQC Ready",
                identified_issues=[],
                recommended_actions=[],
                algorithm_support=AlgorithmSupportStatus(ml_kem_support=True),
                tls_status=TLSStatus(tls_version="TLSv1.3", pqc_cipher_availability=True),
                certificate_status=CertificateStatus(ecc_certificates=True),
                library_status=LibraryStatus(openssl_version="3.0.2", oqs_provider=True),
                hardware_status=HardwareStatus(),
                software_status=SoftwareStatus(),
                benchmark_status=BenchmarkStatus(status="Unavailable"),
            ),
            "asset-c": AssetReadinessAssessment(
                asset_id="asset-c",
                asset_name="External Payment Gateway",
                asset_type="gateway",
                readiness_score=35.0,
                classification="Legacy Blocker",
                identified_issues=["Unsupported operating system", "Legacy crypto module"],
                recommended_actions=["Upgrade OS to CentOS Stream 9"],
                algorithm_support=AlgorithmSupportStatus(ml_kem_support=False, ml_dsa_support=False),
                tls_status=TLSStatus(tls_version="TLSv1.2", pqc_cipher_availability=False),
                certificate_status=CertificateStatus(rsa_certificates=True, certificate_upgrade_required=True),
                library_status=LibraryStatus(openssl_version="1.0.2g"),
                hardware_status=HardwareStatus(legacy_firmware=True),
                software_status=SoftwareStatus(operating_system="CentOS 7"),
                benchmark_status=BenchmarkStatus(status="Unavailable"),
            ),
        }

    def test_determine_strategy(self) -> None:
        """Verify algorithm recommendation selection."""
        strategy_a = determine_strategy(self.asset_a)
        strategy_b = determine_strategy(self.asset_b)
        self.assertIn("ML-KEM", strategy_a)
        self.assertIn("ML-KEM", strategy_b)

    def test_determine_duration(self) -> None:
        """Verify duration assignments and penalties."""
        duration_clean = determine_duration(self.asset_a, has_blockers=False)
        duration_blocked = determine_duration(self.asset_c, has_blockers=True)
        self.assertEqual(duration_clean, 3.0)  # server base
        self.assertEqual(duration_blocked, 3.0 + 2.0 + 1.5)  # gateway base + legacy + blocker

    def test_calculate_step_risk(self) -> None:
        """Verify risk score weights and caps."""
        risk_a = calculate_step_risk(self.asset_a, self.assessments["asset-a"], num_dependents=0)
        risk_c = calculate_step_risk(self.asset_c, self.assessments["asset-c"], num_dependents=5)

        # Web portal is high criticality, 85% ready, 0 dependents
        # crit score = 37.5, readiness = 4.5, dep = 0. total = 42
        self.assertAlmostEqual(risk_a, 42.0, places=1)

        # Payment gateway is critical, 35% ready, 5 dependents
        # crit score = 50.0, readiness = 19.5, dep = 20.0. total = 89.5
        self.assertAlmostEqual(risk_c, 89.5, places=1)

    def test_schedule_waves_ordering(self) -> None:
        """Verify topological scheduling and critical system isolation across waves."""
        # Setup edges: Web Portal (asset-a) depends on Database (asset-b)
        # edge: a -> b. Therefore, b must migrate before a.
        edges = [CommunicationEdge(source="asset-a", target="asset-b", protocol="HTTPS")]

        # Run scheduler
        waves = schedule_waves(self.assets, self.assessments, edges)

        # Ensure we have waves
        self.assertTrue(len(waves) >= 2)

        # Verify that B (Database) is in an earlier wave than A (Web Portal)
        wave_b = next(w.wave_number for w in waves for s in w.steps if s.asset_id == "asset-b")
        wave_a = next(w.wave_number for w in waves for s in w.steps if s.asset_id == "asset-a")
        self.assertTrue(wave_b < wave_a)

        # Also, check critical asset isolation:
        # B and C are both critical, so they should not share the same wave.
        wave_c = next(w.wave_number for w in waves for s in w.steps if s.asset_id == "asset-c")
        self.assertNotEqual(wave_b, wave_c)

    def test_pdf_generation(self) -> None:
        """Verify raw PDF compiler output."""
        edges = [CommunicationEdge(source="asset-a", target="asset-b", protocol="HTTPS")]
        waves = schedule_waves(self.assets, self.assessments, edges)

        plan = MigrationPlan(
            name="Enterprise PQC Migration Plan",
            waves=waves,
            total_duration_hours=10.0,
            overall_risk_score=60.0,
            blockers_detected=1,
            simulation=True,
        )

        pdf_bytes = export_plan_to_pdf(plan)
        self.assertTrue(isinstance(pdf_bytes, bytes))
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))
        self.assertTrue(pdf_bytes.endswith(b"%%EOF\n"))
