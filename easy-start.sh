#!/usr/bin/env bash
# ابدأ من جذر المشروع (alloul-mobile):
#   chmod +x easy-start.sh && ./easy-start.sh
#
# يجهّز .env للباكند وملف .env للتطبيق قدر الإمكان، ثم يشغّل الـ API.

set -euo pipefail
cd "$(dirname "$0")"

echo ">>> 1/2 إعداد الملفات المحلية..."
python3 scripts/bootstrap_local.py

echo ""
echo ">>> 2/2 تشغيل الباكند على المنفذ 8000..."
exec ./backend/run_local.sh
