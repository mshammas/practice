import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Song } from "../../types";

interface Props {
  song: Song;
  onClose: () => void;
}

type FormState = {
  title: string;
  artist: string;
  composer: string;
  lyricist: string;
  album: string;
  year: string;
  language: string;
  tags: string;
};

function toForm(song: Song): FormState {
  return {
    title: song.title ?? "",
    artist: song.artist ?? "",
    composer: song.composer ?? "",
    lyricist: song.lyricist ?? "",
    album: song.album ?? "",
    year: song.year ? String(song.year) : "",
    language: song.language ?? "",
    tags: song.tags ?? "",
  };
}

export function SongMetadataModal({ song, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(toForm(song));
  const [extractUrl, setExtractUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [filledKeys, setFilledKeys] = useState<Set<string>>(new Set());

  const saveMutation = useMutation({
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

  async function handleExtract() {
    if (!extractUrl.trim()) return;
    setExtracting(true);
    setExtractError(null);
    setFilledKeys(new Set());
    try {
      const data = await api.songs.extractMetadata(extractUrl.trim());
      const filled = new Set<string>();
      setForm((f) => {
        const next = { ...f };
        const map: Record<string, keyof FormState> = {
          title: "title", artist: "artist", composer: "composer",
          lyricist: "lyricist", album: "album", language: "language", tags: "tags",
        };
        for (const [key, fkey] of Object.entries(map)) {
          if (data[key]) { next[fkey] = String(data[key]); filled.add(fkey); }
        }
        if (data.year) { next.year = String(data.year); filled.add("year"); }
        return next;
      });
      setFilledKeys(filled);
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  const highlight = (key: keyof FormState) =>
    filledKeys.has(key) ? "border-brand-500 bg-brand-950/20" : "border-gray-700";

  const field = (label: string, key: keyof FormState, placeholder?: string) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        value={form[key]}
        onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setFilledKeys((s) => { const n = new Set(s); n.delete(key); return n; }); }}
        placeholder={placeholder}
        className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors ${highlight(key)}`}
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

        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* URL extraction */}
          <div className="bg-gray-800/60 rounded-xl p-3 space-y-2">
            <p className="text-xs text-gray-400 font-medium">Extract from a webpage</p>
            <p className="text-[11px] text-gray-500">Paste a Wikipedia, Gaana, Raaga, or any music info page — fields will be auto-filled.</p>
            <div className="flex gap-2">
              <input
                value={extractUrl}
                onChange={(e) => setExtractUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExtract()}
                placeholder="https://en.wikipedia.org/wiki/…"
                className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleExtract}
                disabled={extracting || !extractUrl.trim()}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                {extracting ? "…" : "Extract"}
              </button>
            </div>
            {extractError && <p className="text-[11px] text-red-400">{extractError}</p>}
            {filledKeys.size > 0 && (
              <p className="text-[11px] text-brand-400">
                Filled {filledKeys.size} field{filledKeys.size !== 1 ? "s" : ""} — review and save below.
              </p>
            )}
          </div>

          {/* Manual fields */}
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
                onChange={(e) => { setForm((f) => ({ ...f, year: e.target.value })); setFilledKeys((s) => { const n = new Set(s); n.delete("year"); return n; }); }}
                placeholder="e.g. 1960"
                className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors ${highlight("year")}`}
              />
            </div>
            {field("Language", "language", "e.g. Urdu")}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tags</label>
            <input
              value={form.tags}
              onChange={(e) => { setForm((f) => ({ ...f, tags: e.target.value })); setFilledKeys((s) => { const n = new Set(s); n.delete("tags"); return n; }); }}
              placeholder="ghazal, slow, practice, favourite"
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors ${highlight("tags")}`}
            />
            <p className="text-[10px] text-gray-600 mt-1">Separate tags with commas</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.title.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
