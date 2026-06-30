import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type { Song } from "../../types";

function formatDuration(secs: number | null): string {
  if (!secs) return "--:--";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SongCard({ song }: { song: Song }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.songs.delete(song.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["songs"] }),
  });

  return (
    <div className="group relative bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl overflow-hidden transition-all cursor-pointer"
      onClick={() => navigate(`/practice/${song.id}`)}>
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-800 flex items-center justify-center relative overflow-hidden">
        {song.thumbnail_url ? (
          <img
            src={song.thumbnail_url}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl">🎵</span>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-gray-900 text-xl ml-0.5">▶</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{song.title}</h3>
        {song.artist && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{song.artist}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{formatDuration(song.duration)}</span>
          <span className="text-xs text-gray-500">
            {song.sections.length} section{song.sections.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete "${song.title}"?`)) deleteMutation.mutate();
        }}
        className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-600 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
      >
        ✕
      </button>
    </div>
  );
}
