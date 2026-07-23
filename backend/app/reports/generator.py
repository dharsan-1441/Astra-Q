"""
Reports generator — orchestrates the compilation of aggregated metrics
into fully formed DeploymentReport models and saves them to the store.
"""

import logging

from app.reports.exceptions import ReportGenerationError
from app.reports.models import DeploymentReport, get_report_store
from app.reports.service import ReportService

logger = logging.getLogger("pqc_engine.reports.generator")


class ReportGenerator:
    """Coordinator triggering metrics collection and saving new deployment reports."""

    def __init__(self) -> None:
        self.service = ReportService()
        self.store = get_report_store()

    def generate_report(self, name: str = "PQC Migration Audit Report") -> DeploymentReport:
        """Collect metrics across all sub-systems, validate, and write to store."""
        logger.info("Starting report generation: %s", name)
        try:
            metrics = self.service.compile_metrics()
            report = DeploymentReport(
                name=name,
                summary=metrics["summary"],
                statistics=metrics["statistics"],
                dependency_graph_stats=metrics["dependency_graph_stats"],
                compatibility_summary=metrics["compatibility_summary"],
                benchmark_summary=metrics["benchmark_summary"],
                migration_plan_summary=metrics["migration_plan_summary"],
                compliance_status=metrics["compliance_status"],
                action_items=metrics["action_items"],
                rollback_strategy=metrics["rollback_strategy"],
                checklist=metrics["checklist"],
                quantum_simulation_summary=metrics.get("quantum_simulation_summary"),
                hybrid_security_profile=metrics.get("hybrid_security_profile"),
                benchmark_comparison_tables=metrics.get("benchmark_comparison_tables"),
                quantum_resource_analysis=metrics.get("quantum_resource_analysis"),
                tls_benchmark_results=metrics.get("tls_benchmark_results"),
                complexity_analysis=metrics.get("complexity_analysis"),
            )
            self.store.add(report)
            logger.info("Successfully generated report: %s (ID: %s)", report.name, report.id)
            return report
        except Exception as exc:
            logger.error("Failed to generate deployment report: %s", exc)
            raise ReportGenerationError(
                f"Report generation pipeline failed: {exc}"
            ) from exc
