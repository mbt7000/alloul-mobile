"""
Credential Encryption — Secure storage and retrieval of API keys.

Uses Fernet (symmetric encryption) to encrypt API keys at rest.
Keys are decrypted only when actually used for API calls.
"""
from __future__ import annotations

import os
from typing import Optional
from cryptography.fernet import Fernet
from config import settings


class CredentialEncryptor:
    """
    Handles encryption/decryption of sensitive credentials.

    In production:
    - Keep encryption key in a secure vault (e.g., AWS Secrets Manager)
    - Rotate keys periodically
    - Audit access to decrypted credentials
    - Use HSM for key storage in high-security environments
    """

    def __init__(self):
        # Get encryption key from environment or generate one
        encryption_key = os.getenv("CREDENTIAL_ENCRYPTION_KEY")
        if not encryption_key:
            # For development: use a default key (NOT SECURE)
            encryption_key = Fernet.generate_key().decode()
            print("⚠️  WARNING: Using default encryption key. Set CREDENTIAL_ENCRYPTION_KEY in production.")

        self.cipher = Fernet(encryption_key.encode())

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string (API key, secret, etc.)."""
        if not plaintext:
            return ""
        encrypted = self.cipher.encrypt(plaintext.encode())
        return encrypted.decode()

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt an encrypted string."""
        if not ciphertext:
            return ""
        try:
            decrypted = self.cipher.decrypt(ciphertext.encode())
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"Failed to decrypt credential: {str(e)}")

    def mask_key(self, key: str, show_chars: int = 4) -> str:
        """Mask an API key for display (show only last N chars)."""
        if not key or len(key) <= show_chars:
            return "***"
        return f"***{key[-show_chars:]}"


# Singleton instance
_encryptor: Optional[CredentialEncryptor] = None


def get_encryptor() -> CredentialEncryptor:
    """Get or create the global credential encryptor."""
    global _encryptor
    if _encryptor is None:
        _encryptor = CredentialEncryptor()
    return _encryptor


def encrypt_credential(plaintext: str) -> str:
    """Convenience function to encrypt a credential."""
    return get_encryptor().encrypt(plaintext)


def decrypt_credential(ciphertext: str) -> str:
    """Convenience function to decrypt a credential."""
    return get_encryptor().decrypt(ciphertext)


def mask_credential(credential: str) -> str:
    """Convenience function to mask a credential for display."""
    return get_encryptor().mask_key(credential)
