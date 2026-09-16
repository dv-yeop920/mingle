export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          chemistry_score: number
          created_at: string
          group_atmosphere: Json
          group_id: string
          id: string
          is_public: boolean
          member_roles: Json
          metrics: Json
          pair_chemistry: Json
          save_operation_id: string | null
          situation: Json | null
          summary: string
          tagline: string | null
          title: string
          user_id: string
        }
        Insert: {
          chemistry_score: number
          created_at?: string
          group_atmosphere: Json
          group_id: string
          id?: string
          is_public?: boolean
          member_roles: Json
          metrics: Json
          pair_chemistry: Json
          save_operation_id?: string | null
          situation?: Json | null
          summary: string
          tagline?: string | null
          title: string
          user_id: string
        }
        Update: {
          chemistry_score?: number
          created_at?: string
          group_atmosphere?: Json
          group_id?: string
          id?: string
          is_public?: boolean
          member_roles?: Json
          metrics?: Json
          pair_chemistry?: Json
          save_operation_id?: string | null
          situation?: Json | null
          summary?: string
          tagline?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_recovery_attempts: {
        Row: {
          attempt_number: number
          base_sha: string | null
          branch_name: string | null
          candidate_sha: string | null
          checks: Json | null
          completed_at: string | null
          created_at: string
          deploy_id: string | null
          fingerprint: string
          id: string
          monitoring: Json | null
          reproduction: Json | null
          result: string | null
          review: Json | null
        }
        Insert: {
          attempt_number: number
          base_sha?: string | null
          branch_name?: string | null
          candidate_sha?: string | null
          checks?: Json | null
          completed_at?: string | null
          created_at?: string
          deploy_id?: string | null
          fingerprint: string
          id?: string
          monitoring?: Json | null
          reproduction?: Json | null
          result?: string | null
          review?: Json | null
        }
        Update: {
          attempt_number?: number
          base_sha?: string | null
          branch_name?: string | null
          candidate_sha?: string | null
          checks?: Json | null
          completed_at?: string | null
          created_at?: string
          deploy_id?: string | null
          fingerprint?: string
          id?: string
          monitoring?: Json | null
          reproduction?: Json | null
          result?: string | null
          review?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_recovery_attempts_fingerprint_fkey"
            columns: ["fingerprint"]
            isOneToOne: false
            referencedRelation: "auto_recovery_incidents"
            referencedColumns: ["fingerprint"]
          },
        ]
      }
      auto_recovery_events: {
        Row: {
          batch_id: string
          classified_at: string | null
          events: Json
          project_id: string
          received_at: string
        }
        Insert: {
          batch_id: string
          classified_at?: string | null
          events: Json
          project_id: string
          received_at?: string
        }
        Update: {
          batch_id?: string
          classified_at?: string | null
          events?: Json
          project_id?: string
          received_at?: string
        }
        Relationships: []
      }
      auto_recovery_incidents: {
        Row: {
          attempt_count: number
          category: string
          environment: string
          fingerprint: string
          first_seen_at: string
          last_seen_at: string
          locked_at: string | null
          locked_by: string | null
          occurrence_count: number
          project_id: string
          status: string
        }
        Insert: {
          attempt_count?: number
          category: string
          environment: string
          fingerprint: string
          first_seen_at: string
          last_seen_at: string
          locked_at?: string | null
          locked_by?: string | null
          occurrence_count?: number
          project_id: string
          status?: string
        }
        Update: {
          attempt_count?: number
          category?: string
          environment?: string
          fingerprint?: string
          first_seen_at?: string
          last_seen_at?: string
          locked_at?: string | null
          locked_by?: string | null
          occurrence_count?: number
          project_id?: string
          status?: string
        }
        Relationships: []
      }
      character_matches: {
        Row: {
          created_at: string
          full_result: Json
          id: string
          mbti: string
          user_id: string
          work_id: string
          work_name: string
        }
        Insert: {
          created_at?: string
          full_result: Json
          id?: string
          mbti: string
          user_id: string
          work_id: string
          work_name: string
        }
        Update: {
          created_at?: string
          full_result?: Json
          id?: string
          mbti?: string
          user_id?: string
          work_id?: string
          work_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compatibility_analyses: {
        Row: {
          chemistry_score: number
          created_at: string
          id: string
          is_public: boolean
          mbti_a: string
          mbti_b: string
          nickname_a: string | null
          nickname_b: string | null
          result: Json
          user_id: string | null
        }
        Insert: {
          chemistry_score: number
          created_at?: string
          id?: string
          is_public?: boolean
          mbti_a: string
          mbti_b: string
          nickname_a?: string | null
          nickname_b?: string | null
          result: Json
          user_id?: string | null
        }
        Update: {
          chemistry_score?: number
          created_at?: string
          id?: string
          is_public?: boolean
          mbti_a?: string
          mbti_b?: string
          nickname_a?: string | null
          nickname_b?: string | null
          result?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          custom_name: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mbti_profiles: {
        Row: {
          created_at: string
          full_analysis: Json
          id: string
          mbti: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_analysis: Json
          id?: string
          mbti: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_analysis?: Json
          id?: string
          mbti?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mbti_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          gender: string
          group_id: string
          id: string
          is_self: boolean
          mbti: string
          nickname: string
          order: number
          role: string | null
        }
        Insert: {
          gender: string
          group_id: string
          id?: string
          is_self?: boolean
          mbti: string
          nickname: string
          order: number
          role?: string | null
        }
        Update: {
          gender?: string
          group_id?: string
          id?: string
          is_self?: boolean
          mbti?: string
          nickname?: string
          order?: number
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          gender: string | null
          id: string
          mbti: string | null
          nickname: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          gender?: string | null
          id: string
          mbti?: string | null
          nickname: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          gender?: string | null
          id?: string
          mbti?: string | null
          nickname?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_incident_for_monitor: {
        Args: { p_worker_id: string }
        Returns: {
          attempt_count: number
          category: string
          environment: string
          fingerprint: string
          first_seen_at: string
          last_seen_at: string
          locked_at: string | null
          locked_by: string | null
          occurrence_count: number
          project_id: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "auto_recovery_incidents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      acquire_incident_for_repair: {
        Args: { p_worker_id: string }
        Returns: {
          attempt_count: number
          category: string
          environment: string
          fingerprint: string
          first_seen_at: string
          last_seen_at: string
          locked_at: string | null
          locked_by: string | null
          occurrence_count: number
          project_id: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "auto_recovery_incidents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      acquire_incident_for_verify: {
        Args: { p_worker_id: string }
        Returns: {
          attempt_count: number
          category: string
          environment: string
          fingerprint: string
          first_seen_at: string
          last_seen_at: string
          locked_at: string | null
          locked_by: string | null
          occurrence_count: number
          project_id: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "auto_recovery_incidents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      release_incident_lock: {
        Args: { p_fingerprint: string }
        Returns: undefined
      }
      save_guest_analysis: {
        Args: {
          p_chemistry_score: number
          p_custom_name: string
          p_group_atmosphere: Json
          p_group_type: string
          p_member_roles: Json
          p_members: Json
          p_metrics: Json
          p_pair_chemistry: Json
          p_save_operation_id: string
          p_situation?: Json
          p_summary: string
          p_tagline: string
          p_title: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
