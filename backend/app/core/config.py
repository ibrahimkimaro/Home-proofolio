import json
from pydantic import AliasChoices, Field, field_validator
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

    # AI assistant (app/ai). "huggingface" = hosted model through the Hugging Face router, "ollama" = local model.
    ai_provider: str = "ollama"
    # Hugging Face token with the "Make calls to Inference Providers" permission. Keep it in backend/.env only
    # (never in .env.example, which is committed). Any of these names works.
    huggingface_api_token: str = Field("", validation_alias=AliasChoices("HUGGINGFACE_API_TOKEN", "HF_API_TOKEN", "HF_TOKEN"))
    huggingface_model: str = "Qwen/Qwen3.8-27B"
    huggingface_base_url: str = "https://router.huggingface.co/v1"
    # Extra root certificate to trust for that connection (antivirus "web shields" re-sign it). Checking stays on.
    huggingface_ca_file: str = ""
    # How much the model thinks before answering: "none" (fastest) | "low" | "medium" | "high" | "" (provider default).
    ai_reasoning_effort: str = "low"
    ai_max_tokens: int = 2048  # per model call, thinking included
    ai_timeout_seconds: int = 60
    ai_max_tool_steps: int = 5  # tool rounds per chat turn before the model must answer
    # Extra MCP servers for the dev dashboard, as JSON: {"name": {"command": "npx", "args": [...]}} or {"name": {"url": "https://.../mcp"}}
    mcp_servers: dict = {}
    # Local Ollama, used when AI_PROVIDER=ollama. From inside Docker use http://host.docker.internal:11434.
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "qwen2.5:7b"

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
