import type { Section, SectionCreate, SectionUpdate, Song, SongUpdate } from "../types";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Songs ─────────────────────────────────────────────────────────────────

export const api = {
  songs: {
    list: (): Promise<Song[]> => request("/songs"),

    get: (id: string): Promise<Song> => request(`/songs/${id}`),

    importYoutube: (url: string): Promise<Song> =>
      request("/songs/import-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }),

    importFile: (file: File): Promise<Song> => {
      const form = new FormData();
      form.append("file", file);
      return request("/songs/import-file", { method: "POST", body: form });
    },

    update: (id: string, data: SongUpdate): Promise<Song> =>
      request(`/songs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    delete: (id: string): Promise<void> =>
      request(`/songs/${id}`, { method: "DELETE" }),

    audioUrl: (id: string): string => `${BASE}/songs/${id}/audio`,
  },

  library: {
    exportUrl: (): string => `${BASE}/export`,

    import: (file: File): Promise<{ imported: string[]; skipped: string[]; failed: { id: string; error: string }[] }> => {
      const form = new FormData();
      form.append("file", file);
      return request("/import", { method: "POST", body: form });
    },
  },

  sections: {
    create: (songId: string, data: SectionCreate): Promise<Section> =>
      request(`/songs/${songId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    update: (id: string, data: SectionUpdate): Promise<Section> =>
      request(`/sections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    delete: (id: string): Promise<void> =>
      request(`/sections/${id}`, { method: "DELETE" }),

    practiced: (id: string): Promise<Section> =>
      request(`/sections/${id}/practiced`, { method: "PATCH" }),

    toggleMastered: (id: string): Promise<Section> =>
      request(`/sections/${id}/mastered`, { method: "PATCH" }),
  },
};
