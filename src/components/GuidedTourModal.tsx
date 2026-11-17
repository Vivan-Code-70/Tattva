import React, { useState } from 'react';
import {
  Shield,
  GraduationCap,
  Users,
  Compass,
  CheckCircle2,
  ArrowRight,
  X,
  KeyRound,
  BookOpen,
  Bus,
  Award,
} from 'lucide-react';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (roleKey: string) => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
}) => {
  const [selectedTourStep, setSelectedTourStep] = useState<number>(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      id: 'welcome',
      title: 'Tattvaswayam Platform Overview',
      subtitle: 'Academic Portal Walkthrough for Mentors, Parents & Leadership',
      badge: 'Overview',
      description:
        'Tattvaswayam Open Learning Resource Centre & Future Academy (#2060, Sampigehalli, Jakkur, Bengaluru) integrates NEP 2020 inquiry-based learning across Inizio, Novitiate, Mezzo & Adroit stages with CBSE, Cambridge & NIOS pathway readiness.',
      highlights: [
        '9 role-specific workspaces (Student, Mentor, Parent, Centre Head, Founder/Admin, Chief Admin, Gate Staff, Librarian, Bus Driver)',
        '30-second RFC 6238 OTP authentication with 6-digit Master PIN fallback',
        'Interactive 3D Jakkur campus map featuring TURN Reading Nook & Swayam Vichar Manch',
        'Printable A4 transcripts across 13 disciplines with mentor feedback',
      ],
      recommendedRole: 'principal',
      roleLabel: 'Ms. Amrita (Centre Head)',
    },
    {
      id: 'principal',
      title: '1. Centre Head Leadership Workspace',
      subtitle: 'Centre Head & Chief Mentor Ms. Amrita',
      badge: 'Centre Head',
      description:
        'Leadership oversight covering learner attendance trends, mentor roster (Sushmitha, Sandhya Padmanabhan, Shravani, Divya Dogra), Route 14 live bus tracking, and circular dispatch.',
      highlights: [
        'Campus academic summary across Inizio, Novitiate, Mezzo & Adroit stages',
        'Academy Notice Board with parent and student acknowledgment tracking',
        'Live Route 14 fleet status with stop progression and ETA monitoring',
        'Direct circular publishing to mentors, learners, and families',
      ],
      recommendedRole: 'principal',
      roleLabel: 'Open Centre Head Workspace',
    },
    {
      id: 'student',
      title: '2. Student Workspace',
      subtitle: 'Vivan Sharma (Grade 10-A)',
      badge: 'Student',
      description:
        'Organized student hub featuring a 12-hour timetable, 13-subject coursework completion charts, daily academic goals, bus transport opt-in, and Gate 2 digital pass.',
      highlights: [
        'Dedicated views: Overview, Coursework, Timetable, Services & Leave, Faculty Chat',
        'Digital QR & NFC ID pass with Gate 2 verification check-in',
        'Direct link to the AI Inquiry & Study Lab for 13 disciplines',
        'One-click PDF academic summary export',
      ],
      recommendedRole: 'vivan',
      roleLabel: 'Open Student Workspace',
    },
    {
      id: 'parent',
      title: '3. Parent & Guardian Portal',
      subtitle: 'Dr. Ramesh Sharma (Guardian of Vivan)',
      badge: 'Parent',
      description:
        'Complete visibility into student academic progress, term fee settlement, downloadable receipts, bus transport opt-in, and live Route 14 bus tracking.',
      highlights: [
        'Scholastic mastery overview across all opted disciplines',
        'Interactive term and transport fee checkout with downloadable receipts',
        'Live School Bus Route 14 map from Yelahanka to Jakkur Gate 2',
        'Direct communication with mathematics mentor Ms. Sushmitha',
      ],
      recommendedRole: 'pvivan',
      roleLabel: 'Open Parent Workspace',
    },
    {
      id: 'facilitator',
      title: '4. Facilitator & Mentor Workspace',
      subtitle: 'Ms. Sushmitha (Facilitator, Mathematical Studies)',
      badge: 'Faculty',
      description:
        'Focused teaching cockpit with daily scheduled classes, quick roll-call attendance marking, assignment publishing, and structured 45-minute inquiry lesson planning.',
      highlights: [
        'Quick attendance marking synced to Gate 2 and school registry',
        'Publish assignments across 13 disciplines with immediate updates',
        'Structured 45-minute lesson planner and PDF report export',
        'Review student practice quiz scores and inquiries',
      ],
      recommendedRole: 'susmita',
      roleLabel: 'Open Faculty Workspace',
    },
    {
      id: 'admin',
      title: '5. Founder & Admin Workspace',
      subtitle: 'Ms. Sandhya Gatti (Founder & Managing Director)',
      badge: 'Admin',
      description:
        'Streamlined administrative triage: pending leave and counseling approvals, transport payment compliance charts, credential resets, and Gate 2 audit logs.',
      highlights: [
        'Priority approval queue for student and staff leave and counseling',
        'Super Admin OTP Directory with active 30s TOTP codes',
        'Instant password/MPIN reset and account unlock controls',
        'Transport revenue compliance and Gate 2 security audit history',
      ],
      recommendedRole: 'sandhya',
      roleLabel: 'Open Admin Workspace',
    },
    {
      id: 'operations',
      title: '6. Chief Administrator & Gate Security',
      subtitle: 'Ms. Sangeetha (Chief Administrator) & Mr. Sai Kumar (Gate Staff)',
      badge: 'Operations',
      description:
        'Operational desks for 12-hour timetable scheduling, bus opt-in approvals, admissions & parent support triage, and Gate 2 QR/NFC turnstile verification.',
      highlights: [
        'Gate Staff: Live QR camera scanner and contactless NFC tap approval',
        'Gate Staff: Real-time campus visitor entry log',
        'Chief Admin: 12-hour departmental timetable conflict editor',
        'Chief Admin: Transport opt-in approvals & parent ticket triage',
      ],
      recommendedRole: 'bharthi',
      roleLabel: 'Open Operations Workspace',
    },
    {
      id: 'librarian-driver',
      title: '7. Library & Fleet Operations',
      subtitle: 'Ms. Meenakshi S. (Librarian) & Mr. Manjunath G. (Bus Driver)',
      badge: 'Library & Fleet',
      description:
        'Specialized workspaces for Open Learning Resource Centre circulation and Route 14 bus navigation with live ML-predicted ETAs and commuter manifests.',
      highlights: [
        'Librarian: Catalog inventory, checkouts, renewals, and hold queue fulfillment',
        'Bus Driver: Turn-by-turn road-snapped Route 14 map & traffic bypass toggle',
        'Bus Driver: Live picked-up / to-drop tallies and daily rider manifest',
        'Seamless one-click role switching via the bottom-right Role Switcher',
      ],
      recommendedRole: 'driver',
      roleLabel: 'Open Bus Driver Workspace',
    },
    {
      id: 'reports',
      title: '8. Official 13-Subject Transcripts',
      subtitle: 'Printable A4 Report Card & Google Workspace Export',
      badge: 'Reports',
      description:
        'Comprehensive 13-subject academic record featuring cumulative GPA calculations, attendance analytics, educator remarks, and browser print-ready A4 formatting.',
      highlights: [
        '13 Subjects: Applied Physics, Mathematics, Sanskrit, Robotics, World History & more',
        'Educator remarks tailored to individual subject strengths',
        'Printable official report card with institutional crest and Centre Head verification',
        'Export to CSV, Google Sheets, or Gmail summary dispatch',
      ],
      recommendedRole: 'principal',
      roleLabel: 'Open Reports & Transcripts',
    },
  ];

  const currentStep = tourSteps[selectedTourStep];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-demo-tour-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto no-print"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 animate-view-enter">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-amber-300 block">
                Quick Demo Tour
              </span>
              <h3 id="quick-demo-tour-title" className="text-lg sm:text-xl font-extrabold leading-tight font-display">
                Tattvaswayam Future Academy Portal
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Quick Demo Tour"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Selector Ribbon */}
        <div className="flex overflow-x-auto p-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 gap-1 text-xs">
          {tourSteps.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedTourStep(idx)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedTourStep === idx
                  ? 'bg-slate-900 dark:bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {s.badge}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="p-6 sm:p-7 space-y-5 flex-1 overflow-y-auto">
          <div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {currentStep.subtitle}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-display">
              {currentStep.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Highlights checklist */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Key Capabilities
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {currentStep.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Role Switcher Buttons (All 9 Roles, 1 Account Per Role) */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Launch Any Role Workspace Directly
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { key: 'vivan', label: 'Student (Vivan)', icon: GraduationCap },
                { key: 'pvivan', label: 'Parent (Dr. Ramesh)', icon: Users },
                { key: 'susmita', label: 'Faculty (Ms. Sushmitha)', icon: Users },
                { key: 'bharthi', label: 'Chief Admin (Ms. Sangeetha)', icon: Compass },
                { key: 'principal', label: 'Centre Head (Ms. Amrita)', icon: Award },
                { key: 'sandhya', label: 'Founder/Admin (Ms. Sandhya)', icon: Shield },
                { key: 'sai', label: 'Gate Staff (Mr. Sai)', icon: KeyRound },
                { key: 'librarian', label: 'Librarian (Ms. Meenakshi)', icon: BookOpen },
                { key: 'driver', label: 'Bus Driver (Mr. Manjunath)', icon: Bus },
              ].map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => {
                      onSelectRole(role.key);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-slate-800 transition flex items-center gap-2 text-left cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-semibold text-[11px] text-slate-900 dark:text-slate-100 truncate">
                      {role.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedTourStep === 0}
              onClick={() => setSelectedTourStep((prev) => Math.max(0, prev - 1))}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={selectedTourStep === tourSteps.length - 1}
              onClick={() => setSelectedTourStep((prev) => Math.min(tourSteps.length - 1, prev + 1))}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
            >
              Next Step
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectRole(currentStep.recommendedRole);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>{currentStep.roleLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
