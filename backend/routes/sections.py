from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Section, Song
from schemas import SECTION_TYPE_COLORS, SectionCreate, SectionOut, SectionUpdate

router = APIRouter(tags=["sections"])


@router.post("/api/songs/{song_id}/sections", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def create_section(song_id: str, body: SectionCreate, db: Session = Depends(get_db)):
    song = db.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    color = body.color or SECTION_TYPE_COLORS.get(body.type, "#94a3b8")
    section = Section(
        song_id=song_id,
        name=body.name,
        type=body.type,
        start_time=body.start_time,
        end_time=body.end_time,
        order=body.order,
        color=color,
        notes=body.notes,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.put("/api/sections/{section_id}", response_model=SectionOut)
def update_section(section_id: str, body: SectionUpdate, db: Session = Depends(get_db)):
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(section, field, value)

    db.commit()
    db.refresh(section)
    return section


@router.delete("/api/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(section_id: str, db: Session = Depends(get_db)):
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(section)
    db.commit()


@router.patch("/api/sections/{section_id}/practiced", response_model=SectionOut)
def increment_practiced(section_id: str, db: Session = Depends(get_db)):
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    section.practice_count += 1
    db.commit()
    db.refresh(section)
    return section


@router.patch("/api/sections/{section_id}/mastered", response_model=SectionOut)
def toggle_mastered(section_id: str, db: Session = Depends(get_db)):
    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    section.mastered = not section.mastered
    db.commit()
    db.refresh(section)
    return section
