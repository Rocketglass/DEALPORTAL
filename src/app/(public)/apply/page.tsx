'use client';

import { useState, useEffect, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  X,
  FileText,
  AlertCircle,
  Pencil,
  Shield,
  Building2,
  MapPin,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { cn } from '@/lib/utils';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'District of Columbia' },
] as const;

const BUSINESS_TYPES = ['LLC', 'Corporation', 'Sole Proprietorship', 'Partnership', 'Other'] as const;
const PROPERTY_TYPE_PREFS = ['Industrial', 'Retail', 'Office', 'Flex', 'Mixed Use', 'Any'] as const;
const TERM_PRESETS = [12, 24, 36, 60] as const;
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type DocumentCategory = 'tax_returns' | 'bank_statements' | 'pnl' | 'business_license';

const DOCUMENT_CATEGORIES: { key: DocumentCategory; label: string; description: string }[] = [
  { key: 'tax_returns', label: 'Tax Returns', description: 'Last 2 years' },
  { key: 'bank_statements', label: 'Bank Statements', description: 'Last 3 months' },
  { key: 'pnl', label: 'P&L Statement', description: 'Most recent' },
  { key: 'business_license', label: 'Business License', description: 'Current' },
];

const STEPS = [
  { number: 1, label: 'Business' },
  { number: 2, label: 'Properties' },
  { number: 3, label: 'Space' },
  { number: 4, label: 'Contact' },
  { number: 5, label: 'Documents' },
  { number: 6, label: 'Review' },
] as const;

const STORAGE_KEY = 'rr_application_draft_v2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormData {
  businessName: string;
  businessType: string;
  stateOfIncorporation: string;
  agreedUse: string;
  yearsInBusiness: string;
  numberOfEmployees: string;
  annualRevenue: string;
  preferredPropertyType: string;
  preferredArea: string;
  requestedSf: string;
  desiredTermMonths: string;
  desiredMoveIn: string;
  monthlyRentBudget: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  guarantorName: string;
  guarantorEmail: string;
  guarantorPhone: string;
  termsAccepted: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  category: DocumentCategory;
}

type StepErrors = Record<string, string>;

interface PropertyListing {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  property_type: string;
  total_sf: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function getStateName(code: string): string {
  return US_STATES.find((s) => s.value === code)?.label ?? code;
}

function formatCurrencyInput(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
}

// ---------------------------------------------------------------------------
// Reusable input components
// ---------------------------------------------------------------------------

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground mb-1.5">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function Input({
  id, type = 'text', value, onChange, onBlur, placeholder, error, disabled, min, step, inputMode, prefix,
}: {
  id: string; type?: string; value: string; onChange: (v: string) => void; onBlur?: () => void;
  placeholder?: string; error?: string; disabled?: boolean; min?: string; step?: string;
  inputMode?: 'numeric' | 'decimal' | 'tel' | 'email'; prefix?: string;
}) {
  return (
    <div>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground text-sm">{prefix}</span>}
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          placeholder={placeholder} disabled={disabled} min={min} step={step} inputMode={inputMode}
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors',
            'placeholder:text-muted-foreground/60 disabled:bg-muted disabled:cursor-not-allowed',
            error ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
              : 'border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            prefix ? 'pl-7' : '',
          )}
        />
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-red-600" role="alert"><AlertCircle className="h-3 w-3 shrink-0" />{error}</p>}
    </div>
  );
}

function Select({ id, value, onChange, onBlur, options, placeholder, error }: {
  id: string; value: string; onChange: (v: string) => void; onBlur?: () => void;
  options: { value: string; label: string }[]; placeholder?: string; error?: string;
}) {
  return (
    <div>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        aria-invalid={!!error} className={cn(
          'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors appearance-none',
          error ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20' : 'border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          !value && 'text-muted-foreground/60',
        )}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600" role="alert"><AlertCircle className="h-3 w-3 shrink-0" />{error}</p>}
    </div>
  );
}

function Textarea({ id, value, onChange, placeholder, rows = 3, error }: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; error?: string;
}) {
  return (
    <div>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className={cn(
          'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors resize-none placeholder:text-muted-foreground/60',
          error ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20' : 'border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        )} />
      {error && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600" role="alert"><AlertCircle className="h-3 w-3 shrink-0" />{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep, completedSteps }: { currentStep: number; completedSteps: Set<number> }) {
  return (
    <nav aria-label="Application progress" className="w-full">
      <ol className="hidden sm:flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isActive = step.number === currentStep;
          const isCompleted = completedSteps.has(step.number);
          const isLast = idx === STEPS.length - 1;
          return (
            <li key={step.number} className={cn('flex items-center', !isLast && 'flex-1')}>
              <div className="flex flex-col items-center">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
                  isActive && 'border-primary bg-primary text-white',
                  isCompleted && !isActive && 'border-primary bg-primary/10 text-primary',
                  !isActive && !isCompleted && 'border-border bg-white text-muted-foreground',
                )}>
                  {isCompleted && !isActive ? <Check className="h-4 w-4" /> : step.number}
                </div>
                <span className={cn('mt-2 text-xs font-medium', isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.label}
                </span>
              </div>
              {!isLast && <div className={cn('mx-3 mt-[-1rem] h-0.5 flex-1 rounded-full', isCompleted ? 'bg-primary' : 'bg-border')} />}
            </li>
          );
        })}
      </ol>
      <div className="flex sm:hidden items-center justify-between">
        <div className="flex items-center gap-2">
          {STEPS.map((step) => (
            <div key={step.number} className={cn('h-2 rounded-full transition-all',
              step.number === currentStep ? 'w-8 bg-primary' : completedSteps.has(step.number) ? 'w-2 bg-primary' : 'w-2 bg-border')} />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Step {currentStep} of {STEPS.length}</span>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// File upload zone
// ---------------------------------------------------------------------------

function FileUploadZone({ category, files, onAdd, onRemove }: {
  category: { key: DocumentCategory; label: string; description: string };
  files: UploadedFile[]; onAdd: (files: File[], category: DocumentCategory) => string[]; onRemove: (id: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const errors: string[] = [];
    const valid: File[] = [];
    Array.from(incoming).forEach((file) => {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) errors.push(`"${file.name}" is not a supported format.`);
      else if (file.size > MAX_FILE_SIZE) errors.push(`"${file.name}" exceeds 10 MB.`);
      else valid.push(file);
    });
    if (valid.length > 0) errors.push(...onAdd(valid, category.key));
    setFileErrors(errors);
  }, [onAdd, category.key]);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }, [handleFiles]);
  const onFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); if (inputRef.current) inputRef.current.value = ''; }, [handleFiles]);
  const categoryFiles = files.filter((f) => f.category === category.key);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-medium text-foreground">{category.label}</h4>
        <span className="text-xs text-muted-foreground">{category.description}</span>
      </div>
      <div onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        className={cn('flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50')}>
        <Upload className={cn('h-6 w-6', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Drop files here or <span className="text-primary">browse</span></p>
          <p className="mt-0.5 text-xs text-muted-foreground">PDF, JPG, or PNG up to 10 MB</p>
        </div>
        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={onFileInput} className="hidden" />
      </div>
      {fileErrors.length > 0 && <div className="space-y-1">{fileErrors.map((err, i) => (
        <p key={i} className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{err}</p>
      ))}</div>}
      {categoryFiles.length > 0 && (
        <ul className="space-y-2">{categoryFiles.map((f) => (
          <li key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{f.file.name}</p><p className="text-xs text-muted-foreground">{formatBytes(f.file.size)}</p></div>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
              className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"><X className="h-4 w-4" /></button>
          </li>
        ))}</ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Property card skeleton
// ---------------------------------------------------------------------------

function PropertyCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-white p-4">
      <div className="h-4 w-3/4 bg-muted rounded mb-2" />
      <div className="h-3 w-1/2 bg-muted rounded mb-1" />
      <div className="h-3 w-1/3 bg-muted rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Initial form data
// ---------------------------------------------------------------------------

const INITIAL_FORM_DATA: FormData = {
  businessName: '', businessType: '', stateOfIncorporation: 'CA', agreedUse: '',
  yearsInBusiness: '', numberOfEmployees: '', annualRevenue: '',
  preferredPropertyType: '', preferredArea: '',
  requestedSf: '', desiredTermMonths: '', desiredMoveIn: '', monthlyRentBudget: '',
  contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '',
  guarantorName: '', guarantorEmail: '', guarantorPhone: '', termsAccepted: false,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GeneralApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyParam = searchParams.get('property');

  // Auth state
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Properties list
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return propertyParam ? [propertyParam] : [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.selectedPropertyIds ?? (propertyParam ? [propertyParam] : []);
      }
    } catch { /* */ }
    return propertyParam ? [propertyParam] : [];
  });

  // Form state — restore from localStorage on mount
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window === 'undefined') return 1;
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) return JSON.parse(saved).step ?? 1; } catch { /* */ }
    return 1;
  });
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<StepErrors>({});
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasAttemptedStep, setHasAttemptedStep] = useState<Set<number>>(new Set());
  const [shakeKey, setShakeKey] = useState(0);
  const [submitErrorSummary, setSubmitErrorSummary] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window === 'undefined') return INITIAL_FORM_DATA;
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) return { ...INITIAL_FORM_DATA, ...JSON.parse(saved).formData }; } catch { /* */ }
    return INITIAL_FORM_DATA;
  });

  const [isRestoredDraft, setIsRestoredDraft] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        formData, step: currentStep, selectedPropertyIds, savedAt: new Date().toISOString(),
      }));
    } catch { /* */ }
  }, [formData, currentStep, selectedPropertyIds]);

  // Check auth state on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) { setAuthChecked(true); return; }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setAuthUser({ id: data.user.id, email: data.user.email ?? '' });
      }
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  // Load server draft for authenticated users
  useEffect(() => {
    if (!authChecked || !authUser) return;
    fetch('/api/applications/drafts')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.draft) {
          const { form_data, selected_property_ids, current_step } = data.draft;
          // Server draft takes priority over localStorage
          if (form_data && Object.keys(form_data).length > 0) {
            setFormData((prev) => ({ ...prev, ...form_data }));
          }
          if (selected_property_ids?.length > 0) {
            setSelectedPropertyIds(selected_property_ids);
          }
          if (current_step && current_step > 1) {
            setCurrentStep(current_step);
          }
          setDraftBanner('Welcome back! Your application draft has been restored.');
          setIsRestoredDraft(true);
        }
      })
      .catch(() => { /* non-fatal */ });
  }, [authChecked, authUser]);

  // Fetch properties for the Properties step
  useEffect(() => {
    setPropertiesLoading(true);
    fetch('/api/public/properties')
      .then((r) => r.ok ? r.json() : { properties: [] })
      .then((data) => {
        setProperties(data.properties ?? []);
        // If property param was provided, ensure it's pre-selected
        if (propertyParam) {
          setSelectedPropertyIds((prev) =>
            prev.includes(propertyParam) ? prev : [...prev, propertyParam]
          );
        }
      })
      .catch(() => setProperties([]))
      .finally(() => setPropertiesLoading(false));
  }, [propertyParam]);

  // Save draft to server on step change (fire-and-forget)
  const saveDraftToServer = useCallback((step: number, fd: FormData, propIds: string[]) => {
    if (!authUser) return;
    fetch('/api/applications/drafts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form_data: fd,
        selected_property_ids: propIds,
        current_step: step,
      }),
    }).catch(() => { /* non-fatal */ });
  }, [authUser]);

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
    setSubmitErrorSummary([]);
  }, []);

  const blurValidateField = useCallback((field: string) => {
    if (!hasAttemptedStep.has(currentStep)) return;
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }, [currentStep, hasAttemptedStep]);

  const handlePhoneChange = useCallback((key: 'contactPhone' | 'guarantorPhone', raw: string) => {
    updateField(key, raw.replace(/\D/g, '').slice(0, 10));
  }, [updateField]);

  const addFiles = useCallback((incoming: File[], category: DocumentCategory): string[] => {
    setFiles((prev) => [...prev, ...incoming.map((file) => ({
      id: `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, file, category,
    }))]);
    return [];
  }, []);

  const removeFile = useCallback((id: string) => { setFiles((prev) => prev.filter((f) => f.id !== id)); }, []);

  const togglePropertySelection = useCallback((propertyId: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
    setErrors((prev) => { const next = { ...prev }; delete next.properties; return next; });
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const stepErrors: StepErrors = {};
    if (step === 1) {
      if (!formData.businessName.trim()) stepErrors.businessName = 'Please enter your business name';
      if (!formData.businessType) stepErrors.businessType = 'Please select your business type';
    }
    if (step === 2) {
      if (selectedPropertyIds.length === 0) stepErrors.properties = 'Please select at least one property you\'re interested in';
    }
    if (step === 3) {
      if (!formData.requestedSf.trim()) stepErrors.requestedSf = 'Please enter the square footage you need';
      else if (Number(formData.requestedSf) <= 0) stepErrors.requestedSf = 'Must be a positive number';
      if (!formData.desiredTermMonths.trim()) stepErrors.desiredTermMonths = 'Please enter your desired lease term';
      if (!formData.desiredMoveIn.trim()) stepErrors.desiredMoveIn = 'Please select your desired move-in date';
      if (!formData.monthlyRentBudget.trim()) stepErrors.monthlyRentBudget = 'Please enter your monthly rent budget';
    }
    if (step === 4) {
      if (!formData.contactFirstName.trim()) stepErrors.contactFirstName = 'First name is required';
      if (!formData.contactLastName.trim()) stepErrors.contactLastName = 'Last name is required';
      if (!formData.contactEmail.trim()) stepErrors.contactEmail = 'Email address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) stepErrors.contactEmail = 'Please enter a valid email';
      if (!formData.contactPhone.trim()) stepErrors.contactPhone = 'Phone number is required';
      else if (formData.contactPhone.replace(/\D/g, '').length < 10) stepErrors.contactPhone = 'Enter a complete 10-digit number';
      if (formData.guarantorEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guarantorEmail.trim()))
        stepErrors.guarantorEmail = 'Please enter a valid guarantor email';
    }
    if (step === 5 && files.length === 0) stepErrors.documents = 'Please upload at least one document';
    if (step === 6) {
      if (!formData.termsAccepted) stepErrors.termsAccepted = 'You must accept the terms to submit';
      const s: string[] = [];
      if (!formData.businessName.trim()) s.push('Business name (Step 1)');
      if (!formData.businessType) s.push('Business type (Step 1)');
      if (selectedPropertyIds.length === 0) s.push('Properties (Step 2)');
      if (!formData.requestedSf.trim()) s.push('Square footage (Step 3)');
      if (!formData.desiredTermMonths.trim()) s.push('Lease term (Step 3)');
      if (!formData.desiredMoveIn.trim()) s.push('Move-in date (Step 3)');
      if (!formData.monthlyRentBudget.trim()) s.push('Rent budget (Step 3)');
      if (!formData.contactFirstName.trim()) s.push('First name (Step 4)');
      if (!formData.contactLastName.trim()) s.push('Last name (Step 4)');
      if (!formData.contactEmail.trim()) s.push('Email (Step 4)');
      if (!formData.contactPhone.trim()) s.push('Phone (Step 4)');
      if (files.length === 0) s.push('Documents (Step 5)');
      if (s.length > 0) { setSubmitErrorSummary(s); stepErrors['_summary'] = 'Fix issues above'; } else setSubmitErrorSummary([]);
    }
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) setShakeKey((k) => k + 1);
    return Object.keys(stepErrors).length === 0;
  }, [formData, files, selectedPropertyIds]);

  const goNext = useCallback(() => {
    setHasAttemptedStep((prev) => new Set(prev).add(currentStep));
    if (!validateStep(currentStep)) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    const nextStep = Math.min(currentStep + 1, 6);
    setCurrentStep(nextStep);
    saveDraftToServer(nextStep, formData, selectedPropertyIds);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, validateStep, saveDraftToServer, formData, selectedPropertyIds]);

  const goBack = useCallback(() => { setErrors({}); setCurrentStep((s: number) => Math.max(s - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const goToStep = useCallback((step: number) => {
    if (step < currentStep || completedSteps.has(step) || completedSteps.has(step - 1) || step === 1) {
      setErrors({}); setCurrentStep(step); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, completedSteps]);

  const handleSubmit = useCallback(async () => {
    setHasAttemptedStep((prev) => new Set(prev).add(6));
    if (!validateStep(6)) return;
    setIsSubmitting(true); setSubmissionError(null); setUploadProgress(null);
    try {
      const appRes = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyIds: selectedPropertyIds,
          businessName: formData.businessName, businessType: formData.businessType,
          stateOfIncorporation: formData.stateOfIncorporation, agreedUse: formData.agreedUse,
          yearsInBusiness: formData.yearsInBusiness, numberOfEmployees: formData.numberOfEmployees,
          requestedSf: formData.requestedSf, desiredTermMonths: formData.desiredTermMonths,
          desiredMoveIn: formData.desiredMoveIn, monthlyRentBudget: formData.monthlyRentBudget,
          contactFirstName: formData.contactFirstName, contactLastName: formData.contactLastName,
          contactEmail: formData.contactEmail, contactPhone: formData.contactPhone,
          guarantorName: formData.guarantorName, guarantorEmail: formData.guarantorEmail,
          guarantorPhone: formData.guarantorPhone,
        }),
      });
      if (!appRes.ok) { const { error } = await appRes.json().catch(() => ({ error: 'Submission failed' })); throw new Error(error ?? 'Failed to submit'); }
      const { applicationId } = await appRes.json();

      if (files.length > 0) {
        setUploadProgress({ current: 0, total: files.length });
        for (let i = 0; i < files.length; i++) {
          const { file, category } = files[i];
          const docFormData = new globalThis.FormData();
          docFormData.append('file', file); docFormData.append('documentType', category);
          await fetch(`/api/applications/${applicationId}/documents`, { method: 'POST', body: docFormData });
          setUploadProgress({ current: i + 1, total: files.length });
        }
      }

      setCompletedSteps((prev) => new Set(prev).add(6));
      setIsSubmitted(true);
      localStorage.removeItem(STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => router.push(`/applications/status?email=${encodeURIComponent(formData.contactEmail)}`), 3000);
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setShakeKey((k) => k + 1);
    } finally { setIsSubmitting(false); setUploadProgress(null); }
  }, [validateStep, formData, files, router, selectedPropertyIds]);

  const today = new Date().toISOString().split('T')[0];

  // ---------------------------------------------------------------------------
  // Success screen
  // ---------------------------------------------------------------------------

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted">
        <PublicHeader minimal />
        <main className="mx-auto max-w-lg px-4 py-16 sm:px-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Application Submitted</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Thank you, {formData.contactFirstName}. Your application for {formData.businessName} has been received.
            Our team will review your information and match you with available properties.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to your status page&hellip;</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/applications/status?email=${encodeURIComponent(formData.contactEmail)}`}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-light transition-colors">
              Track Your Application
            </Link>
            <Link href="/browse" className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors">
              Browse Properties
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  const renderStep1 = () => (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">General Application</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Fill out this application and select the properties you&rsquo;re interested in. Our team will be in touch.
            </p>
          </div>
        </div>
      </div>
      <div><Label htmlFor="businessName" required>Business Name</Label><Input id="businessName" value={formData.businessName} onChange={(v) => updateField('businessName', v)} onBlur={() => blurValidateField('businessName')} placeholder="e.g. Acme Distribution LLC" error={errors.businessName} /></div>
      <div><Label htmlFor="businessType" required>Business Type</Label><Select id="businessType" value={formData.businessType} onChange={(v) => updateField('businessType', v)} onBlur={() => blurValidateField('businessType')} placeholder="Select business type" options={BUSINESS_TYPES.map((t) => ({ value: t, label: t }))} error={errors.businessType} /></div>
      <div><Label htmlFor="stateOfIncorporation">State of Incorporation</Label><Select id="stateOfIncorporation" value={formData.stateOfIncorporation} onChange={(v) => updateField('stateOfIncorporation', v)} options={US_STATES.map((s) => ({ value: s.value, label: s.label }))} /></div>
      <div><Label htmlFor="agreedUse">Nature of Business / Intended Use</Label><Textarea id="agreedUse" value={formData.agreedUse} onChange={(v) => updateField('agreedUse', v)} placeholder="Describe your business operations and intended use of the space" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div><Label htmlFor="yearsInBusiness">Years in Business</Label><Input id="yearsInBusiness" type="number" value={formData.yearsInBusiness} onChange={(v) => updateField('yearsInBusiness', v)} placeholder="e.g. 5" min="0" inputMode="numeric" /></div>
        <div><Label htmlFor="numberOfEmployees">Number of Employees</Label><Input id="numberOfEmployees" type="number" value={formData.numberOfEmployees} onChange={(v) => updateField('numberOfEmployees', v)} placeholder="e.g. 12" min="0" inputMode="numeric" /></div>
      </div>
      <div><Label htmlFor="annualRevenue">Annual Revenue</Label><Input id="annualRevenue" type="number" value={formData.annualRevenue} onChange={(v) => updateField('annualRevenue', v)} placeholder="e.g. 500000" min="0" inputMode="decimal" prefix="$" /></div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select the properties you&rsquo;re interested in. You can choose multiple.
      </p>

      {errors.properties && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm text-red-600" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />{errors.properties}
          </p>
        </div>
      )}

      {/* Select all option */}
      {!propertiesLoading && properties.length > 0 && (
        <button
          type="button"
          onClick={() => {
            if (selectedPropertyIds.length === properties.length) {
              setSelectedPropertyIds([]);
            } else {
              setSelectedPropertyIds(properties.map((p) => p.id));
            }
            setErrors((prev) => { const next = { ...prev }; delete next.properties; return next; });
          }}
          className="w-full rounded-lg border border-dashed border-border bg-white px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-left"
        >
          {selectedPropertyIds.length === properties.length
            ? 'Deselect all properties'
            : 'Not sure yet — show me all options (select all)'}
        </button>
      )}

      {propertiesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <PropertyCardSkeleton key={i} />)}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No properties available</p>
          <p className="mt-1 text-xs text-muted-foreground">Please continue with your application and our team will match you with suitable spaces.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {properties.map((property) => {
            const isSelected = selectedPropertyIds.includes(property.id);
            return (
              <button
                key={property.id}
                type="button"
                onClick={() => togglePropertySelection(property.id)}
                className={cn(
                  'relative rounded-xl border bg-white p-4 text-left transition-all shadow-sm hover:shadow-md',
                  isSelected
                    ? 'border-blue-700 bg-blue-50/50 ring-1 ring-blue-700'
                    : 'border-border hover:border-primary/40',
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-700">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="pr-6">
                  <p className="text-sm font-semibold text-foreground leading-snug">{property.name}</p>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{property.city}, {property.state}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {property.property_type}
                    </span>
                    {property.total_sf > 0 && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {property.total_sf.toLocaleString()} SF
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedPropertyIds.length > 0 && (
        <p className="text-xs text-primary font-medium">
          {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'property' : 'properties'} selected
        </p>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div><Label htmlFor="preferredPropertyType">Preferred Property Type</Label><Select id="preferredPropertyType" value={formData.preferredPropertyType} onChange={(v) => updateField('preferredPropertyType', v)} placeholder="Select type" options={PROPERTY_TYPE_PREFS.map((t) => ({ value: t, label: t }))} /></div>
        <div><Label htmlFor="preferredArea">Preferred Area / City</Label><Input id="preferredArea" value={formData.preferredArea} onChange={(v) => updateField('preferredArea', v)} placeholder="e.g. San Diego East County" /></div>
      </div>
      <div><Label htmlFor="requestedSf" required>Requested Square Footage</Label><Input id="requestedSf" type="number" value={formData.requestedSf} onChange={(v) => updateField('requestedSf', v)} onBlur={() => blurValidateField('requestedSf')} placeholder="e.g. 5000" min="0" inputMode="numeric" error={errors.requestedSf} /></div>
      <div>
        <Label htmlFor="desiredTermMonths" required>Desired Lease Term (months)</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {TERM_PRESETS.map((m) => (
            <button key={m} type="button" onClick={() => updateField('desiredTermMonths', String(m))}
              className={cn('rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                formData.desiredTermMonths === String(m) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-white text-muted-foreground hover:border-primary/40')}>
              {m} mo
            </button>
          ))}
        </div>
        <Input id="desiredTermMonths" type="number" value={formData.desiredTermMonths} onChange={(v) => updateField('desiredTermMonths', v)} onBlur={() => blurValidateField('desiredTermMonths')} placeholder="Or enter custom term" min="1" inputMode="numeric" error={errors.desiredTermMonths} />
      </div>
      <div><Label htmlFor="desiredMoveIn" required>Desired Move-in Date</Label><Input id="desiredMoveIn" type="date" value={formData.desiredMoveIn} onChange={(v) => updateField('desiredMoveIn', v)} onBlur={() => blurValidateField('desiredMoveIn')} min={today} error={errors.desiredMoveIn} /></div>
      <div><Label htmlFor="monthlyRentBudget" required>Monthly Rent Budget</Label><Input id="monthlyRentBudget" type="number" value={formData.monthlyRentBudget} onChange={(v) => updateField('monthlyRentBudget', v)} onBlur={() => blurValidateField('monthlyRentBudget')} placeholder="e.g. 5000" min="0" step="100" inputMode="decimal" prefix="$" error={errors.monthlyRentBudget} /></div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Contact Information</h3>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><Label htmlFor="contactFirstName" required>First Name</Label><Input id="contactFirstName" value={formData.contactFirstName} onChange={(v) => updateField('contactFirstName', v)} onBlur={() => blurValidateField('contactFirstName')} placeholder="First name" error={errors.contactFirstName} /></div>
            <div><Label htmlFor="contactLastName" required>Last Name</Label><Input id="contactLastName" value={formData.contactLastName} onChange={(v) => updateField('contactLastName', v)} onBlur={() => blurValidateField('contactLastName')} placeholder="Last name" error={errors.contactLastName} /></div>
          </div>
          <div><Label htmlFor="contactEmail" required>Email Address</Label><Input id="contactEmail" type="email" value={formData.contactEmail} onChange={(v) => updateField('contactEmail', v)} onBlur={() => blurValidateField('contactEmail')} placeholder="you@company.com" error={errors.contactEmail} inputMode="email" /></div>
          <div><Label htmlFor="contactPhone" required>Phone Number</Label><Input id="contactPhone" type="tel" value={formatPhoneDisplay(formData.contactPhone)} onChange={(v) => handlePhoneChange('contactPhone', v)} onBlur={() => blurValidateField('contactPhone')} placeholder="(555) 123-4567" error={errors.contactPhone} inputMode="tel" /></div>
        </div>
      </div>
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Guarantor Information</h3>
        <p className="text-xs text-muted-foreground mb-4">Optional. Required if business is less than 2 years old.</p>
        <div className="space-y-5">
          <div><Label htmlFor="guarantorName">Full Name</Label><Input id="guarantorName" value={formData.guarantorName} onChange={(v) => updateField('guarantorName', v)} placeholder="Guarantor full name" /></div>
          <div><Label htmlFor="guarantorEmail">Email Address</Label><Input id="guarantorEmail" type="email" value={formData.guarantorEmail} onChange={(v) => updateField('guarantorEmail', v)} onBlur={() => blurValidateField('guarantorEmail')} placeholder="guarantor@example.com" error={errors.guarantorEmail} inputMode="email" /></div>
          <div><Label htmlFor="guarantorPhone">Phone Number</Label><Input id="guarantorPhone" type="tel" value={formatPhoneDisplay(formData.guarantorPhone)} onChange={(v) => handlePhoneChange('guarantorPhone', v)} placeholder="(555) 123-4567" inputMode="tel" /></div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/70 border border-border px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Shield className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <div><p className="text-sm font-medium text-foreground">Your documents are secure</p><p className="mt-0.5 text-xs text-muted-foreground">All files are encrypted in transit and at rest. Only authorized personnel will have access.</p></div>
        </div>
      </div>
      {errors.documents && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm text-red-600" role="alert"><AlertCircle className="h-4 w-4 shrink-0" />{errors.documents}</p>
        </div>
      )}
      {DOCUMENT_CATEGORIES.map((cat) => <FileUploadZone key={cat.key} category={cat} files={files} onAdd={addFiles} onRemove={removeFile} />)}
    </div>
  );

  const renderStep6 = () => {
    const selectedPropertyNames = properties
      .filter((p) => selectedPropertyIds.includes(p.id))
      .map((p) => p.name);

    const sections = [
      { step: 1, title: 'Business Information', items: [
        { label: 'Business Name', value: formData.businessName },
        { label: 'Business Type', value: formData.businessType },
        { label: 'State of Incorporation', value: getStateName(formData.stateOfIncorporation) },
        { label: 'Nature of Business', value: formData.agreedUse || '---' },
        { label: 'Years in Business', value: formData.yearsInBusiness || '---' },
        { label: 'Employees', value: formData.numberOfEmployees || '---' },
        { label: 'Annual Revenue', value: formData.annualRevenue ? formatCurrencyInput(formData.annualRevenue) : '---' },
      ]},
      { step: 2, title: 'Selected Properties', items:
        selectedPropertyIds.length > 0
          ? selectedPropertyNames.length > 0
            ? selectedPropertyNames.map((name) => ({ label: 'Property', value: name }))
            : selectedPropertyIds.map((id) => ({ label: 'Property ID', value: id }))
          : [{ label: 'Properties', value: 'None selected' }],
      },
      { step: 3, title: 'Space Requirements', items: [
        { label: 'Property Type', value: formData.preferredPropertyType || 'Any' },
        { label: 'Preferred Area', value: formData.preferredArea || '---' },
        { label: 'Requested SF', value: formData.requestedSf ? `${Number(formData.requestedSf).toLocaleString()} SF` : '---' },
        { label: 'Lease Term', value: formData.desiredTermMonths ? `${formData.desiredTermMonths} months` : '---' },
        { label: 'Move-in Date', value: formData.desiredMoveIn ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(formData.desiredMoveIn + 'T00:00:00')) : '---' },
        { label: 'Monthly Budget', value: formData.monthlyRentBudget ? formatCurrencyInput(formData.monthlyRentBudget) : '---' },
      ]},
      { step: 4, title: 'Contact Information', items: [
        { label: 'Name', value: `${formData.contactFirstName} ${formData.contactLastName}`.trim() || '---' },
        { label: 'Email', value: formData.contactEmail || '---' },
        { label: 'Phone', value: formData.contactPhone ? formatPhoneDisplay(formData.contactPhone) : '---' },
        ...(formData.guarantorName ? [
          { label: 'Guarantor', value: formData.guarantorName },
          { label: 'Guarantor Email', value: formData.guarantorEmail || '---' },
          { label: 'Guarantor Phone', value: formData.guarantorPhone ? formatPhoneDisplay(formData.guarantorPhone) : '---' },
        ] : []),
      ]},
      { step: 5, title: 'Documents', items: DOCUMENT_CATEGORIES.map((cat) => {
        const count = files.filter((f) => f.category === cat.key).length;
        return { label: cat.label, value: count > 0 ? `${count} file${count > 1 ? 's' : ''} uploaded` : 'No files' };
      })},
    ];

    // Auth-gated submission
    if (!authChecked) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-8">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {submitErrorSummary.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4" role="alert">
            <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 shrink-0 text-red-600" /><p className="text-sm font-semibold text-red-700">Please fix the following:</p></div>
            <ul className="ml-6 space-y-1">{submitErrorSummary.map((msg, i) => <li key={i} className="text-sm text-red-600 list-disc">{msg}</li>)}</ul>
          </div>
        )}
        {sections.map((section) => (
          <div key={section.step} className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <button type="button" onClick={() => goToStep(section.step)} className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-light transition-colors"><Pencil className="h-3 w-3" />Edit</button>
            </div>
            <dl className="divide-y divide-border">{section.items.map((item, i) => (
              <div key={i} className="flex justify-between px-4 py-2.5"><dt className="text-sm text-muted-foreground">{item.label}</dt><dd className="text-sm font-medium text-foreground text-right max-w-[60%] break-words">{item.value}</dd></div>
            ))}</dl>
          </div>
        ))}

        {!authUser ? (
          // Auth gate — user must log in or register to submit
          <div className="rounded-xl border border-border bg-white p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Create an account to submit</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              To submit your application, please create an account or log in. Your progress has been saved.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register?redirect=/apply&draft=restore"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-light transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </Link>
              <Link
                href="/login?redirect=/apply&draft=restore"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Log In
              </Link>
            </div>
          </div>
        ) : (
          // Authenticated — show terms + submit
          <div className="rounded-xl border border-border bg-white p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={formData.termsAccepted} onChange={(e) => updateField('termsAccepted', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary" />
              <span className="text-sm text-muted-foreground leading-relaxed">
                I confirm that the information provided is accurate and complete. I authorize Rocket Realty to verify the information submitted, including credit checks and reference verification.
              </span>
            </label>
            {errors.termsAccepted && <p className="mt-2 flex items-center gap-1 text-xs text-destructive" role="alert"><AlertCircle className="h-3 w-3 shrink-0" />{errors.termsAccepted}</p>}
          </div>
        )}
      </div>
    );
  };

  const stepMeta: Record<number, { title: string; description: string }> = {
    1: { title: 'Business Information', description: 'Tell us about your business' },
    2: { title: 'Select Properties', description: 'Choose the properties you\'re interested in' },
    3: { title: 'Space Requirements', description: 'What are you looking for?' },
    4: { title: 'Contact & Guarantor', description: 'How can we reach you?' },
    5: { title: 'Financial Documents', description: 'Upload supporting documents' },
    6: { title: 'Review & Submit', description: 'Review your application before submitting' },
  };

  const isLastStep = currentStep === 6;
  const canSubmit = authUser !== null;

  return (
    <div className="min-h-screen bg-muted">
      <PublicHeader minimal />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

        {(draftBanner || isRestoredDraft) && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-800">{draftBanner ?? 'Continuing from your saved draft.'}</p>
            <button type="button" onClick={() => { setDraftBanner(null); setIsRestoredDraft(false); }}
              className="ml-4 rounded p-0.5 text-blue-600 hover:text-blue-800 transition-colors"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div key={shakeKey} className={cn('mt-6 sm:mt-8 rounded-xl bg-white border border-border shadow-sm', shakeKey > 0 && 'animate-shake')}>
          <div className="border-b border-border px-5 py-5 sm:px-8 sm:py-6">
            <h1 className="text-xl font-bold text-foreground">{stepMeta[currentStep].title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{stepMeta[currentStep].description}</p>
          </div>
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
            {currentStep === 6 && renderStep6()}
          </div>

          {submissionError && currentStep === 6 && (
            <div className="mx-5 mb-0 mt-0 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 sm:mx-8">
              <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" /><p className="text-sm text-destructive">{submissionError}</p></div>
            </div>
          )}

          {uploadProgress && (
            <div className="mx-5 mb-0 mt-0 sm:mx-8">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Uploading&hellip; {uploadProgress.current}/{uploadProgress.total}</p>
                <p className="text-xs font-medium text-foreground">{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border px-5 py-4 sm:px-8">
            {currentStep > 1 ? (
              <button type="button" onClick={goBack} disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />Back
              </button>
            ) : <div />}
            {!isLastStep ? (
              <button type="button" onClick={goNext}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-light transition-colors">
                Continue<ChevronRight className="h-4 w-4" />
              </button>
            ) : canSubmit ? (
              <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-light transition-colors disabled:opacity-70">
                {isSubmitting ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{uploadProgress ? `Uploading ${uploadProgress.current}/${uploadProgress.total}…` : 'Submitting…'}</>
                ) : 'Submit Application'}
              </button>
            ) : (
              // No submit button when not authenticated — auth card is shown in the step
              <div />
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Your information is securely encrypted and will only be shared with authorized personnel.</p>
      </main>
    </div>
  );
}
