import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routes import export_import, sections, songs, youtube

# Create all tables on startup
Base.metadata.create_all(bind=engine)

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
    from services.downloader import _COOKIE_FILE, _cookie_content
    return {
        "env_var_set": bool(os.environ.get("YOUTUBE_COOKIES")),
        "content_length": len(_cookie_content),
        "cookie_file_path": str(_COOKIE_FILE) if _COOKIE_FILE else None,
        "cookie_file_exists": _COOKIE_FILE.exists() if _COOKIE_FILE else False,
        "cookie_file_bytes": _COOKIE_FILE.stat().st_size if (_COOKIE_FILE and _COOKIE_FILE.exists()) else 0,
        "first_line": _cookie_content.splitlines()[0] if _cookie_content else None,
    }
