"""
Graph module exceptions — structured error hierarchy for graph operations.
"""

class GraphError(Exception):
    """Base exception for all graph operations."""

    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class GraphBuildError(GraphError):
    """Raised when building the communication graph fails."""
    pass


class GraphValidationError(GraphError):
    """Raised when the graph validation (e.g. cycle check, invalid dependencies) fails."""
    pass


class ExportError(GraphError):
    """Raised when exporting the graph to formats like GraphML, JSON or PNG fails."""
    pass
