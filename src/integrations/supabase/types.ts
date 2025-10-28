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
      cost_class_legend: {
        Row: {
          account_number: string
          brazilian_description: string | null
          bs_pl: string | null
          cost_type: string
          cost_type_capex: string | null
          created_at: string | null
          description: string | null
          ebitda: string | null
          enel_group_external: string | null
          id: string
          macro_cost_type: string
          updated_at: string | null
        }
        Insert: {
          account_number: string
          brazilian_description?: string | null
          bs_pl?: string | null
          cost_type: string
          cost_type_capex?: string | null
          created_at?: string | null
          description?: string | null
          ebitda?: string | null
          enel_group_external?: string | null
          id?: string
          macro_cost_type: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string
          brazilian_description?: string | null
          bs_pl?: string | null
          cost_type?: string
          cost_type_capex?: string | null
          created_at?: string | null
          description?: string | null
          ebitda?: string | null
          enel_group_external?: string | null
          id?: string
          macro_cost_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          classification_rule: string | null
          corrected_value_brl: number
          corrected_value_eur: number
          cost_class: string
          cost_class_description: string | null
          cost_type: string | null
          created_at: string | null
          currency: string | null
          document_number: string | null
          document_text: string | null
          dre_line: string | null
          entry_date: string | null
          entry_type: string | null
          id: string
          is_duplicate: boolean | null
          is_unrecognized: boolean | null
          macro_cost_type: string | null
          object_code: string
          object_name: string | null
          pep_element: string | null
          posting_date: string
          purchase_document: string | null
          reference_document: string | null
          updated_at: string | null
          upload_id: string | null
          user_id: string | null
          value_brl: number
          value_eur: number
        }
        Insert: {
          classification_rule?: string | null
          corrected_value_brl: number
          corrected_value_eur: number
          cost_class: string
          cost_class_description?: string | null
          cost_type?: string | null
          created_at?: string | null
          currency?: string | null
          document_number?: string | null
          document_text?: string | null
          dre_line?: string | null
          entry_date?: string | null
          entry_type?: string | null
          id?: string
          is_duplicate?: boolean | null
          is_unrecognized?: boolean | null
          macro_cost_type?: string | null
          object_code: string
          object_name?: string | null
          pep_element?: string | null
          posting_date: string
          purchase_document?: string | null
          reference_document?: string | null
          updated_at?: string | null
          upload_id?: string | null
          user_id?: string | null
          value_brl: number
          value_eur: number
        }
        Update: {
          classification_rule?: string | null
          corrected_value_brl?: number
          corrected_value_eur?: number
          cost_class?: string
          cost_class_description?: string | null
          cost_type?: string | null
          created_at?: string | null
          currency?: string | null
          document_number?: string | null
          document_text?: string | null
          dre_line?: string | null
          entry_date?: string | null
          entry_type?: string | null
          id?: string
          is_duplicate?: boolean | null
          is_unrecognized?: boolean | null
          macro_cost_type?: string | null
          object_code?: string
          object_name?: string | null
          pep_element?: string | null
          posting_date?: string
          purchase_document?: string | null
          reference_document?: string | null
          updated_at?: string | null
          upload_id?: string | null
          user_id?: string | null
          value_brl?: number
          value_eur?: number
        }
        Relationships: []
      }
      upload_history: {
        Row: {
          classified_entries: number | null
          completed_at: string | null
          created_at: string | null
          duplicate_entries: number | null
          error_message: string | null
          file_name: string
          file_size: number
          id: string
          status: string | null
          total_entries: number | null
          unrecognized_entries: number | null
          user_id: string | null
        }
        Insert: {
          classified_entries?: number | null
          completed_at?: string | null
          created_at?: string | null
          duplicate_entries?: number | null
          error_message?: string | null
          file_name: string
          file_size: number
          id?: string
          status?: string | null
          total_entries?: number | null
          unrecognized_entries?: number | null
          user_id?: string | null
        }
        Update: {
          classified_entries?: number | null
          completed_at?: string | null
          created_at?: string | null
          duplicate_entries?: number | null
          error_message?: string | null
          file_name?: string
          file_size?: number
          id?: string
          status?: string | null
          total_entries?: number | null
          unrecognized_entries?: number | null
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
