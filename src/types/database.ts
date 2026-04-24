export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: string | null;
          payload: Json | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: string | null;
          payload?: Json | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: string | null;
          payload?: Json | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      interval_notes: {
        Row: {
          interval_id: string;
          note_id: string;
        };
        Insert: {
          interval_id: string;
          note_id: string;
        };
        Update: {
          interval_id?: string;
          note_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interval_notes_interval_id_fkey";
            columns: ["interval_id"];
            isOneToOne: false;
            referencedRelation: "intervals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interval_notes_interval_id_fkey";
            columns: ["interval_id"];
            isOneToOne: false;
            referencedRelation: "v_interval_occupancy";
            referencedColumns: ["interval_id"];
          },
          {
            foreignKeyName: "interval_notes_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interval_notes_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "v_absenteeism_rate";
            referencedColumns: ["note_id"];
          },
          {
            foreignKeyName: "interval_notes_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "v_turns_by_note";
            referencedColumns: ["note_id"];
          },
        ];
      };
      intervals: {
        Row: {
          created_at: string;
          created_by: string;
          date_end: string;
          date_start: string;
          description: string | null;
          explain_desactivate: string | null;
          id: string;
          is_active: boolean;
          name: string;
          turn_duration_minutes: number;
          turn_quantity: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          date_end: string;
          date_start: string;
          description?: string | null;
          explain_desactivate?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          turn_duration_minutes?: number;
          turn_quantity?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          date_end?: string;
          date_start?: string;
          description?: string | null;
          explain_desactivate?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          turn_duration_minutes?: number;
          turn_quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "intervals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      news: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string;
          id: string;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["news_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description: string;
          id?: string;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["news_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["news_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "news_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          context: Json | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          context?: Json | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          context?: Json | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          dni: string;
          full_name: string;
          id: string;
          legajo: string | null;
          phone: string | null;
          updated_at: string;
          user_type: Database["public"]["Enums"]["user_type"];
        };
        Insert: {
          created_at?: string;
          dni: string;
          full_name: string;
          id: string;
          legajo?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_type?: Database["public"]["Enums"]["user_type"];
        };
        Update: {
          created_at?: string;
          dni?: string;
          full_name?: string;
          id?: string;
          legajo?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_type?: Database["public"]["Enums"]["user_type"];
        };
        Relationships: [];
      };
      turns: {
        Row: {
          attended_at: string | null;
          cancel_attempts: number;
          cancel_blocked_until: string | null;
          created_at: string;
          date: string;
          id: string;
          interval_id: string;
          note_id: string;
          security_code_hash: string;
          status: Database["public"]["Enums"]["turn_status"];
          student_id: string;
          updated_at: string;
        };
        Insert: {
          attended_at?: string | null;
          cancel_attempts?: number;
          cancel_blocked_until?: string | null;
          created_at?: string;
          date: string;
          id?: string;
          interval_id: string;
          note_id: string;
          security_code_hash: string;
          status?: Database["public"]["Enums"]["turn_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          attended_at?: string | null;
          cancel_attempts?: number;
          cancel_blocked_until?: string | null;
          created_at?: string;
          date?: string;
          id?: string;
          interval_id?: string;
          note_id?: string;
          security_code_hash?: string;
          status?: Database["public"]["Enums"]["turn_status"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "turns_interval_id_fkey";
            columns: ["interval_id"];
            isOneToOne: false;
            referencedRelation: "intervals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "turns_interval_id_fkey";
            columns: ["interval_id"];
            isOneToOne: false;
            referencedRelation: "v_interval_occupancy";
            referencedColumns: ["interval_id"];
          },
          {
            foreignKeyName: "turns_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "turns_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "v_absenteeism_rate";
            referencedColumns: ["note_id"];
          },
          {
            foreignKeyName: "turns_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "v_turns_by_note";
            referencedColumns: ["note_id"];
          },
          {
            foreignKeyName: "turns_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_roles: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["worker_role"];
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          role: Database["public"]["Enums"]["worker_role"];
          worker_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["worker_role"];
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_roles_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_absenteeism_rate: {
        Row: {
          absenteeism_pct: number | null;
          attended: number | null;
          lost: number | null;
          note_id: string | null;
          note_name: string | null;
          total_resolved: number | null;
        };
        Relationships: [];
      };
      v_attention_delay: {
        Row: {
          attended_at: string | null;
          date: string | null;
          delay_minutes: number | null;
          id: string | null;
          note_id: string | null;
          note_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "turns_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "turns_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "v_absenteeism_rate";
            referencedColumns: ["note_id"];
          },
          {
            foreignKeyName: "turns_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "v_turns_by_note";
            referencedColumns: ["note_id"];
          },
        ];
      };
      v_demand_heatmap: {
        Row: {
          day_of_week: number | null;
          hour_of_day: number | null;
          note_id: string | null;
          turn_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "turns_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "turns_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "v_absenteeism_rate";
            referencedColumns: ["note_id"];
          },
          {
            foreignKeyName: "turns_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "v_turns_by_note";
            referencedColumns: ["note_id"];
          },
        ];
      };
      v_interval_occupancy: {
        Row: {
          capacity: number | null;
          interval_id: string | null;
          interval_name: string | null;
          occupancy_pct: number | null;
          used: number | null;
        };
        Relationships: [];
      };
      v_turns_by_note: {
        Row: {
          month: string | null;
          note_id: string | null;
          note_name: string | null;
          status: Database["public"]["Enums"]["turn_status"] | null;
          total: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
      is_worker: { Args: never; Returns: boolean };
    };
    Enums: {
      news_status: "posted" | "pending" | "deleted";
      turn_status: "pending" | "attended" | "lost" | "cancelled";
      user_type: "student" | "worker";
      worker_role: "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      news_status: ["posted", "pending", "deleted"],
      turn_status: ["pending", "attended", "lost", "cancelled"],
      user_type: ["student", "worker"],
      worker_role: ["admin"],
    },
  },
} as const;
