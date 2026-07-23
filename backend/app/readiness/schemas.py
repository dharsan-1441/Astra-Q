"""
Readiness schemas — response wrappers for the PQC readiness endpoints.
"""

from typing import List
from pydantic import BaseModel

from app.readiness.models import AssetReadinessAssessment, ReadinessSummary


class ReadinessAnalyzeResponse(BaseModel):
    """Response payload returned when initiating readiness analysis."""
    message: str
    count: int
    assessments: List[AssetReadinessAssessment]


class ReadinessResultsResponse(BaseModel):
    """Response payload containing a list of asset readiness assessments."""
    assessments: List[AssetReadinessAssessment]


class ReadinessSummaryResponse(BaseModel):
    """Response payload containing the global readiness summary statistics."""
    summary: ReadinessSummary
