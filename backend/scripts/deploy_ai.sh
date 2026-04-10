#!/bin/bash
# Alloul AI Engine — Server Deployment Script
# Run on the server: bash <(curl -fsSL "https://raw.githubusercontent.com/mbt7000/alloul-mobile/ui/prototype-alignment/backend/scripts/deploy_ai.sh")
set -e

BACKEND="/root/allou-backend"
VENV="$BACKEND/.venv"
BRANCH="ui/prototype-alignment"
REPO="https://raw.githubusercontent.com/mbt7000/alloul-mobile/$BRANCH/backend"

echo "================================================"
echo "  Alloul AI Engine Deployment"
echo "  Target: $BACKEND"
echo "================================================"

# ── 1. Download new files ────────────────────────────────────────────────────
echo ""
echo "[1] Downloading AI engine files from GitHub..."

mkdir -p "$BACKEND/services/ai_engine"
mkdir -p "$BACKEND/routers"
mkdir -p "$BACKEND/scripts"

files=(
  "routers/ai_extract.py"
  "routers/ai_confirm.py"
  "services/__init__.py"
  "services/ai_engine/__init__.py"
  "services/ai_engine/client.py"
  "services/ai_engine/extractor.py"
  "services/ai_engine/prompts.py"
  "services/ai_engine/schemas.py"
  "models.py"
  "main.py"
  "config.py"
  "scripts/migrate_ai_tables.py"
)

for f in "${files[@]}"; do
  dir=$(dirname "$BACKEND/$f")
  mkdir -p "$dir"
  curl -fsSL "$REPO/$f" -o "$BACKEND/$f"
  echo "  ✓ $f"
done

# ── 2. Install httpx (required by ai_engine/client.py) ──────────────────────
echo ""
echo "[2] Installing httpx..."
$VENV/bin/pip install httpx --quiet && echo "  ✓ httpx installed"

# ── 3. Add Ollama env vars if missing ───────────────────────────────────────
echo ""
echo "[3] Checking .env..."
ENV_FILE="$BACKEND/.env"
if ! grep -q "OLLAMA_BASE_URL" "$ENV_FILE" 2>/dev/null; then
  printf "\nOLLAMA_BASE_URL=http://127.0.0.1:11434\nOLLAMA_MODEL=llama3.2:3b\nOLLAMA_TIMEOUT=60\n" >> "$ENV_FILE"
  echo "  ✓ Added Ollama config to .env"
else
  echo "  ✓ Ollama config already present"
fi

# ── 4. Run database migration ────────────────────────────────────────────────
echo ""
echo "[4] Running database migration..."
cd "$BACKEND"
$VENV/bin/python scripts/migrate_ai_tables.py

# ── 5. Restart backend service ───────────────────────────────────────────────
echo ""
echo "[5] Restarting backend..."
if systemctl is-active --quiet alloul-api 2>/dev/null; then
  systemctl restart alloul-api
  sleep 3
  systemctl is-active alloul-api && echo "  ✓ alloul-api service restarted"
elif systemctl is-active --quiet alloul 2>/dev/null; then
  systemctl restart alloul
  sleep 3
  echo "  ✓ alloul service restarted"
else
  pkill -f "uvicorn main:app" 2>/dev/null || true
  sleep 2
  nohup $VENV/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 >> /var/log/alloul-api.log 2>&1 &
  sleep 4
  echo "  ✓ uvicorn restarted (PID $!)"
fi

# ── 6. Verify ─────────────────────────────────────────────────────────────────
echo ""
echo "[6] Verifying deployment..."
sleep 2

echo "  Health check:"
curl -s http://localhost:8000/ai/health | python3 -m json.tool 2>/dev/null

echo ""
echo "  New endpoints registered:"
curl -s http://localhost:8000/openapi.json | python3 -c "
import sys,json
d=json.load(sys.stdin)
ai = sorted([p for p in d['paths'] if '/ai' in p])
for p in ai: print('   ', p)
" 2>/dev/null

echo ""
echo "================================================"
echo "  Deployment complete."
echo "  New endpoints:"
echo "    POST /ai/parse-transaction"
echo "    POST /ai/confirm-task"
echo "    POST /ai/confirm-handover"
echo "    POST /ai/confirm-transaction"
echo "================================================"
