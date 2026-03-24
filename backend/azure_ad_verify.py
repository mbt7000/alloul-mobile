"""
Validate Azure AD / Microsoft Entra ID id_token (JWT).
Uses JWKS from Microsoft's discovery endpoint. Optional: set MICROSOFT_CLIENT_ID and MICROSOFT_TENANT_ID.
"""
from __future__ import annotations

import urllib.request
import json
from typing import Any, Dict, Optional

from jose import jwt, jwk, JWTError


def _get_jwks_uri(tenant_id: str) -> str:
    return f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"


def _fetch_jwks(tenant_id: str) -> dict:
    url = _get_jwks_uri(tenant_id)
    with urllib.request.urlopen(url, timeout=10) as resp:
        return json.loads(resp.read().decode())


def verify_azure_ad_token(
    id_token: str,
    client_id: str,
    tenant_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Validate Azure AD id_token. Returns decoded claims or None.
    """
    try:
        jwks = _fetch_jwks(tenant_id)
        unverified = jwt.get_unverified_header(id_token)
        kid = unverified.get("kid")
        key_dict = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key_dict:
            return None
        key = jwk.construct(key_dict)
        claims = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=f"https://login.microsoftonline.com/{tenant_id}/v2.0",
            options={"verify_aud": True, "verify_iss": True, "verify_exp": True},
        )
        return claims
    except (JWTError, Exception):
        return None
