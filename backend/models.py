import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Song(Base):
    __tablename__ = "songs"

    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String, nullable=False)
    artist = Column(String, nullable=True)
    source_type = Column(String, nullable=False)  # "youtube" | "local"
    source_url = Column(String, nullable=True)
    audio_path = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    duration = Column(Float, nullable=True)
    created_at = Column(DateTime, default=_now)

    sections = relationship("Section", back_populates="song", cascade="all, delete-orphan", order_by="Section.order")


class Section(Base):
    __tablename__ = "sections"

    id = Column(String, primary_key=True, default=_uuid)
    song_id = Column(String, ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, default="custom")
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    order = Column(Integer, nullable=False, default=0)
    color = Column(String, nullable=False, default="#6366f1")
    notes = Column(Text, nullable=True)
    practice_count = Column(Integer, nullable=False, default=0)
    mastered = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=_now)

    song = relationship("Song", back_populates="sections")
