"""
Planner engine — service layer orchestrating the inputs from discovery,
graph, and readiness engines, running the scheduler, and saving plans.
"""

import logging
from typing import List

from app.discovery.inventory import get_inventory
from app.graph.builder import GraphBuilder, get_graph_store
from app.planner.exceptions import PlanGenerationError
from app.planner.models import MigrationPlan, get_planner_store
from app.planner.scheduler import schedule_waves
from app.readiness.engine import PQCReadinessEngine

logger = logging.getLogger("pqc_engine.planner.engine")


class PQCPlannerEngine:
    """Service layer managing the lifecycle of post-quantum migration plans."""

    def __init__(self) -> None:
        self.store = get_planner_store()
        self.readiness_engine = PQCReadinessEngine()

    def generate_plan(self, name: str, simulation: bool = True) -> MigrationPlan:
        """
        Synthesize all system configurations, communication links, and security scores
        into a sequenced, risk-evaluated migration roadmap.
        """
        logger.info("Starting migration plan generation for: %s", name)

        # 1. Fetch inventory assets
        assets = get_inventory().get_all()
        if not assets:
            raise PlanGenerationError(
                "Cannot generate plan: Inventory is empty. Import enterprise discovery data first."
            )

        # 2. Compile/re-run readiness assessments
        try:
            self.readiness_engine.run_analysis()
            assessments_list = self.readiness_engine.get_assessments()
            assessments = {a.asset_id: a for a in assessments_list}
        except Exception as exc:
            logger.error("Readiness calculation failed: %s", exc)
            raise PlanGenerationError(
                f"Failed to fetch readiness assessments: {exc}"
            ) from exc

        # 3. Compile/re-build communication graph
        try:
            # Rebuild communication graph nodes and edges to reflect current state
            GraphBuilder().build()
            edges = get_graph_store().get_edges()
        except Exception as exc:
            logger.error("Communication graph compilation failed: %s", exc)
            raise PlanGenerationError(
                f"Failed to compile communication graph: {exc}"
            ) from exc

        # 4. Execute scheduling waves
        try:
            waves = schedule_waves(assets, assessments, edges)
        except Exception as exc:
            logger.error("Scheduling algorithm failed: %s", exc)
            raise PlanGenerationError(
                f"Scheduling engine failed: {exc}"
            ) from exc

        # 5. Calculate overall plan metrics
        total_duration = sum(w.estimated_duration_hours for w in waves)
        overall_risk = max((w.wave_risk_score for w in waves), default=0.0)

        blockers_count = 0
        for wave in waves:
            for step in wave.steps:
                blockers_count += len(step.blockers)

        # 6. Instantiate plan model
        plan = MigrationPlan(
            name=name,
            waves=waves,
            total_duration_hours=total_duration,
            overall_risk_score=overall_risk,
            blockers_detected=blockers_count,
            simulation=simulation,
        )

        self.store.add(plan)
        logger.info("Successfully saved migration plan: %s (ID: %s)", plan.name, plan.id)
        return plan

    def get_plan(self, plan_id: str) -> MigrationPlan:
        """Retrieve a specific generated migration plan."""
        return self.store.get(plan_id)

    def get_all_plans(self) -> List[MigrationPlan]:
        """Retrieve all generated plans, auto-generating a default one if empty."""
        plans = self.store.get_all()
        if not plans:
            try:
                logger.info("No migration plans found in store. Generating default plan.")
                self.generate_plan(name="Default Enterprise Migration Plan", simulation=True)
                plans = self.store.get_all()
            except Exception as exc:
                logger.warning("Failed to auto-generate default plan: %s", exc)

        return plans
