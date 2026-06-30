import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import type { Section } from "../../types";
import { usePlayerStore } from "../../store/player";

interface Props {
  audioUrl: string;
  section: Section;
  onSeek: (time: number) => void;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, "0")}`;
}

export function SectionWaveform({ audioUrl, section, onSeek }: Props) {
  const waveRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { currentTime, abA, abB, setAbA, setAbB, clearAb } = usePlayerStore();

  const sectionDuration = section.end_time - section.start_time;

  // Playhead position as % within the section (0–100)
  const playheadPct =
    sectionDuration > 0
      ? Math.max(
          0,
          Math.min(100, ((currentTime - section.start_time) / sectionDuration) * 100)
        )
      : 0;

  // A/B positions as % — only show if within section bounds
  const pctOf = (t: number | null) =>
    t !== null && t >= section.start_time && t <= section.end_time
      ? ((t - section.start_time) / sectionDuration) * 100
      : null;

  const aPct = pctOf(abA);
  const bPct = pctOf(abB);
  const abActive = abA !== null && abB !== null;
  const loopLeft = abActive ? Math.min(aPct ?? 0, bPct ?? 0) : null;
  const loopWidth = abActive ? Math.abs((bPct ?? 0) - (aPct ?? 0)) : null;

  // Init section WaveSurfer (visual only — muted, no interaction)
  useEffect(() => {
    if (!waveRef.current) return;
    setIsReady(false);

    const ws = WaveSurfer.create({
      container: waveRef.current,
      waveColor: section.color + "66",
      progressColor: section.color + "cc",
      cursorColor: "transparent",
      height: typeof window !== "undefined" && window.innerWidth < 1024 ? 56 : 72,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: false,
    });

    wsRef.current = ws;
    ws.setVolume(0);
    ws.load(audioUrl);

    ws.on("ready", () => {
      const el = waveRef.current;
      if (!el) return;

      const pxPerSec = el.clientWidth / sectionDuration;
      ws.zoom(pxPerSec);

      // Scroll the internal WaveSurfer container to the section start
      setTimeout(() => {
        const scrollEl = el.querySelector<HTMLElement>("div");
        if (scrollEl) {
          scrollEl.scrollLeft = section.start_time * pxPerSec;
          // Prevent user scrolling — we control position entirely
          scrollEl.style.overflow = "hidden";
        }
        setIsReady(true);
      }, 0);
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
      setIsReady(false);
    };
  // Re-mount when section changes so zoom recalculates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, section.id, section.start_time, section.end_time]);

  // Click on the waveform → seek main player to that position in the section
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    onSeek(section.start_time + frac * sectionDuration);
  };

  return (
    <div className="rounded-xl border border-dashed border-gray-700 bg-gray-950 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: section.color }} />
          <span className="text-xs font-semibold text-gray-200 truncate max-w-[200px]">
            {section.name}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            {fmtTime(section.start_time)} – {fmtTime(section.end_time)}
          </span>
        </div>

        {/* A/B controls */}
        <div className="flex items-center gap-1.5">
          {(abA !== null || abB !== null) && (
            <button
              onClick={clearAb}
              className="text-[10px] text-gray-500 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded border border-gray-700 hover:border-red-500"
            >
              Clear
            </button>
          )}

          <button
            onClick={() => setAbA(currentTime)}
            title="Set A point at current playhead"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              abA !== null
                ? "bg-yellow-400 text-gray-900"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            A{abA !== null && <span className="font-mono font-normal text-[10px]">{fmtTime(abA)}</span>}
          </button>

          <button
            onClick={() => setAbB(currentTime)}
            title="Set B point at current playhead"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              abB !== null
                ? "bg-orange-400 text-gray-900"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            B{abB !== null && <span className="font-mono font-normal text-[10px]">{fmtTime(abB)}</span>}
          </button>
        </div>
      </div>

      {/* Waveform + overlays */}
      <div
        className="relative cursor-pointer select-none"
        onClick={handleClick}
      >
        {/* WaveSurfer mounts here */}
        <div ref={waveRef} />

        {/* Loading state */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80">
            <span className="text-xs text-gray-500 animate-pulse">Loading section…</span>
          </div>
        )}

        {isReady && (
          <>
            {/* A/B loop region highlight */}
            {abActive && loopLeft !== null && loopWidth !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: `${loopLeft}%`,
                  width: `${loopWidth}%`,
                  background: "rgba(251,191,36,0.15)",
                  borderLeft: "2px solid #facc15",
                  borderRight: "2px solid #fb923c",
                }}
              />
            )}

            {/* A marker line */}
            {aPct !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-yellow-400 pointer-events-none"
                style={{ left: `${aPct}%` }}
              >
                <span className="absolute top-1 left-1 text-[9px] font-bold text-yellow-300 bg-black/70 px-0.5 rounded leading-tight">
                  A
                </span>
              </div>
            )}

            {/* B marker line */}
            {bPct !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-orange-400 pointer-events-none"
                style={{ left: `${bPct}%` }}
              >
                <span className="absolute top-1 left-1 text-[9px] font-bold text-orange-300 bg-black/70 px-0.5 rounded leading-tight">
                  B
                </span>
              </div>
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-px bg-violet-400 pointer-events-none transition-none"
              style={{ left: `${playheadPct}%` }}
            />
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-1.5 border-t border-gray-800/60 flex items-center justify-between">
        <p className="text-[10px] text-gray-600">
          Click waveform to seek · Set A then B to drill a phrase
        </p>
        {abActive && (
          <p className="text-[10px] text-yellow-500 font-medium animate-pulse">
            ↺ A/B looping
          </p>
        )}
      </div>
    </div>
  );
}
