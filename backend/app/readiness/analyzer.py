"""
Readiness analyzer — evaluates all assets from the inventory, resolves dependencies,
incorporates benchmark results, and compiles individual reports and enterprise summary.
"""

import logging
from typing import Any, Dict, List

from app.benchmark.models import get_session_store
from app.discovery.inventory import get_inventory
from app.discovery.models import NormalizedAsset
from app.readiness.models import (
    AssetReadinessAssessment,
    ReadinessSummary,
)
from app.readiness.rules import evaluate_asset_rules
from app.readiness.scorer import calculate_overall_score, classify_readiness

logger = logging.getLogger("pqc_engine.readiness.analyzer")


class ReadinessAnalyzer:
    """Orchestrates asset-by-asset evaluations and generates enterprise PQC summaries."""

    def analyze_all(self, profile: str = "ML-KEM-512 + ML-DSA Level 1 (Hybrid Level 1)") -> tuple[List[AssetReadinessAssessment], ReadinessSummary]:
        """
        Evaluate every discovered asset and construct the aggregate summary.

        Returns:
            A tuple of (list of assessments, enterprise summary object).
        """
        logger.info("Executing enterprise-wide PQC readiness analysis for profile: %s...", profile)

        inventory = get_inventory()
        assets = inventory.get_all()

        if not assets:
            logger.warning("No assets found in the discovery inventory. Returning empty results.")
            return [], ReadinessSummary()

        # Build lookup map for dependency resolution (similar to graph builder)
        lookup: Dict[str, NormalizedAsset] = {}
        for a in assets:
            lookup[a.id] = a
            lookup[a.name] = a
            orig_id = a.metadata.get("original_id")
            if orig_id:
                lookup[orig_id] = a

        # Fetch benchmark records
        benchmark_sessions = []
        try:
            benchmark_sessions = get_session_store().get_all()
        except Exception as e:
            logger.warning("Failed to fetch benchmark history: %s", e)

        assessments: List[AssetReadinessAssessment] = []

        for asset in assets:
            # Resolve dependency assets
            resolved_deps: List[NormalizedAsset] = []
            deps = asset.metadata.get("dependencies") or []
            for dep_ref in deps:
                if isinstance(dep_ref, str):
                    dep_asset = lookup.get(dep_ref.strip())
                    if dep_asset:
                        resolved_deps.append(dep_asset)

            # Evaluate rules
            scores, issues, recommendations, sub_statuses = evaluate_asset_rules(
                asset,
                resolved_deps,
                benchmark_sessions,
            )

            # Score & Classify
            overall_score = calculate_overall_score(
                scores,
                sub_statuses=sub_statuses,
                profile=profile,
                crypto_algorithm=asset.metadata.get("crypto_algorithm") or ""
            )
            classification = classify_readiness(overall_score, issues)

            # Build assessment report
            assessment = AssetReadinessAssessment(
                asset_id=asset.id,
                asset_name=asset.name,
                asset_type=asset.type,
                readiness_score=overall_score,
                classification=classification,
                algorithm_support=sub_statuses["algorithm_support"],
                tls_status=sub_statuses["tls_status"],
                certificate_status=sub_statuses["certificate_status"],
                library_status=sub_statuses["library_status"],
                hardware_status=sub_statuses["hardware_status"],
                software_status=sub_statuses["software_status"],
                benchmark_status=sub_statuses["benchmark_status"],
                identified_issues=issues,
                recommended_actions=recommendations,
            )
            assessments.append(assessment)

            # Update the source asset's readiness status field
            try:
                # Convert classification to discovery ReadinessLevel string representation
                readiness_mapping = {
                    "PQC Ready": "ready",
                    "Hybrid Ready": "partial",
                    "Upgrade Required": "partial",
                    "Legacy Blocker": "not_ready",
                    "Unsupported": "not_ready",
                }
                asset.readiness = readiness_mapping.get(classification, "unknown")
            except Exception:
                pass

        summary = self._compile_summary(assessments, assets)
        logger.info(
            "Readiness analysis complete. Enterprise Score: %.1f, Assessments count: %d",
            summary.enterprise_readiness_score,
            len(assessments),
        )
        return assessments, summary

    def _compile_summary(
        self,
        assessments: List[AssetReadinessAssessment],
        assets: List[NormalizedAsset],
    ) -> ReadinessSummary:
        """Calculate and assemble enterprise aggregate metrics."""
        if not assessments:
            return ReadinessSummary()

        total_assets = len(assessments)
        total_score = sum(a.readiness_score for a in assessments)
        avg_score = total_score / total_assets

        # Criticality weight mapping for risk estimation
        crit_weights = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1,
            "unknown": 1,
        }

        # Build list of asset records with their calculated risk factor
        asset_risks: List[Dict[str, Any]] = []
        for assessment in assessments:
            # Retrieve criticality from lookup metadata if available
            orig_asset = next((a for a in assets if a.id == assessment.asset_id), None)
            crit = "unknown"
            if orig_asset:
                crit = orig_asset.metadata.get("criticality") or "unknown"

            weight = crit_weights.get(crit.lower(), 1)
            # Risk = criticality weight * (100 - readiness score)
            risk_score = weight * (100.0 - assessment.readiness_score)

            asset_risks.append({
                "asset_id": assessment.asset_id,
                "asset_name": assessment.asset_name,
                "asset_type": assessment.asset_type,
                "readiness_score": assessment.readiness_score,
                "criticality": crit,
                "risk_score": round(risk_score, 2),
                "classification": assessment.classification,
            })

        # Sort highest risk assets (risk score descending)
        highest_risk = sorted(asset_risks, key=lambda x: x["risk_score"], reverse=True)[:5]

        # Sort lowest readiness assets (readiness score ascending)
        lowest_readiness = sorted(asset_risks, key=lambda x: x["readiness_score"])[:5]

        # Readiness score distribution buckets
        distribution = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
        for a in assessments:
            score = a.readiness_score
            if score <= 20:
                distribution["0-20"] += 1
            elif score <= 40:
                distribution["21-40"] += 1
            elif score <= 60:
                distribution["41-60"] += 1
            elif score <= 80:
                distribution["61-80"] += 1
            else:
                distribution["81-100"] += 1

        # Classifications count
        ready_cnt = sum(1 for a in assessments if a.classification == "PQC Ready")
        hybrid_cnt = sum(1 for a in assessments if a.classification == "Hybrid Ready")
        upgrade_cnt = sum(1 for a in assessments if a.classification == "Upgrade Required")
        blocked_cnt = sum(
            1 for a in assessments if a.classification in ("Legacy Blocker", "Unsupported")
        )

        return ReadinessSummary(
            enterprise_readiness_score=round(avg_score, 2),
            average_readiness=round(avg_score, 2),
            highest_risk_assets=highest_risk,
            lowest_readiness_assets=lowest_readiness,
            readiness_distribution=distribution,
            assets_ready=ready_cnt,
            assets_requiring_hybrid=hybrid_cnt,
            assets_requiring_upgrade=upgrade_cnt,
            blocked_assets=blocked_cnt,
        )
