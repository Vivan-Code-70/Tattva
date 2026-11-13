import React, { useMemo, useState } from 'react';
import {
  Bus,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  BusRouteInfo,
  FeeTransaction,
  TransportOptInRequest,
  UserProfile,
  UserRole,
} from '../../types';
import { USER_PROFILES } from '../../services/storageService';
import { soundEffects } from '../../utils/audioChime';

interface TransportOptInPanelProps {
  user: UserProfile;
  busRoute?: BusRouteInfo;
  transportRequests: TransportOptInRequest[];
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

export function resolveTransportSubject(user: UserProfile): {
  userKey: string;
  userName: string;
  userRole: UserRole;
} {
  if (user.role === 'parent') {
    const childKey = user.child || 'vivan';
    const childProfile = USER_PROFILES[childKey];
    return {
      userKey: childKey,
      userName: childProfile?.name || childKey,
      userRole: 'student',
    };
  }
  const matchedKey =
    Object.keys(USER_PROFILES).find((k) => USER_PROFILES[k].id === user.id) ||
    user.id.toLowerCase();
  return {
    userKey: matchedKey,
    userName: user.name,
    userRole: user.role,
  };
}

export const TransportOptInPanel: React.FC<TransportOptInPanelProps> = ({
  user,
  busRoute,
  transportRequests,
  onRequestTransport,
  onPayTransportFee,
}) => {
  const subject = useMemo(() => resolveTransportSubject(user), [user]);
  const pickupStops = useMemo(() => {
    const stops = busRoute?.stops || [];
    // Stops 1-4 are residential pickup stations; stop 5 is Campus Gate 2
    return stops.filter((s, idx) => idx < stops.length - 1);
  }, [busRoute]);

  const [selectedStopId, setSelectedStopId] = useState<number>(pickupStops[2]?.id || 3);
  const [tripType, setTripType] = useState<'both' | 'morning' | 'evening'>('both');
  const [remarks, setRemarks] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<FeeTransaction['paymentMethod']>('UPI');
  const [showCheckout, setShowCheckout] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const existingRequest = useMemo(() => {
    return transportRequests.find(
      (r) =>
        r.userKey.toLowerCase() === subject.userKey.toLowerCase() ||
        r.userName.toLowerCase() === subject.userName.toLowerCase()
    );
  }, [transportRequests, subject]);

  const feeTier = subject.userRole === 'student' ? 12000 : 6000;

  const handleSubmitOptIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRequestTransport) return;
    const stopObj = pickupStops.find((s) => (s.id || 0) === selectedStopId) || pickupStops[0];
    onRequestTransport({
      userKey: subject.userKey,
      userName: subject.userName,
      userRole: subject.userRole,
      stopId: stopObj?.id || 3,
      stopName: stopObj?.name || 'Sahakar Nagar Main Cross',
      tripType,
      remarks: remarks.trim() || undefined,
    });
    soundEffects.playSuccessChime();
    setRemarks('');
    setToastMsg('Bus transport opt-in request submitted to Coordinator & Admin for approval.');
    setTimeout(() => setToastMsg(null), 5000);
  };

  const handlePayNow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingRequest || !onPayTransportFee) return;
    onPayTransportFee(existingRequest.id, paymentMethod);
    soundEffects.playSuccessChime();
    setShowCheckout(false);
    setToastMsg(`Transport fee ₹${existingRequest.feeAmount.toLocaleString('en-IN')} paid. Digital Bus Pass is now active.`);
    setTimeout(() => setToastMsg(null), 5000);
  };

  if (user.role === 'driver') {
    return null;
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
              Route 14 Bus Transport Opt-In & Fee Pass ({subject.userName})
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Transport fees apply exclusively after your opt-in request is approved by the Coordinator or Admin.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 self-start sm:self-auto">
          Term Rate: ₹{feeTier.toLocaleString('en-IN')}
        </span>
      </div>

      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Case 1: Approved and Fee Paid -> Active Digital Bus Pass */}
      {existingRequest && existingRequest.status === 'APPROVED' && existingRequest.isFeePaid && (
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-extrabold text-emerald-900 dark:text-emerald-200">
                Active Route 14 Bus Pass • Fee Settled
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold">
              PASS ACTIVE • SEAT {existingRequest.allocatedSeat || 'ASSIGNED'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <span className="text-[10px] text-stone-500 uppercase block">Pickup Station</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">{existingRequest.stopName}</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase block">Trip Schedule</span>
              <span className="font-bold capitalize text-stone-900 dark:text-stone-100">
                {existingRequest.tripType === 'both' ? 'Morning & Evening' : `${existingRequest.tripType} only`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase block">Transport Fee</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                ₹{existingRequest.feeAmount.toLocaleString('en-IN')} (Paid)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase block">Receipt Ref</span>
              <span className="font-mono text-stone-700 dark:text-stone-300">
                {existingRequest.paymentRef || 'CLEARED'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Approved, awaiting conditional transport fee payment */}
      {existingRequest && existingRequest.status === 'APPROVED' && !existingRequest.isFeePaid && (
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-extrabold text-stone-900 dark:text-stone-100">
                Bus Opt-In Approved! Transport Fee Payment Unlocked
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-mono text-[10px] font-bold">
              SEAT {existingRequest.allocatedSeat || 'ALLOCATED'} · FEE DUE
            </span>
          </div>

          <p className="text-stone-600 dark:text-stone-300">
            Station: <strong>{existingRequest.stopName}</strong> ({existingRequest.tripType === 'both' ? 'Morning & Evening' : `${existingRequest.tripType} only`}). Complete the transport fee settlement below to activate boarding.
          </p>

          {!showCheckout ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="font-mono">
                <span className="text-[10px] text-stone-500 uppercase block">Transport Fee Payable</span>
                <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                  ₹{existingRequest.feeAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckout(true)}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Transport Fee (₹{existingRequest.feeAmount.toLocaleString('en-IN')})</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePayNow} className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-700 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-stone-800 dark:text-stone-200">Select Payment Mode:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['UPI', 'NetBanking', 'DebitCard', 'CampusWallet'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition ${
                        paymentMethod === m
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Confirm & Pay ₹{existingRequest.feeAmount.toLocaleString('en-IN')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Case 3: Pending Approval */}
      {existingRequest && existingRequest.status === 'PENDING' && (
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="font-extrabold text-stone-900 dark:text-stone-100">
                Opt-In Request Under Review ({existingRequest.id})
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
              PENDING APPROVAL
            </span>
          </div>
          <p className="text-stone-600 dark:text-stone-300">
            Requested Pickup: <strong>{existingRequest.stopName}</strong> ({existingRequest.tripType}). No transport fee is charged unless approved by Coordinator Ms. Bharthi or Administration.
          </p>
        </div>
      )}

      {/* Case 4: Not Opted or Rejected -> Opt-In Request Form */}
      {(!existingRequest || existingRequest.status === 'REJECTED') && (
        <form onSubmit={handleSubmitOptIn} className="space-y-3 text-xs">
          {existingRequest?.status === 'REJECTED' && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>Your previous opt-in request ({existingRequest.id}) was declined. You may submit an updated station request below.</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
            <strong>Status:</strong> Not opted for campus bus transport. Only users who opt in and receive approval pay transport fees (₹{feeTier.toLocaleString('en-IN')}).
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                Select Route 14 Station:
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-orange-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedStopId}
                  onChange={(e) => setSelectedStopId(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                >
                  {pickupStops.map((s) => (
                    <option key={s.id} value={s.id}>
                      Stop #{s.id}: {s.name} ({s.timeScheduled})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                Commute Preference:
              </label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
              >
                <option value="both">Morning Pickup & Evening Drop</option>
                <option value="morning">Morning Inbound Only</option>
                <option value="evening">Evening Outbound Only</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional landmark or schedule note for Coordinator..."
              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Bus Transport Opt-In</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
