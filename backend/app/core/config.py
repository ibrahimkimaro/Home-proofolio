import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ibrahim_kimaro:kimmy001@localhost:5432/home_proofolio_db"
    secret_key: str = "change-me"
    cors_origins: list[str] = ["http://localhost:3000","http://192.168.100.60:3000"]
    client_ip_header: str | None = None
    # realtime_chat (Phoenix), for live pushes after a change here (app/services/realtime.py).
    realtime_internal_url: str = "http://127.0.0.1:4000"
    # Outgoing email (Admin > Messages > Email). Empty host/user/password = email stays a manual export.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Home Proofolio"
    # Extra root certificate to trust for the mail connection (some antivirus "mail shields" re-sign it). Checking stays on.
    smtp_ca_file: str = ""
    # Web Push (notifications when the site is closed). Empty keys = off. Made with `web-push generate-vapid-keys`.
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:homeproofolio@gmail.com"
    # Where the site lives, for links in emails when the request has no Origin (CV links).
    site_url: str = "http://localhost:3001"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


settings = Settings()
