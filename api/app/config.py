from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'ScrapePilot API'
    api_host: str = '0.0.0.0'
    api_port: int = 8000
    database_url: str = 'sqlite:///./data/scrapepilot.db'
    scraper_pages: int = 2
    scraper_request_delay_ms: int = 900
    scrape_interval_minutes: int = Field(default=15, ge=1, le=1440)
    allowed_origins: str = (
        'http://localhost:3000,'
        'http://127.0.0.1:3000,'
        'http://localhost:3011,'
        'http://127.0.0.1:3011'
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(',') if origin.strip()]

    @property
    def database_path(self) -> Path:
        if self.database_url.startswith('sqlite:///'):
            raw_path = self.database_url.replace('sqlite:///', '', 1)
            return Path(raw_path)
        return Path('./data/scrapepilot.db')


@lru_cache
def get_settings() -> Settings:
    return Settings()
