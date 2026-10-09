import time
from collections import defaultdict, deque
from dataclasses import dataclass

STARTED: float = time.time()

_last_blocked_log: dict[str, float] = {}


@dataclass
class RequestRecord:
    timestamp: float
    method: str
    path: str
    status_code: int
    duration_ms: float
    error: str | None = None


# Keep up to 10,000 recent requests in memory
_records: deque[RequestRecord] = deque(maxlen=10000)
_recent_errors: deque[dict] = deque(maxlen=100)


def should_log_block(ip: str, interval: int = 60) -> bool:
    """Rate-limit logging of blocked requests to the database per IP."""
    now = time.time()
    last = _last_blocked_log.get(ip, 0)
    if now - last >= interval:
        _last_blocked_log[ip] = now
        return True
    return False


def observe(method: str, path: str, status_code: int, started: float, error: str | None = None) -> None:
    """Record timing and status of an HTTP request."""
    now = time.time()
    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    record = RequestRecord(
        timestamp=now,
        method=method,
        path=path,
        status_code=status_code,
        duration_ms=duration_ms,
        error=error,
    )
    _records.append(record)

    if status_code >= 400 or error:
        _recent_errors.appendleft(
            {
                "at": int(now),
                "method": method,
                "route": path,
                "status": status_code,
                "error": error,
            }
        )


def snapshot(window_s: int) -> dict:
    """Aggregate traffic stats over the past window_s seconds."""
    now = time.time()
    cutoff = now - window_s
    items = [r for r in _records if r.timestamp >= cutoff]

    requests_count = len(items)
    errors_5xx = sum(1 for r in items if 500 <= r.status_code < 600)
    errors_4xx = sum(1 for r in items if 400 <= r.status_code < 500)

    if items:
        durations = sorted(r.duration_ms for r in items)
        avg_ms = round(sum(durations) / len(durations), 1)
        p95_idx = int(len(durations) * 0.95)
        p95_ms = round(durations[min(p95_idx, len(durations) - 1)], 1)
    else:
        avg_ms = 0.0
        p95_ms = 0.0

    # Route timings
    routes: dict[str, list[float]] = defaultdict(list)
    for r in items:
        routes[r.path].append(r.duration_ms)

    slowest = [
        {"route": route, "avg_ms": round(sum(d) / len(d), 1), "count": len(d)}
        for route, d in routes.items()
    ]
    slowest.sort(key=lambda s: s["avg_ms"], reverse=True)

    minutes = max(1.0, window_s / 60.0)
    per_minute_val = round(requests_count / minutes, 1)

    return {
        "window_s": window_s,
        "requests": requests_count,
        "per_minute": per_minute_val,
        "errors_5xx": errors_5xx,
        "errors_4xx": errors_4xx,
        "avg_ms": avg_ms,
        "p95_ms": p95_ms,
        "slowest": slowest[:5],
    }


def per_minute(window_minutes: int = 30) -> list[dict]:
    """Group traffic in the past window_minutes by 1-minute bucket."""
    now = time.time()
    current_minute = int(now // 60) * 60
    buckets: dict[int, dict[str, int]] = {
        current_minute - (i * 60): {"requests": 0, "errors": 0}
        for i in range(window_minutes)
    }

    cutoff = now - (window_minutes * 60)
    for r in _records:
        if r.timestamp >= cutoff:
            minute_bucket = int(r.timestamp // 60) * 60
            if minute_bucket in buckets:
                buckets[minute_bucket]["requests"] += 1
                if r.status_code >= 400:
                    buckets[minute_bucket]["errors"] += 1

    return [
        {"minute": m, "requests": data["requests"], "errors": data["errors"]}
        for m, data in sorted(buckets.items())
    ]


def recent_errors() -> list[dict]:
    """Return recent HTTP and exception errors."""
    return list(_recent_errors)
