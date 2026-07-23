"""
Reports router — router module defining the REST endpoints for
generating, retrieving, listing, and exporting deployment reports.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from app.reports.generator import ReportGenerator
from app.reports.models import get_report_store
from app.reports.exceptions import ReportError, ReportNotFoundError
from app.reports.exporter import export_report_to_pdf

router = APIRouter()
generator = ReportGenerator()
store = get_report_store()


class GenerateReportRequest(BaseModel):
    """Payload schema for generating a consolidated deployment report."""
    name: str = "PQC Migration Audit Report"


@router.post("/report/generate", summary="Compile a new consolidated report")
async def generate_report(payload: Optional[GenerateReportRequest] = None) -> JSONResponse:
    """Trigger report aggregation across all sub-systems."""
    name = "PQC Migration Audit Report"
    if payload:
        name = payload.name
    try:
        report = generator.generate_report(name=name)
        return JSONResponse(
            status_code=201,
            content={"status": "success", "report": report.model_dump()},
        )
    except ReportError as exc:
        raise HTTPException(status_code=400, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/report", summary="List all compiled reports")
async def list_reports() -> JSONResponse:
    """List all saved reports in memory, auto-generating a default if empty."""
    try:
        reports = store.get_all()
        if not reports:
            try:
                report = generator.generate_report()
                reports = [report]
            except Exception as exc:
                # Silently catch so list doesn't blow up if discovery is empty
                pass
        return JSONResponse(content={"reports": [r.model_dump() for r in reports]})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/report/latest", summary="Retrieve the latest report")
async def get_latest_report() -> JSONResponse:
    """Fetch the newest report, auto-generating one if empty."""
    try:
        report = store.get_latest()
        if not report:
            try:
                report = generator.generate_report()
            except Exception as exc:
                raise HTTPException(
                    status_code=404,
                    detail=f"No reports available and auto-generation failed: {exc}",
                ) from exc
        return JSONResponse(content={"report": report.model_dump()})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/report/{report_id}", summary="Get specific report details")
async def get_report(report_id: str) -> JSONResponse:
    """Retrieve details of a single report by ID."""
    try:
        report = store.get(report_id)
        return JSONResponse(content={"report": report.model_dump()})
    except ReportNotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/report/export/json", summary="Download report as JSON file")
async def export_json(
    report_id: Optional[str] = Query(None, description="Report ID to export")
) -> JSONResponse:
    """Download compiled report payload as a JSON file."""
    try:
        if report_id:
            report = store.get(report_id)
        else:
            report = store.get_latest()
            if not report:
                raise HTTPException(status_code=404, detail="No reports available for export")

        headers = {
            "Content-Disposition": f"attachment; filename=pqc_deployment_report_{report.id}.json"
        }
        return JSONResponse(content=report.model_dump(), headers=headers)
    except ReportNotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/report/export/pdf", summary="Download report as PDF document")
async def export_pdf(
    report_id: Optional[str] = Query(None, description="Report ID to export")
) -> Response:
    """Generate and serve report as a formatted PDF-1.4 file."""
    try:
        if report_id:
            report = store.get(report_id)
        else:
            report = store.get_latest()
            if not report:
                raise HTTPException(status_code=404, detail="No reports available for export")

        pdf_bytes = export_report_to_pdf(report)
        headers = {
            "Content-Type": "application/pdf",
            "Content-Disposition": f"attachment; filename=pqc_deployment_report_{report.id}.pdf",
        }
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except ReportNotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
