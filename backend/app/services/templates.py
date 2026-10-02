"""Validate dynamic attributes against a template definition (PRD BR-12, NFR-03)."""
import re

URL_RE = re.compile(r"^https?://\S+$", re.I)
CUSTOM_MAX = 20

EVIDENCE_TYPES = (
    "link", "image", "video", "document", "certificate", "repository", "deployment",
    "test_results", "diagram", "research", "match_footage", "design_file", "business_document",
)
EVIDENCE_VISIBILITY = ("public", "exists", "private")  # exists = visitors see that proof exists, not the file


def validate_attributes(fields: list[dict], attrs: dict) -> dict:
    """Return cleaned attributes or raise ValueError naming the bad field.

    Template fields are type-checked. "custom" holds member-defined [{label, value}] pairs (FR-WORK-03).
    Custom and dynamic attributes accept strings, numbers, lists, and dicts flexibly.
    """
    defs = {f["key"]: f for f in fields}
    out: dict = {}
    for key, value in attrs.items():
        if value in (None, "", []):
            continue  # skipping a field is always allowed
        f = defs.get(key)
        if f:
            out[key] = _check(f, value)
        elif key == "custom":
            out[key] = _check_custom(value)
        elif isinstance(value, str) and len(value) <= 1000:
            out[key] = value.strip()
        elif isinstance(value, (int, float, bool)):
            out[key] = value
        elif isinstance(value, list):
            if all(isinstance(x, str) for x in value):
                out[key] = [x.strip() for x in value if x.strip()]
            elif all(isinstance(x, dict) for x in value):
                out[key] = _check_custom(value)
            else:
                out[key] = [str(x) for x in value]
        elif isinstance(value, dict):
            out[key] = value
        else:
            raise ValueError(f"Unknown attribute '{key}'")
    return out


def _check(f: dict, v):
    label, t = f.get("label", f["key"]), f.get("type", "text")
    if t in ("text", "textarea"):
        if not isinstance(v, str):
            v = str(v)
        if len(v) > (500 if t == "text" else 5000):
            raise ValueError(f"{label} is too long")
        return v.strip()
    if t == "url":
        if not isinstance(v, str):
            raise ValueError(f"{label} must be a link")
        val = v.strip()
        if not URL_RE.match(val):
            if "." in val and not val.startswith(("http://", "https://")):
                val = f"https://{val}"
            else:
                raise ValueError(f"{label} must be a valid web link")
        return val
    if t == "number":
        if isinstance(v, bool):
            raise ValueError(f"{label} must be a number")
        if isinstance(v, str):
            try:
                v = float(v) if "." in v else int(v)
            except ValueError:
                raise ValueError(f"{label} must be a number")
        if not isinstance(v, (int, float)) or v < 0:
            raise ValueError(f"{label} must be a positive number")
        return v
    if t == "list":
        if isinstance(v, str):
            v = [x.strip() for x in v.split(",") if x.strip()]
        if not isinstance(v, list) or len(v) > 50:
            raise ValueError(f"{label} must be a list of items")
        return [str(x).strip() for x in v if str(x).strip()][:50]
    if t == "select":
        if v not in f.get("options", []):
            raise ValueError(f"{label} must be one of: {', '.join(f.get('options', []))}")
        return v
    return v


def _check_custom(v) -> list[dict]:
    if not isinstance(v, list) or len(v) > CUSTOM_MAX:
        raise ValueError("Custom details must be a list")
    out = []
    for item in v:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "")).strip()
        value = item.get("value", "")
        if isinstance(value, list):
            value = ", ".join(str(x) for x in value)
        else:
            value = str(value).strip()
        if not label and not value:
            continue
        if len(label) > 100 or len(value) > 1000:
            raise ValueError("Custom detail label or value is too long")
        out.append({"label": label, "value": value})
    return out


if __name__ == "__main__":  # python -m app.services.templates
    sports = [
        {"key": "position", "label": "Position", "type": "select", "options": ["Goalkeeper", "Defender", "Midfielder", "Forward"]},
        {"key": "goals", "label": "Goals", "type": "number"},
        {"key": "footage_url", "label": "Match footage", "type": "url"},
    ]
    assert validate_attributes(sports, {"position": "Forward", "goals": 3, "footage_url": "https://yt.be/x"}) == {
        "position": "Forward", "goals": 3, "footage_url": "https://yt.be/x"}
    assert validate_attributes(sports, {"goals": None, "position": ""}) == {}  # skipped fields are fine
    for bad, msg in [({"goals": "three"}, "Goals must be a number"), ({"position": "Striker"}, "Position must be one of"),
                     ({"footage_url": "yt.be/x"}, "must be a link"), ({"hack": {"a": 1}}, "Unknown attribute"),
                     ({"custom": [{"label": "", "value": "x"}]}, "needs a label")]:
        try:
            validate_attributes(sports, bad)
            raise AssertionError(f"accepted {bad}")
        except ValueError as e:
            assert msg in str(e), (bad, e)
    assert validate_attributes([], {"custom": [{"label": "Club", "value": "Simba SC"}], "glass_style": "frosted"}) == {
        "custom": [{"label": "Club", "value": "Simba SC"}], "glass_style": "frosted"}
    print("templates.validate_attributes: ok")
