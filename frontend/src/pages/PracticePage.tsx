import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Waveform, useWavesurfer } from "../components/Player/Waveform";
import { SectionWaveform } from "../components/Player/SectionWaveform";
import { PlaybackControls } from "../components/Player/PlaybackControls";
import { SectionList } from "../components/Sections/SectionList";
import { SectionEditor } from "../components/Sections/SectionEditor";
import { usePlayerStore } from "../store/player";

export function PracticePage() {
  const { songId } = useParams<{ songId: string }>();
  const { setWs, playPause, seekTo, skip, isPlaying } = useWavesurfer();
  const { activeSection, setActiveSection, setIsPlaying, setCurrentTime, currentTime } = usePlayerStore();

  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [draftRegion, setDraftRegion] = useState<{ start: number; end: number } | null>(null);
  const [showSections, setShowSections] = useState(false);
  const [newSectionStart, setNewSectionStart] = useState<number | null>(null);

  const handleAddSection = useCallback(() => {
    // Capture playhead position at the moment the button is clicked; close the
    // mobile drawer so the waveform + playback controls are visible to mark the end.
    setNewSectionStart(currentTime);
    setShowSections(false);
  }, [currentTime]);

  const { data: song, isLoading, isError } = useQuery({
    queryKey: ["song", songId],
    queryFn: () => api.songs.get(songId!),
    enabled: !!songId,
  });

  const handleReady = useCallback(
    (ws: import("wavesurfer.js").default) => {
      setWs(ws);
      setDuration(ws.getDuration());
      ws.on("play", () => { setPlaying(true); setIsPlaying(true); });
      ws.on("pause", () => { setPlaying(false); setIsPlaying(false); });
    },
    [setWs, setIsPlaying]
  );

  const handleTimeUpdate = useCallback((t: number) => {
    setLocalCurrentTime(t);
    setCurrentTime(t);
  }, [setCurrentTime]);

  const handlePlayPause = () => {
    playPause();
    setPlaying(isPlaying());
  };

  const handleSeek = useCallback((time: number) => {
    seekTo(time);
    // Half-open interval: adjacent sections often share a boundary (one's end_time ==
    // the next's start_time), so an inclusive end check would always resolve to the
    // earlier section at that boundary.
    const sec = song?.sections.find((s) => time >= s.start_time && time < s.end_time);
    setActiveSection(sec ?? null);
  }, [seekTo, song, setActiveSection]);

  const handleRegionClick = (sectionId: string) => {
    const sec = song?.sections.find((s) => s.id === sectionId);
    if (sec) handleSeek(sec.start_time);
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Loading song…</div>
  );
  if (isError || !song) return (
    <div className="min-h-screen flex items-center justify-center text-red-400">
      Song not found. <Link to="/" className="text-brand-400 ml-2 underline">Go back</Link>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm shrink-0">
          ← Library
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {song.thumbnail_url && (
            <img src={song.thumbnail_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="font-semibold text-sm truncate leading-tight">{song.title}</h1>
            {song.artist && <p className="text-xs text-gray-400 truncate leading-tight">{song.artist}</p>}
          </div>
        </div>

        {/* Mobile: sections toggle button */}
        <button
          onClick={() => setShowSections((v) => !v)}
          className="lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-300 active:bg-gray-700"
        >
          <span>Sections</span>
          <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {song.sections.length}
          </span>
        </button>

        {song.source_url && (
          <a
            href={song.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:block ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors shrink-0"
          >
            Open source ↗
          </a>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Main content column */}
        <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden min-h-0">
          {/* Main waveform */}
          <div className="px-3 pt-3 pb-2 lg:p-4 lg:pb-2">
            <Waveform
              audioUrl={api.songs.audioUrl(song.id)}
              sections={song.sections}
              onReady={handleReady}
              onTimeUpdate={handleTimeUpdate}
              onRegionCreate={(start, end) => setDraftRegion({ start, end })}
              onRegionClick={handleRegionClick}
            />
          </div>

          {/* Draft section editor (drag-to-create on waveform) */}
          {draftRegion && (
            <div className="px-3 pb-2 lg:px-4">
              <SectionEditor
                songId={song.id}
                defaultStart={draftRegion.start}
                defaultEnd={draftRegion.end}
                onClose={() => setDraftRegion(null)}
              />
            </div>
          )}

          {/* New section editor (triggered via "+ Add Section") — rendered here,
              next to the waveform/controls, so mobile users can play/pause to set the end */}
          {newSectionStart !== null && !draftRegion && (
            <div className="px-3 pb-2 lg:px-4">
              <SectionEditor
                songId={song.id}
                defaultStart={newSectionStart}
                onClose={() => setNewSectionStart(null)}
              />
            </div>
          )}

          {/* Section waveform (active section zoomed view) */}
          {activeSection && !draftRegion && newSectionStart === null && (
            <div className="px-3 pb-2 lg:px-4">
              <SectionWaveform
                audioUrl={api.songs.audioUrl(song.id)}
                section={activeSection}
                onSeek={handleSeek}
              />
            </div>
          )}

          {/* Spacer pushes controls to bottom on desktop */}
          <div className="hidden lg:block flex-1" />

          {/* Playback controls */}
          <PlaybackControls
            isPlaying={playing}
            onPlayPause={handlePlayPause}
            onSkip={skip}
            duration={duration}
            currentTime={localCurrentTime}
          />
        </div>

        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:flex w-80 border-l border-gray-800 flex-col overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Sections</h2>
            <span className="text-xs text-gray-500">{song.sections.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <SectionList
              song={song}
              activeSectionId={activeSection?.id ?? null}
              onSeek={handleSeek}
              isAddingSection={newSectionStart !== null}
              onAddSection={handleAddSection}
            />
          </div>
        </aside>
      </div>

      {/* ── Mobile sections drawer ── */}
      {showSections && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSections(false)}
          />
          {/* Sheet */}
          <div className="relative bg-gray-900 rounded-t-2xl border-t border-gray-700 max-h-[70vh] flex flex-col z-10">
            {/* Handle + header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold">Sections</h2>
              <button
                onClick={() => setShowSections(false)}
                className="text-gray-400 hover:text-white text-lg leading-none"
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <SectionList
                song={song}
                activeSectionId={activeSection?.id ?? null}
                onSeek={(t) => { handleSeek(t); setShowSections(false); }}
                isAddingSection={newSectionStart !== null}
                onAddSection={handleAddSection}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
