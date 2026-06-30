import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import {
  SECTION_TYPE_COLORS,
  SECTION_TYPE_LABELS,
  type Section,
  type SectionCreate,
  type SectionType,
} from "../../types";
import { usePlayerStore } from "../../store/player";

interface Props {
  songId: string;
  section?: Section | null;
  defaultStart?: number;
  defaultEnd?: number;
  onClose: () => void;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, "0")}`;
}

function parseTime(v: string): number {
  const parts = v.split(":");
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  return parseFloat(v) || 0;
}

export function SectionEditor({ songId, section, defaultStart = 0, defaultEnd, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!section;

  const [name, setName] = useState(section?.name ?? "");
  const [type, setType] = useState<SectionType>(section?.type ?? "custom");
  const [startRaw, setStartRaw] = useState(fmtTime(section?.start_time ?? defaultStart));
  // End time: use existing end if editing, otherwise start same as start (will update on pause)
  const [endRaw, setEndRaw] = useState(fmtTime(section?.end_time ?? defaultEnd ?? defaultStart));
  const [notes, setNotes] = useState(section?.notes ?? "");
  const [color, setColor] = useState(section?.color ?? SECTION_TYPE_COLORS["custom"]);

  // Track whether the user has manually edited the end time field
  const endManuallyEdited = useRef(false);

  const { isPlaying, currentTime } = usePlayerStore();
  const prevIsPlaying = useRef(isPlaying);

  // When song transitions from playing → paused, snap end time to current playhead
  // Only for new sections (not edits) and only if user hasn't manually typed an end time
  useEffect(() => {
    if (isEdit) return;
    if (prevIsPlaying.current && !isPlaying && !endManuallyEdited.current) {
      setEndRaw(fmtTime(currentTime));
    }
    prevIsPlaying.current = isPlaying;
  }, [isPlaying, currentTime, isEdit]);

  // Auto-set color when type changes
  useEffect(() => {
    setColor(SECTION_TYPE_COLORS[type]);
  }, [type]);

  const afterSave = () => {
    qc.invalidateQueries({ queryKey: ["song", songId] });
    onClose();
  };

  const createMutation = useMutation({
    mutationFn: (data: SectionCreate) => api.sections.create(songId, data),
    onSuccess: afterSave,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SectionCreate>) => api.sections.update(section!.id, data),
    onSuccess: afterSave,
  });

  const handleSubmit = () => {
    const payload = {
      name: name.trim() || SECTION_TYPE_LABELS[type],
      type,
      start_time: parseTime(startRaw),
      end_time: parseTime(endRaw),
      color,
      notes: notes.trim() || undefined,
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const busy = createMutation.isPending || updateMutation.isPending;
  const err = createMutation.error || updateMutation.error;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{isEdit ? "Edit Section" : "New Section"}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
      </div>

      {/* Type */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SectionType)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        >
          {(Object.entries(SECTION_TYPE_LABELS) as [SectionType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Name */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Label</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={SECTION_TYPE_LABELS[type]}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Start</label>
          <input
            value={startRaw}
            onChange={(e) => setStartRaw(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
            End
            {!isEdit && !endManuallyEdited.current && (
              <span className="text-[10px] text-brand-400 font-normal">
                {isPlaying ? "▶ playing…" : "⏸ paused here"}
              </span>
            )}
          </label>
          <input
            value={endRaw}
            onChange={(e) => {
              endManuallyEdited.current = true;
              setEndRaw(e.target.value);
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Hint for new sections */}
      {!isEdit && !endManuallyEdited.current && (
        <p className="text-xs text-gray-500 -mt-2">
          Keep playing and pause the song when the section ends — end time will be set automatically.
        </p>
      )}

      {/* Color */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-400">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded-lg border border-gray-700 bg-transparent cursor-pointer"
        />
        <div className="flex gap-1.5">
          {Object.values(SECTION_TYPE_COLORS).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? "border-white scale-110" : "border-transparent"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. breathe before high note, mind the sur…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-500"
        />
      </div>

      {err && <p className="text-red-400 text-xs">{String(err)}</p>}

      <button
        onClick={handleSubmit}
        disabled={busy}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg py-2.5 text-sm font-medium transition-colors"
      >
        {busy ? "Saving…" : isEdit ? "Update Section" : "Add Section"}
      </button>
    </div>
  );
}
