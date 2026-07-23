"""
Health check endpoint.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.discovery.inventory import get_inventory
from app.graph.builder import get_graph_store
from app.benchmark.models import get_session_store
from app.readiness.models import get_readiness_store
from app.planner.models import get_planner_store
from app.reports.models import get_report_store

router = APIRouter()


@router.get("/health", summary="Service health check")
async def health_check() -> JSONResponse:
    """Return service health status."""
    return JSONResponse(content={"status": "OK"})


@router.post("/system/reset", summary="Reset all system stores and caches")
async def system_reset() -> JSONResponse:
    """Clear all inventory, graph, benchmark, readiness, planner, and reports stores."""
    get_inventory().clear()
    get_graph_store().clear()
    get_session_store().clear()
    get_readiness_store().clear()
    get_planner_store().clear()
    get_report_store().clear()
    return JSONResponse(content={"status": "Reset completed successfully"})

