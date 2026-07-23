"""
Unit tests for the NIST Post-Quantum Benchmark Engine module.
"""

import json
import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from app.benchmark.collector import collect_system_info
from app.benchmark.exceptions import (
    OQSLibraryUnavailableError,
    SessionNotFoundError,
)
from app.benchmark.models import (
    BenchmarkSession,
    BenchmarkSessionStore,
    MetricStats,
    OperationMetrics,
)
from app.benchmark.schemas import BenchmarkRunRequest
from app.benchmark.runner import is_oqs_available, calculate_statistics


class TestBenchmarkEngine(unittest.TestCase):

    def setUp(self):
        self.temp_dir = TemporaryDirectory()
        self.file_path = Path(self.temp_dir.name) / "test_sessions.json"
        self.store = BenchmarkSessionStore(self.file_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_statistics_calculation_empty(self):
        stats = calculate_statistics([])
        self.assertEqual(stats.average, 0.0)
        self.assertEqual(stats.median, 0.0)
        self.assertEqual(stats.min, 0.0)
        self.assertEqual(stats.max, 0.0)

    def test_statistics_calculation_standard(self):
        samples = [1.0, 2.0, 3.0, 4.0, 5.0]
        stats = calculate_statistics(samples)
        self.assertEqual(stats.average, 3.0)
        self.assertEqual(stats.median, 3.0)
        self.assertEqual(stats.min, 1.0)
        self.assertEqual(stats.max, 5.0)
        self.assertAlmostEqual(stats.stddev, 1.5811388, places=4)
        self.assertEqual(stats.p95, 5.0)

    def test_collector_system_info(self):
        info = collect_system_info()
        self.assertIn("cpu_model", info)
        self.assertIn("architecture", info)
        self.assertIn("logical_cores", info)
        self.assertIn("operating_system", info)
        self.assertIn("python_version", info)

    def test_schema_run_request_validation(self):
        # Valid ML-KEM request
        req = BenchmarkRunRequest(
            algorithm="ml-kem",
            parameter_set="ML-KEM-768",
            iterations=20,
            warmup_runs=5,
        )
        self.assertEqual(req.algorithm, "ML-KEM")
        self.assertEqual(req.parameter_set, "ML-KEM-768")

        # Invalid algorithm
        with self.assertRaises(ValueError):
            BenchmarkRunRequest(algorithm="sha256", parameter_set="SHA256")

        # Invalid parameter set for ML-KEM
        with self.assertRaises(ValueError):
            BenchmarkRunRequest(algorithm="ML-KEM", parameter_set="ML-DSA-44")

        # Invalid parameter set for ML-DSA
        with self.assertRaises(ValueError):
            BenchmarkRunRequest(algorithm="ML-DSA", parameter_set="ML-KEM-512")

    def test_store_operations(self):
        # Build a dummy session
        session_id = "test-session-123"
        session = BenchmarkSession(
            id=session_id,
            algorithm="ML-KEM",
            parameter_set="ML-KEM-768",
            hardware_info={"cpu_model": "Test CPU"},
            operating_system="Test OS",
            python_version="3.10",
            timestamp="2026-07-08T00:00:00Z",
            metrics={
                "keygen": OperationMetrics(
                    latency=MetricStats(average=0.001),
                    cpu_usage=MetricStats(average=10.0),
                    memory_usage=MetricStats(average=1024),
                    throughput=1000.0,
                    success_rate=100.0,
                )
            },
            parameters={"iterations": 10},
        )

        # Add to store
        self.store.add(session)
        self.assertTrue(self.file_path.exists())

        # Retrieve
        retrieved = self.store.get(session_id)
        self.assertEqual(retrieved.id, session_id)
        self.assertEqual(retrieved.algorithm, "ML-KEM")
        self.assertEqual(retrieved.metrics["keygen"].throughput, 1000.0)

        # Reload store to test disk persistence
        new_store = BenchmarkSessionStore(self.file_path)
        reload_retrieved = new_store.get(session_id)
        self.assertEqual(reload_retrieved.id, session_id)

        # Delete
        self.store.delete(session_id)
        with self.assertRaises(SessionNotFoundError):
            self.store.get(session_id)


if __name__ == "__main__":
    unittest.main()
