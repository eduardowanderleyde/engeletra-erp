from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("ENGELETRA_DATA_DIR", BASE_DIR))
DB_PATH = DATA_DIR / "engeletra.db"

# Desktop first: the API should only be reachable by the local app.
API_HOST = os.getenv("ENGELETRA_API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("ENGELETRA_API_PORT", "8787"))

# Empty token keeps development friction low. Packaged builds should set one.
API_TOKEN = os.getenv("ENGELETRA_API_TOKEN", "")

DEFAULT_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5177",
    "http://localhost:5177",
]

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ENGELETRA_ALLOWED_ORIGINS", ",".join(DEFAULT_ALLOWED_ORIGINS)).split(",")
    if origin.strip()
]
