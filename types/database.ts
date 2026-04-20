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
      courses: {
        Row: {
          created_at: string
          default_back_rate: number
          default_price: number
          duration_min: number
          id: string
          is_active: boolean
          is_event: boolean
          name: string
          sort_order: number
          store_id: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          default_back_rate?: number
          default_price: number
          duration_min: number
          id?: string
          is_active?: boolean
          is_event?: boolean
          name: string
          sort_order?: number
          store_id: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          default_back_rate?: number
          default_price?: number
          duration_min?: number
          id?: string
          is_active?: boolean
          is_event?: boolean
          name?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      extensions: {
        Row: {
          created_at: string
          default_back_rate: number
          default_price: number
          duration_min: number
          id: string
          is_active: boolean
          name: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_back_rate?: number
          default_price: number
          duration_min: number
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_back_rate?: number
          default_price?: number
          duration_min?: number
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extensions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      nomination_fees: {
        Row: {
          created_at: string
          default_back_rate: number
          default_price: number
          id: string
          is_active: boolean
          store_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_back_rate?: number
          default_price: number
          id?: string
          is_active?: boolean
          store_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_back_rate?: number
          default_price?: number
          id?: string
          is_active?: boolean
          store_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nomination_fees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          created_at: string
          default_back_rate: number
          default_price: number
          id: string
          is_active: boolean
          name: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_back_rate?: number
          default_price: number
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_back_rate?: number
          default_price?: number
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      player_course_overrides: {
        Row: {
          back_rate: number | null
          course_id: string
          created_at: string
          id: string
          player_id: string
          price: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          back_rate?: number | null
          course_id: string
          created_at?: string
          id?: string
          player_id: string
          price?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          back_rate?: number | null
          course_id?: string
          created_at?: string
          id?: string
          player_id?: string
          price?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_course_overrides_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_course_overrides_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_course_overrides_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      player_extension_overrides: {
        Row: {
          back_rate: number | null
          created_at: string
          extension_id: string
          id: string
          player_id: string
          price: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          back_rate?: number | null
          created_at?: string
          extension_id: string
          id?: string
          player_id: string
          price?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          back_rate?: number | null
          created_at?: string
          extension_id?: string
          id?: string
          player_id?: string
          price?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_extension_overrides_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_extension_overrides_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_extension_overrides_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      player_nomination_overrides: {
        Row: {
          back_rate: number | null
          created_at: string
          id: string
          player_id: string
          price: number | null
          store_id: string
          type: string
          updated_at: string
        }
        Insert: {
          back_rate?: number | null
          created_at?: string
          id?: string
          player_id: string
          price?: number | null
          store_id: string
          type: string
          updated_at?: string
        }
        Update: {
          back_rate?: number | null
          created_at?: string
          id?: string
          player_id?: string
          price?: number | null
          store_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_nomination_overrides_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_nomination_overrides_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      player_option_overrides: {
        Row: {
          back_rate: number | null
          created_at: string
          id: string
          option_id: string
          player_id: string
          price: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          back_rate?: number | null
          created_at?: string
          id?: string
          option_id: string
          player_id: string
          price?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          back_rate?: number | null
          created_at?: string
          id?: string
          option_id?: string
          player_id?: string
          price?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_option_overrides_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_option_overrides_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_option_overrides_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_options: {
        Row: {
          created_at: string
          id: string
          option_id: string | null
          option_snapshot: Json
          quantity: number
          reservation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id?: string | null
          option_snapshot: Json
          quantity?: number
          reservation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string | null
          option_snapshot?: Json
          quantity?: number
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_options_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          course_id: string | null
          course_snapshot: Json
          created_at: string
          customer_name: string
          customer_type: string
          end_at: string
          extension_id: string | null
          extension_snapshot: Json | null
          id: string
          meeting_method: string
          nomination_snapshot: Json
          nomination_type: string
          payment_method: string
          player_back_amount: number
          player_id: string
          reservation_channel: string
          start_at: string
          status: string
          store_amount: number
          store_id: string
          total_amount: number
          transport_back_rate: number
          transport_fee: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          course_id?: string | null
          course_snapshot: Json
          created_at?: string
          customer_name: string
          customer_type: string
          end_at: string
          extension_id?: string | null
          extension_snapshot?: Json | null
          id?: string
          meeting_method: string
          nomination_snapshot: Json
          nomination_type: string
          payment_method: string
          player_back_amount?: number
          player_id: string
          reservation_channel: string
          start_at: string
          status?: string
          store_amount?: number
          store_id: string
          total_amount?: number
          transport_back_rate?: number
          transport_fee?: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          course_id?: string | null
          course_snapshot?: Json
          created_at?: string
          customer_name?: string
          customer_type?: string
          end_at?: string
          extension_id?: string | null
          extension_snapshot?: Json | null
          id?: string
          meeting_method?: string
          nomination_snapshot?: Json
          nomination_type?: string
          payment_method?: string
          player_back_amount?: number
          player_id?: string
          reservation_channel?: string
          start_at?: string
          status?: string
          store_amount?: number
          store_id?: string
          total_amount?: number
          transport_back_rate?: number
          transport_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_email: string | null
          store_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_email?: string | null
          store_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_email?: string | null
          store_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      transport_settings: {
        Row: {
          created_at: string
          id: string
          input_mode: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_mode?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          input_mode?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          back_rate_transport: number | null
          created_at: string
          id: string
          is_active: boolean
          login_id: string
          name: string
          password_hash: string
          role: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          back_rate_transport?: number | null
          created_at?: string
          id: string
          is_active?: boolean
          login_id: string
          name: string
          password_hash: string
          role: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          back_rate_transport?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          login_id?: string
          name?: string
          password_hash?: string
          role?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      current_user_store_id: { Args: never; Returns: string }
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
    Enums: {},
  },
} as const
