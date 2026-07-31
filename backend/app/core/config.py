from functools import lru_cache
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Aviator History Recorder"
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"

    telegram_bot_token: str = ""
    telegram_request_timeout_seconds: float = 10.0

    mysql_host: str = "mysql"
    mysql_port: int = 3306
    mysql_database: str = "aviator_history"
    mysql_user: str = "aviator"
    mysql_password: str = "change-db-password"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        user = quote_plus(self.mysql_user)
        password = quote_plus(self.mysql_password)
        return (
            f"mysql+aiomysql://{user}:{password}@"
            f"{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
            "?charset=utf8mb4"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
