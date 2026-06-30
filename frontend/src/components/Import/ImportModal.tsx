import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Song } from "../../types";

interface Props {
  onClose: () => void;
  onImported: (song: Song) => void;
}

export function ImportModal({ onClose, onImported }: Props) {
  const [tab, setTab] = useState<"youtube" | "file">("youtube");
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const afterImport = (song: Song) => {
    qc.invalidateQueries({ queryKey: ["songs"] });
    onImported(song);
  };

  const ytMutation = useMutation({
    mutationFn: () => api.songs.importYoutube(url.trim()),
    onSuccess: afterImport,
  });

  const fileMutation = useMutation({
    mutationFn: (file: File) => api.songs.importFile(file),
    onSuccess: afterImport,
  });

  const busy = ytMutation.isPending || fileMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Add Song</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {(["youtube", "file"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-brand-500 border-b-2 border-brand-500"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t === "youtube" ? "🎬 YouTube URL" : "📁 Local File"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === "youtube" ? (
            <>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                disabled={busy}
              />
              {ytMutation.isError && (
                <p className="text-red-400 text-xs">{String(ytMutation.error)}</p>
              )}
              <button
                onClick={() => ytMutation.mutate()}
                disabled={busy || !url.trim()}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                {ytMutation.isPending ? "Downloading…" : "Import from YouTube"}
              </button>
              {ytMutation.isPending && (
                <p className="text-xs text-gray-400 text-center animate-pulse">
                  Extracting audio — this may take a minute…
                </p>
              )}
            </>
          ) : (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-brand-500 rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <div className="text-3xl mb-2">🎵</div>
                <p className="text-sm text-gray-300">Click to choose a file</p>
                <p className="text-xs text-gray-500 mt-1">MP3, MP4, WAV, M4A, OGG, FLAC</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,video/mp4,.m4a,.flac"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) fileMutation.mutate(file);
                }}
              />
              {fileMutation.isError && (
                <p className="text-red-400 text-xs">{String(fileMutation.error)}</p>
              )}
              {fileMutation.isPending && (
                <p className="text-xs text-gray-400 text-center animate-pulse">Uploading…</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
