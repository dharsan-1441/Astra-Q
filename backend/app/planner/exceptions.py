"""
Planner module exceptions — structured error hierarchy
for all PQC migration planning operations.
"""


class PlannerError(Exception):
    """Base exception for all PQC planner operations."""

    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class PlanNotFoundError(PlannerError):
    """Raised when a specific migration plan is not found."""
    pass


class PlanGenerationError(PlannerError):
    """Raised when the planner engine fails during plan generation."""
    pass
