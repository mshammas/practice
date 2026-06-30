#!/usr/bin/env bash
set -uo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ── Cleanup: kill both servers on exit ────────────────────────────────────────
cleanup() {
    echo -e "\n${YELLOW}Stopping SongPractice servers...${RESET}"
    [[ -n "${BACKEND_PID:-}"  ]] && kill "$BACKEND_PID"  2>/dev/null || true
    [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
    # Give processes a moment to exit cleanly, then force-kill
    sleep 1
    [[ -n "${BACKEND_PID:-}"  ]] && kill -9 "$BACKEND_PID"  2>/dev/null || true
    [[ -n "${FRONTEND_PID:-}" ]] && kill -9 "$FRONTEND_PID" 2>/dev/null || true
    echo -e "${GREEN}Done.${RESET}"
}
trap cleanup EXIT INT TERM

# ── Port conflict check ───────────────────────────────────────────────────────
for PORT in 8000 5173; do
    if lsof -ti:"$PORT" >/dev/null 2>&1; then
        echo -e "${RED}Error: port $PORT is already in use.${RESET}"
        echo "Run:  kill \$(lsof -ti:$PORT)  to free it, then try again."
        exit 1
    fi
done

# ── Backend ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}▶ Starting backend (FastAPI on :8000)...${RESET}"
cd "$REPO/backend"
source .venv/bin/activate
uvicorn main:app --port 8000 --log-level warning &
BACKEND_PID=$!

# ── Frontend ──────────────────────────────────────────────────────────────────
echo -e "${CYAN}▶ Starting frontend (Vite on :5173)...${RESET}"
cd "$REPO/frontend"
npm run dev --silent &
FRONTEND_PID=$!

# ── Wait until both servers respond ──────────────────────────────────────────
echo -n "  Waiting for servers to be ready"
READY=false
for _ in $(seq 1 40); do
    sleep 0.5
    B=$(curl -sf --max-time 1 http://localhost:8000/api/health 2>/dev/null && echo y || echo n)
    F=$(curl -sf --max-time 1 http://localhost:5173         2>/dev/null && echo y || echo n)
    [[ "$B" == "y" && "$F" == "y" ]] && { READY=true; break; }
    echo -n "."
done

if [[ "$READY" == "true" ]]; then
    echo -e " ${GREEN}ready!${RESET}"
else
    echo -e " ${YELLOW}(timed out — opening anyway)${RESET}"
fi

# ── Open browser ──────────────────────────────────────────────────────────────
echo -e "${CYAN}▶ Opening http://localhost:5173${RESET}"
open "http://localhost:5173"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║  SongPractice is running             ║${RESET}"
echo -e "${BOLD}║  http://localhost:5173               ║${RESET}"
echo -e "${BOLD}║                                      ║${RESET}"
echo -e "${BOLD}║  Press Ctrl+C to stop both servers   ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""

# ── Stay alive; exit automatically if either server crashes ──────────────────
while true; do
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${RED}Backend stopped unexpectedly.${RESET}"
        exit 1
    fi
    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${RED}Frontend stopped unexpectedly.${RESET}"
        exit 1
    fi
    sleep 2
done
