#!/usr/bin/env python3
"""
جهّز البيئة المحلية تلقائياً قدر الإمكان:
- ينسخ backend/.env من المثال إن لم يكن موجوداً
- يولّد SECRET_KEY قوي إذا كان ما زال افتراضياً
- يكتب/ينشئ في جذر المشروع .env بسطر EXPO_PUBLIC_API_URL (عنوان IP للماك على الشبكة)

ما يفعله: لا يمس Firebase / Google / Microsoft / Stripe — تحتاج مفاتيحك أنت لاحقاً.
"""
from __future__ import annotations

import re
import secrets
import shutil
import socket
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
ENV_EXAMPLE = BACKEND / ".env.example"
ENV_FILE = BACKEND / ".env"
ROOT_ENV = ROOT / ".env"

WEAK_SECRET_MARKERS = (
    "change-me",
    "your-secret-key",
    "openssl-rand",
)


def detect_lan_ip() -> str:
    """أفضل تخمين لـ IP الماك على الشبكة المحلية (للوصول من التلفون)."""
    try:
        out = subprocess.run(
            ["ipconfig", "getifaddr", "en0"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    try:
        out = subprocess.run(
            ["ipconfig", "getifaddr", "en1"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    # بديل: اتصال وهمي لمعرفة واجهة الخروج
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except OSError:
        pass
    return "127.0.0.1"


def ensure_backend_env() -> None:
    if not ENV_EXAMPLE.is_file():
        print("تعذر العثور على", ENV_EXAMPLE, file=sys.stderr)
        sys.exit(1)
    if not ENV_FILE.is_file():
        shutil.copy(ENV_EXAMPLE, ENV_FILE)
        print("✓ أنشئنا", ENV_FILE, "من المثال.")

    text = ENV_FILE.read_text(encoding="utf-8")
    lines = text.splitlines()
    new_lines: list[str] = []
    secret_fixed = False
    for line in lines:
        if line.startswith("SECRET_KEY="):
            val = line.split("=", 1)[-1].strip().strip('"').strip("'")
            low = val.lower()
            if len(val) < 32 or any(m in low for m in WEAK_SECRET_MARKERS):
                new_lines.append(f"SECRET_KEY={secrets.token_hex(32)}")
                secret_fixed = True
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    if secret_fixed or len(lines) != len(new_lines):
        ENV_FILE.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    if secret_fixed:
        print("✓ حدّثنا SECRET_KEY في backend/.env (مفتاح عشوائي قوي).")


def ensure_root_expo_api_url(ip: str) -> None:
    api = f"http://{ip}:8000"
    key = "EXPO_PUBLIC_API_URL"

    if ROOT_ENV.is_file():
        content = ROOT_ENV.read_text(encoding="utf-8")
        if re.search(rf"^\s*{re.escape(key)}\s*=", content, re.MULTILINE):
            print(f"✓ يوجد بالفعل {key} في .env — لم نغيّره.")
            print(f"  (للتلفون على الشبكة تأكد أنه يشير لجهازك، مثلاً: {api})")
            return
        if not content.endswith("\n"):
            content += "\n"
        content += f"\n# أضيف تلقائياً بواسطة scripts/bootstrap_local.py\n{key}={api}\n"
        ROOT_ENV.write_text(content, encoding="utf-8")
        print(f"✓ أضفنا {key}={api} إلى ملف .env في جذر المشروع.")
        return

    ROOT_ENV.write_text(
        f"# توليد تلقائي — راجع العنوان إذا غيّرت شبكة أو منفذ\n{key}={api}\n",
        encoding="utf-8",
    )
    print(f"✓ أنشئنا .env في جذر المشروع مع {key}={api}")


def main() -> None:
    print("— Alloul One: إعداد محلي مبسّط —\n")
    ensure_backend_env()
    ip = detect_lan_ip()
    print(f"✓ عنوان IP المقترح للشبكة المحلية: {ip}")
    ensure_root_expo_api_url(ip)
    print("\nالخطوة التالية:")
    print("  1) من مجلد backend شغّل: ./run_local.sh   (أو: python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000)")
    print("  2) من جذر المشروع شغّل: npx expo start   ثم أعد تحميل التطبيق")
    print("\nملاحظة: تسجيل Google / Microsoft يحتاج مفاتيح من حساباتك — لا يمكن إنشاؤها تلقائياً.")


if __name__ == "__main__":
    main()
