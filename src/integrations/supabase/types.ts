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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_default: boolean | null
          name: string
          phone: string
          relationship: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          phone: string
          relationship?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          phone?: string
          relationship?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journey_checkins: {
        Row: {
          id: string
          journey_id: string
          response: Database["public"]["Enums"]["checkin_response"]
          timestamp: string | null
        }
        Insert: {
          id?: string
          journey_id: string
          response: Database["public"]["Enums"]["checkin_response"]
          timestamp?: string | null
        }
        Update: {
          id?: string
          journey_id?: string
          response?: Database["public"]["Enums"]["checkin_response"]
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_checkins_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          journey_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          journey_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          journey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_contacts_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_locations: {
        Row: {
          accuracy: number | null
          id: string
          journey_id: string
          latitude: number
          longitude: number
          timestamp: string | null
        }
        Insert: {
          accuracy?: number | null
          id?: string
          journey_id: string
          latitude: number
          longitude: number
          timestamp?: string | null
        }
        Update: {
          accuracy?: number | null
          id?: string
          journey_id?: string
          latitude?: number
          longitude?: number
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_locations_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          dest_address: string
          dest_name: string
          end_time: string | null
          eta_time: string | null
          id: string
          location_updated_at: string | null
          start_address: string
          start_name: string
          start_time: string | null
          status: Database["public"]["Enums"]["journey_status"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          dest_address: string
          dest_name: string
          end_time?: string | null
          eta_time?: string | null
          id?: string
          location_updated_at?: string | null
          start_address: string
          start_name: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["journey_status"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          dest_address?: string
          dest_name?: string
          end_time?: string | null
          eta_time?: string | null
          id?: string
          location_updated_at?: string | null
          start_address?: string
          start_name?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["journey_status"] | null
          user_id?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          contact_id: string | null
          id: string
          journey_id: string
          message: string
          timestamp: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          contact_id?: string | null
          id?: string
          journey_id: string
          message: string
          timestamp?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          contact_id?: string | null
          id?: string
          journey_id?: string
          message?: string
          timestamp?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          default_checkin_interval: number | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          usf_campus_mode: boolean | null
        }
        Insert: {
          created_at?: string | null
          default_checkin_interval?: number | null
          id: string
          name: string
          phone?: string | null
          updated_at?: string | null
          usf_campus_mode?: boolean | null
        }
        Update: {
          created_at?: string | null
          default_checkin_interval?: number | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          usf_campus_mode?: boolean | null
        }
        Relationships: []
      }
      safe_places: {
        Row: {
          address: string
          created_at: string | null
          id: string
          is_usf_recommended: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          is_usf_recommended?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          is_usf_recommended?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      checkin_response: "yes" | "no" | "no_response"
      journey_status: "active" | "completed_safe" | "alert_triggered"
      notification_type:
        | "start"
        | "checkin_alert"
        | "arrival_safe"
        | "danger_alert"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      checkin_response: ["yes", "no", "no_response"],
      journey_status: ["active", "completed_safe", "alert_triggered"],
      notification_type: [
        "start",
        "checkin_alert",
        "arrival_safe",
        "danger_alert",
      ],
    },
  },
} as const
