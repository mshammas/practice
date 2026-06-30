import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { SECTION_TYPE_LABELS, type Section } from "../../types";
import { usePlayerStore } from "../../store/player";

interface Props {
  section: Section;
  songId: string;
  isActive: boolean;
  onEdit: () => void;
  onSeek: (time: number) => void;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function SectionItem({ section, songId, isActive, onEdit, onSeek }: Props) {
  const qc = useQueryClient();
  const { activeSection, looping, setActiveSection, setLooping, clearAb } = usePlayerStore();

  const practicedMutation = useMutation({
    mutationFn: () => api.sections.practiced(section.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["song", songId] }),
  });

  const masteredMutation = useMutation({
    mutationFn: () => api.sections.toggleMastered(section.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["song", songId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.sections.delete(section.id),
    onSuccess: () => {
      if (activeSection?.id === section.id) setActiveSection(null);
      qc.invalidateQueries({ queryKey: ["song", songId] });
    },
  });

  const isLoopingThis = isActive && looping;

  const handleLoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoopingThis) {
      setLooping(false);
      setActiveSection(null);
    } else {
      clearAb(); // A/B and section loop are mutually exclusive
      setActiveSection(section);
      setLooping(true);
      onSeek(section.start_time);
    }
  };

  return (
    <div
      className={`group relative rounded-xl border transition-all cursor-pointer ${
        isActive
          ? "border-brand-500 bg-brand-500/10"
          : "border-gray-800 bg-gray-900 hover:border-gray-600"
      }`}
      onClick={() => onSeek(section.start_time)}
    >
      {/* Color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: section.color }}
      />

      <div className="pl-3 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{section.name}</span>
              {section.mastered && (
                <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full shrink-0">✓</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5"
                style={{ background: section.color + "33", color: section.color }}
              >
                {SECTION_TYPE_LABELS[section.type as keyof typeof SECTION_TYPE_LABELS] || section.type}
              </span>
              {fmtTime(section.start_time)} – {fmtTime(section.end_time)}
            </div>
            {section.notes && (
              <p className="text-xs text-gray-500 mt-1 italic truncate">{section.notes}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Loop */}
            <button
              onClick={handleLoop}
              title={isLoopingThis ? "Stop loop" : "Loop this section"}
              className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-colors ${
                isLoopingThis
                  ? "bg-brand-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              ↺
            </button>

            {/* Practiced */}
            <button
              onClick={(e) => { e.stopPropagation(); practicedMutation.mutate(); }}
              title={`Practiced ${section.practice_count}×`}
              className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs flex items-center justify-center text-gray-400 transition-colors"
            >
              {section.practice_count > 0 ? (
                <span className="text-[10px] font-bold text-brand-400">{section.practice_count}</span>
              ) : "📝"}
            </button>

            {/* Mastered */}
            <button
              onClick={(e) => { e.stopPropagation(); masteredMutation.mutate(); }}
              title={section.mastered ? "Unmark mastered" : "Mark as mastered"}
              className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-colors ${
                section.mastered ? "bg-green-600/30 text-green-400" : "bg-gray-800 text-gray-500 hover:bg-gray-700"
              }`}
            >
              ★
            </button>

            {/* Edit */}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs flex items-center justify-center text-gray-400 transition-colors"
            >
              ✎
            </button>

            {/* Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${section.name}"?`)) deleteMutation.mutate();
              }}
              className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-600/40 text-xs flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
