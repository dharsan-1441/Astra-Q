"""
Compatibility analysis endpoint.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.post("/compatibility", summary="Analyze PQC compatibility")
async def compatibility() -> JSONResponse:
    """Evaluate compatibility of enterprise systems with PQC algorithms."""
    return JSONResponse(content={"status": "Not Implemented"})
