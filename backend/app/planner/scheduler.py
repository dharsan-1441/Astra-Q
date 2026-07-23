"""
Planner scheduler — schedules enterprise assets into sequential waves,
ensuring dependency constraints and critical system separation rules are met.
"""

import logging
from typing import Any, Dict, List, Set

from app.discovery.models import NormalizedAsset
from app.planner.models import MigrationStep, MigrationWave
from app.planner.risk import (
    calculate_step_risk,
    determine_duration,
    determine_rollback_plan,
    determine_strategy,
)
from app.readiness.models import AssetReadinessAssessment

logger = logging.getLogger("pqc_engine.planner.scheduler")


def schedule_waves(
    assets: List[NormalizedAsset],
    assessments: Dict[str, AssetReadinessAssessment],
    edges: List[Any],
) -> List[MigrationWave]:
    """
    Generate sequenced waves of migration steps ensuring parents are migrated before dependents,
    critical assets are isolated across waves, and circular loops are handled.
    """
    logger.info("Scheduling %d assets into migration waves...", len(assets))

    # Initialize graph structures
    dependencies_map: Dict[str, Set[str]] = {a.id: set() for a in assets}
    dependents_map: Dict[str, Set[str]] = {a.id: set() for a in assets}

    # Populate dependency maps
    # An edge from source to target means source calls/depends on target.
    # Therefore, target must be migrated before or during the same wave as source.
    for edge in edges:
        if edge.source in dependencies_map and edge.target in dependencies_map:
            # target is a dependency of source
            dependencies_map[edge.source].add(edge.target)
            dependents_map[edge.target].add(edge.source)

    unscheduled = set(a.id for a in assets)
    waves: List[MigrationWave] = []
    wave_number = 1

    # Check criticality status of assets helper
    def is_critical(asset_id: str) -> bool:
        asset_obj = next((a for a in assets if a.id == asset_id), None)
        if not asset_obj:
            return False
        crit = str(asset_obj.metadata.get("criticality") or "unknown").lower()
        return crit in ("critical", "high")

    # Helper to check if a node has any remaining transitive dependencies in the postponed list
    def depends_on_any(node_id: str, postponed_set: Set[str]) -> bool:
        for p in postponed_set:
            if p in dependencies_map[node_id]:
                return True
        return False

    while unscheduled:
        # Find candidates for the current wave: assets in unscheduled with 0 dependencies in unscheduled
        candidates = []
        for aid in unscheduled:
            remaining_deps = dependencies_map[aid] & unscheduled
            if not remaining_deps:
                candidates.append(aid)

        # Cycle Resolution: If there is a circular dependency, choose the one with fewest remaining dependencies
        if not candidates:
            logger.warning("Circular dependency detected among remaining assets. Splitting loop.")
            min_deps = 999999
            best_candidate = None
            for aid in unscheduled:
                rem_len = len(dependencies_map[aid] & unscheduled)
                if rem_len < min_deps:
                    min_deps = rem_len
                    best_candidate = aid
            if best_candidate:
                candidates = [best_candidate]
            else:
                break

        # Critical System Isolation:
        # Prevent multiple critical/high assets from migrating in the same wave.
        critical_candidates = [c for c in candidates if is_critical(c)]

        if len(critical_candidates) > 1:
            # Keep only the first critical asset in this wave, postpone the rest
            keep_critical = critical_candidates[0]
            postponed = set(critical_candidates[1:])

            # Transitive postponement: also postpone any candidate depending on postponed nodes
            additional_postponed = set()
            for c in candidates:
                if c in postponed or c == keep_critical:
                    continue
                if depends_on_any(c, postponed):
                    additional_postponed.add(c)

            postponed.update(additional_postponed)
            candidates = [c for c in candidates if c not in postponed]

        # Assemble step definitions for this wave
        wave_steps = []
        for aid in candidates:
            asset = next(a for a in assets if a.id == aid)
            assess = assessments.get(aid)

            # Blockers detection
            blockers = []
            if assess:
                if assess.classification in ("Legacy Blocker", "Unsupported"):
                    blockers.extend(assess.identified_issues)
            if not blockers and asset.metadata.get("legacy", False):
                blockers.append("Asset marked as legacy system")

            # Risk and recommendations
            strategy = determine_strategy(asset)
            rollback = determine_rollback_plan(asset)
            duration = determine_duration(asset, len(blockers) > 0)
            
            # Step risk score
            num_deps = len(dependents_map[aid])
            risk = calculate_step_risk(asset, assess, num_deps)

            step = MigrationStep(
                step_number=len(wave_steps) + 1,
                asset_id=asset.id,
                asset_name=asset.name,
                asset_type=asset.type,
                recommended_strategy=strategy,
                risk_score=risk,
                blockers=blockers,
                rollback_plan=rollback,
                duration_hours=duration,
            )
            wave_steps.append(step)

        # Create Wave Object
        wave_dur = sum(s.duration_hours for s in wave_steps)
        wave_risk = max((s.risk_score for s in wave_steps), default=0.0)

        # Maintenance window assignment: alternate weekend hours
        day = "Saturday" if wave_number % 2 == 1 else "Sunday"
        hour_start = "02:00" if wave_number <= 2 else "22:00"
        hour_end = "06:00" if wave_number <= 2 else "02:00"
        mw = f"{day} {hour_start} - {hour_end} UTC"

        wave = MigrationWave(
            wave_number=wave_number,
            name=f"Wave {wave_number} - Infrastructure Transition",
            steps=wave_steps,
            estimated_duration_hours=wave_dur,
            maintenance_window=mw,
            wave_risk_score=wave_risk,
        )
        waves.append(wave)

        # Remove scheduled assets
        for c in candidates:
            unscheduled.remove(c)

        wave_number += 1

    return waves
