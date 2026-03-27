export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: Property;
        Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Property, 'id'>>;
      };
      units: {
        Row: Unit;
        Insert: Omit<Unit, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Unit, 'id'>>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Contact, 'id'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<User, 'id'>>;
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, 'id' | 'created_at' | 'updated_at' | 'application_type'> & {
          id?: string;
          application_type?: ApplicationType;
        };
        Update: Partial<Omit<Application, 'id'>>;
      };
      application_documents: {
        Row: ApplicationDocument;
        Insert: Omit<ApplicationDocument, 'id' | 'uploaded_at' | 'shared_with_landlord' | 'shared_at' | 'shared_by' | 'removal_requested_at' | 'removal_requested_by' | 'removal_approved_at' | 'removal_approved_by' | 'removal_status'> & {
          id?: string;
          shared_with_landlord?: boolean;
          shared_at?: string | null;
          shared_by?: string | null;
          removal_requested_at?: string | null;
          removal_requested_by?: string | null;
          removal_approved_at?: string | null;
          removal_approved_by?: string | null;
          removal_status?: string | null;
        };
        Update: Partial<Omit<ApplicationDocument, 'id'>>;
      };
      lois: {
        Row: Loi;
        Insert: Omit<Loi, 'id' | 'created_at' | 'updated_at' | 'ai_drafted' | 'ai_draft_prompt' | 'applicant_docusign_envelope_id' | 'applicant_docusign_status' | 'applicant_signed_at'> & {
          id?: string;
          ai_drafted?: boolean;
          ai_draft_prompt?: string | null;
          applicant_docusign_envelope_id?: string | null;
          applicant_docusign_status?: string | null;
          applicant_signed_at?: string | null;
        };
        Update: Partial<Omit<Loi, 'id'>>;
      };
      loi_sections: {
        Row: LoiSection;
        Insert: Omit<LoiSection, 'id' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<LoiSection, 'id'>>;
      };
      loi_negotiations: {
        Row: LoiNegotiation;
        Insert: Omit<LoiNegotiation, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<LoiNegotiation, 'id'>>;
      };
      leases: {
        Row: Lease;
        Insert: Omit<Lease, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Lease, 'id'>>;
      };
      rent_escalations: {
        Row: RentEscalation;
        Insert: Omit<RentEscalation, 'id'> & { id?: string };
        Update: Partial<Omit<RentEscalation, 'id'>>;
      };
      commission_invoices: {
        Row: CommissionInvoice;
        Insert: Omit<CommissionInvoice, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<CommissionInvoice, 'id'>>;
      };
      qr_codes: {
        Row: QrCode;
        Insert: Omit<QrCode, 'id' | 'created_at' | 'qr_type'> & {
          id?: string;
          qr_type?: QrType;
        };
        Update: Partial<Omit<QrCode, 'id'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Notification, 'id'>>;
      };
      audit_log: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<AuditLog, 'id'>>;
      };
      comparable_transactions: {
        Row: ComparableTransaction;
        Insert: Omit<ComparableTransaction, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<ComparableTransaction, 'id'>>;
      };
      property_views: {
        Row: PropertyView;
        Insert: Omit<PropertyView, 'id' | 'viewed_at'> & { id?: string };
        Update: Partial<Omit<PropertyView, 'id'>>;
      };
      loi_templates: {
        Row: LoiTemplate;
        Insert: Omit<LoiTemplate, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<LoiTemplate, 'id'>>;
      };
      lease_sections: {
        Row: LeaseSection;
        Insert: Omit<LeaseSection, 'id' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<LeaseSection, 'id'>>;
      };
      lease_negotiations: {
        Row: LeaseNegotiation;
        Insert: Omit<LeaseNegotiation, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<LeaseNegotiation, 'id'>>;
      };
      deal_checklists: {
        Row: DealChecklist;
        Insert: Omit<DealChecklist, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<DealChecklist, 'id'>>;
      };
      deal_checklist_items: {
        Row: DealChecklistItem;
        Insert: Omit<DealChecklistItem, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<DealChecklistItem, 'id'>>;
      };
    };
  };
};

// ============================================================
// Row types
// ============================================================

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string | null;
  property_type: string;
  total_sf: number | null;
  land_area_sf: number | null;
  year_built: number | null;
  zoning: string | null;
  parcel_number: string | null;
  parking_spaces: number | null;
  parking_ratio: number | null;
  power: string | null;
  clear_height_ft: number | null;
  dock_high_doors: number;
  grade_level_doors: number;
  levelers: number;
  crane_capacity_tons: number | null;
  building_far: number | null;
  primary_leasing_company: string | null;
  description: string | null;
  features: Json;
  photos: Json;
  photo_urls: string[];
  floorplan_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  suite_number: string;
  sf: number;
  unit_type: string | null;
  status: UnitStatus;
  monthly_rent: number | null;
  rent_per_sqft: number | null;
  cam_percent: number | null;
  cam_monthly: number | null;
  base_year: number | null;
  current_lease_id: string | null;
  marketing_rate: number | null;
  marketing_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  type: ContactType;
  company_name: string | null;
  dba_name: string | null;
  entity_type: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  industry: string | null;
  website: string | null;
  notes: string | null;
  tags: Json;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  contact_id: string | null;
  email: string;
  role: UserRole;
  auth_provider_id: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  property_id: string | null;
  unit_id: string | null;
  contact_id: string;
  application_type: ApplicationType;
  status: ApplicationStatus;
  business_name: string;
  business_type: string | null;
  business_entity_state: string | null;
  agreed_use: string | null;
  years_in_business: number | null;
  number_of_employees: number | null;
  annual_revenue: number | null;
  requested_sf: number | null;
  desired_term_months: number | null;
  desired_move_in: string | null;
  desired_rent_budget: number | null;
  guarantor_name: string | null;
  guarantor_phone: string | null;
  guarantor_email: string | null;
  credit_check_status: CreditCheckStatus;
  credit_check_date: string | null;
  credit_score: number | null;
  credit_report_url: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  portal_source: string | null;
  qr_code_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  tax_year: number | null;
  period_start: string | null;
  period_end: string | null;
  uploaded_at: string;
  reviewed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  shared_with_landlord: boolean;
  shared_at: string | null;
  shared_by: string | null;
  removal_requested_at: string | null;
  removal_requested_by: string | null;
  removal_approved_at: string | null;
  removal_approved_by: string | null;
  removal_status: DocumentRemovalStatus | null;
}

export interface Loi {
  id: string;
  application_id: string | null;
  property_id: string;
  unit_id: string;
  tenant_contact_id: string;
  landlord_contact_id: string;
  broker_contact_id: string;
  status: LoiStatus;
  version: number;
  parent_loi_id: string | null;
  created_by: string;
  sent_at: string | null;
  expires_at: string | null;
  agreed_at: string | null;
  notes: string | null;
  ai_drafted: boolean;
  ai_draft_prompt: string | null;
  applicant_docusign_envelope_id: string | null;
  applicant_docusign_status: string | null;
  applicant_signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoiSection {
  id: string;
  loi_id: string;
  section_key: LoiSectionKey;
  section_label: string;
  display_order: number;
  proposed_value: string;
  landlord_response: string | null;
  agreed_value: string | null;
  status: LoiSectionStatus;
  negotiation_notes: string | null;
  last_updated_by: string | null;
  updated_at: string;
}

export interface LoiNegotiation {
  id: string;
  loi_section_id: string;
  action: NegotiationAction;
  value: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface Lease {
  id: string;
  loi_id: string | null;
  property_id: string;
  unit_id: string;
  tenant_contact_id: string;
  landlord_contact_id: string;
  broker_contact_id: string;
  guarantor_contact_id: string | null;
  status: LeaseStatus;
  form_type: string;
  form_version: string | null;
  reference_date: string | null;
  lessor_name: string;
  lessor_entity_type: string | null;
  lessee_name: string;
  lessee_entity_type: string | null;
  premises_address: string;
  premises_city: string;
  premises_county: string | null;
  premises_state: string;
  premises_zip: string | null;
  premises_sf: number;
  premises_description: string | null;
  parking_spaces: number | null;
  parking_type: string;
  term_years: number | null;
  term_months: number | null;
  commencement_date: string;
  expiration_date: string;
  early_possession_terms: string | null;
  base_rent_monthly: number;
  base_rent_payable_day: string;
  base_rent_commencement: string | null;
  cam_percent: number | null;
  cam_description: string;
  exec_base_rent_amount: number | null;
  exec_base_rent_period: string | null;
  exec_cam_amount: number | null;
  exec_cam_period: string | null;
  exec_security_deposit: number | null;
  exec_other_amount: number | null;
  exec_other_description: string | null;
  total_due_upon_execution: number | null;
  agreed_use: string | null;
  insuring_party: string;
  broker_representation_type: string | null;
  lessors_broker_name: string | null;
  lessors_broker_company: string | null;
  lessees_broker_name: string | null;
  lessees_broker_company: string | null;
  broker_payment_terms: string | null;
  guarantor_names: string | null;
  addendum_paragraph_start: number | null;
  addendum_paragraph_end: number | null;
  has_site_plan_premises: boolean;
  has_site_plan_project: boolean;
  has_rules_and_regulations: boolean;
  other_attachments: string | null;
  security_deposit: number | null;
  docusign_envelope_id: string | null;
  docusign_status: string | null;
  sent_for_signature_at: string | null;
  signed_date: string | null;
  lease_pdf_url: string | null;
  executed_pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentEscalation {
  id: string;
  lease_id: string;
  year_number: number;
  effective_date: string;
  rent_per_sqft: number;
  monthly_amount: number;
  notes: string | null;
}

export interface CommissionInvoice {
  id: string;
  lease_id: string;
  invoice_number: string;
  broker_contact_id: string;
  payee_contact_id: string;
  lease_term_months: number;
  monthly_rent: number;
  total_consideration: number;
  commission_rate_percent: number;
  commission_amount: number;
  payee_name: string | null;
  payee_address: string | null;
  payee_city_state_zip: string | null;
  payment_instructions: string | null;
  status: InvoiceStatus;
  sent_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  paid_amount: number | null;
  payment_method: string | null;
  payment_reference: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QrCode {
  id: string;
  property_id: string | null;
  unit_id: string | null;
  qr_type: QrType;
  short_code: string;
  portal_url: string;
  qr_image_url: string | null;
  is_active: boolean;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  read: boolean;
  read_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: Json | null;
  new_value: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ComparableTransaction {
  id: string;
  property_id: string | null;
  address: string;
  city: string;
  state: string;
  property_type: string | null;
  transaction_type: TransactionType;
  transaction_date: string;
  tenant_name: string | null;
  sf: number | null;
  rent_per_sqft: number | null;
  monthly_rent: number | null;
  lease_term_months: number | null;
  sale_price: number | null;
  price_per_sqft: number | null;
  cap_rate: number | null;
  notes: string | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PropertyView {
  id: string;
  property_id: string;
  source: string | null;
  viewer_ip: string | null;
  user_agent: string | null;
  viewed_at: string;
}

export interface LoiTemplate {
  id: string;
  name: string;
  property_type: string;
  description: string | null;
  sections: Json;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Enums
// ============================================================

export type ContactType = 'tenant' | 'landlord' | 'broker' | 'prospect' | 'guarantor';
export type UserRole = 'admin' | 'broker' | 'tenant' | 'landlord';
export type UnitStatus = 'vacant' | 'occupied' | 'pending' | 'maintenance';
export type ApplicationType = 'general' | 'property';
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn' | 'info_requested';
export type CreditCheckStatus = 'not_run' | 'pending' | 'completed' | 'failed';
export type DocumentType = 'tax_return' | 'bank_statement' | 'pnl' | 'business_license' | 'id' | 'credit_report' | 'other';
export type DocumentRemovalStatus = 'requested' | 'approved' | 'denied';
export type QrType = 'property' | 'general';
export type LoiStatus = 'draft' | 'sent' | 'in_negotiation' | 'agreed' | 'expired' | 'rejected' | 'withdrawn';
export type LoiSectionStatus = 'proposed' | 'accepted' | 'countered' | 'rejected';
export type LoiSectionKey = 'base_rent' | 'term' | 'tenant_improvements' | 'cam' | 'security_deposit' | 'agreed_use' | 'parking' | 'options' | 'escalations' | 'free_rent' | 'other';
export type NegotiationAction = 'propose' | 'accept' | 'counter' | 'reject';
export type LeaseStatus = 'draft' | 'review' | 'sent_for_signature' | 'partially_signed' | 'executed' | 'expired' | 'terminated';
export type LeaseNegotiationStatus = 'none' | 'in_negotiation' | 'agreed';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type TransactionType = 'lease' | 'sale';
export type PartyRole = 'broker' | 'tenant' | 'landlord' | 'tenant_agent' | 'landlord_agent';
export type ChecklistItemAssignment = 'tenant' | 'landlord' | 'both' | 'broker';

// ============================================================
// Phase 5: Lease negotiation
// ============================================================

export interface LeaseSection {
  id: string;
  lease_id: string;
  section_key: string;
  section_label: string;
  display_order: number;
  proposed_value: string;
  counterparty_response: string | null;
  agreed_value: string | null;
  status: LoiSectionStatus; // reuses same statuses
  negotiation_notes: string | null;
  last_updated_by: string | null;
  updated_at: string;
}

export interface LeaseNegotiation {
  id: string;
  lease_section_id: string;
  action: NegotiationAction;
  value: string | null;
  note: string | null;
  created_by: string;
  party_role: PartyRole;
  created_at: string;
}

// ============================================================
// Phase 6: Deal checklist
// ============================================================

export interface DealChecklist {
  id: string;
  lease_id: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DealChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  description: string | null;
  assigned_to: ChecklistItemAssignment;
  display_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  due_date: string | null;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Joined/extended types for queries
// ============================================================

export interface UnitWithProperty extends Unit {
  property: Property;
}

export interface ApplicationWithRelations extends Application {
  property: Property;
  unit: Unit | null;
  contact: Contact;
  documents: ApplicationDocument[];
}

export interface LoiWithRelations extends Loi {
  property: Property;
  unit: Unit;
  tenant: Contact;
  landlord: Contact;
  broker: Contact;
  sections: LoiSection[];
}

export interface LeaseWithRelations extends Lease {
  property: Property;
  unit: Unit;
  tenant: Contact;
  landlord: Contact;
  broker: Contact;
  escalations: RentEscalation[];
}
