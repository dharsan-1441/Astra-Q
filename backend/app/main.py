"""
Enterprise PQC Migration Sequencing Engine — FastAPI Application Entry Point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings, setup_logging
from app.api.router import api_router


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifecycle manager — startup and shutdown hooks."""
    logger = setup_logging()
    settings = get_settings()

    logger.info(
        "Starting %s v%s [%s]",
        settings.app_name,
        settings.app_version,
        settings.app_env,
    )

    yield

    logger.info("Shutting down %s", settings.app_name)


def create_app() -> FastAPI:
    """Application factory — constructs and configures the FastAPI instance."""
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Enterprise-grade migration sequencing engine for "
            "Post-Quantum Cryptography (ML-KEM / ML-DSA) adoption."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/", summary="Root health check")
    async def root_health():
        """Root health check endpoint for deployment environment validation."""
        return {"status": "ok"}

    application.include_router(api_router, prefix="/api")

    return application


app = create_app()


if __name__ == "__main__":
    import uvicorn

    _settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=_settings.app_host,
        port=_settings.app_port,
        reload=_settings.is_development,
        log_level=_settings.log_level.lower(),
    )
