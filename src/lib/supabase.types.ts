export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bands: {
        Row: {
          id: string;
          name: string;
          stage: string;
          start_time: string;
          end_time: string;
          image_url: string | null;
          genre: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          stage: string;
          start_time: string;
          end_time: string;
          image_url?: string | null;
          genre?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          stage?: string;
          start_time?: string;
          end_time?: string;
          image_url?: string | null;
          genre?: string | null;
        };
        Relationships: [];
      };
      user_picks: {
        Row: {
          user_id: string;
          band_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          band_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          band_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
