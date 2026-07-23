"""
Structured logging configuration for the application.
"""

import logging
import sys
from app.config.settings import get_settings


def setup_logging() -> logging.Logger:
    """
    Configure application-wide structured logging.

    Returns the root application logger with console output
    and a consistent format for correlation in production.
    """
    settings = get_settings()

    log_format = (
        "%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s"
    )
    date_format = "%Y-%m-%d %H:%M:%S"

    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format=log_format,
        datefmt=date_format,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    logger = logging.getLogger("pqc_engine")
    logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

    logger.info(
        "Logging initialized — level=%s, env=%s",
        settings.log_level,
        settings.app_env,
    )

    return logger
