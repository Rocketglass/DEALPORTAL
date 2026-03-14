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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      application_documents: {
        Row: {
          application_id: string
          document_type: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          period_end: string | null
          period_start: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          tax_year: number | null
          uploaded_at: string | null
        }
        Insert: {
          application_id: string
          document_type: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          period_end?: string | null
          period_start?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          tax_year?: number | null
          uploaded_at?: string | null
        }
        Update: {
          application_id?: string
          document_type?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          period_end?: string | null
          period_start?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          tax_year?: number | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          agreed_use: string | null
          annual_revenue: number | null
          business_entity_state: string | null
          business_name: string
          business_type: string | null
          contact_id: string
          created_at: string | null
          credit_check_date: string | null
          credit_check_status: string | null
          credit_report_url: string | null
          credit_score: number | null
          desired_move_in: string | null
          desired_rent_budget: number | null
          desired_term_months: number | null
          guarantor_email: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          id: string
          number_of_employees: number | null
          portal_source: string | null
          property_id: string
          qr_code_id: string | null
          requested_sf: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          unit_id: string | null
          updated_at: string | null
          years_in_business: number | null
        }
        Insert: {
          agreed_use?: string | null
          annual_revenue?: number | null
          business_entity_state?: string | null
          business_name: string
          business_type?: string | null
          contact_id: string
          created_at?: string | null
          credit_check_date?: string | null
          credit_check_status?: string | null
          credit_report_url?: string | null
          credit_score?: number | null
          desired_move_in?: string | null
          desired_rent_budget?: number | null
          desired_term_months?: number | null
          guarantor_email?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          number_of_employees?: number | null
          portal_source?: string | null
          property_id: string
          qr_code_id?: string | null
          requested_sf?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          unit_id?: string | null
          updated_at?: string | null
          years_in_business?: number | null
        }
        Update: {
          agreed_use?: string | null
          annual_revenue?: number | null
          business_entity_state?: string | null
          business_name?: string
          business_type?: string | null
          contact_id?: string
          created_at?: string | null
          credit_check_date?: string | null
          credit_check_status?: string | null
          credit_report_url?: string | null
          credit_score?: number | null
          desired_move_in?: string | null
          desired_rent_budget?: number | null
          desired_term_months?: number | null
          guarantor_email?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          number_of_employees?: number | null
          portal_source?: string | null
          property_id?: string
          qr_code_id?: string | null
          requested_sf?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          unit_id?: string | null
          updated_at?: string | null
          years_in_business?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_invoices: {
        Row: {
          broker_contact_id: string
          commission_amount: number
          commission_rate_percent: number
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string
          lease_id: string
          lease_term_months: number
          monthly_rent: number
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payee_address: string | null
          payee_city_state_zip: string | null
          payee_contact_id: string
          payee_name: string | null
          payment_instructions: string | null
          payment_method: string | null
          payment_reference: string | null
          pdf_url: string | null
          sent_date: string | null
          status: string
          total_consideration: number
          updated_at: string | null
        }
        Insert: {
          broker_contact_id: string
          commission_amount: number
          commission_rate_percent: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          lease_id: string
          lease_term_months: number
          monthly_rent: number
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payee_address?: string | null
          payee_city_state_zip?: string | null
          payee_contact_id: string
          payee_name?: string | null
          payment_instructions?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          sent_date?: string | null
          status?: string
          total_consideration: number
          updated_at?: string | null
        }
        Update: {
          broker_contact_id?: string
          commission_amount?: number
          commission_rate_percent?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          lease_id?: string
          lease_term_months?: number
          monthly_rent?: number
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payee_address?: string | null
          payee_city_state_zip?: string | null
          payee_contact_id?: string
          payee_name?: string | null
          payment_instructions?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          sent_date?: string | null
          status?: string
          total_consideration?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_invoices_broker_contact_id_fkey"
            columns: ["broker_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_invoices_payee_contact_id_fkey"
            columns: ["payee_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          dba_name: string | null
          email: string | null
          entity_type: string | null
          first_name: string | null
          id: string
          industry: string | null
          last_name: string | null
          notes: string | null
          phone: string | null
          state: string | null
          tags: Json | null
          type: string
          updated_at: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          dba_name?: string | null
          email?: string | null
          entity_type?: string | null
          first_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          tags?: Json | null
          type: string
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          dba_name?: string | null
          email?: string | null
          entity_type?: string | null
          first_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          tags?: Json | null
          type?: string
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      leases: {
        Row: {
          addendum_paragraph_end: number | null
          addendum_paragraph_start: number | null
          agreed_use: string | null
          base_rent_commencement: string | null
          base_rent_monthly: number
          base_rent_payable_day: string | null
          broker_contact_id: string
          broker_payment_terms: string | null
          broker_representation_type: string | null
          cam_description: string | null
          cam_percent: number | null
          commencement_date: string
          created_at: string | null
          docusign_envelope_id: string | null
          docusign_status: string | null
          early_possession_terms: string | null
          exec_base_rent_amount: number | null
          exec_base_rent_period: string | null
          exec_cam_amount: number | null
          exec_cam_period: string | null
          exec_other_amount: number | null
          exec_other_description: string | null
          exec_security_deposit: number | null
          executed_pdf_url: string | null
          expiration_date: string
          form_type: string | null
          form_version: string | null
          guarantor_contact_id: string | null
          guarantor_names: string | null
          has_rules_and_regulations: boolean | null
          has_site_plan_premises: boolean | null
          has_site_plan_project: boolean | null
          id: string
          insuring_party: string | null
          landlord_contact_id: string
          lease_pdf_url: string | null
          lessee_entity_type: string | null
          lessee_name: string
          lessees_broker_company: string | null
          lessees_broker_name: string | null
          lessor_entity_type: string | null
          lessor_name: string
          lessors_broker_company: string | null
          lessors_broker_name: string | null
          loi_id: string | null
          other_attachments: string | null
          parking_spaces: number | null
          parking_type: string | null
          premises_address: string
          premises_city: string
          premises_county: string | null
          premises_description: string | null
          premises_sf: number
          premises_state: string | null
          premises_zip: string | null
          property_id: string
          reference_date: string | null
          security_deposit: number | null
          sent_for_signature_at: string | null
          signed_date: string | null
          status: string
          tenant_contact_id: string
          term_months: number | null
          term_years: number | null
          total_due_upon_execution: number | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          addendum_paragraph_end?: number | null
          addendum_paragraph_start?: number | null
          agreed_use?: string | null
          base_rent_commencement?: string | null
          base_rent_monthly: number
          base_rent_payable_day?: string | null
          broker_contact_id: string
          broker_payment_terms?: string | null
          broker_representation_type?: string | null
          cam_description?: string | null
          cam_percent?: number | null
          commencement_date: string
          created_at?: string | null
          docusign_envelope_id?: string | null
          docusign_status?: string | null
          early_possession_terms?: string | null
          exec_base_rent_amount?: number | null
          exec_base_rent_period?: string | null
          exec_cam_amount?: number | null
          exec_cam_period?: string | null
          exec_other_amount?: number | null
          exec_other_description?: string | null
          exec_security_deposit?: number | null
          executed_pdf_url?: string | null
          expiration_date: string
          form_type?: string | null
          form_version?: string | null
          guarantor_contact_id?: string | null
          guarantor_names?: string | null
          has_rules_and_regulations?: boolean | null
          has_site_plan_premises?: boolean | null
          has_site_plan_project?: boolean | null
          id?: string
          insuring_party?: string | null
          landlord_contact_id: string
          lease_pdf_url?: string | null
          lessee_entity_type?: string | null
          lessee_name: string
          lessees_broker_company?: string | null
          lessees_broker_name?: string | null
          lessor_entity_type?: string | null
          lessor_name: string
          lessors_broker_company?: string | null
          lessors_broker_name?: string | null
          loi_id?: string | null
          other_attachments?: string | null
          parking_spaces?: number | null
          parking_type?: string | null
          premises_address: string
          premises_city: string
          premises_county?: string | null
          premises_description?: string | null
          premises_sf: number
          premises_state?: string | null
          premises_zip?: string | null
          property_id: string
          reference_date?: string | null
          security_deposit?: number | null
          sent_for_signature_at?: string | null
          signed_date?: string | null
          status?: string
          tenant_contact_id: string
          term_months?: number | null
          term_years?: number | null
          total_due_upon_execution?: number | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          addendum_paragraph_end?: number | null
          addendum_paragraph_start?: number | null
          agreed_use?: string | null
          base_rent_commencement?: string | null
          base_rent_monthly?: number
          base_rent_payable_day?: string | null
          broker_contact_id?: string
          broker_payment_terms?: string | null
          broker_representation_type?: string | null
          cam_description?: string | null
          cam_percent?: number | null
          commencement_date?: string
          created_at?: string | null
          docusign_envelope_id?: string | null
          docusign_status?: string | null
          early_possession_terms?: string | null
          exec_base_rent_amount?: number | null
          exec_base_rent_period?: string | null
          exec_cam_amount?: number | null
          exec_cam_period?: string | null
          exec_other_amount?: number | null
          exec_other_description?: string | null
          exec_security_deposit?: number | null
          executed_pdf_url?: string | null
          expiration_date?: string
          form_type?: string | null
          form_version?: string | null
          guarantor_contact_id?: string | null
          guarantor_names?: string | null
          has_rules_and_regulations?: boolean | null
          has_site_plan_premises?: boolean | null
          has_site_plan_project?: boolean | null
          id?: string
          insuring_party?: string | null
          landlord_contact_id?: string
          lease_pdf_url?: string | null
          lessee_entity_type?: string | null
          lessee_name?: string
          lessees_broker_company?: string | null
          lessees_broker_name?: string | null
          lessor_entity_type?: string | null
          lessor_name?: string
          lessors_broker_company?: string | null
          lessors_broker_name?: string | null
          loi_id?: string | null
          other_attachments?: string | null
          parking_spaces?: number | null
          parking_type?: string | null
          premises_address?: string
          premises_city?: string
          premises_county?: string | null
          premises_description?: string | null
          premises_sf?: number
          premises_state?: string | null
          premises_zip?: string | null
          property_id?: string
          reference_date?: string | null
          security_deposit?: number | null
          sent_for_signature_at?: string | null
          signed_date?: string | null
          status?: string
          tenant_contact_id?: string
          term_months?: number | null
          term_years?: number | null
          total_due_upon_execution?: number | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_broker_contact_id_fkey"
            columns: ["broker_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_guarantor_contact_id_fkey"
            columns: ["guarantor_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_landlord_contact_id_fkey"
            columns: ["landlord_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_loi_id_fkey"
            columns: ["loi_id"]
            isOneToOne: false
            referencedRelation: "lois"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_contact_id_fkey"
            columns: ["tenant_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      loi_negotiations: {
        Row: {
          action: string
          created_at: string | null
          created_by: string
          id: string
          loi_section_id: string
          note: string | null
          value: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by: string
          id?: string
          loi_section_id: string
          note?: string | null
          value?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string
          id?: string
          loi_section_id?: string
          note?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loi_negotiations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loi_negotiations_loi_section_id_fkey"
            columns: ["loi_section_id"]
            isOneToOne: false
            referencedRelation: "loi_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      loi_sections: {
        Row: {
          agreed_value: string | null
          display_order: number
          id: string
          landlord_response: string | null
          last_updated_by: string | null
          loi_id: string
          negotiation_notes: string | null
          proposed_value: string
          section_key: string
          section_label: string
          status: string
          updated_at: string | null
        }
        Insert: {
          agreed_value?: string | null
          display_order?: number
          id?: string
          landlord_response?: string | null
          last_updated_by?: string | null
          loi_id: string
          negotiation_notes?: string | null
          proposed_value: string
          section_key: string
          section_label: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          agreed_value?: string | null
          display_order?: number
          id?: string
          landlord_response?: string | null
          last_updated_by?: string | null
          loi_id?: string
          negotiation_notes?: string | null
          proposed_value?: string
          section_key?: string
          section_label?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loi_sections_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loi_sections_loi_id_fkey"
            columns: ["loi_id"]
            isOneToOne: false
            referencedRelation: "lois"
            referencedColumns: ["id"]
          },
        ]
      }
      lois: {
        Row: {
          agreed_at: string | null
          application_id: string | null
          broker_contact_id: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          landlord_contact_id: string
          notes: string | null
          parent_loi_id: string | null
          property_id: string
          sent_at: string | null
          status: string
          tenant_contact_id: string
          unit_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          agreed_at?: string | null
          application_id?: string | null
          broker_contact_id: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          landlord_contact_id: string
          notes?: string | null
          parent_loi_id?: string | null
          property_id: string
          sent_at?: string | null
          status?: string
          tenant_contact_id: string
          unit_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          agreed_at?: string | null
          application_id?: string | null
          broker_contact_id?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          landlord_contact_id?: string
          notes?: string | null
          parent_loi_id?: string | null
          property_id?: string
          sent_at?: string | null
          status?: string
          tenant_contact_id?: string
          unit_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lois_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lois_broker_contact_id_fkey"
            columns: ["broker_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lois_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lois_landlord_contact_id_fkey"
            columns: ["landlord_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lois_parent_loi_id_fkey"
            columns: ["parent_loi_id"]
            isOneToOne: false
            referencedRelation: "lois"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lois_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lois_tenant_contact_id_fkey"
            columns: ["tenant_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lois_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          link_url: string | null
          message: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          link_url?: string | null
          message: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          link_url?: string | null
          message?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          building_far: number | null
          city: string
          clear_height_ft: number | null
          county: string | null
          crane_capacity_tons: number | null
          created_at: string | null
          description: string | null
          dock_high_doors: number | null
          features: Json | null
          floorplan_url: string | null
          grade_level_doors: number | null
          id: string
          is_active: boolean | null
          land_area_sf: number | null
          levelers: number | null
          name: string
          parcel_number: string | null
          parking_ratio: number | null
          parking_spaces: number | null
          photos: Json | null
          power: string | null
          primary_leasing_company: string | null
          property_type: string
          state: string
          total_sf: number | null
          updated_at: string | null
          year_built: number | null
          zip: string
          zoning: string | null
        }
        Insert: {
          address: string
          building_far?: number | null
          city: string
          clear_height_ft?: number | null
          county?: string | null
          crane_capacity_tons?: number | null
          created_at?: string | null
          description?: string | null
          dock_high_doors?: number | null
          features?: Json | null
          floorplan_url?: string | null
          grade_level_doors?: number | null
          id?: string
          is_active?: boolean | null
          land_area_sf?: number | null
          levelers?: number | null
          name: string
          parcel_number?: string | null
          parking_ratio?: number | null
          parking_spaces?: number | null
          photos?: Json | null
          power?: string | null
          primary_leasing_company?: string | null
          property_type: string
          state?: string
          total_sf?: number | null
          updated_at?: string | null
          year_built?: number | null
          zip: string
          zoning?: string | null
        }
        Update: {
          address?: string
          building_far?: number | null
          city?: string
          clear_height_ft?: number | null
          county?: string | null
          crane_capacity_tons?: number | null
          created_at?: string | null
          description?: string | null
          dock_high_doors?: number | null
          features?: Json | null
          floorplan_url?: string | null
          grade_level_doors?: number | null
          id?: string
          is_active?: boolean | null
          land_area_sf?: number | null
          levelers?: number | null
          name?: string
          parcel_number?: string | null
          parking_ratio?: number | null
          parking_spaces?: number | null
          photos?: Json | null
          power?: string | null
          primary_leasing_company?: string | null
          property_type?: string
          state?: string
          total_sf?: number | null
          updated_at?: string | null
          year_built?: number | null
          zip?: string
          zoning?: string | null
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_scanned_at: string | null
          portal_url: string
          property_id: string
          qr_image_url: string | null
          scan_count: number | null
          short_code: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_scanned_at?: string | null
          portal_url: string
          property_id: string
          qr_image_url?: string | null
          scan_count?: number | null
          short_code: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_scanned_at?: string | null
          portal_url?: string
          property_id?: string
          qr_image_url?: string | null
          scan_count?: number | null
          short_code?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_escalations: {
        Row: {
          effective_date: string
          id: string
          lease_id: string
          monthly_amount: number
          notes: string | null
          rent_per_sqft: number
          year_number: number
        }
        Insert: {
          effective_date: string
          id?: string
          lease_id: string
          monthly_amount: number
          notes?: string | null
          rent_per_sqft: number
          year_number: number
        }
        Update: {
          effective_date?: string
          id?: string
          lease_id?: string
          monthly_amount?: number
          notes?: string | null
          rent_per_sqft?: number
          year_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "rent_escalations_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          base_year: number | null
          cam_monthly: number | null
          cam_percent: number | null
          created_at: string | null
          current_lease_id: string | null
          id: string
          marketing_notes: string | null
          marketing_rate: number | null
          monthly_rent: number | null
          property_id: string
          rent_per_sqft: number | null
          sf: number
          status: string
          suite_number: string
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          base_year?: number | null
          cam_monthly?: number | null
          cam_percent?: number | null
          created_at?: string | null
          current_lease_id?: string | null
          id?: string
          marketing_notes?: string | null
          marketing_rate?: number | null
          monthly_rent?: number | null
          property_id: string
          rent_per_sqft?: number | null
          sf: number
          status?: string
          suite_number: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          base_year?: number | null
          cam_monthly?: number | null
          cam_percent?: number | null
          created_at?: string | null
          current_lease_id?: string | null
          id?: string
          marketing_notes?: string | null
          marketing_rate?: number | null
          monthly_rent?: number | null
          property_id?: string
          rent_per_sqft?: number | null
          sf?: number
          status?: string
          suite_number?: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_units_current_lease"
            columns: ["current_lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_provider_id: string | null
          contact_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          auth_provider_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          auth_provider_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_contact_id: { Args: never; Returns: string }
      get_user_email: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_broker_or_admin: { Args: never; Returns: boolean }
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
