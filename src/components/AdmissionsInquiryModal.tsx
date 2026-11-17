import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  User,
  GraduationCap,
  AlertCircle,
} from 'lucide-react';

export interface AdmissionInquiryRecord {
  id: string;
  inquiryType: 'admissions' | 'visit';
  childName: string;
  grade: string;
  pathway:
    | 'NEP 2020 Open Learning'
    | 'CBSE Assessment Readiness'
    | 'Cambridge Assessment'
    | 'NIOS Flexible Pathway';
  parentName: string;
  phone: string;
  email: string;
  visitDate: string;
  notes: string;
  submittedAt: string;
}

interface AdmissionsInquiryModalProps {
  isOpen: boolean;
  initialMode?: 'admissions' | 'visit';
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

const GRADES = [
  'Inizio (Ages 3.8–5.8 · Early Years)',
  'Novitiate (Ages 5.9–7 · Grades 1–2)',
  'Novitiate (Ages 8–10 · Grades 3–5)',
  'Mezzo (Ages 11–12 · Grades 6–7)',
  'Mezzo (Ages 13–14 · Grade 8)',
  'Adroit (Ages 15–16 · Grades 9–10)',
  'Adroit (Ages 17–19 · Grades 11–12 & Pathways)',
];

const STORAGE_KEY = 'tattvasayam_admission_inquiries';

export const AdmissionsInquiryModal: React.FC<AdmissionsInquiryModalProps> = ({
  isOpen,
  initialMode = 'admissions',
  onClose,
  onSuccessToast,
}) => {
  const [inquiryType, setInquiryType] = useState<'admissions' | 'visit'>(initialMode);
  const [childName, setChildName] = useState('');
  const [grade, setGrade] = useState('Novitiate (Ages 8–10 · Grades 3–5)');
  const [pathway, setPathway] = useState<AdmissionInquiryRecord['pathway']>('NEP 2020 Open Learning');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [visitDate, setVisitDate] = useState('2026-11-21');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState<AdmissionInquiryRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInquiryType(initialMode);
      setErrors({});
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!childName.trim() || childName.trim().length < 2) {
      nextErrors.childName = "Please enter your child's full name.";
    }
    if (!parentName.trim() || parentName.trim().length < 2) {
      nextErrors.parentName = "Please enter a parent or guardian's full name.";
    }
    const digits = phone.replace(/[\s\-+]/g, '');
    if (!/^\d{10,13}$/.test(digits)) {
      nextErrors.phone = 'Please enter a valid 10-digit mobile number.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!visitDate) {
      nextErrors.visitDate = 'Please select a preferred campus visit date.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const refId = `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const record: AdmissionInquiryRecord = {
        id: refId,
        inquiryType,
        childName: childName.trim(),
        grade,
        pathway,
        parentName: parentName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        visitDate,
        notes: notes.trim(),
        submittedAt: new Date().toISOString(),
      };

      try {
        const existingRaw = localStorage.getItem(STORAGE_KEY);
        const existing: AdmissionInquiryRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing.slice(0, 29)]));
      } catch {}

      setIsSubmitting(false);
      setConfirmedRecord(record);
      if (onSuccessToast) {
        onSuccessToast(
          inquiryType === 'visit'
            ? `Campus visit scheduled for ${visitDate} (Ref: ${refId}).`
            : `2026–27 admission inquiry received for ${record.childName} (Ref: ${refId}).`
        );
      }
    }, 350);
  };

  const handleResetAndClose = () => {
    setConfirmedRecord(null);
    setChildName('');
    setParentName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setErrors({});
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admissions-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#182230]/70 backdrop-blur-xs overflow-y-auto no-print"
    >
      <div className="relative w-full max-w-2xl bg-[#FAF9F6] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 animate-view-enter">
        {/* Warm Editorial Header */}
        <div className="px-6 py-5 bg-[#182230] text-[#FAF9F6] flex items-start justify-between gap-4 border-b border-slate-800">
          <div className="space-y-1">
            <span className="text-xs font-medium text-amber-300 block">
              Admissions Office · #2060, Sampigehalli, Jakkur, Bengaluru
            </span>
            <h2
              id="admissions-modal-title"
              className="text-xl sm:text-2xl font-bold font-editorial text-white"
            >
              {confirmedRecord
                ? 'Inquiry & Campus Visit Confirmed'
                : inquiryType === 'visit'
                ? 'Book a Personal Campus Visit'
                : 'Admissions Inquiry · 2026–27 Academic Year'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close admissions dialog"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmedRecord ? (
          /* Instant Confirmation Receipt State */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#182230] dark:text-slate-100 font-sans-clean">
                  Thank you, {confirmedRecord.parentName}. We look forward to welcoming your family.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Chief Administrator <strong>Ms. Sangeetha</strong> and Centre Head <strong>Ms. Amrita&apos;s</strong> mentoring team will reach out at{' '}
                  <strong className="text-[#182230] dark:text-white">{confirmedRecord.phone}</strong>{' '}
                  (or you may call <strong className="text-[#182230] dark:text-white">+91-76250-03355</strong>) within one working day to confirm your personal campus conversation.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-white dark:bg-slate-800/60 border border-[#E6E1D6] dark:border-slate-700 text-xs">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Reference Number</dt>
                <dd className="font-mono font-bold text-sm text-amber-800 dark:text-amber-400 mt-0.5 tabular-nums">
                  {confirmedRecord.id}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Preferred Visit Date</dt>
                <dd className="font-semibold text-sm text-[#182230] dark:text-slate-100 mt-0.5 tabular-nums">
                  {confirmedRecord.visitDate} · 10:00 AM IST
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Child&apos;s Name &amp; Stage</dt>
                <dd className="font-semibold text-sm text-[#182230] dark:text-slate-100 mt-0.5">
                  {confirmedRecord.childName} ({confirmedRecord.grade})
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Learning Pathway</dt>
                <dd className="font-semibold text-sm text-[#182230] dark:text-slate-100 mt-0.5">
                  {confirmedRecord.pathway}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6E1D6] dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <MapPin className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>#2060, Sampigehalli, Jakkur, Bengaluru 560064 · +91-76250-03355</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmedRecord(null)}
                  className="px-4 py-2 rounded-xl border border-[#D8D0C0] dark:border-slate-700 text-xs font-semibold text-[#182230] dark:text-slate-200 hover:bg-[#F4EFE6] dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Register Another Child
                </button>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-5 py-2 rounded-xl bg-[#182230] hover:bg-[#243247] dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Registration & Visit Form */
          <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-7 space-y-5">
            {/* Switch between Admission Application and Campus Visit */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F4EFE6] dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700">
              <button
                type="button"
                onClick={() => setInquiryType('admissions')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  inquiryType === 'admissions'
                    ? 'bg-white dark:bg-slate-900 text-[#182230] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#182230]'
                }`}
              >
                2026–27 Admission Inquiry
              </button>
              <button
                type="button"
                onClick={() => setInquiryType('visit')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  inquiryType === 'visit'
                    ? 'bg-white dark:bg-slate-900 text-[#182230] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#182230]'
                }`}
              >
                Schedule a Campus Tour
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Child's Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="adm-child-name"
                  className="block text-xs font-semibold text-[#182230] dark:text-slate-200"
                >
                  Child&apos;s Full Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="adm-child-name"
                    type="text"
                    value={childName}
                    onChange={(e) => {
                      setChildName(e.target.value);
                      if (errors.childName) setErrors((p) => ({ ...p, childName: '' }));
                    }}
                    placeholder="e.g. Aarav Deshmukh"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D8D0C0] dark:border-slate-700 text-sm text-[#182230] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                  />
                </div>
                {errors.childName && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.childName}</span>
                  </p>
                )}
              </div>

              {/* Grade Applying For */}
              <div className="space-y-1.5">
                <label
                  htmlFor="adm-grade"
                  className="block text-xs font-semibold text-[#182230] dark:text-slate-200"
                >
                  Age Stage / Grade Applying For <span className="text-rose-600">*</span>
                </label>
                <select
                  id="adm-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D8D0C0] dark:border-slate-700 text-sm text-[#182230] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parent Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="adm-parent-name"
                  className="block text-xs font-semibold text-[#182230] dark:text-slate-200"
                >
                  Parent / Guardian Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="adm-parent-name"
                    type="text"
                    value={parentName}
                    onChange={(e) => {
                      setParentName(e.target.value);
                      if (errors.parentName) setErrors((p) => ({ ...p, parentName: '' }));
                    }}
                    placeholder="e.g. Mrs. Ananya Deshmukh"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D8D0C0] dark:border-slate-700 text-sm text-[#182230] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                  />
                </div>
                {errors.parentName && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.parentName}</span>
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label
                  htmlFor="adm-phone"
                  className="block text-xs font-semibold text-[#182230] dark:text-slate-200"
                >
                  Mobile Number <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="adm-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors((p) => ({ ...p, phone: '' }));
                    }}
                    placeholder="+91 98450 12345"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D8D0C0] dark:border-slate-700 text-sm text-[#182230] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.phone}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="adm-email"
                  className="block text-xs font-semibold text-[#182230] dark:text-slate-200"
                >
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="adm-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: '' }));
                    }}
                    placeholder="parent@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D8D0C0] dark:border-slate-700 text-sm text-[#182230] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Preferred Visit Date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="adm-visit-date"
                  className="block text-xs font-semibold text-[#182230] dark:text-slate-200"
                >
                  Preferred Campus Visit Date <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="adm-visit-date"
                    type="date"
                    value={visitDate}
                    onChange={(e) => {
                      setVisitDate(e.target.value);
                      if (errors.visitDate) setErrors((p) => ({ ...p, visitDate: '' }));
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D8D0C0] dark:border-slate-700 text-sm text-[#182230] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                  />
                </div>
                {errors.visitDate && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.visitDate}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Preferred Pathway & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div className="space-y-1.5">
                <label
                  htmlFor="adm-pathway"
                  className="block text-xs font-semibold text-[#182230] dark:text-slate-200"
                >
                  Curriculum Interest
                </label>
                <select
                  id="adm-pathway"
                  value={pathway}
                  onChange={(e) => setPathway(e.target.value as AdmissionInquiryRecord['pathway'])}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D8D0C0] dark:border-slate-700 text-sm text-[#182230] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                >
                  <option value="NEP 2020 Open Learning">NEP 2020 Open Learning</option>
                  <option value="CBSE Assessment Readiness">CBSE Assessment Readiness</option>
                  <option value="Cambridge Assessment">Cambridge Assessment</option>
                  <option value="NIOS Flexible Pathway">NIOS Flexible Pathway</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label
                  htmlFor="adm-notes"
                  className="block text-xs font-semibold text-[#182230] dark:text-slate-200"
                >
                  Questions or Transport Locality (Optional)
                </label>
                <input
                  id="adm-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Looking for bus pickup near Sahakar Nagar or Yelahanka"
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#D8D0C0] dark:border-slate-700 text-sm text-[#182230] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6E1D6] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                No application fee required to schedule a tour or receive our 2026–27 prospectus.
              </p>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl border border-[#D8D0C0] dark:border-slate-700 text-xs font-semibold text-[#182230] dark:text-slate-300 hover:bg-[#F4EFE6] dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : inquiryType === 'visit'
                    ? 'Confirm Campus Visit'
                    : 'Submit 2026–27 Inquiry'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
