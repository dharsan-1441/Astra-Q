"""
Benchmark module models — data structures and session storage manager.
"""

import json
import logging
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.benchmark.exceptions import SessionNotFoundError

logger = logging.getLogger("pqc_engine.benchmark.models")


class MetricStats(BaseModel):
    """Statistical distribution of a benchmark measurement."""
    average: float = 0.0
    median: float = 0.0
    min: float = 0.0
    max: float = 0.0
    stddev: float = 0.0
    p95: float = 0.0


class OperationMetrics(BaseModel):
    """Measurements collected for a single cryptographic operation."""
    latency: MetricStats = Field(default_factory=MetricStats)  # in seconds
    cpu_usage: MetricStats = Field(default_factory=MetricStats)  # in percentage
    memory_usage: MetricStats = Field(default_factory=MetricStats)  # in bytes
    throughput: float = 0.0  # operations per second
    success_rate: float = 0.0  # percentage (0.0 to 100.0)


class BenchmarkSession(BaseModel):
    """A recorded benchmark session containing results for a specific algorithm configuration."""
    id: str
    algorithm: str  # "ML-KEM" or "ML-DSA"
    parameter_set: str  # e.g., "ML-KEM-768", "ML-DSA-65"
    hardware_info: Dict[str, Any]
    operating_system: str
    python_version: str
    timestamp: str  # ISO 8601 string
    metrics: Dict[str, OperationMetrics]  # key: operation name (e.g. keygen, encap, decap, sign, verify)
    parameters: Dict[str, Any]  # iterations, warmup_runs, thread_count, repeat_count


class BenchmarkSessionStore:
    """Thread-safe JSON-backed storage for PQC benchmark sessions."""

    def __init__(self, file_path: Path):
        self._file_path = file_path
        self._lock = Lock()
        self._sessions: Dict[str, BenchmarkSession] = {}
        self._load()

    def _load(self) -> None:
        """Load benchmark sessions from disk."""
        with self._lock:
            if not self._file_path.exists():
                self._sessions = {}
                return
            try:
                with open(self._file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._sessions = {}
                    for k, v in data.items():
                        try:
                            self._sessions[k] = BenchmarkSession.model_validate(v)
                        except Exception as e:
                            logger.error("Failed to parse benchmark session %s: %s", k, e)
            except Exception as e:
                logger.error("Failed to load benchmark sessions from %s: %s", self._file_path, e)
                self._sessions = {}

    def _save(self) -> None:
        """Save benchmark sessions to disk (lock assumed held)."""
        try:
            self._file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._file_path, "w", encoding="utf-8") as f:
                json.dump(
                    {k: v.model_dump() for k, v in self._sessions.items()},
                    f,
                    indent=2,
                    ensure_ascii=False,
                )
        except Exception as e:
            logger.error("Failed to save benchmark sessions to %s: %s", self._file_path, e)

    def add(self, session: BenchmarkSession) -> BenchmarkSession:
        """Add a new benchmark session to the store and save it."""
        with self._lock:
            self._sessions[session.id] = session
            self._save()
            return session

    def get(self, session_id: str) -> BenchmarkSession:
        """Retrieve a specific benchmark session."""
        with self._lock:
            session = self._sessions.get(session_id)
        if session is None:
            raise SessionNotFoundError(f"Benchmark session with ID {session_id} not found.")
        return session

    def get_all(self) -> List[BenchmarkSession]:
        """Retrieve all benchmark sessions, sorted by timestamp descending."""
        with self._lock:
            return sorted(self._sessions.values(), key=lambda s: s.timestamp, reverse=True)

    def delete(self, session_id: str) -> None:
        """Delete a benchmark session and save changes."""
        with self._lock:
            if session_id not in self._sessions:
                raise SessionNotFoundError(f"Benchmark session with ID {session_id} not found.")
            del self._sessions[session_id]
            self._save()

    def clear(self) -> None:
        """Clear all benchmark sessions."""
        with self._lock:
            self._sessions.clear()
            self._save()


# Initialize application-wide store singleton pointing to backend/output/
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "output"
STORE_FILE = OUTPUT_DIR / "benchmark_sessions.json"
_store = BenchmarkSessionStore(STORE_FILE)


def get_session_store() -> BenchmarkSessionStore:
    """Retrieve the application-wide benchmark sessions store."""
    return _store
