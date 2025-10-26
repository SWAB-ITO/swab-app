export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      csv_import_log: {
        Row: {
          created_at: string | null
          duplicates_detected: number | null
          file_size_bytes: number | null
          filename: string
          id: number
          mentors_matched: number | null
          new_contact_ids_captured: number | null
          processing_time_ms: number | null
          total_contacts: number | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          duplicates_detected?: number | null
          file_size_bytes?: number | null
          filename: string
          id?: number
          mentors_matched?: number | null
          new_contact_ids_captured?: number | null
          processing_time_ms?: number | null
          total_contacts?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          duplicates_detected?: number | null
          file_size_bytes?: number | null
          filename?: string
          id?: number
          mentors_matched?: number | null
          new_contact_ids_captured?: number | null
          processing_time_ms?: number | null
          total_contacts?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      mentors: {
        Row: {
          amount_raised: number | null
          campaign_joined_at: string | null
          campaign_member: boolean | null
          created_at: string | null
          first_name: string
          full_name: string | null
          fundraised_at: string | null
          fundraised_done: boolean | null
          gb_contact_id: string | null
          gb_member_id: string | null
          gender: string | null
          last_name: string
          middle_name: string | null
          mn_id: string
          partner_preference: string | null
          personal_email: string | null
          phone: string | null
          preferred_name: string | null
          setup_submission_id: string | null
          shift_preference: string | null
          shirt_size: string | null
          signup_at: string | null
          signup_submission_id: string | null
          status_category: string | null
          training_at: string | null
          training_done: boolean | null
          uga_class: string | null
          uga_email: string | null
          updated_at: string | null
        }
        Insert: {
          amount_raised?: number | null
          campaign_joined_at?: string | null
          campaign_member?: boolean | null
          created_at?: string | null
          first_name: string
          full_name?: string | null
          fundraised_at?: string | null
          fundraised_done?: boolean | null
          gb_contact_id?: string | null
          gb_member_id?: string | null
          gender?: string | null
          last_name: string
          middle_name?: string | null
          mn_id: string
          partner_preference?: string | null
          personal_email?: string | null
          phone?: string | null
          preferred_name?: string | null
          setup_submission_id?: string | null
          shift_preference?: string | null
          shirt_size?: string | null
          signup_at?: string | null
          signup_submission_id?: string | null
          status_category?: string | null
          training_at?: string | null
          training_done?: boolean | null
          uga_class?: string | null
          uga_email?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_raised?: number | null
          campaign_joined_at?: string | null
          campaign_member?: boolean | null
          created_at?: string | null
          first_name?: string
          full_name?: string | null
          fundraised_at?: string | null
          fundraised_done?: boolean | null
          gb_contact_id?: string | null
          gb_member_id?: string | null
          gender?: string | null
          last_name?: string
          middle_name?: string | null
          mn_id?: string
          partner_preference?: string | null
          personal_email?: string | null
          phone?: string | null
          preferred_name?: string | null
          setup_submission_id?: string | null
          shift_preference?: string | null
          shirt_size?: string | null
          signup_at?: string | null
          signup_submission_id?: string | null
          status_category?: string | null
          training_at?: string | null
          training_done?: boolean | null
          uga_class?: string | null
          uga_email?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mn_errors: {
        Row: {
          chosen_value: string | null
          created_at: string | null
          email: string | null
          error_message: string | null
          error_type: string
          field_name: string | null
          id: number
          local_value: string | null
          mn_id: string | null
          phone: string | null
          raw_data: Json | null
          remote_value: string | null
          resolved: boolean | null
          severity: string | null
          source_table: string | null
          updated_at: string | null
        }
        Insert: {
          chosen_value?: string | null
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          error_type: string
          field_name?: string | null
          id?: number
          local_value?: string | null
          mn_id?: string | null
          phone?: string | null
          raw_data?: Json | null
          remote_value?: string | null
          resolved?: boolean | null
          severity?: string | null
          source_table?: string | null
          updated_at?: string | null
        }
        Update: {
          chosen_value?: string | null
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          error_type?: string
          field_name?: string | null
          id?: number
          local_value?: string | null
          mn_id?: string | null
          phone?: string | null
          raw_data?: Json | null
          remote_value?: string | null
          resolved?: boolean | null
          severity?: string | null
          source_table?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mn_gb_import: {
        Row: {
          "✅ Mentor Training Signed Up?": string | null
          "👯‍♂️ Partner Preference": string | null
          "💰 Amount Fundraised": string | null
          "💸 Givebutter Page Setup": string | null
          "📆 Shift Preference": string | null
          "📈 Fully Fundraised": string | null
          "📧 Custom Email Message 1️⃣": string | null
          "📱Custom Text Message 1️⃣": string | null
          "📱Custom Text Message 2️⃣": string | null
          "🚂 Mentor Training Complete": string | null
          "Address Subscription Status": string | null
          "Contact External ID": string | null
          created_at: string | null
          "Date of Birth": string | null
          "Email Addresses": string | null
          "Email Subscription Status": string | null
          Employer: string | null
          "First Name": string | null
          Gender: string | null
          "Givebutter Contact ID": string | null
          "Household Envelope Name": string | null
          "Household Name": string | null
          "Is Household Primary Contact": string | null
          "Last Name": string | null
          last_synced_at: string | null
          "Middle Name": string | null
          mn_id: string
          needs_sync: boolean | null
          Notes: string | null
          "Phone Numbers": string | null
          "Phone Subscription Status": string | null
          Prefix: string | null
          "Primary Email": string | null
          "Primary Phone Number": string | null
          Tags: string | null
          Title: string | null
          updated_at: string | null
        }
        Insert: {
          "✅ Mentor Training Signed Up?"?: string | null
          "👯‍♂️ Partner Preference"?: string | null
          "💰 Amount Fundraised"?: string | null
          "💸 Givebutter Page Setup"?: string | null
          "📆 Shift Preference"?: string | null
          "📈 Fully Fundraised"?: string | null
          "📧 Custom Email Message 1️⃣"?: string | null
          "📱Custom Text Message 1️⃣"?: string | null
          "📱Custom Text Message 2️⃣"?: string | null
          "🚂 Mentor Training Complete"?: string | null
          "Address Subscription Status"?: string | null
          "Contact External ID"?: string | null
          created_at?: string | null
          "Date of Birth"?: string | null
          "Email Addresses"?: string | null
          "Email Subscription Status"?: string | null
          Employer?: string | null
          "First Name"?: string | null
          Gender?: string | null
          "Givebutter Contact ID"?: string | null
          "Household Envelope Name"?: string | null
          "Household Name"?: string | null
          "Is Household Primary Contact"?: string | null
          "Last Name"?: string | null
          last_synced_at?: string | null
          "Middle Name"?: string | null
          mn_id: string
          needs_sync?: boolean | null
          Notes?: string | null
          "Phone Numbers"?: string | null
          "Phone Subscription Status"?: string | null
          Prefix?: string | null
          "Primary Email"?: string | null
          "Primary Phone Number"?: string | null
          Tags?: string | null
          Title?: string | null
          updated_at?: string | null
        }
        Update: {
          "✅ Mentor Training Signed Up?"?: string | null
          "👯‍♂️ Partner Preference"?: string | null
          "💰 Amount Fundraised"?: string | null
          "💸 Givebutter Page Setup"?: string | null
          "📆 Shift Preference"?: string | null
          "📈 Fully Fundraised"?: string | null
          "📧 Custom Email Message 1️⃣"?: string | null
          "📱Custom Text Message 1️⃣"?: string | null
          "📱Custom Text Message 2️⃣"?: string | null
          "🚂 Mentor Training Complete"?: string | null
          "Address Subscription Status"?: string | null
          "Contact External ID"?: string | null
          created_at?: string | null
          "Date of Birth"?: string | null
          "Email Addresses"?: string | null
          "Email Subscription Status"?: string | null
          Employer?: string | null
          "First Name"?: string | null
          Gender?: string | null
          "Givebutter Contact ID"?: string | null
          "Household Envelope Name"?: string | null
          "Household Name"?: string | null
          "Is Household Primary Contact"?: string | null
          "Last Name"?: string | null
          last_synced_at?: string | null
          "Middle Name"?: string | null
          mn_id?: string
          needs_sync?: boolean | null
          Notes?: string | null
          "Phone Numbers"?: string | null
          "Phone Subscription Status"?: string | null
          Prefix?: string | null
          "Primary Email"?: string | null
          "Primary Phone Number"?: string | null
          Tags?: string | null
          Title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mn_gb_import_mn_id_fkey"
            columns: ["mn_id"]
            isOneToOne: true
            referencedRelation: "mentors"
            referencedColumns: ["mn_id"]
          },
        ]
      }
      raw_gb_campaign_members: {
        Row: {
          amount_raised: number | null
          created_at: string | null
          created_at_gb: string | null
          display_name: string | null
          donors: number | null
          email: string | null
          first_name: string | null
          goal: number | null
          items: number | null
          last_name: string | null
          member_id: number
          mn_id: string | null
          phone: string | null
          picture: string | null
          updated_at: string | null
          updated_at_gb: string | null
          url: string | null
        }
        Insert: {
          amount_raised?: number | null
          created_at?: string | null
          created_at_gb?: string | null
          display_name?: string | null
          donors?: number | null
          email?: string | null
          first_name?: string | null
          goal?: number | null
          items?: number | null
          last_name?: string | null
          member_id: number
          mn_id?: string | null
          phone?: string | null
          picture?: string | null
          updated_at?: string | null
          updated_at_gb?: string | null
          url?: string | null
        }
        Update: {
          amount_raised?: number | null
          created_at?: string | null
          created_at_gb?: string | null
          display_name?: string | null
          donors?: number | null
          email?: string | null
          first_name?: string | null
          goal?: number | null
          items?: number | null
          last_name?: string | null
          member_id?: number
          mn_id?: string | null
          phone?: string | null
          picture?: string | null
          updated_at?: string | null
          updated_at_gb?: string | null
          url?: string | null
        }
        Relationships: []
      }
      raw_gb_full_contacts: {
        Row: {
          additional_addresses: string | null
          additional_emails: string | null
          additional_phones: string | null
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          contact_id: number
          country: string | null
          created_at: string | null
          csv_filename: string | null
          csv_uploaded_at: string | null
          custom_fields: Json | null
          date_created_utc: string | null
          date_of_birth: string | null
          employer: string | null
          engage_email_subscribed: boolean | null
          engage_mail_subscribed: boolean | null
          engage_sms_subscribed: boolean | null
          external_id: string | null
          facebook: string | null
          first_name: string | null
          gender: string | null
          household: string | null
          household_id: string | null
          household_primary_contact: boolean | null
          last_modified_utc: string | null
          last_name: string | null
          linkedin: string | null
          middle_name: string | null
          notes: string | null
          postal_code: string | null
          prefix: string | null
          primary_email: string | null
          primary_phone: string | null
          recurring_contributions: string | null
          source: string | null
          state: string | null
          suffix: string | null
          tags: string[] | null
          title: string | null
          total_contributions: string | null
          total_soft_credits: string | null
          twitter: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          additional_addresses?: string | null
          additional_emails?: string | null
          additional_phones?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          contact_id: number
          country?: string | null
          created_at?: string | null
          csv_filename?: string | null
          csv_uploaded_at?: string | null
          custom_fields?: Json | null
          date_created_utc?: string | null
          date_of_birth?: string | null
          employer?: string | null
          engage_email_subscribed?: boolean | null
          engage_mail_subscribed?: boolean | null
          engage_sms_subscribed?: boolean | null
          external_id?: string | null
          facebook?: string | null
          first_name?: string | null
          gender?: string | null
          household?: string | null
          household_id?: string | null
          household_primary_contact?: boolean | null
          last_modified_utc?: string | null
          last_name?: string | null
          linkedin?: string | null
          middle_name?: string | null
          notes?: string | null
          postal_code?: string | null
          prefix?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          recurring_contributions?: string | null
          source?: string | null
          state?: string | null
          suffix?: string | null
          tags?: string[] | null
          title?: string | null
          total_contributions?: string | null
          total_soft_credits?: string | null
          twitter?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          additional_addresses?: string | null
          additional_emails?: string | null
          additional_phones?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          contact_id?: number
          country?: string | null
          created_at?: string | null
          csv_filename?: string | null
          csv_uploaded_at?: string | null
          custom_fields?: Json | null
          date_created_utc?: string | null
          date_of_birth?: string | null
          employer?: string | null
          engage_email_subscribed?: boolean | null
          engage_mail_subscribed?: boolean | null
          engage_sms_subscribed?: boolean | null
          external_id?: string | null
          facebook?: string | null
          first_name?: string | null
          gender?: string | null
          household?: string | null
          household_id?: string | null
          household_primary_contact?: boolean | null
          last_modified_utc?: string | null
          last_name?: string | null
          linkedin?: string | null
          middle_name?: string | null
          notes?: string | null
          postal_code?: string | null
          prefix?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          recurring_contributions?: string | null
          source?: string | null
          state?: string | null
          suffix?: string | null
          tags?: string[] | null
          title?: string | null
          total_contributions?: string | null
          total_soft_credits?: string | null
          twitter?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      raw_mn_funds_setup: {
        Row: {
          created_at: string | null
          email: string | null
          phone: string | null
          status: string | null
          submission_id: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          phone?: string | null
          status?: string | null
          submission_id: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          phone?: string | null
          status?: string | null
          submission_id?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      raw_mn_signups: {
        Row: {
          created_at: string | null
          first_name: string | null
          gender: string | null
          last_name: string | null
          middle_name: string | null
          mn_id: string | null
          partner_preference: string | null
          personal_email: string | null
          phone: string | null
          preferred_name: string | null
          shift_preference: string | null
          shirt_size: string | null
          submission_id: string
          submitted_at: string | null
          uga_class: string | null
          uga_email: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          gender?: string | null
          last_name?: string | null
          middle_name?: string | null
          mn_id?: string | null
          partner_preference?: string | null
          personal_email?: string | null
          phone?: string | null
          preferred_name?: string | null
          shift_preference?: string | null
          shirt_size?: string | null
          submission_id: string
          submitted_at?: string | null
          uga_class?: string | null
          uga_email?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          gender?: string | null
          last_name?: string | null
          middle_name?: string | null
          mn_id?: string | null
          partner_preference?: string | null
          personal_email?: string | null
          phone?: string | null
          preferred_name?: string | null
          shift_preference?: string | null
          shirt_size?: string | null
          submission_id?: string
          submitted_at?: string | null
          uga_class?: string | null
          uga_email?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_config: {
        Row: {
          configured_at: string | null
          configured_by: string | null
          contact_sync_interval_hours: number | null
          created_at: string | null
          current_campaign_code: string | null
          current_tag_filter: string | null
          givebutter_api_key: string | null
          givebutter_campaign_code: string | null
          id: number
          jotform_api_key: string | null
          jotform_setup_form_id: string | null
          jotform_signup_form_id: string | null
          last_csv_upload_at: string | null
          last_gb_api_sync_at: string | null
          last_jotform_sync_at: string | null
          last_sync_at: string | null
          last_tag_query_at: string | null
          system_initialized: boolean | null
          updated_at: string | null
        }
        Insert: {
          configured_at?: string | null
          configured_by?: string | null
          contact_sync_interval_hours?: number | null
          created_at?: string | null
          current_campaign_code?: string | null
          current_tag_filter?: string | null
          givebutter_api_key?: string | null
          givebutter_campaign_code?: string | null
          id?: number
          jotform_api_key?: string | null
          jotform_setup_form_id?: string | null
          jotform_signup_form_id?: string | null
          last_csv_upload_at?: string | null
          last_gb_api_sync_at?: string | null
          last_jotform_sync_at?: string | null
          last_sync_at?: string | null
          last_tag_query_at?: string | null
          system_initialized?: boolean | null
          updated_at?: string | null
        }
        Update: {
          configured_at?: string | null
          configured_by?: string | null
          contact_sync_interval_hours?: number | null
          created_at?: string | null
          current_campaign_code?: string | null
          current_tag_filter?: string | null
          givebutter_api_key?: string | null
          givebutter_campaign_code?: string | null
          id?: number
          jotform_api_key?: string | null
          jotform_setup_form_id?: string | null
          jotform_signup_form_id?: string | null
          last_csv_upload_at?: string | null
          last_gb_api_sync_at?: string | null
          last_jotform_sync_at?: string | null
          last_sync_at?: string | null
          last_tag_query_at?: string | null
          system_initialized?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          error_details: Json | null
          error_message: string | null
          id: number
          metadata: Json | null
          records_failed: number | null
          records_inserted: number | null
          records_processed: number | null
          records_updated: number | null
          source: string | null
          started_at: string | null
          status: string | null
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: number
          metadata?: Json | null
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: number
          metadata?: Json | null
          records_failed?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_sync_stats: {
        Args: never
        Returns: {
          avg_duration_seconds: number
          failed_syncs: number
          last_sync: string
          sync_type: string
          total_syncs: number
        }[]
      }
      link_campaign_members_to_mentors: { Args: never; Returns: number }
      normalize_email: { Args: { email: string }; Returns: string }
      normalize_phone: { Args: { phone: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

