import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Volume2,
  VolumeX,
  Lock,
  EyeOff,
  BellOff,
  ShieldCheck,
  Phone,
  Clock,
  Radio,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { EmergencyLockdownState, UserProfile } from '../../types';
import { soundEffects } from '../../utils/audioChime';

interface EmergencyLockdownOverlayProps {
  lockdown: EmergencyLockdownState;
  currentUser: UserProfile | null;
  onSwitchToAuthority?: (role: 'principal' | 'sai') => void;
}

export const EmergencyLockdownOverlay: React.FC<EmergencyLockdownOverlayProps> = ({
  lockdown,
  currentUser,
  onSwitchToAuthority,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Elapsed timer since lockdown initiated
  useEffect(() => {
    if (!lockdown.active || !lockdown.timestamp) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - lockdown.timestamp) / 1000));
      setElapsedSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockdown.active, lockdown.timestamp]);

  // Audio siren management
  useEffect(() => {
    if (lockdown.active && !isMuted) {
      soundEffects.playLockdownSiren();
    } else {
      soundEffects.stopLockdownSiren();
    }

    return () => {
      soundEffects.stopLockdownSiren();
    };
  }, [lockdown.active, isMuted]);

  if (!lockdown.active) return null;

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const triggeredTimeStr = lockdown.timestamp
    ? new Date(lockdown.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[99999] bg-red-950/98 backdrop-blur-md text-white flex flex-col justify-between overflow-y-auto"
    >
      {/* Top Hazard Warning Stripes */}
      <div className="h-3 w-full bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_20px,#7f1d1d_20px,#7f1d1d_40px)] animate-pulse" />

      {/* Main Warning Content Container */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col justify-center">
        {/* Top Header & Alarm Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-red-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-red-600/90 border-2 border-red-400 flex items-center justify-center text-white shadow-xl shadow-red-600/40 animate-pulse shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-red-500 text-white animate-pulse">
                  CODE RED PROTOCOL
                </span>
                <span className="text-xs font-mono text-red-300">
                  REF: SEC-LOCKDOWN-{lockdown.timestamp || 'ACTIVE'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mt-0.5 font-display">
                EMERGENCY LOCKDOWN IN EFFECT
              </h1>
            </div>
          </div>

          {/* Audio Mute & Elapsed Time Badges */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-red-900/80 border border-red-700/80 flex items-center gap-2 font-mono text-xs">
              <Clock className="w-4 h-4 text-red-400 animate-spin-slow" />
              <span>ACTIVE:</span>
              <span className="text-amber-300 font-bold text-sm tracking-widest">{formatElapsed(elapsedSeconds)}</span>
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 rounded-xl bg-red-900/80 hover:bg-red-800 border border-red-700 text-red-200 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
              title={isMuted ? 'Unmute Siren Alarm' : 'Mute Siren Alarm'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-red-400" />
                  <span className="hidden sm:inline">Unmute Siren</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="hidden sm:inline">Mute Siren</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Big Alert Banner */}
        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-900/90 via-red-900/70 to-red-900/90 border-2 border-red-500 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-200 text-xs font-bold uppercase tracking-wider">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <span>Official Broadcast Directive</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-white leading-snug">
              {lockdown.reason || 'Campus-wide emergency protocol initiated. Cease all movement immediately.'}
            </p>
            <p className="text-xs text-red-300">
              Initiated by <strong className="text-white">{lockdown.triggeredBy || 'Executive Security'}</strong> at {triggeredTimeStr} • Location:{' '}
              <span className="text-red-200">{lockdown.location || 'All Campus Grounds, Jakkur, Bengaluru'}</span>
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-red-600 text-xs font-mono text-red-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span>ALL EXTERIOR GATES LOCKED</span>
          </div>
        </div>

        {/* Four Primary Safety Directives Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Directive 1 */}
          <div className="p-4 rounded-xl bg-red-900/50 border border-red-700/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/60 border border-red-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white">1. Lock & Barricade Doors</h2>
              <p className="text-xs text-red-200 mt-0.5 leading-relaxed">
                Immediately lock all classroom and laboratory doors. Place heavy desks or furniture against inward-opening entrances.
              </p>
            </div>
          </div>

          {/* Directive 2 */}
          <div className="p-4 rounded-xl bg-red-900/50 border border-red-700/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/60 border border-red-400 flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white">2. Stay Out of Sight</h2>
              <p className="text-xs text-red-200 mt-0.5 leading-relaxed">
                Move away from all windows, glass partitions, and doors. Sit on the floor along interior walls below sightlines.
              </p>
            </div>
          </div>

          {/* Directive 3 */}
          <div className="p-4 rounded-xl bg-red-900/50 border border-red-700/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/60 border border-red-400 flex items-center justify-center shrink-0">
              <BellOff className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white">3. Lights Off & Total Silence</h2>
              <p className="text-xs text-red-200 mt-0.5 leading-relaxed">
                Extinguish all room lighting and monitors. Silence all mobile phones (disable vibration). Maintain absolute quiet.
              </p>
            </div>
          </div>

          {/* Directive 4 */}
          <div className="p-4 rounded-xl bg-red-900/50 border border-red-700/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/60 border border-red-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white">4. Await Official ALL CLEAR</h2>
              <p className="text-xs text-red-200 mt-0.5 leading-relaxed">
                Do NOT open doors or evacuate for bells or alarms unless physical smoke/fire is in your room. Wait for verbal & portal ALL CLEAR.
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Contacts & Protocol Notice */}
        <div className="mt-6 p-4 rounded-xl bg-black/40 border border-red-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-red-200">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Phone className="w-4 h-4 text-red-400" />
              <span>Campus Security Hotline:</span>
              <a href="tel:+919845073510" className="text-amber-300 font-mono underline hover:text-amber-200">
                +91 98450 73510 (Ext. 100)
              </a>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 font-bold text-white">
              <span>Principal Office:</span>
              <span className="text-amber-300 font-mono">+91 98450 52094 (Ext. 101)</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 font-mono text-[11px] text-red-300">
              <span>Police North: 112 | Fire: 101</span>
            </div>
          </div>

          {/* Quick Switcher for Evaluators / Testers to Lift Lockdown */}
          {onSwitchToAuthority && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-red-300">Switch account to lift:</span>
              <button
                onClick={() => onSwitchToAuthority('principal')}
                className="px-2.5 py-1 rounded-lg bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-600 font-semibold text-[11px] transition"
              >
                Principal (Dr. Shenoy)
              </button>
              <button
                onClick={() => onSwitchToAuthority('sai')}
                className="px-2.5 py-1 rounded-lg bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-600 font-semibold text-[11px] transition"
              >
                Security (Mr. Sai)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Hazard Warning Stripes */}
      <div className="h-3 w-full bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_20px,#7f1d1d_20px,#7f1d1d_40px)] animate-pulse" />
    </div>
  );
};
