/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  ShieldCheck,
  Radio,
  Sparkles,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  Building,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import { UserProfile, PendingNfcTap } from '../../types';

interface DigitalIdBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSimulateTap?: () => void;
  pendingNfcTaps?: PendingNfcTap[];
  onQuickApproveDemo?: (tapId: string) => void;
  onSwitchToSecurity?: () => void;
}

export const DigitalIdBadgeModal: React.FC<DigitalIdBadgeModalProps> = ({
  isOpen,
  onClose,
  user,
  onSimulateTap,
  pendingNfcTaps = [],
  onQuickApproveDemo,
  onSwitchToSecurity,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [tapSuccess, setTapSuccess] = useState(false);

  const payload = JSON.stringify({
    institution: 'TATTVASAYAM FUTURE ACADEMY',
    campus: 'Jakkur Campus, Bengaluru',
    role: user.role,
    id: user.id,
    name: user.name,
    grade: user.title,
    badgeId: `TAT-2026-${user.id.toUpperCase()}`,
    validUntil: '2027-05-31',
    token: `SIG_${user.id}_${user.role}_2026`,
  });

  useEffect(() => {
    if (!isOpen) return;
    setTapSuccess(false);

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1c120b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR', err));
  }, [isOpen, payload]);

  if (!isOpen) return null;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const userKeyLower = (user.id || '').toLowerCase();
  const userNameLower = (user.name || '').toLowerCase();
  const myPendingTap = pendingNfcTaps.find(
    (t) =>
      t.status === 'PENDING' &&
      (t.studentKey.toLowerCase() === userKeyLower ||
        t.studentName.toLowerCase() === userNameLower ||
        userKeyLower.includes(t.studentKey.toLowerCase()))
  );

  const lastApprovedTap = pendingNfcTaps.find(
    (t) =>
      t.status === 'APPROVED' &&
      (t.studentKey.toLowerCase() === userKeyLower ||
        t.studentName.toLowerCase() === userNameLower ||
        userKeyLower.includes(t.studentKey.toLowerCase()))
  );

  const handleTap = () => {
    if (onSimulateTap) {
      onSimulateTap();
      setTapSuccess(true);
      setTimeout(() => setTapSuccess(false), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-orange-200 dark:border-amber-950 overflow-hidden">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Digital ID Card Preview */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-orange-600 tracking-wider">
              Institutional Credential
            </span>
            <h3 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
              Student Digital Pass & QR Code
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Present this pass at Gate 2. Per foolproof security protocol, turnstiles unlock only upon physical Officer approval.
            </p>
          </div>

          {/* Physical Badge Simulation Container */}
          <div className="relative rounded-2xl bg-gradient-to-br from-orange-600 via-orange-700 to-amber-700 p-5 text-white shadow-lg overflow-hidden border border-orange-400/30">
            {/* Shimmer Background Accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

            <div className="relative z-10 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white p-0.5 shadow-sm shrink-0 flex items-center justify-center">
                    <img
                      src="/assets/aistudio/Tattvaswayam_School_Logo_dd139741.png"
                      alt="Tattvasayam Academy Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="font-mono text-[11px] font-black tracking-widest text-amber-200">
                      TATTVASAYAM
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-orange-100">
                      Future Academy • Jakkur
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                    2026–2027
                  </span>
                </div>
              </div>

              {/* QR Code and Identity info */}
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-md shrink-0">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Student Gate QR Code"
                      className="w-28 h-28 object-contain"
                    />
                  ) : (
                    <div className="w-28 h-28 flex items-center justify-center bg-stone-100 text-stone-400">
                      <QrCode className="w-8 h-8 animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="text-lg font-black leading-tight truncate">
                    {user.name}
                  </div>
                  <div className="text-xs text-amber-200 font-semibold truncate">
                    {user.title}
                  </div>
                  <div className="text-[11px] font-mono text-orange-100">
                    ID: TAT-2026-{user.id.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] text-orange-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Cryptographically Signed</span>
                  </div>
                </div>
              </div>

              {/* Barcode & NFC Footer */}
              <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-orange-100 font-mono">
                <span>GATE 2 NFC ENABLED</span>
                <span>EXP: 31-MAY-2027</span>
              </div>
            </div>
          </div>

          {/* Foolproof Status Callout */}
          {myPendingTap ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-xs">
                <Lock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                <span>Turnstile Locked: Awaiting Officer Clearance</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                NFC badge read acknowledged at Gate 2. For institutional safety, Security Officer Mr. Sai must physically verify and approve your admittance.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {onQuickApproveDemo && (
                  <button
                    type="button"
                    onClick={() => onQuickApproveDemo(myPendingTap.id)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve as Officer Sai (Demo)</span>
                  </button>
                )}
                {onSwitchToSecurity && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToSecurity();
                    }}
                    className="py-1.5 px-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl font-bold text-[11px] transition"
                  >
                    Open Security Kiosk
                  </button>
                )}
              </div>
            </div>
          ) : lastApprovedTap ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Turnstile Unlocked & Cleared:</span> Approved by {lastApprovedTap.verifiedBy || 'Security Officer Mr. Sai'} at {lastApprovedTap.time}. Attendance confirmed.
              </div>
            </div>
          ) : null}

          {/* Action Row */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleTap}
              className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs ${
                myPendingTap
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : tapSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {myPendingTap ? (
                <>
                  <Lock className="w-4 h-4 text-amber-200 animate-pulse" />
                  <span>NFC Tapped · Awaiting Security Clearance</span>
                </>
              ) : tapSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>NFC Transmitted to Gate 2 Officer!</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 animate-pulse text-amber-200" />
                  <span>Tap NFC Badge at Gate 2</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyPayload}
              className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              {copiedPayload ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Encrypted Payload Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                  <span>Copy Digital ID String</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
