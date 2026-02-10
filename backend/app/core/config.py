from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./attendance.db"
    SECRET_KEY: str = "secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"

settings = Settings()
