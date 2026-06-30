"""yt-dlp wrapper — downloads audio from YouTube and returns metadata."""
import asyncio
import os
from pathlib import Path
from typing import Any

import yt_dlp

MEDIA_DIR = Path(os.environ.get("MEDIA_DIR", Path(__file__).parent.parent.parent / "media"))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)


def _build_opts(out_path: Path) -> dict[str, Any]:
    return {
        # Prefer m4a/webm audio-only; fall back to any best available stream
        "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
        "outtmpl": str(out_path / "%(id)s.%(ext)s"),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        # ios client bypasses bot detection on datacenter IPs better than android_vr
        "extractor_args": {"youtube": {"player_client": ["ios", "android_vr", "web"]}},
        "quiet": True,
        "no_warnings": False,
    }


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
