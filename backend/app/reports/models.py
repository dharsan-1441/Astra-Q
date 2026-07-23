"""
Reports models — Pydantic definitions for consolidated deployment reports,
constituent section statistics, and report memory storage.
"""

import uuid
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.reports.exceptions import ReportNotFoundError


class ExecutiveSummary(BaseModel):
    """Overall highlights and recommendations of the migration status."""
    overall_status: str = "Pending"
    readiness_rating: str = "Upgrade Required"
    key_findings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class EnterpriseStats(BaseModel):
    """Aggregated numerical metrics across the inventory."""
    total_assets: int = 0
    ready_assets: int = 0
    hybrid_ready_assets: int = 0
    upgrade_required_assets: int = 0
    legacy_blockers: int = 0
    overall_readiness_score: float = 0.0
    estimated_migration_duration: float = 0.0
    overall_migration_risk: float = 0.0


class DependencyGraphStats(BaseModel):
    """Calculated metrics from the asset communication mapping."""
    total_nodes: int = 0
    total_edges: int = 0
    critical_nodes: int = 0
    connected_components: int = 0


class CompatibilitySummary(BaseModel):
    """Inferred protocol and system level compatibility distributions."""
    tls_1_3_compatible_percent: float = 0.0
    openssl_oqs_compatible_percent: float = 0.0
    pqc_algorithm_ready_percent: float = 0.0
    cert_upgrade_required_percent: float = 0.0


class ComplianceSummary(BaseModel):
    """Status indicating alignment with NIST standard guidelines."""
    fips_203_status: str = "Non-Compliant"  # ML-KEM
    fips_204_status: str = "Non-Compliant"  # ML-DSA
    checklist: Dict[str, bool] = Field(default_factory=dict)
    notes: str = ""


class DeploymentReport(BaseModel):
    """Consolidated state report of the Post-Quantum cryptography migration."""
    id: str = Field(default_factory=lambda: f"report-{uuid.uuid4().hex[:12]}")
    name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    summary: ExecutiveSummary = Field(default_factory=ExecutiveSummary)
    statistics: EnterpriseStats = Field(default_factory=EnterpriseStats)
    dependency_graph_stats: DependencyGraphStats = Field(default_factory=DependencyGraphStats)
    compatibility_summary: CompatibilitySummary = Field(default_factory=CompatibilitySummary)
    benchmark_summary: List[Dict[str, Any]] = Field(default_factory=list)
    migration_plan_summary: Dict[str, Any] = Field(default_factory=dict)
    compliance_status: ComplianceSummary = Field(default_factory=ComplianceSummary)
    action_items: List[Dict[str, Any]] = Field(default_factory=list)
    rollback_strategy: str = ""
    checklist: List[Dict[str, Any]] = Field(default_factory=list)
    
    # New Quantum & Hybrid fields
    quantum_simulation_summary: Optional[Dict[str, Any]] = None
    hybrid_security_profile: Optional[Dict[str, Any]] = None
    benchmark_comparison_tables: Optional[List[Dict[str, Any]]] = None
    quantum_resource_analysis: Optional[Dict[str, Any]] = None
    tls_benchmark_results: Optional[Dict[str, Any]] = None
    complexity_analysis: Optional[Dict[str, Any]] = None



class ReportStore:
    """Thread-safe in-memory cache for compiled reports."""

    def __init__(self) -> None:
        self._reports: Dict[str, DeploymentReport] = {}
        self._lock = Lock()

    def add(self, report: DeploymentReport) -> None:
        """Cache a report object."""
        with self._lock:
            self._reports[report.id] = report

    def get(self, report_id: str) -> DeploymentReport:
        """Get report by ID, or raise ReportNotFoundError."""
        with self._lock:
            report = self._reports.get(report_id)
        if not report:
            raise ReportNotFoundError(f"PQC Report with ID '{report_id}' not found.")
        return report

    def get_latest(self) -> Optional[DeploymentReport]:
        """Retrieve the newest generated report, or None."""
        with self._lock:
            if not self._reports:
                return None
            sorted_reports = sorted(
                self._reports.values(), key=lambda r: r.created_at, reverse=True
            )
            return sorted_reports[0]

    def get_all(self) -> List[DeploymentReport]:
        """List all compiled reports ordered by creation time descending."""
        with self._lock:
            return sorted(
                self._reports.values(), key=lambda r: r.created_at, reverse=True
            )

    def clear(self) -> None:
        """Wipe report cache."""
        with self._lock:
            self._reports.clear()


# Application-wide singleton store
_report_store = ReportStore()


def get_report_store() -> ReportStore:
    """Retrieve the global ReportStore singleton instance."""
    return _report_store
