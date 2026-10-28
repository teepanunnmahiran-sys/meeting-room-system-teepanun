import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BASE_DIR / "meeting_room.db"
# Use forward slashes for sqlite url
DB_URL_DEFAULT = f"sqlite:///{DB_FILE.as_posix()}"

class Settings(BaseSettings):
    APP_NAME: str = "Enterprise Meeting Room Booking System"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-enterprise-meeting-room-jwt-token-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv("DATABASE_URL", DB_URL_DEFAULT)
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"

settings = Settings()
