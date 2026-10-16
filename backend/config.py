"""Configuration shared by the FamilyCare backend.

The default values support local hackathon development. They can be
overridden with environment variables when the application is deployed.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


def _read_cors_origins() -> tuple[str, ...]:
    raw_origins = os.getenv("FAMILYCARE_CORS_ORIGINS")
    if not raw_origins:
        return DEFAULT_CORS_ORIGINS

    origins = tuple(
        origin.strip()
        for origin in raw_origins.split(",")
        if origin.strip()
    )
    if not origins:
        raise ValueError(
            "FAMILYCARE_CORS_ORIGINS must contain at least one URL."
        )
    return origins


def _read_positive_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    try:
        value = int(raw_value)
    except ValueError as error:
        raise ValueError(f"{name} must be a whole number.") from error

    if value <= 0:
        raise ValueError(f"{name} must be greater than zero.")
    return value


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_description: str
    app_version: str
    environment: str
    timezone: str
    cors_origins: tuple[str, ...]
    resident_check_in_timeout_seconds: int


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load and validate settings once when the server starts."""

    return Settings(
        app_name=os.getenv("FAMILYCARE_APP_NAME", "FamilyCare API"),
        app_description=(
            "Backend for elderly-first home safety, resident check-ins "
            "and family alerts."
        ),
        app_version=os.getenv("FAMILYCARE_APP_VERSION", "0.1.0"),
        environment=os.getenv("FAMILYCARE_ENVIRONMENT", "development"),
        timezone=os.getenv("FAMILYCARE_TIMEZONE", "Asia/Kuala_Lumpur"),
        cors_origins=_read_cors_origins(),
        resident_check_in_timeout_seconds=_read_positive_int(
            "FAMILYCARE_RESIDENT_CHECK_IN_TIMEOUT_SECONDS",
            default=30,
        ),
    )


settings = get_settings()
