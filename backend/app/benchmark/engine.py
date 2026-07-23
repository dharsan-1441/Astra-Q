"""
Benchmark module engine — orchestrates running benchmark runs and managing results.
"""

import uuid
from datetime import datetime
from typing import List

from app.benchmark.collector import collect_system_info
from app.benchmark.exceptions import OQSLibraryUnavailableError
from app.benchmark.models import BenchmarkSession, get_session_store
from app.benchmark.runner import is_oqs_available, run_benchmark
from app.benchmark.schemas import BenchmarkRunRequest


class PQCBenchmarkEngine:
    """Service layer representing the Post-Quantum Cryptography Benchmark Engine."""

    def __init__(self) -> None:
        self.store = get_session_store()

    def check_connection(self) -> bool:
        """Verify if the liboqs native backend is connected and ready."""
        return is_oqs_available()

    def run(self, request: BenchmarkRunRequest) -> BenchmarkSession:
        """
        Run a cryptographic benchmark job and record the session details.

        Raises:
            OQSLibraryUnavailableError: If liboqs is not connected.
            BenchmarkExecutionError: If a benchmark operation fails.
        """
        if not self.check_connection():
            raise OQSLibraryUnavailableError("Benchmark backend not connected")

        # Collect host system hardware and environment info
        sys_info = collect_system_info()

        # Run benchmark measurements
        metrics = run_benchmark(
            algorithm=request.algorithm,
            parameter_set=request.parameter_set,
            iterations=request.iterations,
            warmup_runs=request.warmup_runs,
            thread_count=request.thread_count,
            repeat_count=request.repeat_count,
        )

        # Build session record
        session = BenchmarkSession(
            id=str(uuid.uuid4()),
            algorithm=request.algorithm,
            parameter_set=request.parameter_set,
            hardware_info={
                "cpu_model": sys_info["cpu_model"],
                "architecture": sys_info["architecture"],
                "logical_cores": sys_info["logical_cores"],
                "total_memory_gb": sys_info["total_memory_gb"],
            },
            operating_system=sys_info["operating_system"],
            python_version=sys_info["python_version"],
            timestamp=datetime.utcnow().isoformat() + "Z",
            metrics=metrics,
            parameters={
                "iterations": request.iterations,
                "warmup_runs": request.warmup_runs,
                "thread_count": request.thread_count,
                "repeat_count": request.repeat_count,
            },
        )

        # Record session in store
        return self.store.add(session)

    def get_history(self) -> List[BenchmarkSession]:
        """Retrieve all recorded benchmark sessions."""
        return self.store.get_all()

    def get_session(self, session_id: str) -> BenchmarkSession:
        """Retrieve a specific benchmark session."""
        return self.store.get(session_id)

    def delete_session(self, session_id: str) -> None:
        """Remove a benchmark session."""
        self.store.delete(session_id)
