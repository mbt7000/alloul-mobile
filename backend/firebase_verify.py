"""
Firebase Admin: verify ID token and return decoded claims.
Optional: if GOOGLE_APPLICATION_CREDENTIALS is not set, returns None and endpoint will 503.
"""
from __future__ import annotations

import os
from typing import Any, Dict, Optional

_firebase_app = None


def is_firebase_configured() -> bool:
    """True if a service account path is set and the file exists (does not initialize the SDK)."""
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    return bool(cred_path and os.path.isfile(cred_path))


def _init_firebase() -> bool:
    global _firebase_app
    if _firebase_app is not None:
        return True
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path or not os.path.isfile(cred_path):
        return False
    try:
        import firebase_admin as fa
        from firebase_admin import credentials
        _firebase_app = fa.initialize_app(credentials.Certificate(cred_path))
        return True
    except Exception:
        return False


def verify_firebase_token(id_token: str) -> Optional[Dict[str, Any]]:
    if not _init_firebase():
        return None
    try:
        from firebase_admin import auth
        return auth.verify_id_token(id_token)
    except Exception:
        return None
