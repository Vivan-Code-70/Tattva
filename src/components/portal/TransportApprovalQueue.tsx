import React, { useMemo, useState } from 'react';
import {
  Bus,
  CheckCircle2,
  Clock,
  IndianRupee,
  MapPin,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { TransportOptInRequest } from '../../types';
import { soundEffects } from '../../utils/audioChime';

interface TransportApprovalQueueProps {
  transportRequests: TransportOptInRequest[];
  onUpdateTransportRequestStatus?: (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    allocatedSeat?: string
  ) => void;
  reviewerLabel?: string;
}

export const TransportApprovalQueue: React.FC<TransportApprovalQueueProps> = ({
  transportRequests,
  onUpdateTransportRequestStatus,
  reviewerLabel = 'Coordinator & Admin Desk',
}) => {
  const [filterTab, setFilterTab] = useState<'PENDING' | 'FEE_PENDING' | 'PAID' | 'ALL'>('PENDING');
  const [seatInputs, setSeatInputs] = useState<Record<string, string>>({});
  const [actionToast, setActionToast] = useState<string | null>(null);

  const counts = useMemo(() => {
    const pending = transportRequests.filter((r) => r.status === 'PENDING').length;
    const feePending = transportRequests.filter((r) => r.status === 'APPROVED' && !r.isFeePaid).length;
    const paid = transportRequests.filter((r) => r.status === 'APPROVED' && r.isFeePaid).length;
    return { pending, feePending, paid, all: transportRequests.length };
  }, [transportRequests]);

  const filteredRequests = useMemo(() => {
    return transportRequests.filter((r) => {
      if (filterTab === 'PENDING') return r.status === 'PENDING';
      if (filterTab === 'FEE_PENDING') return r.status === 'APPROVED' && !r.isFeePaid;
      if (filterTab === 'PAID') return r.status === 'APPROVED' && r.isFeePaid;
      return true;
    });
  }, [transportRequests, filterTab]);

  const handleDecision = (
    req: TransportOptInRequest,
    decision: 'APPROVED' | 'REJECTED',
    index: number
  ) => {
    if (!onUpdateTransportRequestStatus) return;
    const defaultSeat =
      req.userRole === 'student' ? `${10 + index}B` : `${2 + index}C`;
    const seat = (seatInputs[req.id] || req.allocatedSeat || defaultSeat).trim();
    onUpdateTransportRequestStatus(req.id, decision, decision === 'APPROVED' ? seat : undefined);
    soundEffects.playSuccessChime();
    setActionToast(
      decision === 'APPROVED'
        ? `Approved ${req.userName} (${req.userRole}) for Route 14 Seat ${seat}. Transport fee (₹${req.feeAmount.toLocaleString('en-IN')}) unlocked for user.`
        : `Declined bus opt-in request ${req.id} for ${req.userName}. No transport fee billed.`
    );
    setTimeout(() => setActionToast(null), 5000);
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-orange-600" />
            <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
              Bus Transport Opt-In Approvals & Billing Desk
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {reviewerLabel} • Approving a request allocates a seat on Route 14, updates the Driver manifest, and bills the transport fee solely to that opted rider.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'PENDING', label: `Pending Review (${counts.pending})` },
            { id: 'FEE_PENDING', label: `Approved – Fee Due (${counts.feePending})` },
            { id: 'PAID', label: `Active & Paid (${counts.paid})` },
            { id: 'ALL', label: `All (${counts.all})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTab(t.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                filterTab === t.id
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {actionToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      <div className="space-y-3">
        {filteredRequests.map((req, idx) => {
          const isPending = req.status === 'PENDING';
          const isApproved = req.status === 'APPROVED';
          const defaultSeat = req.userRole === 'student' ? `${10 + idx}B` : `${2 + idx}C`;

          return (
            <div
              key={req.id}
              className="p-4 rounded-2xl bg-stone-50/70 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    {req.userName}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-stone-700 text-orange-800 dark:text-orange-300 font-bold uppercase text-[10px]">
                    {req.userRole}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">{req.id}</span>
                  {isPending && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Awaiting Approval</span>
                    </span>
                  )}
                  {isApproved && req.isFeePaid && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Approved & Paid ({req.paymentRef})</span>
                    </span>
                  )}
                  {isApproved && !req.isFeePaid && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold text-[10px] inline-flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      <span>Approved · Fee Payment Pending</span>
                    </span>
                  )}
                  {req.status === 'REJECTED' && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      <span>Declined</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-stone-600 dark:text-stone-300">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    <strong>{req.stopName}</strong> (Stop #{req.stopId})
                  </span>
                  <span>
                    Trip: <strong className="capitalize">{req.tripType}</strong>
                  </span>
                  <span className="font-mono font-bold">
                    Fee Tier: ₹{req.feeAmount.toLocaleString('en-IN')}
                  </span>
                  {req.allocatedSeat && (
                    <span className="font-mono font-bold text-orange-700 dark:text-orange-300">
                      Seat: {req.allocatedSeat}
                    </span>
                  )}
                </div>

                {req.remarks && (
                  <p className="text-[11px] text-stone-500 italic">Note: "{req.remarks}"</p>
                )}
              </div>

              {isPending && onUpdateTransportRequestStatus && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-stone-500 font-semibold">Seat:</span>
                    <input
                      type="text"
                      value={seatInputs[req.id] ?? defaultSeat}
                      onChange={(e) =>
                        setSeatInputs((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      className="w-16 px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono text-center font-bold text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <button
                    onClick={() => handleDecision(req, 'APPROVED', idx)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs transition flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept & Unlock Fee</span>
                  </button>
                  <button
                    onClick={() => handleDecision(req, 'REJECTED', idx)}
                    className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-stone-800 hover:bg-rose-50 text-rose-600 font-bold transition"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="py-10 text-center text-stone-400 text-xs">
            No transport opt-in requests in this category.
          </div>
        )}
      </div>
    </div>
  );
};
