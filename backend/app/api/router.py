"""
Route registration — aggregates all API routers into a single mountable router.
"""

from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.discovery import router as discovery_router
from app.api.graph import router as graph_router
from app.api.benchmark import router as benchmark_router
from app.api.compatibility import router as compatibility_router
from app.api.planner import router as planner_router
from app.api.reports import router as reports_router
from app.api.readiness import router as readiness_router
from app.api.quantum import router as quantum_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["Health"])
api_router.include_router(discovery_router, tags=["Discovery"])
api_router.include_router(graph_router, tags=["Graph"])
api_router.include_router(benchmark_router, tags=["Benchmark"])
api_router.include_router(readiness_router, tags=["Readiness"])
api_router.include_router(compatibility_router, tags=["Compatibility"])
api_router.include_router(planner_router, tags=["Planner"])
api_router.include_router(reports_router, tags=["Reports"])
api_router.include_router(quantum_router, prefix="/quantum", tags=["Quantum"])

