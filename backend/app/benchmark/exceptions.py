"""
Benchmark module exceptions — structured error hierarchy
for all NIST algorithm benchmarking operations.
"""


class PQCBenchmarkError(Exception):
    """Base exception for all post-quantum cryptography benchmarking operations."""

    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class OQSLibraryUnavailableError(PQCBenchmarkError):
    """Raised when the liboqs/python-oqs library is not loaded or available."""
    pass


class InvalidBenchmarkParameterError(PQCBenchmarkError):
    """Raised when Iterations, Thread Count, Warm-up Runs, or other parameters are invalid."""
    pass


class BenchmarkExecutionError(PQCBenchmarkError):
    """Raised when a cryptographic operation fails during benchmarking."""
    pass


class SessionNotFoundError(PQCBenchmarkError):
    """Raised when a benchmark session cannot be found in the store."""
    pass
