/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  ShieldCheck,
  UserCheck,
  Search,
  Clock,
  Camera,
  CameraOff,
  RefreshCw,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
  FlipHorizontal,
  ChevronRight,
  User,
  Shield,
  FileCheck,
  Lock,
  Unlock,
  ShieldAlert,
  Bus,
} from 'lucide-react';
import {
  UserProfile,
  UserRole,
  GateLogEntry,
  PendingNfcTap,
  EmergencyLockdownState,
  BusRouteInfo,
  TransportOptInRequest,
  FeeTransaction,
} from '../../types';
import { soundEffects } from '../../utils/audioChime';
import { USER_PROFILES } from '../../services/storageService';
import { TransportOptInPanel } from './TransportOptInPanel';

interface SecurityDashboardProps {
  user: UserProfile;
  gateLogs: GateLogEntry[];
  onMarkAttendance: (name: string, category: string, grade?: string) => void;
  pendingNfcTaps?: PendingNfcTap[];
  onApproveNfcTap?: (tapId: string) => void;
  onDenyNfcTap?: (tapId: string, reason?: string) => void;
  onSimulateStudentTap?: () => void;
  lockdown?: EmergencyLockdownState;
  onToggleLockdown?: (active: boolean, reason?: string) => void;
  busRoute?: BusRouteInfo;
  transportRequests?: TransportOptInRequest[];
  onRequestTransport?: (payload: {
    userKey: string;
    userName: string;
    userRole: UserRole;
    stopId: number;
    stopName: string;
    tripType: 'both' | 'morning' | 'evening';
    remarks?: string;
  }) => void;
  onPayTransportFee?: (requestId: string, method: FeeTransaction['paymentMethod']) => void;
}

interface VerifiedStudentData {
  name: string;
  category: string;
  grade?: string;
  badgeId: string;
  time: string;
  timestamp: number;
  token?: string;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  user,
  gateLogs,
  onMarkAttendance,
  pendingNfcTaps = [],
  onApproveNfcTap,
  onDenyNfcTap,
  onSimulateStudentTap,
  lockdown,
  onToggleLockdown,
  busRoute,
  transportRequests = [],
  onRequestTransport,
  onPayTransportFee,
}) => {
  // Navigation tabs to keep layout clean and uncramped
  const [activeSection, setActiveSection] = useState<'scanner' | 'stream' | 'manual' | 'transport'>('scanner');

  // Emergency Lockdown State
  const [showLockdownModal, setShowLockdownModal] = useState(false);
  const [lockdownReason, setLockdownReason] = useState('Gate 2 Perimeter Security Alert');
  const [customReason, setCustomReason] = useState('');

  const handleConfirmLockdown = () => {
    const finalReason = customReason.trim() || lockdownReason;
    if (onToggleLockdown) {
      onToggleLockdown(true, finalReason);
    }
    setShowLockdownModal(false);
    setCustomReason('');
  };

  const handleLiftLockdown = () => {
    if (window.confirm('Officer Sai: Confirm to lift campus emergency lockdown and release gate turnstiles?')) {
      if (onToggleLockdown) {
        onToggleLockdown(false);
      }
    }
  };

  // Camera & QR Scanner State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState<boolean>(false);
  const [audioFeedback, setAudioFeedback] = useState<boolean>(true);
  const [lastVerifiedStudent, setLastVerifiedStudent] = useState<VerifiedStudentData | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  // Manual Kiosk Form State
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeCategory, setAttendeeCategory] = useState('Student');
  const [attendeeGrade, setAttendeeGrade] = useState('Grade 10-A');

  // Search & Filter State for Stream
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Animation frame reference
  const animationFrameRef = useRef<number | null>(null);

  // Stop camera media tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Process decoded QR text payload
  const handleDecodedQr = useCallback(
    (rawData: string) => {
      if (scanCooldown) return;

      try {
        let name = '';
        let category = 'Student';
        let grade: string | undefined = undefined;
        let badgeId = '';

        // Check if rawData is structured JSON
        if (rawData.startsWith('{') && rawData.endsWith('}')) {
          const parsed = JSON.parse(rawData);
          name = parsed.name || parsed.id || 'Verified Student';
          category = parsed.role === 'teacher' ? 'Faculty' : parsed.role ? parsed.role.charAt(0).toUpperCase() + parsed.role.slice(1) : 'Student';
          grade = parsed.grade || 'Grade 10-A';
          badgeId = parsed.badgeId || `TAT-2026-${(parsed.id || 'STU').toUpperCase()}`;
        } else if (rawData.includes(':')) {
          // Format: TATTVASAYAM:ID:vivan:Vivan:Grade 10-A
          const parts = rawData.split(':');
          if (parts.length >= 4) {
            name = parts[3] || parts[2];
            grade = parts[4] || 'Secondary Cohort';
            category = 'Student';
            badgeId = `TAT-2026-${(parts[2] || 'STU').toUpperCase()}`;
          } else {
            name = parts[1] || parts[0];
            badgeId = 'TAT-2026-BADGE';
          }
        } else {
          // Fallback plain string
          name = rawData.trim();
          badgeId = `TAT-2026-${name.toUpperCase().replace(/\s+/g, '')}`;
        }

        // Check against known USER_PROFILES for photo / exact match
        const matchingProfile = Object.values(USER_PROFILES).find(
          (p) =>
            p.name.toLowerCase() === name.toLowerCase() ||
            p.id.toLowerCase() === name.toLowerCase()
        );

        if (matchingProfile) {
          name = matchingProfile.name;
          if (matchingProfile.role === 'student') {
            category = 'Student';
            grade = matchingProfile.title;
          } else if (matchingProfile.role === 'teacher') {
            category = 'Faculty';
            grade = matchingProfile.title;
          }
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const verifiedRecord: VerifiedStudentData = {
          name,
          category,
          grade,
          badgeId,
          time: timeStr,
          timestamp: Date.now(),
        };

        setLastVerifiedStudent(verifiedRecord);

        // Play pleasant institutional audio confirmation
        if (audioFeedback) {
          soundEffects.playSuccessChime();
        }

        // Mark attendance in system
        onMarkAttendance(name, category, grade);

        // Trigger brief cooldown to prevent double scans in immediate succession
        setScanCooldown(true);
        setTimeout(() => setScanCooldown(false), 2400);
      } catch (err) {
        console.error('Failed to parse scanned QR', err);
      }
    },
    [audioFeedback, onMarkAttendance, scanCooldown]
  );

  // Start device camera
  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser environment.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in browser permissions or use the sample QR simulator.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No active video camera detected on this device. You can test identity verification using the simulation cards below.');
      } else {
        setCameraError(`Camera initialisation notice: ${err.message || 'Device camera currently unavailable.'}`);
      }
      setIsCameraActive(false);
    }
  }, [facingMode, stopCameraStream]);

  // QR Scanning loop running on requestAnimationFrame
  useEffect(() => {
    if (!isCameraActive) return;

    let isActive = true;

    const scanFrame = () => {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode && qrCode.data && qrCode.data.trim().length > 0) {
            handleDecodedQr(qrCode.data);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraActive, handleDecodedQr]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Toggle front/back camera
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Switch facing mode requires re-starting stream if active
  useEffect(() => {
    if (isCameraActive) {
      startCameraStream();
    }
  }, [facingMode]);

  // File upload QR scanner (for testing or image barcodes)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleDecodedQr(code.data);
          } else {
            alert('No recognizable QR code found in uploaded image. Please ensure the image is clear.');
          }
        }
        setIsProcessingFile(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick simulation trigger for testing
  const handleSimulateScan = (name: string, grade: string) => {
    const mockPayload = JSON.stringify({
      institution: 'TATTVASAYAM FUTURE ACADEMY',
      name,
      grade,
      role: 'student',
      badgeId: `TAT-2026-${name.toUpperCase()}`,
      token: `SIG_${name}_2026`,
    });
    handleDecodedQr(mockPayload);
  };

  // Handle manual attendance submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeName.trim()) return;
    onMarkAttendance(
      attendeeName.trim(),
      attendeeCategory,
      attendeeCategory === 'Student' ? attendeeGrade : undefined
    );
    setAttendeeName('');
  };

  const filteredLogs = gateLogs.filter((log) => {
    if (filterCategory !== 'ALL' && log.category !== filterCategory) return false;
    if (searchQuery && !log.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Active Lockdown Station Command Banner */}
      {lockdown?.active && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-red-600 via-red-700 to-red-800 border-2 border-red-400 text-white shadow-xl shadow-red-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-red-700">
                  SECURITY COMMAND CODE RED
                </span>
                <span className="text-xs text-red-200">
                  Triggered by: {lockdown.triggeredBy || 'Authority'}
                </span>
              </div>
              <p className="text-sm font-extrabold text-white mt-0.5">
                EMERGENCY CAMPUS LOCKDOWN ACTIVE • GATES 1 & 2 CRASH BARRIERS ARMED
              </p>
              <p className="text-xs text-red-100 font-mono mt-0.5">
                Directive: {lockdown.reason || 'Perimeter Security Protocol'} • Full-screen overlay broadcasted to all students/teachers.
              </p>
            </div>
          </div>
          <button
            onClick={handleLiftLockdown}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-700 font-black text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
          >
            <Unlock className="w-4 h-4 text-emerald-600" />
            <span>LIFT LOCKDOWN (RELEASE GATES)</span>
          </button>
        </div>
      )}

      {/* Top Station Header - Spacious & Clean */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400">
            <span className="text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider text-[11px]">
              Gate 2 Physical Access Station
            </span>
            <span aria-hidden="true">·</span>
            <span>Officer {user.name}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active Post</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Security & Identity Verification Kiosk
          </h2>

          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-2xl leading-relaxed">
            Real-time optical QR code scanning via device camera and biometric NFC verification for students, faculty, and campus visitors.
          </p>
        </div>

        {/* Counter Summary & Emergency Lockdown Toggle Button */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {lockdown?.active ? (
            <button
              onClick={handleLiftLockdown}
              className="px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 animate-pulse"
              title="Deactivate emergency lockdown"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Lift Lockdown</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLockdownModal(true)}
              className="px-4 py-3 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-xs shadow-xs transition flex items-center gap-2"
              title="Initiate emergency lockdown across campus"
            >
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Emergency Lockdown</span>
            </button>
          )}

          <div className="px-5 py-3 rounded-2xl bg-orange-50/70 dark:bg-stone-800/80 border border-orange-200/80 dark:border-stone-700 text-center">
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
              Entries Today
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono mt-0.5">
              {gateLogs.length}
            </div>
          </div>
        </div>
      </div>

      {/* FOOLPROOF GATE 2 NFC TURNSTILE CLEARANCE QUEUE */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-white via-orange-50/40 to-white dark:from-stone-900 dark:via-stone-900/90 dark:to-stone-900 border-2 border-orange-300/80 dark:border-amber-900/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-100 dark:border-stone-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-600"></span>
              </span>
              <span className="text-[11px] uppercase font-extrabold tracking-wider text-orange-600 dark:text-orange-400">
                Foolproof Access Protocol · Gate 2 Turnstile Clearance
              </span>
            </div>
            <h3 className="text-xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              <span>Physical NFC Badge Authorization Queue</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              When a student taps their digital NFC badge, Gate 2 holds locked until you physically inspect identity and unlock the turnstile.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {pendingNfcTaps.filter((t) => t.status === 'PENDING').length > 0 ? (
              <span className="px-3.5 py-1.5 rounded-xl bg-orange-600 text-white font-mono font-black text-xs animate-pulse flex items-center gap-1.5 shadow-sm">
                <Lock className="w-3.5 h-3.5" />
                <span>{pendingNfcTaps.filter((t) => t.status === 'PENDING').length} Pending Officer Approval</span>
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Turnstile Locked & Secured (Armed)</span>
              </span>
            )}
            {onSimulateStudentTap && (
              <button
                type="button"
                onClick={onSimulateStudentTap}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs transition flex items-center gap-1.5 border border-stone-200 dark:border-stone-700"
                title="Simulate incoming student badge tap for testing"
              >
                <Radio className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                <span>Simulate Student Tap (Vivan)</span>
              </button>
            )}
          </div>
        </div>

        {/* Pending Requests List */}
        {pendingNfcTaps.filter((t) => t.status === 'PENDING').length === 0 ? (
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-stone-850/50 border border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Turnstiles are in armed standby mode. No unapproved student badges in queue.</span>
            </div>
            <span className="text-[11px] font-mono opacity-70">Officer: Mr. Sai • Station: Gate 2 Turnstiles</span>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingNfcTaps
              .filter((t) => t.status === 'PENDING')
              .map((tap) => (
                <div
                  key={tap.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border-2 border-orange-400 dark:border-orange-600 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 flex items-center justify-center font-black text-sm shrink-0 border border-orange-300 dark:border-orange-800">
                      <Lock className="w-6 h-6 text-orange-600 animate-pulse" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-base text-stone-900 dark:text-stone-100">
                          {tap.studentName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-stone-800 text-orange-700 dark:text-orange-300 font-bold text-xs">
                          {tap.grade}
                        </span>
                        <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                          ID: {tap.badgeId}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 font-medium flex-wrap">
                        <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold">
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>{tap.gateNumber}</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono text-stone-600 dark:text-stone-300">Tapped: {tap.time}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Digital Signature Verified</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Security Decision Buttons */}
                  <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => onApproveNfcTap && onApproveNfcTap(tap.id)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                      <span>Approve & Unlock Turnstile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDenyNfcTap && onDenyNfcTap(tap.id, 'Identity manual check required')}
                      className="px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-rose-50 dark:bg-stone-800 dark:hover:bg-rose-950/40 text-stone-700 hover:text-rose-600 dark:text-stone-300 dark:hover:text-rose-400 border border-stone-200 dark:border-stone-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Deny / Hold</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Segmented Section Switcher - Prevents page crowding */}
      <div className="flex items-center gap-1.5 p-1.5 bg-stone-100 dark:bg-stone-850 rounded-2xl border border-stone-200/80 dark:border-stone-800 w-full sm:w-fit text-xs font-bold">
        <button
          onClick={() => setActiveSection('scanner')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition ${
            activeSection === 'scanner'
              ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <Camera className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <span>Device Camera QR Scanner</span>
        </button>

        <button
          onClick={() => setActiveSection('stream')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition ${
            activeSection === 'stream'
              ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Live Entry Stream ({gateLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('manual')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition ${
            activeSection === 'manual'
              ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Manual Visitor Registration</span>
        </button>

        <button
          onClick={() => setActiveSection('transport')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition ${
            activeSection === 'transport'
              ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <Bus className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <span>Staff Bus Transport</span>
        </button>
      </div>

      {/* SECTION 1: DEVICE CAMERA QR SCANNER */}
      {activeSection === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Viewfinder Card (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-orange-600" />
                  <span>Gate 2 Optical QR Camera Viewfinder</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Point the camera at student mobile screens or physical identity passes.
                </p>
              </div>

              {/* Controls: Audio feedback & Camera Switch */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAudioFeedback((a) => !a)}
                  title={audioFeedback ? 'Sound chime enabled' : 'Sound chime muted'}
                  className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
                >
                  {audioFeedback ? <Volume2 className="w-4 h-4 text-orange-600" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {isCameraActive && (
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    title="Flip camera (front / rear)"
                    className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Video Viewport Box with Scanning Reticle */}
            <div className="relative aspect-4/3 sm:aspect-16/10 rounded-2xl bg-stone-950 overflow-hidden flex items-center justify-center border border-stone-800 shadow-inner">
              {/* Actual Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : 'block'}`}
              />

              {/* Hidden Canvas used for ImageData QR decoding */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Laser Scanning Reticle when camera is active */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Bounding Target Box */}
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-orange-500/80 rounded-2xl bg-orange-500/5 shadow-2xl">
                    {/* Corner Guides */}
                    <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-orange-400 rounded-tl-sm" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-orange-400 rounded-tr-sm" />
                    <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-orange-400 rounded-bl-sm" />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-orange-400 rounded-br-sm" />

                    {/* Laser scanning line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-lg shadow-orange-500/50 animate-pulse relative top-1/2" />
                  </div>

                  <div className="absolute bottom-4 px-3 py-1 rounded-full bg-stone-950/80 text-orange-200 text-[11px] font-mono border border-orange-500/30 backdrop-blur-md">
                    {scanCooldown ? 'Verifying identity...' : 'Align student QR pass inside box'}
                  </div>
                </div>
              )}

              {/* Standby View when camera is stopped */}
              {!isCameraActive && (
                <div className="p-8 text-center space-y-4 max-w-sm">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-stone-850 border border-stone-750 text-stone-400 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-orange-500" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-stone-100">
                      Camera Scanner Standby
                    </h4>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Tap below to activate device camera and scan student passes at Gate 2.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={startCameraStream}
                    className="w-full py-3 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Live Camera Scanner</span>
                  </button>
                </div>
              )}
            </div>

            {/* Error or Notice Alert */}
            {cameraError && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Camera Notice</div>
                  <p className="leading-relaxed">{cameraError}</p>
                </div>
              </div>
            )}

            {/* Viewfinder Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <CameraOff className="w-4 h-4 text-rose-500" />
                    <span>Stop Camera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCameraStream}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Enable Camera</span>
                  </button>
                )}

                {/* Upload QR image as file */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-stone-400" />
                  <span>{isProcessingFile ? 'Analyzing...' : 'Scan Image File'}</span>
                </button>
              </div>

              <div className="text-[11px] text-stone-400">
                {facingMode === 'environment' ? 'Rear Camera Mode' : 'Front Camera Mode'}
              </div>
            </div>
          </div>

          {/* Right Verification & Fast Testing Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Real-Time Verification Status Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/90 shadow-sm space-y-4">
              <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
                <span className="text-xs uppercase font-bold text-orange-600 tracking-wider">
                  Verification Telemetry
                </span>
                <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
                  Latest Student Clearance
                </h3>
              </div>

              {lastVerifiedStudent ? (
                <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                          Access Authorized
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          Gate 2 Optical & NFC Verified
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg">
                      {lastVerifiedStudent.time}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 space-y-1.5 text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="text-stone-500 dark:text-stone-400">Student Name:</span>
                      <span className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                        {lastVerifiedStudent.name}
                      </span>
                    </div>

                    {lastVerifiedStudent.grade && (
                      <div className="flex items-baseline justify-between">
                        <span className="text-stone-500 dark:text-stone-400">Cohort / Grade:</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {lastVerifiedStudent.grade}
                        </span>
                      </div>
                    )}

                    <div className="flex items-baseline justify-between">
                      <span className="text-stone-500 dark:text-stone-400">Credential Badge:</span>
                      <span className="font-mono text-[11px] text-stone-600 dark:text-stone-300">
                        {lastVerifiedStudent.badgeId}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-stone-500 dark:text-stone-400">Parent Notification:</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                        Sent to App
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2 text-stone-400">
                  <UserCheck className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600" />
                  <p className="text-xs">
                    Scan a student QR pass above or use one of the quick test badges below.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Test Simulator - Generous spacing */}
            <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Instant Gate Simulation
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Test hardware scanning pipeline without physical cards
                  </p>
                </div>
                <Radio className="w-4 h-4 text-orange-500" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleSimulateScan('Vivan', 'Grade 10-A')}
                  className="p-3 rounded-2xl bg-orange-50/80 dark:bg-stone-800 hover:bg-orange-100 dark:hover:bg-stone-750 border border-orange-200 dark:border-stone-700 text-left transition flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">Vivan</div>
                    <div className="text-[11px] text-stone-500">Grade 10-A</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-600" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateScan('Krishvika', 'Grade 8-B')}
                  className="p-3 rounded-2xl bg-orange-50/80 dark:bg-stone-800 hover:bg-orange-100 dark:hover:bg-stone-750 border border-orange-200 dark:border-stone-700 text-left transition flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">Krishvika</div>
                    <div className="text-[11px] text-stone-500">Grade 8-B</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LIVE ENTRY STREAM - Spacious, uncluttered list */}
      {activeSection === 'stream' && (
        <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/90 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <h3 className="font-extrabold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span>Gate 2 Access Stream</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Timestamped biometric and optical entry log for campus arrivals.
              </p>
            </div>

            {/* Filter buttons - Clean text styling per frontend constitution */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-semibold">
              {(['ALL', 'Student', 'Faculty', 'Staff', 'Visitor'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filterCategory === cat
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar with generous width */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search entries by name or badge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Spacious Entry Cards */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <FileCheck className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600" />
                <p className="text-xs">No gate records found matching current query.</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-stone-50/70 dark:bg-stone-850/60 border border-stone-200/70 dark:border-stone-800 hover:border-orange-200 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-stone-800 text-orange-700 dark:text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {log.category.charAt(0)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                          {log.name}
                        </span>
                        <span className="text-[11px] text-stone-400">·</span>
                        <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                          {log.category}
                        </span>
                        {log.grade && (
                          <>
                            <span className="text-[11px] text-stone-400">·</span>
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              {log.grade}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Log ID: {log.id} • Gate 2 Optical Scanner</span>
                        {log.verifiedBy && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            Verified: {log.verifiedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 shrink-0">
                    {log.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: MANUAL REGISTRATION KIOSK - Clean, uncluttered form */}
      {activeSection === 'manual' && (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/90 shadow-sm space-y-6">
          <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
            <span className="text-xs uppercase font-bold text-orange-600 tracking-wider">
              Manual Override
            </span>
            <h3 className="text-lg font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
              Gate 2 Visitor & Staff Registration
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Record campus admittance for guest lecturers, contractors, or students who forgot their mobile pass.
            </p>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Visitor / Person Name:
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. K. Raman (Guest Lecturer) or Parent Name"
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
                className="w-full p-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Affiliation Category:
                </label>
                <select
                  value={attendeeCategory}
                  onChange={(e) => setAttendeeCategory(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
                >
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                  <option value="Visitor">Visitor / Guest</option>
                </select>
              </div>

              {attendeeCategory === 'Student' ? (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Grade / Cohort:
                  </label>
                  <select
                    value={attendeeGrade}
                    onChange={(e) => setAttendeeGrade(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
                  >
                    <option value="Grade 10-A">Grade 10-A</option>
                    <option value="Grade 8-B">Grade 8-B</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 7">Grade 7</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Purpose / Authorization:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Science Fair Jury, Campus Tour"
                    className="w-full p-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-2xl shadow-sm transition mt-2"
            >
              Confirm Admittance & Log Gate Entry
            </button>
          </form>
        </div>
      )}

      {/* SECTION 4: STAFF BUS TRANSPORT OPT-IN & PASS */}
      {activeSection === 'transport' && (
        <TransportOptInPanel
          user={user}
          busRoute={busRoute}
          transportRequests={transportRequests}
          onRequestTransport={onRequestTransport}
          onPayTransportFee={onPayTransportFee}
        />
      )}

      {/* Security Officer Emergency Lockdown Modal */}
      {showLockdownModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border-2 border-red-500 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-red-200 dark:border-red-950">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 flex items-center justify-center text-red-600 shrink-0">
                <ShieldAlert className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-red-700 dark:text-red-400 font-display">
                  Deploy Emergency Campus Lockdown?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Gate 2 Command • Armed Turnstile Lockdown Protocol
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 text-xs space-y-1.5 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-300">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>Station Security Protocols:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-700 dark:text-stone-300">
                <li>Automated bollards & turnstiles immediately dead-locked.</li>
                <li>Displays full-screen inescapable red emergency warning overlay across all active student & teacher sessions.</li>
                <li>Triggers station sirens and alerts Principal Dr. Shenoy's office.</li>
              </ul>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Incident Reason / Preset:
                </label>
                <select
                  value={lockdownReason}
                  onChange={(e) => setLockdownReason(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium"
                >
                  <option value="Gate 2 Perimeter Security Alert & Gate Seal">Gate 2 Perimeter Security Alert & Gate Seal</option>
                  <option value="Unidentified Perimeter Intruder Alert">Unidentified Perimeter Intruder Alert</option>
                  <option value="Severe Hazardous Environmental Incident Near Yelahanka-Jakkur Highway">Severe Hazardous Environmental Incident Near Yelahanka-Jakkur Highway</option>
                  <option value="Unscheduled Campus Emergency Drill">Unscheduled Campus Emergency Drill</option>
                  <option value="Custom">Custom Security Directive...</option>
                </select>
              </div>

              {lockdownReason === 'Custom' && (
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Specific Security Incident Description:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter security incident details..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLockdownModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLockdown}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>CONFIRM & SEAL CAMPUS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
