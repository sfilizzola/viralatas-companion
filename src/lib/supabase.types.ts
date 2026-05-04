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
          preferred_language: 'br' | 'en';
          is_test_user: boolean;
          role: 'normal' | 'manager' | 'godlike';
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_language?: 'br' | 'en';
          is_test_user?: boolean;
          role?: 'normal' | 'manager' | 'godlike';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_language?: 'br' | 'en';
          is_test_user?: boolean;
          role?: 'normal' | 'manager' | 'godlike';
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
      user_presence: {
        Row: {
          user_id: string;
          is_camping: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          is_camping?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          is_camping?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          author_id: string;
          content: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          content: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          author_id?: string;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      blocked_posters: {
        Row: {
          user_id: string;
          blocked_by: string;
          blocked_at: string;
        };
        Insert: {
          user_id: string;
          blocked_by: string;
          blocked_at?: string;
        };
        Update: {
          user_id?: string;
          blocked_by?: string;
          blocked_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_user_role: {
        Args: { target_user_id: string; new_role: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
