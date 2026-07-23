"""
Planner models — Pydantic models for migration plans, waves, steps,
and the in-memory plan storage store.
"""

import uuid
from datetime import datetime, timezone
from threading import Lock
from typing import Dict, List
from pydantic import BaseModel, Field

from app.planner.exceptions import PlanNotFoundError


class MigrationStep(BaseModel):
    """A single migration step targeting a specific enterprise asset."""
    step_number: int
    asset_id: str
    asset_name: str
    asset_type: str
    recommended_strategy: str  # "ML-KEM", "ML-DSA", "Hybrid (ML-KEM + ECDH)", etc.
    risk_score: float  # 0 to 100
    blockers: List[str] = Field(default_factory=list)
    rollback_plan: str
    duration_hours: float


class MigrationWave(BaseModel):
    """A logical grouping of migration steps executed together during a maintenance window."""
    wave_number: int
    name: str
    steps: List[MigrationStep] = Field(default_factory=list)
    estimated_duration_hours: float = 0.0
    maintenance_window: str
    wave_risk_score: float = 0.0


class MigrationPlan(BaseModel):
    """The complete generated migration plan document."""
    id: str = Field(default_factory=lambda: f"plan-{uuid.uuid4().hex[:12]}")
    name: str
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    status: str = "draft"  # "draft", "active", "completed"
    waves: List[MigrationWave] = Field(default_factory=list)
    total_duration_hours: float = 0.0
    overall_risk_score: float = 0.0
    blockers_detected: int = 0
    simulation: bool = True


class PlannerStore:
    """Thread-safe in-memory store for generated migration plans."""

    def __init__(self) -> None:
        self._plans: Dict[str, MigrationPlan] = {}
        self._lock = Lock()

    def add(self, plan: MigrationPlan) -> MigrationPlan:
        """Store a new migration plan."""
        with self._lock:
            self._plans[plan.id] = plan
            return plan

    def get(self, plan_id: str) -> MigrationPlan:
        """Retrieve a specific plan by its ID."""
        with self._lock:
            plan = self._plans.get(plan_id)
        if plan is None:
            raise PlanNotFoundError(f"Migration plan not found: {plan_id}")
        return plan

    def get_all(self) -> List[MigrationPlan]:
        """Retrieve all stored plans."""
        with self._lock:
            return list(self._plans.values())

    def delete(self, plan_id: str) -> None:
        """Remove a plan from the store."""
        with self._lock:
            if plan_id not in self._plans:
                raise PlanNotFoundError(f"Migration plan not found: {plan_id}")
            del self._plans[plan_id]

    def clear(self) -> None:
        """Clear all stored plans."""
        with self._lock:
            self._plans.clear()


# Module-level singleton
_planner_store = PlannerStore()


def get_planner_store() -> PlannerStore:
    """Return the global PlannerStore singleton instance."""
    return _planner_store
