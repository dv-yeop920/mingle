export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          nickname: string;
          mbti: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          nickname: string;
          mbti?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          nickname?: string;
          mbti?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          custom_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          custom_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          custom_name?: string | null;
          created_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          group_id: string;
          nickname: string;
          gender: string;
          mbti: string;
          is_self: boolean;
          order: number;
        };
        Insert: {
          id?: string;
          group_id: string;
          nickname: string;
          gender: string;
          mbti: string;
          is_self?: boolean;
          order: number;
        };
        Update: {
          id?: string;
          group_id?: string;
          nickname?: string;
          gender?: string;
          mbti?: string;
          is_self?: boolean;
          order?: number;
        };
      };
      analyses: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          chemistry_score: number;
          metrics: Json;
          group_atmosphere: Json;
          member_roles: Json;
          pair_chemistry: Json;
          summary: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id: string;
          chemistry_score: number;
          metrics: Json;
          group_atmosphere: Json;
          member_roles: Json;
          pair_chemistry: Json;
          summary: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          group_id?: string;
          chemistry_score?: number;
          metrics?: Json;
          group_atmosphere?: Json;
          member_roles?: Json;
          pair_chemistry?: Json;
          summary?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
