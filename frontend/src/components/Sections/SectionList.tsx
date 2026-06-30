import { useState } from "react";
import type { Section, Song } from "../../types";
import { SectionItem } from "./SectionItem";
import { SectionEditor } from "./SectionEditor";
import { usePlayerStore } from "../../store/player";

interface Props {
  song: Song;
  activeSectionId: string | null;
  onSeek: (time: number) => void;
}

export function SectionList({ song, activeSectionId, onSeek }: Props) {
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [addingStart, setAddingStart] = useState<number | null>(null);
  const { currentTime } = usePlayerStore();

  const handleAddSection = () => {
    // Capture playhead position at the moment the button is clicked
    setAddingStart(currentTime);
  };

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto scrollbar-thin pr-1">
      {/* Add section button */}
      {addingStart === null && !editingSection && (
        <button
          onClick={handleAddSection}
          className="w-full border border-dashed border-gray-700 hover:border-brand-500 text-gray-400 hover:text-brand-400 rounded-xl py-2.5 text-sm transition-colors"
        >
          + Add Section
        </button>
      )}

      {/* New section editor — start locked to playhead at click, end updates on pause */}
      {addingStart !== null && (
        <SectionEditor
          songId={song.id}
          defaultStart={addingStart}
          onClose={() => setAddingStart(null)}
        />
      )}

      {song.sections.length === 0 && addingStart === null && (
        <p className="text-center text-sm text-gray-500 py-8">
          No sections yet.<br />
          <span className="text-xs">Drag on the waveform or click "+ Add Section"</span>
        </p>
      )}

      {song.sections.map((s) =>
        editingSection?.id === s.id ? (
          <SectionEditor
            key={s.id}
            songId={song.id}
            section={s}
            onClose={() => setEditingSection(null)}
          />
        ) : (
          <SectionItem
            key={s.id}
            section={s}
            songId={song.id}
            isActive={activeSectionId === s.id}
            onEdit={() => setEditingSection(s)}
            onSeek={onSeek}
          />
        )
      )}
    </div>
  );
}
