from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Song
from schemas import SongOut, YoutubeImportRequest
from services.downloader import download_youtube_async

router = APIRouter(prefix="/api/songs", tags=["youtube"])


@router.post("/import-youtube", response_model=SongOut, status_code=status.HTTP_201_CREATED)
async def import_youtube(body: YoutubeImportRequest, db: Session = Depends(get_db)):
    try:
        meta = await download_youtube_async(body.url)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Download failed: {exc}") from exc

    song = Song(
        title=meta["title"],
        artist=meta.get("artist"),
        source_type="youtube",
        source_url=meta["source_url"],
        audio_path=meta["audio_path"],
        thumbnail_url=meta.get("thumbnail_url"),
        duration=meta.get("duration"),
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    return song
