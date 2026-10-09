import hashlib
import hmac
import secrets
import time

from app.core.config import settings


def sign(path_or_url: str | None, ttl_seconds: int = 86400) -> str | None:
    """Sign a local uploaded file URL (/files/<name>) with an expiration timestamp and HMAC signature.

    If path_or_url is None or not a local '/files/' upload, it is returned unchanged.
    """
    if not path_or_url:
        return None
    if not path_or_url.startswith("/files/"):
        return path_or_url

    name = path_or_url.removeprefix("/files/").split("?")[0]
    exp = int(time.time()) + ttl_seconds
    msg = f"{name}:{exp}".encode("utf-8")
    sig = hmac.new(settings.secret_key.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return f"/files/{name}?exp={exp}&sig={sig}"


def verify(name: str, exp: int | None, sig: str | None) -> bool:
    """Verify an expiration timestamp and HMAC signature for an uploaded file."""
    if exp is None or not sig:
        return False
    if exp < int(time.time()):
        return False
    msg = f"{name}:{exp}".encode("utf-8")
    expected = hmac.new(settings.secret_key.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return secrets.compare_digest(expected, sig)
