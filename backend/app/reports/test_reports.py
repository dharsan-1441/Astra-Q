"""
Reports unit tests — verifies report data aggregation, compatibility calculations,
subgraph connected components counts, and PDF document rendering.
"""

import unittest
from datetime import datetime, timezone

from app.discovery.inventory import get_inventory
from app.discovery.models import NormalizedAsset
from app.graph.models import AssetNode, CommunicationEdge
from app.graph.builder import get_graph_store
from app.readiness.models import (
    get_readiness_store,
    AssetReadinessAssessment,
    ReadinessSummary,
    AlgorithmSupportStatus,
    TLSStatus,
    CertificateStatus,
    LibraryStatus,
    HardwareStatus,
    SoftwareStatus,
    BenchmarkStatus,
)
from app.planner.models import get_planner_store, MigrationPlan, MigrationWave
from app.reports.generator import ReportGenerator
from app.reports.exporter import export_report_to_pdf
from app.reports.service import count_connected_components


class TestReports(unittest.TestCase):
    """Test suite covering post-quantum consolidated reporting calculations and formatting."""

    def setUp(self) -> None:
        self.inventory = get_inventory()
        self.readiness_store = get_readiness_store()
        self.graph_store = get_graph_store()
        self.planner_store = get_planner_store()

        # Clear stores before testing
        self.inventory.clear()
        self.readiness_store.clear()
        self.graph_store.clear()
        self.planner_store.clear()

        # Define mock assets
        self.asset_1 = NormalizedAsset(
            id="asset-1",
            name="Public Gateway Server",
            type="server",
            discovery_source="manual",
            metadata={"criticality": "high", "legacy": False},
        )
        self.asset_2 = NormalizedAsset(
            id="asset-2",
            name="Secure DB Node",
            type="database",
            discovery_source="manual",
            metadata={"criticality": "critical", "legacy": False},
        )
        self.asset_3 = NormalizedAsset(
            id="asset-3",
            name="Legacy Directory Server",
            type="server",
            discovery_source="manual",
            metadata={"criticality": "medium", "legacy": True},
        )

        self.inventory.add(self.asset_1)
        self.inventory.add(self.asset_2)
        self.inventory.add(self.asset_3)

        # Mock readiness
        self.assessments = [
            AssetReadinessAssessment(
                asset_id="asset-1",
                asset_name="Public Gateway Server",
                asset_type="server",
                readiness_score=80.0,
                classification="Hybrid Ready",
                algorithm_support=AlgorithmSupportStatus(ml_kem_support=True, hybrid_support=True),
                tls_status=TLSStatus(tls_version="TLS 1.3", pqc_cipher_availability=True),
                certificate_status=CertificateStatus(ecc_certificates=True),
                library_status=LibraryStatus(openssl_version="3.0.2", oqs_provider=True),
                hardware_status=HardwareStatus(),
                software_status=SoftwareStatus(),
                benchmark_status=BenchmarkStatus(status="Unavailable"),
            ),
            AssetReadinessAssessment(
                asset_id="asset-2",
                asset_name="Secure DB Node",
                asset_type="database",
                readiness_score=90.0,
                classification="PQC Ready",
                algorithm_support=AlgorithmSupportStatus(ml_kem_support=True),
                tls_status=TLSStatus(tls_version="TLS 1.3", pqc_cipher_availability=True),
                certificate_status=CertificateStatus(ecc_certificates=True),
                library_status=LibraryStatus(openssl_version="3.0.2", oqs_provider=True),
                hardware_status=HardwareStatus(),
                software_status=SoftwareStatus(),
                benchmark_status=BenchmarkStatus(status="Unavailable"),
            ),
            AssetReadinessAssessment(
                asset_id="asset-3",
                asset_name="Legacy Directory Server",
                asset_type="server",
                readiness_score=30.0,
                classification="Legacy Blocker",
                identified_issues=["Legacy cert key size"],
                recommended_actions=["Upgrade certificate parameters"],
                algorithm_support=AlgorithmSupportStatus(),
                tls_status=TLSStatus(tls_version="TLS 1.2"),
                certificate_status=CertificateStatus(rsa_certificates=True, certificate_upgrade_required=True),
                library_status=LibraryStatus(openssl_version="1.0.2g"),
                hardware_status=HardwareStatus(legacy_firmware=True),
                software_status=SoftwareStatus(),
                benchmark_status=BenchmarkStatus(status="Unavailable"),
            ),
        ]
        self.readiness_store.set_results(
            self.assessments,
            ReadinessSummary(
                enterprise_readiness_score=66.7,
                average_readiness=66.7,
                assets_ready=1,
                assets_requiring_hybrid=1,
                assets_requiring_upgrade=0,
                blocked_assets=1,
            ),
        )

        # Mock communication graph
        self.node_1 = AssetNode(
            id="asset-1",
            name="Public Gateway Server",
            type="server",
            discovery_source="manual",
        )
        self.node_2 = AssetNode(
            id="asset-2",
            name="Secure DB Node",
            type="database",
            discovery_source="manual",
        )
        self.node_3 = AssetNode(
            id="asset-3",
            name="Legacy Directory Server",
            type="server",
            discovery_source="manual",
        )
        self.edge = CommunicationEdge(source="asset-1", target="asset-2", protocol="HTTPS")
        self.graph_store.set_graph([self.node_1, self.node_2, self.node_3], [self.edge], [])

        # Mock migration plan
        self.wave = MigrationWave(
            wave_number=1,
            name="Wave 1 - Infrastructure",
            steps=[],
            estimated_duration_hours=5.0,
            maintenance_window="Saturday 01:00 - 05:00 UTC",
            wave_risk_score=40.0,
        )
        self.plan = MigrationPlan(
            name="Audit Plan",
            waves=[self.wave],
            total_duration_hours=5.0,
            overall_risk_score=40.0,
            blockers_detected=1,
            simulation=True,
        )
        self.planner_store.add(self.plan)

    def tearDown(self) -> None:
        self.inventory.clear()
        self.readiness_store.clear()
        self.graph_store.clear()
        self.planner_store.clear()

    def test_count_connected_components(self) -> None:
        """Verify network component calculation correctness."""
        nodes = ["A", "B", "C", "D"]
        class MockEdge:
            def __init__(self, s, t):
                self.source = s
                self.target = t

        edges = [MockEdge("A", "B")]
        components = count_connected_components(nodes, edges)
        self.assertEqual(components, 3)

    def test_report_generation_compiles(self) -> None:
        """Verify generator aggregates all stores and outputs accurate statistics."""
        generator = ReportGenerator()
        report = generator.generate_report(name="Enterprise Status Audit")

        self.assertEqual(report.name, "Enterprise Status Audit")
        self.assertEqual(report.statistics.total_assets, 3)
        self.assertEqual(report.statistics.ready_assets, 1)
        self.assertEqual(report.statistics.legacy_blockers, 1)
        self.assertAlmostEqual(report.statistics.overall_readiness_score, 66.7, places=1)
        self.assertEqual(report.statistics.estimated_migration_duration, 5.0)

        # Graph node/edge stats
        self.assertEqual(report.dependency_graph_stats.total_nodes, 3)
        self.assertEqual(report.dependency_graph_stats.total_edges, 1)

        # Compatibility % calculations:
        # TLS 1.3: 2 out of 3 = 66.7%
        # OpenSSL OQS: 2 out of 3 = 66.7%
        self.assertAlmostEqual(report.compatibility_summary.tls_1_3_compatible_percent, 66.7, places=1)
        self.assertAlmostEqual(report.compatibility_summary.openssl_oqs_compatible_percent, 66.7, places=1)

        # Action items from blockers: should contain "Upgrade certificate parameters"
        self.assertTrue(len(report.action_items) > 0)
        self.assertEqual(report.action_items[0]["target"], "Legacy Directory Server")
        self.assertEqual(report.action_items[0]["action"], "Upgrade certificate parameters")

    def test_pdf_rendering(self) -> None:
        """Verify compiled PDF starts and ends with standard compliant bytes."""
        generator = ReportGenerator()
        report = generator.generate_report(name="Export Check Report")
        
        pdf_bytes = export_report_to_pdf(report)
        self.assertTrue(isinstance(pdf_bytes, bytes))
        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))
        self.assertTrue(pdf_bytes.endswith(b"%%EOF\n"))
