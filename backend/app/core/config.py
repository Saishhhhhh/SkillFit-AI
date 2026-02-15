# Centralized application configuration.

import os


class Settings:
    PROJECT_NAME: str = "SkillFit AI"
    API_VERSION: str = "v1"
    API_PREFIX: str = f"/api/{API_VERSION}"

    # Server
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "*",
    ]

    # Cleanup
    CLEANUP_INTERVAL_SECONDS: int = 3600       # 1 hour
    CLEANUP_MAX_AGE_SECONDS: int = 3600 * 24   # 24 hours


settings = Settings()
