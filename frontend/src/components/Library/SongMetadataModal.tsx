import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Song } from "../../types";

interface Props {
  song: Song;
  onClose: () => void;
}

export function SongMetadataModal({ song, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: song.title ?? "",
    artist: song.artist ?? "",
    composer: song.composer ?? "",
    lyricist: song.lyricist ?? "",
    album: song.album ?? "",
    year: song.year ? String(song.year) : "",
    language: song.language ?? "",
    tags: song.tags ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.songs.update(song.id, {
        ...form,
        year: form.year ? parseInt(form.year) : null,
        artist: form.artist || undefined,
        composer: form.composer || undefined,
        lyricist: form.lyricist || undefined,
        album: form.album || undefined,
        language: form.language || undefined,
        tags: form.tags || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["songs"] });
      qc.invalidateQueries({ queryKey: ["song", song.id] });
      onClose();
    },
  });

  const field = (label: string, key: keyof typeof form, placeholder?: string) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-base">Edit Song Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {field("Title", "title")}
          {field("Artist / Singer", "artist")}
          {field("Composer", "composer", "e.g. Naushad")}
          {field("Lyricist", "lyricist", "e.g. Shakeel Badayuni")}
          {field("Album / Film", "album", "e.g. Mughal-E-Azam")}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Year</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                placeholder="e.g. 1960"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            {field("Language", "language", "e.g. Urdu")}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tags</label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="ghazal, slow, practice, favourite"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
            />
            <p className="text-[10px] text-gray-600 mt-1">Separate tags with commas</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
