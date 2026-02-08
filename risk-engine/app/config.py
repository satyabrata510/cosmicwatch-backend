from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    risk_engine_port: int = 8000
    risk_engine_host: str = "0.0.0.0"
    log_level: str = "info"

    class Config:
        env_file = ".env"


settings = Settings()
