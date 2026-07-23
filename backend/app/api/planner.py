"""
Migration planner router — exposes endpoints for plan generation,
retrieval, JSON export, and PDF document exports.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from app.planner.engine import PQCPlannerEngine
from app.planner.exceptions import PlannerError, PlanNotFoundError
from app.planner.pdf_exporter import export_plan_to_pdf

router = APIRouter()
engine = PQCPlannerEngine()


class GeneratePlanRequest(BaseModel):
    """Payload schema for triggering plan generation."""
    name: str = "Enterprise Migration Plan"
    simulation: bool = True


async def _run_generation(payload: Optional[GeneratePlanRequest]) -> JSONResponse:
    name = "Enterprise Migration Plan"
    simulation = True
    if payload:
        name = payload.name
        simulation = payload.simulation
    try:
        plan = engine.generate_plan(name=name, simulation=simulation)
        return JSONResponse(
            status_code=201,
            content={"status": "success", "plan": plan.model_dump()},
        )
    except PlannerError as exc:
        raise HTTPException(status_code=400, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/planner/generate", summary="Generate migration execution plan")
async def generate_plan_explicit(
    payload: Optional[GeneratePlanRequest] = None,
) -> JSONResponse:
    """Explicit endpoint for generating a migration plan."""
    return await _run_generation(payload)


@router.post("/planner", summary="Generate migration execution plan (compatible)")
async def generate_plan_legacy(
    payload: Optional[GeneratePlanRequest] = None,
) -> JSONResponse:
    """Compatible endpoint matching the legacy `/planner` path."""
    return await _run_generation(payload)


@router.get("/planner", summary="List all generated migration plans")
async def list_plans() -> JSONResponse:
    """Retrieve list of all generated plans in memory."""
    try:
        plans = engine.get_all_plans()
        return JSONResponse(content={"plans": [p.model_dump() for p in plans]})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/planner/{plan_id}", summary="Get specific migration plan")
async def get_plan(plan_id: str) -> JSONResponse:
    """Retrieve details of a single plan by its ID."""
    try:
        plan = engine.get_plan(plan_id)
        return JSONResponse(content={"plan": plan.model_dump()})
    except PlanNotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/planner/export/json", summary="Export migration plan as JSON file")
async def export_json(
    plan_id: Optional[str] = Query(None, description="Plan ID to export")
) -> JSONResponse:
    """Download plan details as a JSON file."""
    try:
        if plan_id:
            plan = engine.get_plan(plan_id)
        else:
            plans = engine.get_all_plans()
            if not plans:
                raise HTTPException(status_code=404, detail="No migration plans found to export")
            plan = plans[0]

        headers = {
            "Content-Disposition": f"attachment; filename=pqc_migration_plan_{plan.id}.json"
        }
        return JSONResponse(content=plan.model_dump(), headers=headers)
    except PlanNotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/planner/export/pdf", summary="Export migration plan as PDF document")
async def export_pdf(
    plan_id: Optional[str] = Query(None, description="Plan ID to export")
) -> Response:
    """Compile and download plan details as a standard PDF document."""
    try:
        if plan_id:
            plan = engine.get_plan(plan_id)
        else:
            plans = engine.get_all_plans()
            if not plans:
                raise HTTPException(status_code=404, detail="No migration plans found to export")
            plan = plans[0]

        pdf_bytes = export_plan_to_pdf(plan)
        headers = {
            "Content-Type": "application/pdf",
            "Content-Disposition": f"attachment; filename=pqc_migration_plan_{plan.id}.pdf",
        }
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except PlanNotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
