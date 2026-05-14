from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Database
    DATABASE_TYPE: str = "sqlite"  # "postgresql" or "sqlite"
    DATABASE_URL: str = "sqlite:///./idmc_profiling.db"  # Will be overridden if PostgreSQL
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "idmc_profiling"
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "postgres"

    # Backend
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # IDMC Configuration (optional, used by connection management)
    IDMC_BASE_URL: Optional[str] = None
    IDMC_USERNAME: Optional[str] = None
    IDMC_PASSWORD: Optional[str] = None

    # Encryption
    ENCRYPTION_KEY: str = "your-encryption-key-change-in-production"

    # Environment
    ENVIRONMENT: str = "development"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set DATABASE_URL based on DATABASE_TYPE
        if self.DATABASE_TYPE == "postgresql":
            self.DATABASE_URL = f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        else:  # sqlite
            # Use absolute path for SQLite database
            db_path = os.path.abspath("idmc_profiling.db")
            self.DATABASE_URL = f"sqlite:///{db_path}"

    class Config:
        # Look for .env in project root, not backend folder
        env_file = "../.env"
        case_sensitive = True


settings = Settings()
