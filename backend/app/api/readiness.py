"""
PQC Readiness Assessment API endpoints.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status

from app.readiness.engine import PQCReadinessEngine
from app.readiness.exceptions import AssetReadinessNotFoundError, ReadinessAnalysisError
from app.readiness.models import AssetReadinessAssessment
from app.readiness.schemas import (
    ReadinessAnalyzeResponse,
    ReadinessResultsResponse,
    ReadinessSummaryResponse,
)

logger = logging.getLogger("pqc_engine.api.readiness")

router = APIRouter()
engine = PQCReadinessEngine()


@router.post(
    "/readiness/analyze",
    summary="Trigger PQC readiness analysis",
    response_model=ReadinessAnalyzeResponse,
)
async def analyze_readiness(profile: Optional[str] = "ML-KEM-512 + ML-DSA Level 1 (Hybrid Level 1)"):
    """Trigger enterprise-wide cryptographic migration migration readiness analysis."""
    try:
        assessments = engine.run_analysis(profile=profile)
        return ReadinessAnalyzeResponse(
            message=f"Successfully analyzed {len(assessments)} assets",
            count=len(assessments),
            assessments=assessments,
        )
    except ReadinessAnalysisError as exc:
        logger.error("Readiness analysis failed: %s", exc.message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc


@router.get(
    "/readiness",
    summary="List all readiness assessments",
    response_model=ReadinessResultsResponse,
)
async def list_readiness():
    """Retrieve PQC readiness reports for all registered enterprise assets."""
    assessments = engine.get_assessments()
    return ReadinessResultsResponse(assessments=assessments)


@router.get(
    "/readiness/summary",
    summary="Get enterprise readiness summary",
    response_model=ReadinessSummaryResponse,
)
async def get_readiness_summary():
    """Retrieve high-level PQC readiness metrics and risk lists for the enterprise."""
    summary = engine.get_summary()
    return ReadinessSummaryResponse(summary=summary)


@router.get(
    "/readiness/{asset_id}",
    summary="Get readiness assessment by asset ID",
    response_model=AssetReadinessAssessment,
)
async def get_asset_readiness(asset_id: str):
    """Retrieve detailed readiness assessment report for a single asset."""
    try:
        return engine.get_assessment(asset_id)
    except AssetReadinessNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc
