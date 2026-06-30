"""Export all songs (+ sections) as a ZIP. Import from a previously exported ZIP."""
import io
import json
import os
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Section, Song
from services.downloader import MEDIA_DIR, download_youtube_async

router = APIRouter(prefix="/api", tags=["export/import"])
EXPORT_VERSION = "1"


def _song_to_dict(song: Song) -> dict:
    return {
        "id": song.id,
        "title": song.title,
        "artist": song.artist,
        "source_type": song.source_type,
        "source_url": song.source_url,
        "thumbnail_url": song.thumbnail_url,
        "duration": song.duration,
        "audio_filename": None,  # filled in for local songs
        "sections": [
            {
                "id": s.id,
                "name": s.name,
                "type": s.type,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "order": s.order,
                "color": s.color,
                "notes": s.notes,
                "practice_count": s.practice_count,
                "mastered": s.mastered,
            }
            for s in song.sections
        ],
    }


@router.get("/export")
def export_library(db: Session = Depends(get_db)):
    songs = db.query(Song).order_by(Song.created_at).all()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        songs_data = []
        for song in songs:
            d = _song_to_dict(song)
            if song.source_type == "local":
                audio_path = Path(song.audio_path)
                if audio_path.exists():
                    filename = f"audio/{song.id}{audio_path.suffix}"
                    zf.write(audio_path, filename)
                    d["audio_filename"] = filename
            songs_data.append(d)

        manifest = {"version": EXPORT_VERSION, "songs": songs_data}
        zf.writestr("songs.json", json.dumps(manifest, ensure_ascii=False, indent=2))

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="songpractice-export.zip"'},
    )


@router.post("/import", status_code=status.HTTP_200_OK)
async def import_library(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Upload a .zip file exported from SongPractice")

    raw = await file.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
        manifest = json.loads(zf.read("songs.json"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid export file: {exc}") from exc

    results = {"imported": [], "skipped": [], "failed": []}

    for song_data in manifest.get("songs", []):
        song_id = song_data["id"]

        # Skip songs that are already in the DB
        if db.get(Song, song_id):
            results["skipped"].append(song_id)
            continue

        try:
            # Determine audio path
            if song_data["source_type"] == "youtube" and song_data.get("source_url"):
                meta = await download_youtube_async(song_data["source_url"])
                audio_path = meta["audio_path"]
            elif song_data.get("audio_filename"):
                audio_bytes = zf.read(song_data["audio_filename"])
                dest = MEDIA_DIR / Path(song_data["audio_filename"]).name
                dest.write_bytes(audio_bytes)
                audio_path = str(dest)
            else:
                # Local song without embedded audio — record metadata, audio missing
                audio_path = ""

            song = Song(
                id=song_id,
                title=song_data["title"],
                artist=song_data.get("artist"),
                source_type=song_data["source_type"],
                source_url=song_data.get("source_url"),
                thumbnail_url=song_data.get("thumbnail_url"),
                duration=song_data.get("duration"),
                audio_path=audio_path,
            )
            db.add(song)

            for i, s in enumerate(song_data.get("sections", [])):
                section = Section(
                    id=s["id"],
                    song_id=song_id,
                    name=s["name"],
                    type=s.get("type", "custom"),
                    start_time=s["start_time"],
                    end_time=s["end_time"],
                    order=s.get("order", i),
                    color=s.get("color", "#94a3b8"),
                    notes=s.get("notes"),
                    practice_count=s.get("practice_count", 0),
                    mastered=s.get("mastered", False),
                )
                db.add(section)

            db.commit()
            results["imported"].append(song_id)

        except Exception as exc:
            db.rollback()
            results["failed"].append({"id": song_id, "error": str(exc)})

    return results
