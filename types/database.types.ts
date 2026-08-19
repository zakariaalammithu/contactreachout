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
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          role: 'owner' | 'admin' | 'operator' | 'viewer';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: 'owner' | 'admin' | 'operator' | 'viewer';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: 'owner' | 'admin' | 'operator' | 'viewer';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          organization_id: string;
          default_is_dry_run: boolean;
          max_concurrent_workers: number;
          rate_limit_per_minute: number;
          inter_page_delay_ms: number;
          page_navigation_timeout_ms: number;
          form_detection_timeout_ms: number;
          global_suppression_domains: string[];
          global_suppression_emails: string[];
          webhook_url: string | null;
          webhook_secret: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          default_is_dry_run?: boolean;
          max_concurrent_workers?: number;
          rate_limit_per_minute?: number;
          inter_page_delay_ms?: number;
          page_navigation_timeout_ms?: number;
          form_detection_timeout_ms?: number;
          global_suppression_domains?: string[];
          global_suppression_emails?: string[];
          webhook_url?: string | null;
          webhook_secret?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          default_is_dry_run?: boolean;
          max_concurrent_workers?: number;
          rate_limit_per_minute?: number;
          inter_page_delay_ms?: number;
          page_navigation_timeout_ms?: number;
          form_detection_timeout_ms?: number;
          global_suppression_domains?: string[];
          global_suppression_emails?: string[];
          webhook_url?: string | null;
          webhook_secret?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      message_templates: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          subject_template: string;
          body_template: string;
          compliance_footer: string;
          is_spintax_enabled: boolean;
          variables: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          subject_template: string;
          body_template: string;
          compliance_footer: string;
          is_spintax_enabled?: boolean;
          variables?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          subject_template?: string;
          body_template?: string;
          compliance_footer?: string;
          is_spintax_enabled?: boolean;
          variables?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          organization_id: string;
          message_template_id: string | null;
          name: string;
          status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'archived';
          is_dry_run: boolean;
          total_leads: number;
          processed_leads: number;
          successful_submissions: number;
          review_required_leads: number;
          blocked_leads: number;
          failed_leads: number;
          rate_limit_per_minute: number;
          max_concurrency: number;
          scheduled_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          message_template_id?: string | null;
          name: string;
          status?: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'archived';
          is_dry_run?: boolean;
          total_leads?: number;
          processed_leads?: number;
          successful_submissions?: number;
          review_required_leads?: number;
          blocked_leads?: number;
          failed_leads?: number;
          rate_limit_per_minute?: number;
          max_concurrency?: number;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          message_template_id?: string | null;
          name?: string;
          status?: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'archived';
          is_dry_run?: boolean;
          total_leads?: number;
          processed_leads?: number;
          successful_submissions?: number;
          review_required_leads?: number;
          blocked_leads?: number;
          failed_leads?: number;
          rate_limit_per_minute?: number;
          max_concurrency?: number;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          domain: string;
          website: string;
          company_name: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          industry: string | null;
          city: string | null;
          country: string | null;
          custom_fields: Json;
          status: string;
          source_filename: string | null;
          last_attempt_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          domain: string;
          website: string;
          company_name: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          industry?: string | null;
          city?: string | null;
          country?: string | null;
          custom_fields?: Json;
          status?: string;
          source_filename?: string | null;
          last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          domain?: string;
          website?: string;
          company_name?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          industry?: string | null;
          city?: string | null;
          country?: string | null;
          custom_fields?: Json;
          status?: string;
          source_filename?: string | null;
          last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      submissions: {
        Row: {
          id: string;
          campaign_id: string;
          lead_id: string;
          job_id: string | null;
          contact_form_id: string | null;
          status: string;
          lead_status: string;
          is_dry_run: boolean;
          submitted_payload: Json;
          http_response_status: number | null;
          error_code: string | null;
          error_message: string | null;
          manual_review_notes: string | null;
          resolved_by_user_id: string | null;
          resolved_at: string | null;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          lead_id: string;
          job_id?: string | null;
          contact_form_id?: string | null;
          status: string;
          lead_status: string;
          is_dry_run?: boolean;
          submitted_payload?: Json;
          http_response_status?: number | null;
          error_code?: string | null;
          error_message?: string | null;
          manual_review_notes?: string | null;
          resolved_by_user_id?: string | null;
          resolved_at?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          lead_id?: string;
          job_id?: string | null;
          contact_form_id?: string | null;
          status?: string;
          lead_status?: string;
          is_dry_run?: boolean;
          submitted_payload?: Json;
          http_response_status?: number | null;
          error_code?: string | null;
          error_message?: string | null;
          manual_review_notes?: string | null;
          resolved_by_user_id?: string | null;
          resolved_at?: string | null;
          submitted_at?: string | null;
          created_at?: string;
        };
      };
      submission_logs: {
        Row: {
          id: string;
          submission_id: string;
          step_name: string;
          level: 'debug' | 'info' | 'warn' | 'error';
          message: string;
          duration_ms: number | null;
          context: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          step_name: string;
          level?: 'debug' | 'info' | 'warn' | 'error';
          message: string;
          duration_ms?: number | null;
          context?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          step_name?: string;
          level?: 'debug' | 'info' | 'warn' | 'error';
          message?: string;
          duration_ms?: number | null;
          context?: Json;
          created_at?: string;
        };
      };
      screenshots: {
        Row: {
          id: string;
          submission_id: string;
          type: 'pre_submit' | 'post_submit' | 'error_state' | 'captcha_state' | 'manual_review';
          storage_path: string;
          file_size_bytes: number | null;
          dimensions_width: number | null;
          dimensions_height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          type: 'pre_submit' | 'post_submit' | 'error_state' | 'captcha_state' | 'manual_review';
          storage_path: string;
          file_size_bytes?: number | null;
          dimensions_width?: number | null;
          dimensions_height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          type?: 'pre_submit' | 'post_submit' | 'error_state' | 'captcha_state' | 'manual_review';
          storage_path?: string;
          file_size_bytes?: number | null;
          dimensions_width?: number | null;
          dimensions_height?: number | null;
          created_at?: string;
        };
      };
    };
  };
}
