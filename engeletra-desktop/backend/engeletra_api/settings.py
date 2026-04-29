from __future__ import annotations

import os
import secrets
import warnings
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("ENGELETRA_DATA_DIR", BASE_DIR))
DB_PATH = DATA_DIR / "engeletra.db"

# Optional: directory with Vite `dist` (index.html + assets) for same-origin Docker deploys.
STATIC_DIR = Path(os.getenv("ENGELETRA_STATIC_DIR", ""))

# Desktop first: the API should only be reachable by the local app.
API_HOST = os.getenv("ENGELETRA_API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("ENGELETRA_API_PORT", "8787"))

DEFAULT_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5177",
    "http://localhost:5177",
]

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ENGELETRA_ALLOWED_ORIGINS", ",".join(DEFAULT_ALLOWED_ORIGINS)).split(",")
    if origin.strip()
]

# JWT — defina ENGELETRA_SECRET_KEY em produção. Em dev gera chave volátil (tokens
# expiram ao reiniciar o backend).
_raw_key = os.getenv("ENGELETRA_SECRET_KEY", "")
if not _raw_key:
    _raw_key = secrets.token_hex(32)
    warnings.warn(
        "ENGELETRA_SECRET_KEY não definido – usando chave volátil. "
        "Tokens expiram ao reiniciar. Defina a variável em produção.",
        RuntimeWarning,
        stacklevel=2,
    )
SECRET_KEY = _raw_key
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("ENGELETRA_JWT_EXPIRE_MINUTES", "480"))  # 8 h
