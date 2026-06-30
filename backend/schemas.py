from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

SectionType = Literal[
    "intro", "pallavi", "anupallavi", "antara",
    "interlude", "bridge", "outro", "custom"
]

SECTION_TYPE_COLORS: dict[str, str] = {
    "intro":      "#64748b",
    "pallavi":    "#6366f1",
    "anupallavi": "#8b5cf6",
    "antara":     "#ec4899",
    "interlude":  "#0ea5e9",
    "bridge":     "#f59e0b",
    "outro":      "#10b981",
    "custom":     "#94a3b8",
}


# ── Section ──────────────────────────────────────────────────────────────────

class SectionCreate(BaseModel):
    name: str
    type: SectionType = "custom"
    start_time: float
    end_time: float
    order: int = 0
    color: Optional[str] = None
    notes: Optional[str] = None


class SectionUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[SectionType] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    order: Optional[int] = None
    color: Optional[str] = None
    notes: Optional[str] = None
    mastered: Optional[bool] = None


class SectionOut(BaseModel):
    id: str
    song_id: str
    name: str
    type: str
    start_time: float
    end_time: float
    order: int
    color: str
    notes: Optional[str]
    practice_count: int
    mastered: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Song ─────────────────────────────────────────────────────────────────────

class SongOut(BaseModel):
    id: str
    title: str
    artist: Optional[str]
    source_type: str
    source_url: Optional[str]
    thumbnail_url: Optional[str]
    duration: Optional[float]
    created_at: datetime
    sections: list[SectionOut] = []

    model_config = {"from_attributes": True}


class YoutubeImportRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL")
