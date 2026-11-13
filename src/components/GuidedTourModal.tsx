import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  GraduationCap,
  Users,
  Compass,
  CheckCircle2,
  ArrowRight,
  X,
  KeyRound,
  Bus,
  CreditCard,
  Printer,
  Boxes,
  Activity,
  Award,
} from 'lucide-react';
import { UserRole } from '../types';

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
      title: 'Academy Presentation Guide',
      subtitle: 'Complete Walkthrough for School Assembly & Leadership Presentation',
      badge: 'Demo Playbook',
      description:
        'Tattvasayam Future Academy (Jakkur, Bengaluru) combines integral Indian pedagogical philosophy with cutting-edge academic intelligence. Built with React 19, Tailwind CSS v4, and modern Gemini AI.',
      highlights: [
        '7 Role-specific tailored workspaces (Student, Facilitator, Staff, Parent, Admin, Coordinator, Principal)',
        '30-Second cryptographic OTP authentication with MPIN phone-free fallback',
        'Interactive 3D architectural campus twin & live hologram centrepiece',
        'Printable official CBSE/Cambridge diploma transcript & 13-subject mastery engine',
      ],
      recommendedRole: 'principal',
      roleLabel: 'Dr. B. R. Shenoy (Principal)',
    },
    {
      id: 'principal',
      title: '1. Executive Leadership Workspace',
      subtitle: 'Principal Dr. B. R. Shenoy',
      badge: 'Principal Role',
      description:
        'Head-of-school executive oversight: campus telemetry, departmental attendance matrix, live Bus Route 14 fleet monitor, and circular acknowledgment tracker.',
      highlights: [
        'Campus Executive Pulse: 1,240 scholars, 98.4% attendance, 72 faculty',
        'Academy Notice Board with live parent/student acknowledgement %',
        'Live Fleet Route 14 tracker with speed, current stop, and ETA',
        'One-click official circular broadcast to all faculty and families',
      ],
      recommendedRole: 'principal',
      roleLabel: 'Launch Principal Workspace',
    },
    {
      id: 'student',
      title: '2. Student Learner Experience',
      subtitle: 'Vivan Sharma (Grade 10-A) & Krishvika Patel (Grade 8-B)',
      badge: 'Student Role',
      description:
        'Opens directly on an uncluttered Overview with 12-hour timetable, pending coursework submissions, attendance record, and fee due alerts.',
      highlights: [
        'Dedicated tabs: Overview, Coursework, Timetable, Services & Leave, Faculty Chat',
        'Digital NFC ID Card badge with real-time Gate 2 tap simulation',
        'Direct link to AI Study & Practice Quiz Lab',
        'Coursework submission with instant status reflection',
      ],
      recommendedRole: 'vivan',
      roleLabel: 'Launch Student Workspace (Vivan)',
    },
    {
      id: 'parent',
      title: '3. Parent & Guardian Portal',
      subtitle: 'Dr. Ramesh Sharma (Parent of Vivan)',
      badge: 'Parent Role',
      description:
        'Immediate overview of child’s academic progress, fee balances, and institutional messages, with integrated fee checkout and bus tracking.',
      highlights: [
        'Scholastic progress summary across 13 disciplines',
        'Interactive Term Fee Checkout with official downloadable receipts',
        'Live School Bus Route 14 tracker from Jakkur to Sahakara Nagar',
        'Direct messaging channel with class mentor Ms. Susmita Roy',
      ],
      recommendedRole: 'pvivan',
      roleLabel: 'Launch Parent Workspace (Dr. Ramesh)',
    },
    {
      id: 'facilitator',
      title: '4. Facilitator / Teacher Workspace',
      subtitle: 'Ms. Susmita Roy (Senior Faculty, Physics & Math)',
      badge: 'Facilitator Role',
      description:
        'Starts on Overview with today’s scheduled classes, quick attendance roll call, and students needing diagnostic intervention.',
      highlights: [
        'Quick roll call for Grade 10-A synchronized to Gate 2 registry',
        'Broadcast new coursework & assignments with automatic push alerts',
        'AI Lesson Planner drafts 45-minute structured instructional plans',
        'Live stream of student questions and automated quiz scores',
      ],
      recommendedRole: 'susmita',
      roleLabel: 'Launch Facilitator Workspace',
    },
    {
      id: 'admin',
      title: '5. Administration & Super Admin',
      subtitle: 'Ms. Sandhya V. & Ms. Amrita S.',
      badge: 'Admin Role',
      description:
        'Opens strictly on Pending Approvals First: student/staff leave requests and counseling triage before all else.',
      highlights: [
        'Priority approval queue: instant Approve / Decline leave and counseling',
        'Super Admin TOTP Security Directory with live 30s OTP dispatch',
        'User credentials management: instant password / MPIN reset and unlock',
        'Gate 2 entry logs and security audit telemetry',
      ],
      recommendedRole: 'sandhya',
      roleLabel: 'Launch Super Admin Workspace',
    },
    {
      id: 'security-support',
      title: '6. Campus Staff & Coordinator',
      subtitle: 'Mr. Sai (Gate Security) & Ms. Bharthi (Academic Coordinator)',
      badge: 'Operations Roles',
      description:
        'Specialized operational task lists: Gate 2 QR badge scanning and 12-hour timetable master conflict scheduler.',
      highlights: [
        'Staff: Live QR camera badge scanner with audible audio chimes',
        'Staff: Real-time gate visitor log with biometric verification',
        'Coordinator: Drag-and-drop 12-hour departmental timetable editor',
        'Coordinator: Urgent student & parent support ticket triage',
      ],
      recommendedRole: 'sai',
      roleLabel: 'Launch Gate Security (Mr. Sai)',
    },
    {
      id: 'librarian',
      title: '7. Library Management System',
      subtitle: 'Ms. Meenakshi Sundaram (Chief Academic Librarian)',
      badge: 'Librarian Only',
      description:
        'Restricted resource desk for catalog inventory control, RFID student/faculty checkout, hold queue fulfillment, and overdue fine analytics.',
      highlights: [
        'Open Learning Resource Centre: Full catalog of academic volumes',
        'Circulation Desk: Instant checkout, renewals, and returned copy stock sync',
        'Scholar Holds: Queue management and pickup notifications',
        'Subject analytics and punctuality tracking across all borrowing scholars',
      ],
      recommendedRole: 'librarian',
      roleLabel: 'Launch Librarian Workspace (Ms. Meenakshi)',
    },
    {
      id: 'reports',
      title: '8. Official 13-Subject Transcript',
      subtitle: 'Official Report Card with Browser Print & School Seal',
      badge: 'Academic Records',
      description:
        'Comprehensive 13-subject scholastic evaluation with Gemini AI educator remarks, cumulative neural GPA, and printable A4 report card.',
      highlights: [
        '13 Subjects: Quantum Physics, Applied Math, Sanskrit, Robotics, World History...',
        'AI Educator Remark generated dynamically based on student strengths',
        'Printable official report card modal with school letterhead and principal seal',
        'Formatted for clean standard A4 paper printing via window.print()',
      ],
      recommendedRole: 'principal',
      roleLabel: 'View Official Report Card',
    },
  ];

  const currentStep = tourSteps[selectedTourStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-orange-200 block">
                Presentation Demo Assistant
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold leading-tight">
                Tattvasayam Future Academy Tour
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Selector Ribbon */}
        <div className="flex overflow-x-auto p-2 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 gap-1 text-xs">
          {tourSteps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setSelectedTourStep(idx)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedTourStep === idx
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
              }`}
            >
              {idx === 0 ? 'Overview' : s.badge}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto">
          <div>
            <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 mb-2">
              {currentStep.badge}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
              {currentStep.title}
            </h2>
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-0.5">
              {currentStep.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-2 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Highlights checklist */}
          <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/50 dark:bg-stone-800/40 border border-orange-200/80 dark:border-stone-700/80 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
              Key Capabilities for Presentation:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {currentStep.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-stone-800 dark:text-stone-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Role Switcher Buttons */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
              One-Click Switch to Any Role for Live Demo:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { key: 'vivan', label: 'Student (Vivan)', icon: GraduationCap },
                { key: 'susmita', label: 'Facilitator (Susmita)', icon: Users },
                { key: 'pvivan', label: 'Parent (Dr. Ramesh)', icon: Users },
                { key: 'principal', label: 'Principal (Dr. Shenoy)', icon: Award },
                { key: 'sandhya', label: 'Admin (Ms. Sandhya)', icon: Shield },
                { key: 'bharthi', label: 'Coordinator (Bharthi)', icon: Compass },
                { key: 'sai', label: 'Staff (Mr. Sai)', icon: KeyRound },
              ].map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.key}
                    onClick={() => {
                      onSelectRole(role.key);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-stone-700 transition flex items-center gap-2 text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="font-bold text-[11px] text-stone-900 dark:text-stone-100 truncate">
                      {role.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              disabled={selectedTourStep === 0}
              onClick={() => setSelectedTourStep((prev) => Math.max(0, prev - 1))}
              className="px-3.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={selectedTourStep === tourSteps.length - 1}
              onClick={() => setSelectedTourStep((prev) => Math.min(tourSteps.length - 1, prev + 1))}
              className="px-3.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-40"
            >
              Next Step
            </button>
          </div>

          <button
            onClick={() => {
              onSelectRole(currentStep.recommendedRole);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <span>{currentStep.roleLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
