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
          wacken_years: number[];
          country: string | null;
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
          wacken_years?: number[];
          country?: string | null;
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
          wacken_years?: number[];
          country?: string | null;
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
          is_at_metal_place?: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          is_camping?: boolean;
          is_at_metal_place?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          is_camping?: boolean;
          is_at_metal_place?: boolean;
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
      metal_place_config: {
        Row: {
          id?: number;
          festival_day?: number | null;
          start_time?: string | null;
          end_time?: string | null;
          label?: string;
          test_override_day?: number | null;
          updated_by?: string;
          updated_at?: string;
        };
        Insert: {
          id?: number;
          festival_day?: number | null;
          start_time?: string | null;
          end_time?: string | null;
          label?: string;
          test_override_day?: number | null;
          updated_by?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          festival_day?: number | null;
          start_time?: string | null;
          end_time?: string | null;
          label?: string;
          test_override_day?: number | null;
          updated_by?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: string;
          registration_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_config: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          key?: string;
          value?: string;
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
