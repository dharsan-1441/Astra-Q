"""
PQC benchmark API endpoints.
"""

import logging
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.benchmark.engine import PQCBenchmarkEngine
from app.benchmark.exceptions import (
    BenchmarkExecutionError,
    InvalidBenchmarkParameterError,
    OQSLibraryUnavailableError,
    SessionNotFoundError,
)
from app.benchmark.models import BenchmarkSession
from app.benchmark.schemas import BenchmarkResultsResponse, BenchmarkRunRequest

logger = logging.getLogger("pqc_engine.api.benchmark")

router = APIRouter()
engine = PQCBenchmarkEngine()


@router.post(
    "/benchmark/run",
    summary="Execute PQC algorithm benchmarks",
    response_model=BenchmarkSession,
)
async def run_benchmark_endpoint(request: BenchmarkRunRequest):
    """
    Execute performance benchmarks for ML-KEM or ML-DSA.
    Only runs if liboqs native library is available.
    """
    try:
        session = engine.run(request)
        return session
    except OQSLibraryUnavailableError as exc:
        logger.error("OQS Library Unavailable: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Benchmark backend not connected",
        ) from exc
    except InvalidBenchmarkParameterError as exc:
        logger.error("Invalid Benchmark Parameters: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        ) from exc
    except BenchmarkExecutionError as exc:
        logger.error("Benchmark Execution Error: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc


@router.get(
    "/benchmark/results",
    summary="List all benchmark sessions",
    response_model=BenchmarkResultsResponse,
)
async def list_benchmark_results():
    """List all previously recorded benchmark sessions and include backend availability status."""
    connected = engine.check_connection()
    sessions = engine.get_history()
    return BenchmarkResultsResponse(connected=connected, sessions=sessions)


@router.get(
    "/benchmark/results/{session_id}",
    summary="Get benchmark session by ID",
    response_model=BenchmarkSession,
)
async def get_benchmark_result(session_id: str):
    """Retrieve details of a single benchmark session."""
    try:
        return engine.get_session(session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc


@router.delete(
    "/benchmark/results/{session_id}",
    summary="Delete benchmark session",
)
async def delete_benchmark_result(session_id: str):
    """Remove a benchmark session record."""
    try:
        engine.delete_session(session_id)
        return JSONResponse(
            content={"message": f"Benchmark session {session_id} successfully deleted"}
        )
    except SessionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc

