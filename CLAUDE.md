# SongPractice — Claude Session Guide

## Self-maintenance rule
**Update this file immediately whenever any of the following change:**
- Tech stack, dependencies, or versions
- How to run the app (commands, ports, env vars)
- Project structure (new dirs, renamed files, deleted files)
- Data model (new fields, tables, schema changes)
- API endpoints (new routes, changed paths, removed endpoints)
- Key features added, changed, or removed
- Deployment configuration

---

## What is this?

A web app for singers to practice songs by breaking them into named sections (Intro, Pallavi, Anupallavi, Antara, Interlude, Bridge, Outro, Custom). Users import songs from YouTube or upload local audio files, mark section boundaries on a waveform, loop and drill sections, and track practice progress.

**Primary user:** Mohammed Shammas (singer), shared with singer friends.

---

## Tech stack

### Backend — `backend/`
| Component | Choice |
|-----------|--------|
| Language | Python 3.11+ |
| Framework | FastAPI |
| Database | SQLite via SQLAlchemy (file: `backend/data/songs.db`) |
| Audio download | yt-dlp ≥ 2026.6.9 (must stay current — YouTube API changes break older versions) |
| Audio files stored | `media/` directory at repo root |

### Frontend — `frontend/`
| Component | Choice |
|-----------|--------|
| Build tool | Vite |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS v3 |
| Waveform | Wavesurfer.js v7 + RegionsPlugin |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| Routing | React Router v6 |

---

## How to run

```bash
# Backend (terminal 1) — from repo root
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Frontend (terminal 2) — from repo root
cd frontend
npm run dev
# → http://localhost:5173
```

Vite proxies all `/api/*` requests to `http://localhost:8000`, so no CORS issues in dev.

### First-time setup
```bash
# Backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Tables are auto-created on first run (SQLAlchemy Base.metadata.create_all)

# Frontend
cd frontend && npm install
```

### System dependencies
- **ffmpeg** must be installed (`brew install ffmpeg` on macOS) — required by yt-dlp for audio extraction
- **Node.js** — yt-dlp uses it for YouTube JS signature extraction (avoids missing-format warnings)

---

## Project structure

```
practice/
├── backend/
│   ├── main.py               # FastAPI app entry, CORS, router registration
│   ├── database.py           # SQLAlchemy engine + session + Base
│   ├── models.py             # ORM: Song, Section
│   ├── schemas.py            # Pydantic schemas, SectionType enum, default colors
│   ├── routes/
│   │   ├── songs.py          # Song CRUD + audio streaming (Range header support)
│   │   ├── sections.py       # Section CRUD + practiced/mastered endpoints
│   │   ├── youtube.py        # POST /api/songs/import-youtube
│   │   └── export_import.py  # GET /api/export, POST /api/import (zip-based)
│   ├── services/
│   │   └── downloader.py     # yt-dlp wrapper (async, uses android_vr client)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx           # BrowserRouter + routes
│       ├── main.tsx          # React root + QueryClientProvider
│       ├── index.css         # Tailwind directives + ws-region-label style
│       ├── types/index.ts    # Song, Section, SectionType, color/label maps
│       ├── api/client.ts     # Typed fetch wrappers for all API endpoints
│       ├── store/player.ts   # Zustand: activeSection, looping, speed, currentTime, abA, abB
│       ├── pages/
│       │   ├── LibraryPage.tsx    # Song grid, Add Song, Export, Import
│       │   └── PracticePage.tsx   # Practice view, responsive layout
│       └── components/
│           ├── Import/ImportModal.tsx      # YouTube URL + local file upload
│           ├── Library/SongCard.tsx        # Thumbnail card with delete
│           ├── Player/
│           │   ├── Waveform.tsx            # Wavesurfer + RegionsPlugin, drag-to-create
│           │   ├── SectionWaveform.tsx     # Zoomed section view + A/B controls
│           │   └── PlaybackControls.tsx    # Transport, speed, loop indicator
│           └── Sections/
│               ├── SectionList.tsx         # List wrapper + "Add Section" (captures playhead)
│               ├── SectionItem.tsx         # Loop, practice count, mastered, edit, delete
│               └── SectionEditor.tsx       # Create/edit form; end time auto-sets on pause
├── media/                    # Downloaded/uploaded audio files (gitignored)
├── .gitignore
└── CLAUDE.md                 # This file
```

---

## Data model

### Song
| Field | Type | Notes |
|-------|------|-------|
| id | TEXT (uuid) | Primary key |
| title | TEXT | |
| artist | TEXT | Nullable |
| source_type | TEXT | `"youtube"` or `"local"` |
| source_url | TEXT | YouTube URL; null for local |
| audio_path | TEXT | Absolute path in `media/` |
| thumbnail_url | TEXT | Nullable |
| duration | REAL | Seconds |
| created_at | DATETIME | |

### Section
| Field | Type | Notes |
|-------|------|-------|
| id | TEXT (uuid) | Primary key |
| song_id | TEXT | FK → songs.id (cascade delete) |
| name | TEXT | User label e.g. "Pallavi" |
| type | TEXT | One of the 8 SectionTypes |
| start_time | REAL | Seconds |
| end_time | REAL | Seconds |
| order | INTEGER | Display order |
| color | TEXT | Hex color for waveform region |
| notes | TEXT | Nullable; singer's notes |
| practice_count | INTEGER | Default 0 |
| mastered | BOOLEAN | Default false |
| created_at | DATETIME | |

---

## API endpoints

```
GET    /api/health
GET    /api/songs                         → Song[]
GET    /api/songs/{id}                    → Song + sections
POST   /api/songs/import-youtube          body: {url} → Song
POST   /api/songs/import-file             multipart  → Song
DELETE /api/songs/{id}
GET    /api/songs/{id}/audio              streams audio (Range header supported)

POST   /api/songs/{song_id}/sections      body: SectionCreate → Section
PUT    /api/sections/{id}                 body: SectionUpdate → Section
DELETE /api/sections/{id}
PATCH  /api/sections/{id}/practiced       increments practice_count
PATCH  /api/sections/{id}/mastered        toggles mastered

GET    /api/export                        → streams zip download
POST   /api/import                        multipart zip → {imported, skipped, failed}
```

---

## Key features and behaviours

### Section types (with default colors)
`intro` (slate) · `pallavi` (indigo) · `anupallavi` (violet) · `antara` (pink) · `interlude` (sky) · `bridge` (amber) · `outro` (emerald) · `custom` (gray)

### Add Section workflow
1. Play the song; at section start click **"+ Add Section"** → start time = current playhead
2. Keep playing; pause at section end → end time auto-fills from playhead at pause
3. If user manually types end time, auto-fill is disabled for that session

### A/B repeat
- Set **A** → set **B** → immediately jumps to A, starts looping A→B
- Shown on the section waveform as a yellow/orange highlighted region
- Mutually exclusive with section loop (setting one clears the other)
- **Clear** button removes both markers

### Section waveform
- Appears below main waveform whenever a section is active
- Zoomed to show only that section at full width (precise A/B placement)
- Muted second WaveSurfer instance; playhead is a CSS overlay synced to currentTime from Zustand

### Export / Import
- **Export**: `GET /api/export` → zip containing `songs.json` + audio files for local-upload songs. YouTube songs just store the source URL.
- **Import**: `POST /api/import` with zip → YouTube songs re-downloaded via yt-dlp; local audio extracted from zip. Songs already in DB (matched by ID) are skipped. Full section data, practice counts, and mastered flags are preserved.

### Responsive layout
- **Desktop (≥ 1024px)**: waveforms on left, sections sidebar on right
- **Mobile (< 1024px)**: everything stacked vertically; "Sections (n)" button in header opens a bottom sheet drawer

---

## Known gotchas

- **yt-dlp version**: Pin to `>=2026.6.9`. Older versions (e.g. 2024.12.13) fail signature extraction — YouTube changes break them. Run `pip install -U yt-dlp` if downloads start failing.
- **ffmpeg required**: yt-dlp postprocessor converts to MP3 192kbps. Missing ffmpeg causes download failures.
- **React StrictMode**: WaveSurfer `useEffect` init runs twice in dev. Fixed by using `isReadyRef` guard and nulling refs in cleanup.
- **region.element timing**: Only available after WaveSurfer fires `ready`. Region labels must be appended inside the ready callback, not synchronously after `addRegion()`.
- **SQLite threading**: `check_same_thread=False` is set intentionally for FastAPI's async handlers.

---

## GitHub
- Repo: https://github.com/mshammas/practice
- Branch: `main`
- Remote URL: `git@github-mshammas:mshammas/practice.git` (uses SSH alias `github-mshammas` from `~/.ssh/config`)
- Push command: `git push origin main` (remote is already configured correctly)

---

## Deployment

**Target domain:** `practice.shammas.in`

### Architecture
```
Browser → practice.shammas.in  (Vercel — frontend)
                ↓ API calls
        songpractice-api.onrender.com  (Render — backend)
```

### Backend — Render
1. Go to https://render.com → New → Web Service → connect `mshammas/practice`
2. Render auto-detects `render.yaml` at the repo root — no manual config needed
3. After deploy, note the service URL (e.g. `https://songpractice-api.onrender.com`)
4. If the URL differs from the default, update `ALLOWED_ORIGINS` in `render.yaml` and redeploy

> **Persistent disk required:** `render.yaml` provisions a 1 GB disk at `/data` for the SQLite DB and audio files. This needs Render's Starter plan ($7/month). The free plan has ephemeral storage — data is lost on every restart.

### Frontend — Vercel
1. Go to https://vercel.com → New Project → import `mshammas/practice`
2. Set **Root Directory** to `frontend`
3. Add environment variable: `VITE_API_BASE_URL` = your Render service URL (e.g. `https://songpractice-api.onrender.com`)
4. Deploy — Vercel auto-detects Vite, `frontend/vercel.json` handles SPA routing
5. Project Settings → Domains → add `practice.shammas.in`

### DNS (shammas.in)
Add a CNAME record at your DNS provider:
```
practice    CNAME    cname.vercel-dns.com
```
Vercel provisions an SSL certificate automatically.

### Environment variables
| Where | Variable | Value |
|-------|----------|-------|
| Render | `DATA_DIR` | `/data/db` |
| Render | `MEDIA_DIR` | `/data/media` |
| Render | `ALLOWED_ORIGINS` | `https://practice.shammas.in` |
| Vercel | `VITE_API_BASE_URL` | `https://songpractice-api.onrender.com` |

### Post-deploy checklist
- [ ] `https://<render-url>/api/health` returns `{"status":"ok"}`
- [ ] `https://practice.shammas.in` loads the library page
- [ ] YouTube import works end-to-end
- [ ] Export/import zip round-trip works
