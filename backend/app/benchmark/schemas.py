"""
Benchmark module API schemas — request and response verification.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, model_validator

from app.benchmark.models import BenchmarkSession


class BenchmarkRunRequest(BaseModel):
    """Validation schema for executing a benchmark run."""

    algorithm: Optional[str] = Field(
        None,
        description="Cryptographic algorithm category: 'ML-KEM' or 'ML-DSA'",
    )
    parameter_set: Optional[str] = Field(
        None,
        description="Specific parameter set identifier (e.g., 'ML-KEM-768')",
    )
    security_level: Optional[int] = Field(
        None,
        ge=1,
        le=3,
        description="Hybrid Enterprise Security Level (1, 2, or 3)",
    )
    iterations: int = Field(
        10,
        ge=1,
        le=10000,
        description="Number of benchmark iterations per repeat cycle",
    )
    warmup_runs: int = Field(
        2,
        ge=0,
        le=1000,
        description="Number of preliminary executions (not counted in metrics)",
    )
    thread_count: int = Field(
        1,
        ge=1,
        le=64,
        description="Number of parallel execution threads to run",
    )
    repeat_count: int = Field(
        1,
        ge=1,
        le=100,
        description="Number of repeat cycles to aggregate statistics from",
    )

    @model_validator(mode="after")
    def validate_algorithm_parameters(self) -> "BenchmarkRunRequest":
        sec_level = self.security_level

        if sec_level is not None:
            # Populate fields for database compatibility
            self.algorithm = "HYBRID"
            self.parameter_set = f"Level {sec_level}"
            return self

        if not self.algorithm or not self.parameter_set:
            raise ValueError(
                "Either 'security_level' or both 'algorithm' and 'parameter_set' must be provided."
            )

        algo = self.algorithm.upper().strip()
        param = self.parameter_set.upper().strip()

        valid_kem = ["ML-KEM-512", "ML-KEM-768", "ML-KEM-1024"]
        valid_sig = ["ML-DSA-44", "ML-DSA-65", "ML-DSA-87"]

        if algo == "ML-KEM":
            if param not in valid_kem:
                raise ValueError(
                    f"Invalid parameter set '{self.parameter_set}' for ML-KEM. "
                    f"Must be one of: {', '.join(valid_kem)}"
                )
        elif algo == "ML-DSA":
            if param not in valid_sig:
                raise ValueError(
                    f"Invalid parameter set '{self.parameter_set}' for ML-DSA. "
                    f"Must be one of: {', '.join(valid_sig)}"
                )
        elif algo == "CLASSICAL":
            self.parameter_set = "Classical Only"
        else:
            raise ValueError(
                f"Invalid algorithm '{self.algorithm}'. Must be 'ML-KEM', 'ML-DSA', or 'CLASSICAL'"
            )

        # Normalize to standard uppercase representations
        self.algorithm = algo
        self.parameter_set = param
        return self


class BenchmarkResultsResponse(BaseModel):
    """List of all benchmark sessions with connectivity status of the OQS backend."""

    connected: bool = Field(
        ...,
        description="True if the native liboqs backend is connected, False otherwise",
    )
    sessions: List[BenchmarkSession] = Field(
        default_factory=list,
        description="List of recorded benchmark sessions",
    )
