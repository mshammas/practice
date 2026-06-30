export type SectionType =
  | "intro"
  | "pallavi"
  | "anupallavi"
  | "antara"
  | "interlude"
  | "bridge"
  | "outro"
  | "custom";

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  intro:      "Intro",
  pallavi:    "Pallavi / Mukda",
  anupallavi: "Anupallavi",
  antara:     "Antara / Paragraph",
  interlude:  "Interlude",
  bridge:     "Bridge",
  outro:      "Outro",
  custom:     "Custom",
};

export const SECTION_TYPE_COLORS: Record<SectionType, string> = {
  intro:      "#64748b",
  pallavi:    "#6366f1",
  anupallavi: "#8b5cf6",
  antara:     "#ec4899",
  interlude:  "#0ea5e9",
  bridge:     "#f59e0b",
  outro:      "#10b981",
  custom:     "#94a3b8",
};

export interface Section {
  id: string;
  song_id: string;
  name: string;
  type: SectionType;
  start_time: number;
  end_time: number;
  order: number;
  color: string;
  notes: string | null;
  practice_count: number;
  mastered: boolean;
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  source_type: "youtube" | "local";
  source_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  created_at: string;
  composer: string | null;
  lyricist: string | null;
  album: string | null;
  year: number | null;
  language: string | null;
  tags: string | null;
  sections: Section[];
}

export type SongUpdate = {
  title?: string;
  artist?: string;
  composer?: string;
  lyricist?: string;
  album?: string;
  year?: number | null;
  language?: string;
  tags?: string;
};

export type SectionCreate = {
  name: string;
  type: SectionType;
  start_time: number;
  end_time: number;
  order?: number;
  color?: string;
  notes?: string;
};

export type SectionUpdate = Partial<SectionCreate> & { mastered?: boolean };
