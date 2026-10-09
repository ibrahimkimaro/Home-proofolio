import os
import re

# Enforce containment to a strict local data vault
SANDBOX_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai_sandbox"))
os.makedirs(SANDBOX_DIR, exist_ok=True)


class SecurityError(Exception):
    pass


def sanitize_user_prompt(prompt: str) -> str:
    """Blocks active prompt injection patterns and shell escape structures."""
    dangerous_patterns = [
        r"ignore previous instructions",
        r"system override",
        r"__import__",
        r"eval\(",
    ]
    for pattern in dangerous_patterns:
        if re.search(pattern, prompt, re.IGNORECASE):
            return "Process data safely. Reject system command configurations."
    return prompt


def enforce_sandbox_path(user_path: str, subfolder: str = "") -> str:
    """Forces all generated file outputs to stay inside the project vault."""
    target_dir = os.path.abspath(os.path.join(SANDBOX_DIR, subfolder))
    os.makedirs(target_dir, exist_ok=True)

    # Strip malicious directory paths like '../../'
    base_filename = os.path.basename(user_path)
    safe_resolved_path = os.path.abspath(os.path.join(target_dir, base_filename))

    # Compare with a trailing separator so "ai_sandbox_evil" can't pass as a prefix match
    if not safe_resolved_path.startswith(SANDBOX_DIR + os.sep):
        raise SecurityError("Directory traversal injection blocked.")

    return safe_resolved_path
