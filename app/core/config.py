"""
Core configuration settings for BoilerAI CS.
"""

import os
from typing import Any, Dict, List, Optional, Union

from pydantic import Field, PostgresDsn, computed_field, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_ignore_empty=True,
        extra="ignore"
    )
    
    # Application
    APP_NAME: str = "BoilerAI CS (No-KB Mode)"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = Field(min_length=32)
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    
    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str = "boilerai_cs"
    
    # Database Pool Settings
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    
    @computed_field  # type: ignore[misc]
    @property
    def DATABASE_URL(self) -> PostgresDsn:
        """Construct database URL from components."""
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )
    
    # Redis (for caching)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Planning Algorithm
    MAX_SEMESTERS: int = 8
    DEFAULT_SEMESTER_CAPACITY: int = 15
    
    # Text-to-SQL Security
    SQL_WHITELIST_FILE: str = "data/sql_whitelist.json"
    MAX_QUERY_COMPLEXITY: int = 100
    
    # Transcript Processing
    MAX_TRANSCRIPT_SIZE_MB: int = 10
    SUPPORTED_TRANSCRIPT_FORMATS: List[str] = ["pdf", "txt", "json"]
    
    @validator("SECRET_KEY", pre=True)
    def secret_key_required(cls, v: str) -> str:
        """Ensure secret key is provided."""
        if not v:
            raise ValueError("SECRET_KEY is required")
        return v
    
    @validator("POSTGRES_PASSWORD", pre=True)
    def postgres_password_required(cls, v: str) -> str:
        """Ensure postgres password is provided."""
        if not v:
            raise ValueError("POSTGRES_PASSWORD is required")
        return v
    
    class Config:
        case_sensitive = True


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings."""
    return settings