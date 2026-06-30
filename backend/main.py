import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from database import Base, engine
from routes import export_import, sections, songs, youtube

# Create tables, then add any new columns to existing tables
Base.metadata.create_all(bind=engine)

def _migrate():
    inspector = inspect(engine)
    existing = {c["name"] for c in inspector.get_columns("songs")}
    new_cols = [
        ("composer", "TEXT"),
        ("lyricist", "TEXT"),
        ("album",    "TEXT"),
        ("year",     "INTEGER"),
        ("language", "TEXT"),
        ("tags",     "TEXT"),
    ]
    with engine.begin() as conn:
        for col, col_type in new_cols:
            if col not in existing:
                conn.execute(text(f"ALTER TABLE songs ADD COLUMN {col} {col_type}"))

_migrate()

app = FastAPI(title="Song Practice API", version="1.0.0")

_origins_env = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [o.strip() for o in _origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(songs.router)
app.include_router(youtube.router)
app.include_router(sections.router)
app.include_router(export_import.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/debug/yt-cookies")
def debug_yt_cookies():
    from services.downloader import _COOKIE_FILE, _SECRET_FILE, _TMP_COOKIE_FILE
    return {
        "secret_file_exists": _SECRET_FILE.exists(),
        "secret_file_bytes": _SECRET_FILE.stat().st_size if _SECRET_FILE.exists() else 0,
        "tmp_file_exists": _TMP_COOKIE_FILE.exists(),
        "tmp_file_bytes": _TMP_COOKIE_FILE.stat().st_size if _TMP_COOKIE_FILE.exists() else 0,
        "cookie_file_in_use": str(_COOKIE_FILE) if _COOKIE_FILE else None,
        "env_var_set": bool(os.environ.get("YOUTUBE_COOKIES")),
    }
