"""
Readiness module exceptions — structured error hierarchy
for all Post-Quantum Cryptography readiness assessments.
"""


class ReadinessError(Exception):
    """Base exception for all PQC readiness assessment operations."""

    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class AssetReadinessNotFoundError(ReadinessError):
    """Raised when an assessment for a specific asset is not found."""
    pass


class ReadinessAnalysisError(ReadinessError):
    """Raised when the readiness engine fails during batch analysis execution."""
    pass
