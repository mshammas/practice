"""yt-dlp wrapper — downloads audio from YouTube and returns metadata."""
import asyncio
import os
from pathlib import Path
from typing import Any

import yt_dlp

MEDIA_DIR = Path(os.environ.get("MEDIA_DIR", Path(__file__).parent.parent.parent / "media"))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# Locate YouTube cookies. Prefer a Render Secret File (no env var size limits),
# fall back to the YOUTUBE_COOKIES env var written to a temp file.
# Render Secret File: add a file at /etc/secrets/yt_cookies.txt in the dashboard.
_COOKIE_FILE: Path | None = None
_SECRET_FILE = Path("/etc/secrets/yt_cookies.txt")
_TMP_COOKIE_FILE = Path("/tmp/yt_cookies.txt")
if _SECRET_FILE.exists():
    # Copy to /tmp so yt-dlp can write back refreshed cookies (/etc/secrets is read-only)
    import shutil
    shutil.copy2(_SECRET_FILE, _TMP_COOKIE_FILE)
    _COOKIE_FILE = _TMP_COOKIE_FILE
else:
    _cookie_content = os.environ.get("YOUTUBE_COOKIES", "").strip()
    if _cookie_content:
        _TMP_COOKIE_FILE.write_text(_cookie_content)
        _COOKIE_FILE = _TMP_COOKIE_FILE


def _build_opts(out_path: Path) -> dict[str, Any]:
    opts: dict[str, Any] = {
        # bestaudio picks audio-only if available; best catches muxed streams (e.g. ios client)
        "format": "bestaudio/best",
        "outtmpl": str(out_path / "%(id)s.%(ext)s"),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        # With cookies: use web client — browser cookies are designed for it
        # Without cookies: use ios which bypasses bot detection on datacenter IPs
        "extractor_args": {"youtube": {"player_client": ["web" if _COOKIE_FILE else "ios"]}},
        "quiet": True,
        "no_warnings": False,
    }
    if _COOKIE_FILE:
        opts["cookiefile"] = str(_COOKIE_FILE)
    return opts


def download_youtube(url: str) -> dict[str, Any]:
    """Blocking download — run in a thread executor from async context."""
    opts = _build_opts(MEDIA_DIR)
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)

    video_id = info["id"]
    audio_file = MEDIA_DIR / f"{video_id}.mp3"

    thumbnail = None
    for thumb in info.get("thumbnails", []):
        if thumb.get("url"):
            thumbnail = thumb["url"]
            break
    # prefer the last (usually highest-res) thumbnail
    thumbnails = [t["url"] for t in info.get("thumbnails", []) if t.get("url")]
    if thumbnails:
        thumbnail = thumbnails[-1]

    return {
        "title": info.get("title", "Unknown"),
        "artist": info.get("uploader") or info.get("channel"),
        "duration": info.get("duration"),
        "audio_path": str(audio_file),
        "thumbnail_url": thumbnail,
        "source_url": url,
    }


async def download_youtube_async(url: str) -> dict[str, Any]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, download_youtube, url)
