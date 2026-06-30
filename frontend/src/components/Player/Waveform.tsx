import { useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions.js";
import type { Section } from "../../types";
import { usePlayerStore } from "../../store/player";

interface Props {
  audioUrl: string;
  sections: Section[];
  onReady: (ws: WaveSurfer) => void;
  onTimeUpdate: (t: number) => void;
  onRegionCreate: (start: number, end: number) => void;
  onRegionClick: (sectionId: string) => void;
}

function drawRegions(regions: RegionsPlugin, sections: Section[]) {
  regions.clearRegions();
  sections.forEach((s) => {
    const region = regions.addRegion({
      id: s.id,
      start: s.start_time,
      end: s.end_time,
      color: s.color + "55",
      drag: false,
      resize: false,
    });
    if (region.element) {
      const label = document.createElement("span");
      label.className = "ws-region-label";
      label.textContent = s.name;
      region.element.appendChild(label);
    }
  });
}

export function Waveform({
  audioUrl,
  sections,
  onReady,
  onTimeUpdate,
  onRegionCreate,
  onRegionClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const isReadyRef = useRef(false);
  const sectionsRef = useRef<Section[]>(sections);
  sectionsRef.current = sections;

  const { speed, activeSection, looping, abA, abB } = usePlayerStore();

  useEffect(() => {
    if (!containerRef.current) return;
    isReadyRef.current = false;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#374151",
      progressColor: "#6366f1",
      cursorColor: "#a5b4fc",
      height: typeof window !== "undefined" && window.innerWidth < 1024 ? 72 : 96,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      plugins: [regions],
    });

    wsRef.current = ws;
    ws.load(audioUrl);

    ws.on("ready", () => {
      isReadyRef.current = true;
      drawRegions(regions, sectionsRef.current);
      onReady(ws);
    });

    ws.on("timeupdate", onTimeUpdate);

    regions.enableDragSelection({ color: "rgba(99,102,241,0.25)" });
    regions.on("region-created", (region: Region) => {
      const { start, end } = region;
      region.remove();
      onRegionCreate(start, end);
    });
    regions.on("region-clicked", (region: Region, e: MouseEvent) => {
      e.stopPropagation();
      onRegionClick(region.id);
    });

    return () => {
      isReadyRef.current = false;
      ws.destroy();
      wsRef.current = null;
      regionsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  useEffect(() => {
    if (!isReadyRef.current || !regionsRef.current) return;
    drawRegions(regionsRef.current, sections);
  }, [sections]);

  useEffect(() => {
    wsRef.current?.setPlaybackRate(speed, true);
  }, [speed]);

  // A/B loop — takes priority over section loop
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || abA === null || abB === null) return;

    const loopStart = Math.min(abA, abB);
    const loopEnd = Math.max(abA, abB);

    // Jump to A and play immediately
    ws.seekTo(loopStart / ws.getDuration());
    ws.play();

    const check = () => {
      if (ws.getCurrentTime() >= loopEnd) {
        ws.seekTo(loopStart / ws.getDuration());
      }
    };
    ws.on("timeupdate", check);
    return () => { ws.un("timeupdate", check); };
  }, [abA, abB]);

  // Section loop (only when no A/B active)
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !looping || !activeSection || (abA !== null && abB !== null)) return;

    const check = () => {
      if (ws.getCurrentTime() >= activeSection.end_time) {
        ws.seekTo(activeSection.start_time / ws.getDuration());
      }
    };
    ws.on("timeupdate", check);
    return () => { ws.un("timeupdate", check); };
  }, [looping, activeSection, abA, abB]);

  return (
    <div className="bg-gray-950 px-4 py-3 rounded-xl">
      <div ref={containerRef} />
      <p className="text-xs text-gray-600 mt-1 text-center">
        Drag on the waveform to mark a new section
      </p>
    </div>
  );
}

export function useWavesurfer() {
  const wsRef = useRef<WaveSurfer | null>(null);

  const setWs = useCallback((ws: WaveSurfer) => { wsRef.current = ws; }, []);
  const playPause = useCallback(() => wsRef.current?.playPause(), []);
  const seekTo = useCallback((seconds: number) => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.seekTo(seconds / ws.getDuration());
  }, []);
  const skip = useCallback((delta: number) => {
    const ws = wsRef.current;
    if (!ws) return;
    const next = Math.max(0, Math.min(ws.getCurrentTime() + delta, ws.getDuration()));
    ws.seekTo(next / ws.getDuration());
  }, []);
  const isPlaying = useCallback(() => wsRef.current?.isPlaying() ?? false, []);

  return { setWs, playPause, seekTo, skip, isPlaying };
}
