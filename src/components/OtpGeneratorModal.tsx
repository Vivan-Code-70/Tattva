/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Mail,
  Clock,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { otpService, OtpRecord } from '../services/otpService';
import { USER_PROFILES } from '../services/storageService';

interface OtpGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserId?: string;
  onSelectUserId?: (userId: string) => void;
  onNavigateToLogin?: (userId: string) => void;
}

export const OtpGeneratorModal: React.FC<OtpGeneratorModalProps> = ({
  isOpen,
  onClose,
  selectedUserId,
  onSelectUserId,
  onNavigateToLogin,
}) => {
  const [activeUser, setActiveUser] = useState<string>(selectedUserId || 'vivan');
  const [activeRecord, setActiveRecord] = useState<OtpRecord | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => otpService.getSecondsRemaining());
  const [copied, setCopied] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);

  // Sync with selectedUserId prop when changed
  useEffect(() => {
    if (selectedUserId) {
      setActiveUser(selectedUserId);
    }
  }, [selectedUserId]);

  // Synchronize 30-second TOTP record
  useEffect(() => {
    if (!isOpen) return;

    const sync = () => {
      const rec = otpService.getActiveOtp(activeUser);
      setActiveRecord(rec);
      setSecondsLeft(otpService.getSecondsRemaining());
    };

    sync();

    const timer = setInterval(() => {
      const remaining = otpService.getSecondsRemaining();
      setSecondsLeft(remaining);
      if (remaining === 30 || remaining === 29) {
        sync();
      }
    }, 1000);

    const unsub = otpService.subscribe(() => {
      sync();
    });

    return () => {
      clearInterval(timer);
      unsub();
    };
  }, [activeUser, isOpen]);

  if (!isOpen) return null;

  const handleGenerateFresh = () => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 500);
    const newRec = otpService.generateOtp(activeUser);
    setActiveRecord(newRec);
    setSecondsLeft(otpService.getSecondsRemaining());
  };

  const handleCopy = () => {
    if (!activeRecord) return;
    navigator.clipboard.writeText(activeRecord.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceedToLogin = () => {
    if (onSelectUserId) onSelectUserId(activeUser);
    if (onNavigateToLogin) onNavigateToLogin(activeUser);
    onClose();
  };

  const currentProfile = USER_PROFILES[activeUser];
  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / 30) * 100));
  const totpSiteUrl = typeof window !== 'undefined' ? `${window.location.origin}/totp` : '/totp';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Tattvasayam 30s TOTP Viewer
              </h3>
              <p className="text-[11px] text-orange-100 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Standard 30-Second TOTP Code</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close OTP Viewer"
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Account Selector Pill Row */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
              Select Academy Account / Role:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              {[
                { key: 'vivan', label: 'Vivan', role: 'Student 10-A' },
                { key: 'krishvika', label: 'Krishvika', role: 'Student 8-B' },
                { key: 'susmita', label: 'Ms. Susmita', role: 'Faculty' },
                { key: 'bharthi', label: 'Ms. Bharthi', role: 'Coordinator' },
                { key: 'sandhya', label: 'Ms. Sandhya', role: 'Super Admin' },
                { key: 'sai', label: 'Mr. Sai', role: 'Gate Staff' },
                { key: 'pvivan', label: 'Parent Vivan', role: 'Parent' },
                { key: 'pkrishvika', label: 'Parent Krish', role: 'Parent' },
              ].map((acc) => (
                <button
                  key={acc.key}
                  type="button"
                  onClick={() => {
                    setActiveUser(acc.key);
                    if (onSelectUserId) onSelectUserId(acc.key);
                  }}
                  className={`p-2 rounded-xl text-left border transition ${
                    activeUser === acc.key
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 font-bold shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 hover:border-orange-300'
                  }`}
                >
                  <div className="text-[11px] truncate leading-tight">{acc.label}</div>
                  <div className="text-[9px] text-stone-400 dark:text-stone-500 truncate">{acc.role}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Account Details */}
          {currentProfile && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs">
                  {currentProfile.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 leading-tight">
                    {currentProfile.name}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono">
                    ID: {currentProfile.id}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-stone-700 text-orange-800 dark:text-orange-300 capitalize">
                  {currentProfile.role}
                </span>
              </div>
            </div>
          )}

          {/* Main 6-Digit OTP Display Card (Fixed for 30s) */}
          <div className="relative p-4 rounded-3xl bg-gradient-to-b from-orange-50/80 to-amber-50/50 dark:from-stone-800 dark:to-stone-900 border-2 border-dashed border-orange-300 dark:border-amber-900 text-center space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1 font-semibold text-orange-700 dark:text-orange-300">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>30-Second Code</span>
              </span>
              <button
                type="button"
                onClick={handleGenerateFresh}
                title="Sync with atomic clock"
                className="flex items-center gap-1 font-semibold text-stone-600 dark:text-stone-300 hover:text-orange-600 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                <span>Sync Clock</span>
              </button>
            </div>

            {/* OTP Code Display */}
            <div className="py-1 flex items-center justify-center gap-2">
              {activeRecord?.code ? (
                activeRecord.code.split('').map((digit, idx) => (
                  <span
                    key={idx}
                    className="w-10 h-12 rounded-2xl bg-white dark:bg-stone-800 border-2 border-orange-400 dark:border-orange-500/70 shadow-sm flex items-center justify-center font-mono text-2xl font-black text-orange-600 dark:text-orange-400 tracking-wider"
                  >
                    {digit}
                  </span>
                ))
              ) : (
                <span className="font-mono text-xl text-stone-400">Computing...</span>
              )}
            </div>

            {/* Countdown Timer & Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Valid for: {secondsLeft}s</span>
                </span>
                <span className="text-stone-400 text-[10px]">Rotates every 30s</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Web Address Callout */}
          <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-stone-800/80 border border-orange-200/80 dark:border-amber-950 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate text-stone-600 dark:text-stone-300">
              <Globe className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="font-mono text-[11px] truncate">{totpSiteUrl}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(totpSiteUrl);
                alert('Copied TOTP web address!');
              }}
              className="px-2 py-0.5 rounded-lg bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 font-bold text-[10px] text-orange-700 dark:text-orange-300 shrink-0 hover:bg-orange-100"
            >
              Copy Link
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-stone-750 transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500" />
                  <span>Copy 6 Digits</span>
                </>
              )}
            </button>

            {onNavigateToLogin && (
              <button
                type="button"
                onClick={handleProceedToLogin}
                className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-5 py-2.5 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-100 dark:border-stone-800 text-center">
          <p className="text-[10px] text-stone-500 dark:text-stone-400">
            Standard RFC 6238 30-Second TOTP Protocol. No rapid 1-second cycling.
          </p>
        </div>
      </div>
    </div>
  );
};
