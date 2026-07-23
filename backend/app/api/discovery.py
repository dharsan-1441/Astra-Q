"""
Enterprise Discovery API endpoints.

Routes:
    POST /discovery/yaml        — Upload YAML, return parsed inventory
    POST /discovery/tls         — Scan TLS endpoint
    POST /discovery/manual      — Register manual asset
    GET  /discovery/assets      — Return full normalized inventory
    GET  /discovery/assets/{id} — Return single asset
    DELETE /discovery/assets/{id} — Remove asset
"""

import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse

from app.discovery.exceptions import (
    AssetNotFoundError,
    InvalidAssetError,
    YAMLParseError,
    YAMLValidationError,
)
from app.discovery.inventory import get_inventory
from app.discovery.manual_assets import ManualAssetService
from app.discovery.models import ManualAssetEntry, TLSScanRequest
from app.discovery.parser import YAMLParser
from app.discovery.tls_scanner import TLSScanner

logger = logging.getLogger("pqc_engine.api.discovery")

router = APIRouter()

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"


# ---------------------------------------------------------------------------
# POST /discovery/yaml
# ---------------------------------------------------------------------------

@router.post("/discovery/yaml", summary="Import enterprise YAML configuration")
async def import_yaml(
    file: UploadFile | None = File(None),
    preset: str | None = Query(None, description="Built-in preset: small, medium, large"),
):
    """
    Parse an enterprise YAML file and add discovered systems to the inventory.

    Accepts either a file upload or a preset name referencing built-in samples.
    """
    parser = YAMLParser()
    inventory = get_inventory()

    try:
        if preset:
            preset_map = {
                "small": ASSETS_DIR / "enterprise_small.yaml",
                "medium": ASSETS_DIR / "enterprise_medium.yaml",
                "large": ASSETS_DIR / "enterprise_large.yaml",
            }
            file_path = preset_map.get(preset.lower())
            if not file_path:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown preset '{preset}'. Valid: small, medium, large",
                )
            assets = parser.parse_file(file_path)

        elif file:
            content = await file.read()
            decoded = content.decode("utf-8")
            assets = parser.parse_content(decoded, source_label=file.filename or "upload")

        else:
            raise HTTPException(
                status_code=400,
                detail="Provide either a YAML file upload or a preset name (small, medium, large)",
            )

        stored = inventory.add_many(assets)
        logger.info("YAML import complete — %d assets added", len(stored))

        return JSONResponse(content={
            "message": f"Imported {len(stored)} systems",
            "count": len(stored),
            "assets": [a.model_dump() for a in stored],
            "summary": inventory.summary(),
        })

    except (YAMLParseError, YAMLValidationError) as exc:
        logger.error("YAML import failed: %s", exc.message)
        raise HTTPException(status_code=422, detail=exc.message) from exc


# ---------------------------------------------------------------------------
# POST /discovery/tls
# ---------------------------------------------------------------------------

@router.post("/discovery/tls", summary="Scan TLS endpoint")
async def scan_tls(request: TLSScanRequest):
    """
    Perform TLS inspection on a target endpoint and add
    the discovered asset to the inventory.
    """
    scanner = TLSScanner()
    inventory = get_inventory()

    scan_result, asset = scanner.scan_to_asset(
        hostname=request.hostname,
        port=request.port,
        timeout=request.timeout,
    )

    inventory.add(asset)

    logger.info(
        "TLS scan complete for %s:%d — reachable=%s",
        request.hostname,
        request.port,
        scan_result.reachable,
    )

    return JSONResponse(content={
        "scan_result": scan_result.model_dump(),
        "asset": asset.model_dump(),
    })


# ---------------------------------------------------------------------------
# POST /discovery/manual
# ---------------------------------------------------------------------------

@router.post("/discovery/manual", summary="Register manual asset")
async def register_manual(entry: ManualAssetEntry):
    """Register a system that cannot be auto-discovered (HSM, legacy VPN, etc.)."""
    service = ManualAssetService()
    inventory = get_inventory()

    try:
        asset = service.register(entry)
        inventory.add(asset)
        return JSONResponse(
            status_code=201,
            content={"asset": asset.model_dump()},
        )
    except InvalidAssetError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc


# ---------------------------------------------------------------------------
# GET /discovery/assets
# ---------------------------------------------------------------------------

@router.get("/discovery/assets", summary="List all discovered assets")
async def list_assets():
    """Return the full normalized inventory with summary statistics."""
    inventory = get_inventory()
    all_assets = inventory.get_all()

    return JSONResponse(content={
        "assets": [a.model_dump() for a in all_assets],
        "summary": inventory.summary(),
    })


# ---------------------------------------------------------------------------
# GET /discovery/assets/{asset_id}
# ---------------------------------------------------------------------------

@router.get("/discovery/assets/{asset_id}", summary="Get asset by ID")
async def get_asset(asset_id: str):
    """Retrieve a single asset from the inventory."""
    inventory = get_inventory()

    try:
        asset = inventory.get(asset_id)
        return JSONResponse(content={"asset": asset.model_dump()})
    except AssetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message) from exc


# ---------------------------------------------------------------------------
# DELETE /discovery/assets/{asset_id}
# ---------------------------------------------------------------------------

@router.delete("/discovery/assets/{asset_id}", summary="Delete asset")
async def delete_asset(asset_id: str):
    """Remove an asset from the inventory."""
    inventory = get_inventory()

    try:
        inventory.delete(asset_id)
        return JSONResponse(content={"message": f"Asset {asset_id} deleted"})
    except AssetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=exc.message) from exc
