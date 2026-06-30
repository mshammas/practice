import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { SongCard } from "../components/Library/SongCard";
import { ImportModal } from "../components/Import/ImportModal";
import type { Song } from "../types";

export function LibraryPage() {
  const [showImport, setShowImport] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: songs = [], isLoading, isError } = useQuery({
    queryKey: ["songs"],
    queryFn: api.songs.list,
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.library.import(file),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["songs"] });
      const n = result.imported.length;
      const sk = result.skipped.length;
      const fl = result.failed.length;
      const parts = [];
      if (n) parts.push(`${n} imported`);
      if (sk) parts.push(`${sk} already existed`);
      if (fl) {
        const errors = result.failed.map((f: { id: string; error: string }) => f.error).join("; ");
        parts.push(`${fl} failed: ${errors}`);
      }
      setImportMessage({ type: fl > 0 && n === 0 ? "err" : "ok", text: parts.join(", ") });
      setTimeout(() => setImportMessage(null), 5000);
    },
    onError: (err) => {
      setImportMessage({ type: "err", text: String(err) });
      setTimeout(() => setImportMessage(null), 5000);
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">🎵</span>
          <h1 className="text-lg font-bold tracking-tight truncate">SongPractice</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Export */}
          <a
            href={api.library.exportUrl()}
            download="songpractice-export.zip"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-700 ${
              songs.length === 0 ? "opacity-40 pointer-events-none" : ""
            }`}
            title="Export all songs"
          >
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">⬆</span>
          </a>

          {/* Import from zip */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50"
            title="Import from exported zip"
          >
            {importMutation.isPending ? (
              <span className="animate-pulse">Importing…</span>
            ) : (
              <>
                <span className="hidden sm:inline">Import</span>
                <span className="sm:hidden">⬇</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importMutation.mutate(file);
              e.target.value = "";
            }}
          />

          {/* Add song */}
          <button
            onClick={() => setShowImport(true)}
            className="bg-brand-600 hover:bg-brand-700 active:bg-brand-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <span className="hidden sm:inline">+ Add Song</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </header>

      {/* Import feedback banner */}
      {importMessage && (
        <div className={`px-4 py-2 text-sm text-center ${
          importMessage.type === "ok" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
        }`}>
          {importMessage.text}
        </div>
      )}

      <main className="flex-1 p-4 lg:p-6 max-w-6xl mx-auto w-full">
        {isLoading && (
          <div className="flex items-center justify-center py-24 text-gray-500">
            Loading your library…
          </div>
        )}

        {isError && (
          <div className="text-center py-24 text-red-400">
            Could not connect to the backend. Is the server running?
          </div>
        )}

        {!isLoading && !isError && songs.length === 0 && (
          <div className="text-center py-16 lg:py-24">
            <div className="text-5xl mb-4">🎶</div>
            <h2 className="text-xl font-semibold mb-2">Your library is empty</h2>
            <p className="text-gray-400 text-sm mb-6">
              Import a song from YouTube, upload a local file, or import a library export.
            </p>
            <button
              onClick={() => setShowImport(true)}
              className="bg-brand-600 hover:bg-brand-700 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Add your first song
            </button>
          </div>
        )}

        {songs.length > 0 && (
          <>
            <p className="text-gray-400 text-sm mb-4">
              {songs.length} song{songs.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
              {songs.map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          </>
        )}
      </main>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={(song: Song) => {
            setShowImport(false);
            navigate(`/practice/${song.id}`);
          }}
        />
      )}
    </div>
  );
}
