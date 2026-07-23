"""
Reports exceptions — domain-specific exceptions for report compilation and storage.
"""

class ReportError(Exception):
    """Base exception for all report errors."""
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class ReportNotFoundError(ReportError):
    """Raised when a requested deployment report is not found in memory."""


class ReportGenerationError(ReportError):
    """Raised when report aggregation or compilation fails."""
