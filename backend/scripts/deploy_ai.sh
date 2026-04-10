#!/bin/bash
# Alloul AI Engine — Server Deployment Script  
# Run on server: bash <(curl -fsSL "https://raw.githubusercontent.com/mbt7000/alloul-mobile/ui/prototype-alignment/backend/scripts/deploy_ai.sh")
set -e

BACKEND="/root/allou-backend"
VENV="$BACKEND/.venv"
TGZ_URL="https://github.com/mbt7000/alloul-mobile/raw/ui/prototype-alignment/alloul-backend-deploy.tgz"

echo "================================================"
echo "  Alloul AI Engine — Production Deployment"
echo "  Target: $BACKEND"
echo "================================================"

# ── 1. Download & extract deployment package ─────────────────────────────────
echo ""
echo "[1] Downloading deployment package..."
curl -fsSL "$TGZ_URL" -o /tmp/alloul-backend-deploy.tgz
echo "  Downloaded: $(du -sh /tmp/alloul-backend-deploy.tgz | cut -f1)"

echo "  Extracting to $BACKEND..."
cd "$BACKEND"
# Preserve .env and app.db — only overwrite source files
tar -xzf /tmp/alloul-backend-deploy.tgz \
  --exclude="./.env" \
  --exclude="./app.db" \
  -C "$BACKEND"
rm /tmp/alloul-backend-deploy.tgz
echo "  ✓ Files extracted"

# ── 2. Install httpx (required by services/ai_engine/client.py) ──────────────
echo ""
echo "[2] Installing httpx..."
$VENV/bin/pip install httpx --quiet && echo "  ✓ httpx ready"

# ── 3. Add Ollama config to .env if missing ──────────────────────────────────
echo ""
echo "[3] Checking .env for Ollama config..."
if ! grep -q "OLLAMA_BASE_URL" "$BACKEND/.env" 2>/dev/null; then
  printf "\nOLLAMA_BASE_URL=http://127.0.0.1:11434\nOLLAMA_MODEL=llama3.2:3b\nOLLAMA_TIMEOUT=60\n" >> "$BACKEND/.env"
  echo "  ✓ Added Ollama config"
else
  echo "  ✓ Already present"
fi

# ── 4. Run database migration ────────────────────────────────────────────────
echo ""
echo "[4] Running database migration..."
cd "$BACKEND"
$VENV/bin/python scripts/migrate_ai_tables.py

# ── 5. Restart service ───────────────────────────────────────────────────────
echo ""
echo "[5] Restarting backend service..."
if systemctl is-active --quiet alloul-api 2>/dev/null; then
  systemctl restart alloul-api && sleep 3 && echo "  ✓ alloul-api restarted"
elif systemctl is-active --quiet alloul 2>/dev/null; then
  systemctl restart alloul && sleep 3 && echo "  ✓ alloul restarted"
else
  # Fallback: manual uvicorn restart
  pkill -f "uvicorn main:app" 2>/dev/null || true
  sleep 2
  cd "$BACKEND"
  # Check which venv pattern is used
  if [ -f "$VENV/bin/python" ]; then
    PYTHON="$VENV/bin/python"
  elif [ -f "/root/allou-backend/venv/bin/python" ]; then
    PYTHON="/root/allou-backend/venv/bin/python"
  else
    PYTHON="python3"
  fi
  nohup $PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8000 >> /var/log/alloul-api.log 2>&1 &
  sleep 4
  echo "  ✓ uvicorn restarted"
fi

# ── 6. Verify ─────────────────────────────────────────────────────────────────
echo ""
echo "[6] Verification..."
sleep 2

echo "  AI Health:"
curl -s http://localhost:8000/ai/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/ai/health

echo ""
echo "  All /ai routes:"
curl -s http://localhost:8000/openapi.json 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in sorted(d['paths']):
    if '/ai' in p: print('   ', list(d['paths'][p].keys())[0].upper(), p)
" 2>/dev/null

echo ""
echo "================================================"
echo "  Deployment complete!"
echo "  New endpoints:"
echo "    POST /ai/parse-transaction  (replaces /ai/parse-sales)"
echo "    POST /ai/confirm-task"
echo "    POST /ai/confirm-handover"
echo "    POST /ai/confirm-transaction"
echo "================================================"
