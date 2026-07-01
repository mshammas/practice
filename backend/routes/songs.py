import os
import shutil
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Song
from schemas import SongOut, SongUpdate

router = APIRouter(prefix="/api/songs", tags=["songs"])

MEDIA_DIR = Path(os.environ.get("MEDIA_DIR", Path(__file__).parent.parent.parent / "media"))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".mp4", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm"}


class ExtractRequest(BaseModel):
    url: str


@router.post("/extract-metadata")
async def extract_metadata(body: ExtractRequest):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured on server")
    try:
        from services.metadata_extractor import extract_metadata as _extract
        result = await _extract(body.url)
        return result
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Extraction failed: {exc}") from exc


@router.get("", response_model=list[SongOut])
def list_songs(db: Session = Depends(get_db)):
    return db.query(Song).order_by(Song.created_at.desc()).all()


@router.get("/{song_id}", response_model=SongOut)
def get_song(song_id: str, db: Session = Depends(get_db)):
    song = db.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song


@router.post("/import-file", response_model=SongOut, status_code=status.HTTP_201_CREATED)
async def import_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    file_id = str(uuid.uuid4())
    dest = MEDIA_DIR / f"{file_id}{suffix}"

    async with aiofiles.open(dest, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            await out.write(chunk)

    title = Path(file.filename or "Unknown").stem

    song = Song(
        id=file_id,
        title=title,
        source_type="local",
        audio_path=str(dest),
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    return song


@router.put("/{song_id}", response_model=SongOut)
def update_song(song_id: str, body: SongUpdate, db: Session = Depends(get_db)):
    song = db.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(song, field, value)
    db.commit()
    db.refresh(song)
    return song


@router.delete("/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_song(song_id: str, db: Session = Depends(get_db)):
    song = db.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    if song.audio_path:
        audio = Path(song.audio_path)
        if audio.exists() and audio.is_file():
            audio.unlink()
    db.delete(song)
    db.commit()


@router.get("/{song_id}/audio")
async def stream_audio(song_id: str, request: Request, db: Session = Depends(get_db)):
    song = db.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    if not song.audio_path:
        raise HTTPException(status_code=404, detail="No audio file associated with this song")
    path = Path(song.audio_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    file_size = path.stat().st_size
    range_header = request.headers.get("range")

    suffix = path.suffix.lower()
    content_type_map = {
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
        ".aac": "audio/aac",
        ".webm": "audio/webm",
    }
    content_type = content_type_map.get(suffix, "application/octet-stream")

    chunk_size = 1024 * 256  # 256 KB

    if range_header:
        # Parse "bytes=start-end"
        range_val = range_header.replace("bytes=", "")
        parts = range_val.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        content_length = end - start + 1

        async def ranged_file():
            async with aiofiles.open(path, "rb") as f:
                await f.seek(start)
                remaining = content_length
                while remaining > 0:
                    data = await f.read(min(chunk_size, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            ranged_file(),
            status_code=206,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": content_type,
            },
        )

    async def full_file():
        async with aiofiles.open(path, "rb") as f:
            while chunk := await f.read(chunk_size):
                yield chunk

    return StreamingResponse(
        full_file(),
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Type": content_type,
        },
    )
