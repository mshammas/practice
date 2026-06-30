from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routes import export_import, sections, songs, youtube

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Song Practice API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
