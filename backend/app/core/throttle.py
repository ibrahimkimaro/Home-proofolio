import time
from collections import defaultdict

_attempts: dict[str, list[float]] = defaultdict(list)
_lockouts: dict[str, float] = {}

MAX_ATTEMPTS = 5
WINDOW_SECONDS = 900
LOCKOUT_SECONDS = 900


def fail(key: str, max_attempts: int = MAX_ATTEMPTS, lockout: int = LOCKOUT_SECONDS) -> None:
    """Record a failed attempt for key. When attempts reach max_attempts, set a lockout."""
    now = time.time()
    _attempts[key] = [t for t in _attempts[key] if now - t < WINDOW_SECONDS]
    _attempts[key].append(now)
    if len(_attempts[key]) >= max_attempts:
        _lockouts[key] = now + lockout


def retry_after(key: str) -> int:
    """Return remaining lockout time in seconds, or 0 if not locked."""
    now = time.time()
    lock_until = _lockouts.get(key, 0)
    if lock_until > now:
        return int(lock_until - now)
    if key in _lockouts:
        del _lockouts[key]
        _attempts.pop(key, None)
    return 0


def clear(key: str) -> None:
    """Reset failures and lockouts for a key."""
    _lockouts.pop(key, None)
    _attempts.pop(key, None)
