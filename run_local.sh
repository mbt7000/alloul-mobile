#!/usr/bin/env zsh
# تشغيل الباكند محليًا على macOS — من مجلد backend:
#   chmod +x run_local.sh && ./run_local.sh

set -e
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example."
  echo "Tip: from repo root run: python3 scripts/bootstrap_local.py"
  echo "     (auto SECRET_KEY + EXPO_PUBLIC_API_URL) then run ./run_local.sh again."
  exit 1
fi

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
source .venv/bin/activate

python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

echo "Starting API at http://0.0.0.0:8000 — docs: http://localhost:8000/docs"
exec python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
