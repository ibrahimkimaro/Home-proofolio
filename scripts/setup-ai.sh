#!/usr/bin/env bash
# Set up and test the AI companion for Home Proofolio (Linux / macOS / WSL / Git Bash).
# The Windows twin is scripts/setup-ai.bat. Run from anywhere:   bash scripts/setup-ai.sh
#   1. saves the Hugging Face token in backend/.env (asks for it once; that file is not committed)
#   2. rebuilds the backend image so the new Python packages are installed
#   3. restarts the backend and waits until it answers
#   4. runs backend/ai_smoke_test.py inside the container (token -> model -> tools -> MCP -> agent)
# Safe to run again at any time.
set -u

cd "$(dirname "$0")/.." || exit 1
ENV_FILE="backend/.env"
TOKEN_LINE='^[[:space:]]*(HUGGINGFACE_API_TOKEN|HF_API_TOKEN|HF_TOKEN)[[:space:]]*=[[:space:]]*[^[:space:]]+'

cyan()   { printf '\033[36m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
red()    { printf '\033[31m%s\033[0m\n' "$*"; }

if docker compose version >/dev/null 2>&1; then
    compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
    compose() { docker-compose "$@"; }
else
    red "[!] Docker Compose was not found. Install Docker, then run this again."
    exit 1
fi

echo
cyan "[1/4] Hugging Face token ($ENV_FILE)..."
if [ -f "$ENV_FILE" ] && grep -Eq "$TOKEN_LINE" "$ENV_FILE"; then
    green "      Token already saved."
else
    yellow "      Paste your Hugging Face token (starts with hf_) and press Enter."
    echo   "      Nothing is shown while you paste."
    read -rs -p "      Token: " token
    echo
    token="$(printf '%s' "$token" | tr -d '[:space:]')"
    case "$token" in
        hf_*) ;;
        *) red "[!] That does not look like a Hugging Face token (it must start with hf_). Nothing was saved."; exit 1 ;;
    esac
    # start on a fresh line if the file exists and does not end with one
    if [ -s "$ENV_FILE" ] && [ -n "$(tail -c 1 "$ENV_FILE")" ]; then echo >> "$ENV_FILE"; fi
    printf 'HUGGINGFACE_API_TOKEN=%s\n' "$token" >> "$ENV_FILE"
    chmod 600 "$ENV_FILE" 2>/dev/null || true
    green "      Saved to $ENV_FILE"
fi

echo
cyan "[2/4] Rebuilding the backend image (installs langchain-openai and mcp, takes a few minutes)..."
if ! docker info >/dev/null 2>&1; then
    red "[!] Docker is not running (or this user may not use it). Start Docker, then run this again."
    exit 1
fi
if ! compose build backend; then
    red "[!] The build failed. Scroll up for the first error (often a network timeout: just run this again)."
    exit 1
fi

echo
cyan "[3/4] Restarting the backend..."
if ! compose up -d backend; then
    red "[!] Could not start the backend. Check: docker compose logs backend"
    exit 1
fi
healthy=0
for _ in $(seq 1 60); do
    sleep 2
    # asked from inside the container, so this needs neither curl nor a published port on the host
    if compose exec -T backend python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).status == 200 else 1)" >/dev/null 2>&1; then
        healthy=1
        break
    fi
done
if [ "$healthy" -ne 1 ]; then
    red "[!] The backend did not answer on /health within 2 minutes. Last log lines:"
    compose logs --tail 40 backend
    exit 1
fi
green "      Backend is up."

echo
cyan "[4/4] Testing the AI end to end..."
echo
compose exec -T backend python ai_smoke_test.py
result=$?

echo
if [ "$result" -eq 0 ]; then
    green "========================================================"
    green " SUCCESS: the AI companion is connected and answering."
    cyan  " Chat with it in a terminal:"
    cyan  "   docker compose exec backend python ai_smoke_test.py --chat"
    green "========================================================"
else
    yellow "Some checks failed. Each [FAIL] line above says what to fix."
    echo   "Backend logs: docker compose logs --tail 80 backend"
fi
echo
exit "$result"
