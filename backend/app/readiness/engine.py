"""
Readiness module engine — service layer representing the PQC Readiness Engine.
"""

from typing import List

from app.readiness.analyzer import ReadinessAnalyzer
from app.readiness.models import AssetReadinessAssessment, ReadinessSummary, get_readiness_store


class PQCReadinessEngine:
    """Service layer coordinating readiness calculations, analysis, and data access."""

    def __init__(self) -> None:
        self.store = get_readiness_store()
        self.analyzer = ReadinessAnalyzer()

    def run_analysis(self, profile: str = "ML-KEM-512 + ML-DSA Level 1 (Hybrid Level 1)") -> List[AssetReadinessAssessment]:
        """Perform inventory evaluations and update the stored results."""
        assessments, summary = self.analyzer.analyze_all(profile=profile)
        self.store.set_results(assessments, summary)
        return assessments

    def get_assessments(self) -> List[AssetReadinessAssessment]:
        """Retrieve all assessments, running analysis if empty."""
        items = self.store.get_all()
        if not items:
            return self.run_analysis()
        return items

    def get_assessment(self, asset_id: str) -> AssetReadinessAssessment:
        """Retrieve a specific asset assessment, running analysis first if not found."""
        try:
            return self.store.get(asset_id)
        except Exception:
            self.run_analysis()
            return self.store.get(asset_id)

    def get_summary(self) -> ReadinessSummary:
        """Retrieve the global summary, running analysis if none is available."""
        summary = self.store.get_summary()
        # If store has no calculations, trigger a run
        if summary.enterprise_readiness_score == 0.0 and not self.store.get_all():
            self.run_analysis()
            return self.store.get_summary()
        return summary
