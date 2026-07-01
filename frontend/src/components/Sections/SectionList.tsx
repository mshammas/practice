import { useState } from "react";
import type { Section, Song } from "../../types";
import { SectionItem } from "./SectionItem";
import { SectionEditor } from "./SectionEditor";

interface Props {
  song: Song;
  activeSectionId: string | null;
  onSeek: (time: number) => void;
  isAddingSection: boolean;
  onAddSection: () => void;
}

export function SectionList({ song, activeSectionId, onSeek, isAddingSection, onAddSection }: Props) {
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto scrollbar-thin pr-1">
      {/* Add section button */}
      {!isAddingSection && !editingSection && (
        <button
          onClick={onAddSection}
          className="w-full border border-dashed border-gray-700 hover:border-brand-500 text-gray-400 hover:text-brand-400 rounded-xl py-2.5 text-sm transition-colors"
        >
          + Add Section
        </button>
      )}

      {song.sections.length === 0 && !isAddingSection && (
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
