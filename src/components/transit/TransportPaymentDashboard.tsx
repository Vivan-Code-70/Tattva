import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Bus,
  CheckCircle2,
  Clock,
  CreditCard,
  Filter,
  IndianRupee,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  BusRouteInfo,
  FeeTransaction,
  PassengerCategory,
  TransportOptInRequest,
  UserProfile,
} from '../../types';

interface TransportPaymentDashboardProps {
  transportRequests: TransportOptInRequest[];
  busRoute?: BusRouteInfo;
  currentUser?: UserProfile | null;
  onPayTransportFee?: (requestId: string, method: FeeTransaction['paymentMethod']) => void;
  onUpdateTransportRequestStatus?: (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    allocatedSeat?: string
  ) => void;
  isDark?: boolean;
}

function mapRoleToCategory(role: string): PassengerCategory {
  if (role === 'student' || role === 'parent') return 'student';
  if (role === 'teacher') return 'teacher';
  if (role === 'admin' || role === 'principal') return 'admin';
  return 'staff';
}

function formatCategoryLabel(cat: PassengerCategory): string {
  switch (cat) {
    case 'student':
      return 'Students';
    case 'teacher':
      return 'Teachers';
    case 'admin':
      return 'Admin';
    case 'staff':
    default:
      return 'Staff';
  }
}

export const TransportPaymentDashboard: React.FC<TransportPaymentDashboardProps> = ({
  transportRequests,
  currentUser,
  onPayTransportFee,
  isDark = false,
}) => {
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PassengerCategory>('all');
  const [selectedPayMethod, setSelectedPayMethod] = useState<FeeTransaction['paymentMethod']>('UPI');
  const [settlingRequestId, setSettlingRequestId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Only users whose bus transport opt-in has been APPROVED are eligible for transport fee billing
  const approvedRiders = useMemo(
    () => transportRequests.filter((r) => r.status === 'APPROVED'),
    [transportRequests]
  );

  const pendingApprovalsCount = useMemo(
    () => transportRequests.filter((r) => r.status === 'PENDING').length,
    [transportRequests]
  );

  const stats = useMemo(() => {
    const paidList = approvedRiders.filter((r) => r.isFeePaid);
    const pendingList = approvedRiders.filter((r) => !r.isFeePaid);
    const totalCollected = paidList.reduce((sum, r) => sum + (r.feeAmount || 0), 0);
    const totalPending = pendingList.reduce((sum, r) => sum + (r.feeAmount || 0), 0);
    const totalBilled = totalCollected + totalPending;
    const complianceRate =
      approvedRiders.length > 0 ? Math.round((paidList.length / approvedRiders.length) * 100) : 0;

    return {
      totalOpted: approvedRiders.length,
      paidCount: paidList.length,
      pendingCount: pendingList.length,
      totalCollected,
      totalPending,
      totalBilled,
      complianceRate,
    };
  }, [approvedRiders]);

  // Chart 1 Dataset: Grouped by Role + Paid vs Pending Compliance
  const roleComplianceData = useMemo(() => {
    const categories: PassengerCategory[] = ['student', 'teacher', 'staff', 'admin'];
    return categories.map((cat) => {
      const group = approvedRiders.filter((r) => mapRoleToCategory(r.userRole) === cat);
      const paid = group.filter((r) => r.isFeePaid);
      const pending = group.filter((r) => !r.isFeePaid);
      return {
        category: formatCategoryLabel(cat),
        roleKey: cat,
        paidCount: paid.length,
        pendingCount: pending.length,
        collectedAmount: paid.reduce((s, r) => s + r.feeAmount, 0),
        pendingAmount: pending.reduce((s, r) => s + r.feeAmount, 0),
      };
    });
  }, [approvedRiders]);

  // Chart 2 Dataset: Monthly Transport Fee Collection & Compliance Trend (Jun - Nov 2026)
  // Dynamically anchored to live Paid vs Pending metrics for current term cycle
  const monthlyTrendData = useMemo(() => {
    const baseMonths = [
      { month: 'Jun 2026', historicalPaid: 12000, historicalPending: 6000 },
      { month: 'Jul 2026', historicalPaid: 24000, historicalPending: 12000 },
      { month: 'Aug 2026', historicalPaid: 30000, historicalPending: 6000 },
      { month: 'Sep 2026', historicalPaid: 36000, historicalPending: 12000 },
      { month: 'Oct 2026', historicalPaid: 42000, historicalPending: 18000 },
    ];

    const series = baseMonths.map((m) => {
      const total = m.historicalPaid + m.historicalPending;
      return {
        month: m.month,
        paidRevenue: m.historicalPaid,
        pendingRevenue: m.historicalPending,
        compliancePct: total > 0 ? Math.round((m.historicalPaid / total) * 100) : 0,
      };
    });

    // Current live billing month reflects live state changes immediately
    series.push({
      month: 'Nov 2026 (Live)',
      paidRevenue: stats.totalCollected,
      pendingRevenue: stats.totalPending,
      compliancePct: stats.complianceRate,
    });

    return series;
  }, [stats]);

  const filteredDirectory = useMemo(() => {
    return approvedRiders.filter((r) => {
      if (complianceFilter === 'PAID' && !r.isFeePaid) return false;
      if (complianceFilter === 'PENDING' && r.isFeePaid) return false;
      if (categoryFilter !== 'all' && mapRoleToCategory(r.userRole) !== categoryFilter) return false;
      return true;
    });
  }, [approvedRiders, complianceFilter, categoryFilter]);

  const canManagePayments =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'support' ||
    currentUser?.role === 'principal';

  const handleSettle = (req: TransportOptInRequest) => {
    if (!onPayTransportFee) return;
    onPayTransportFee(req.id, selectedPayMethod);
    setSettlingRequestId(null);
    setToastMsg(`Transport fee of ₹${req.feeAmount.toLocaleString('en-IN')} settled for ${req.userName} via ${selectedPayMethod}.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const axisColor = isDark ? '#a8a29e' : '#78716c';
  const gridColor = isDark ? '#292524' : '#e7e5e4';
  const tooltipBg = isDark ? '#1c1917' : '#ffffff';
  const tooltipBorder = isDark ? '#44403c' : '#fed7aa';

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* High-Level Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Bus Transport Revenue & Compliance Analytics
            </span>
          </div>
          <h3 className="text-xl font-black text-stone-900 dark:text-stone-100 font-display">
            Opted Riders Payment Status Dashboard
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-2xl">
            Tracks bus transport fee collections exclusively across users with Coordinator/Admin-approved bus opt-in passes (Students, Teachers, Staff & Administration). Non-bus commuters are excluded from billing.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold">
            {stats.paidCount} Paid · {stats.pendingCount} Pending
          </span>
          {pendingApprovalsCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold">
              {pendingApprovalsCount} Opt-In Pending Review
            </span>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
            Approved Bus Riders
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-stone-900 dark:text-stone-100">
            {stats.totalOpted}
          </div>
          <span className="text-xs text-stone-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-orange-600" />
            <span>Active transport opt-ins</span>
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
            Payment Compliance
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {stats.complianceRate}%
          </div>
          <span className="text-xs text-stone-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {stats.paidCount} of {stats.totalOpted} riders settled
            </span>
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
            Revenue Collected
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-stone-900 dark:text-stone-100">
            ₹{stats.totalCollected.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Verified fee receipts</span>
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
            Pending Collections
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
            ₹{stats.totalPending.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{stats.pendingCount} approved riders due</span>
          </span>
        </div>
      </div>

      {/* Dual Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Payment Compliance Grouped by Role (Paid vs Pending) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                Compliance Grouping by User Role (Paid vs Pending)
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Revenue collected vs pending dues across opted Students, Teachers, Staff & Admin
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-orange-50 dark:bg-stone-800 text-orange-700 dark:text-orange-300 font-bold">
              Grouped Compliance
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={roleComplianceData}
                margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any, entry: any) => {
                    const num = Number(value || 0).toLocaleString('en-IN');
                    if (name === 'Paid Revenue (₹)') {
                      return [`₹${num} (${entry?.payload?.paidCount ?? 0} riders)`, name];
                    }
                    return [`₹${num} (${entry?.payload?.pendingCount ?? 0} riders)`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  dataKey="collectedAmount"
                  name="Paid Revenue (₹)"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
                <Bar
                  dataKey="pendingAmount"
                  name="Pending Dues (₹)"
                  fill="#ea580c"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Payment Collection & Compliance Trend Over Months */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                Transport Fee Collection & Compliance Trend
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Cumulative fee collection trajectory alongside Paid compliance %
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
              AY 2026–27
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="paidAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: axisColor, fontSize: 10.5, fontWeight: 600 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => {
                    if (String(name).includes('%')) return [`${value}%`, name];
                    return [`₹${Number(value || 0).toLocaleString('en-IN')}`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="paidRevenue"
                  name="Paid Collection (₹)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#paidAreaGrad)"
                />
                <Bar
                  yAxisId="left"
                  dataKey="pendingRevenue"
                  name="Pending Dues (₹)"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="compliancePct"
                  name="Compliance (%)"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ea580c' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Role Compliance Breakdown Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roleComplianceData.map((grp) => {
          const total = grp.paidCount + grp.pendingCount;
          const pct = total > 0 ? Math.round((grp.paidCount / total) * 100) : 100;
          return (
            <button
              key={grp.roleKey}
              type="button"
              onClick={() =>
                setCategoryFilter((prev) => (prev === grp.roleKey ? 'all' : grp.roleKey))
              }
              className={`p-4 rounded-2xl border text-left transition ${
                categoryFilter === grp.roleKey
                  ? 'bg-orange-50/80 dark:bg-stone-800 border-orange-400 dark:border-orange-600'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-orange-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100">
                  {grp.category}
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {pct}% Paid
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-stone-500">
                <span>Paid: {grp.paidCount}</span>
                <span className={grp.pendingCount > 0 ? 'text-amber-600 font-bold' : ''}>
                  Pending: {grp.pendingCount}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Grouped Paid / Pending Ledger Table */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Bus className="w-4 h-4 text-orange-600" />
            <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
              Opted Bus Riders Compliance Ledger ({filteredDirectory.length})
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              {(['ALL', 'PAID', 'PENDING'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setComplianceFilter(st)}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    complianceFilter === st
                      ? 'bg-white dark:bg-stone-700 text-orange-600 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All Riders'
                    : st === 'PAID'
                    ? `Paid (${stats.paidCount})`
                    : `Pending (${stats.pendingCount})`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-semibold"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 text-[11px] uppercase tracking-wider text-stone-400">
                <th className="py-2.5 pr-3">Rider</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Station & Seat</th>
                <th className="py-2.5 px-3">Fee Tier</th>
                <th className="py-2.5 px-3">Compliance</th>
                <th className="py-2.5 pl-3 text-right">Reference / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
              {filteredDirectory.map((req) => {
                const cat = mapRoleToCategory(req.userRole);
                const isSelf =
                  currentUser &&
                  (currentUser.id.toLowerCase().includes(req.userKey.toLowerCase()) ||
                    currentUser.child === req.userKey ||
                    currentUser.name === req.userName);
                const canPay = Boolean(onPayTransportFee && !req.isFeePaid && (canManagePayments || isSelf));

                return (
                  <tr key={req.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40">
                    <td className="py-3 pr-3">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{req.userName}</div>
                      <div className="text-[10px] font-mono text-stone-400">{req.id}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold capitalize text-[11px]">
                        {cat}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-stone-800 dark:text-stone-200">{req.stopName}</div>
                      <div className="text-[10px] font-mono text-stone-400">
                        Seat {req.allocatedSeat || 'TBD'} · {req.tripType}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold tabular-nums text-stone-900 dark:text-stone-100">
                      ₹{req.feeAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      {req.isFeePaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Paid</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      {req.isFeePaid ? (
                        <div className="font-mono text-[11px] text-stone-500">
                          <div>{req.paymentRef || 'VERIFIED'}</div>
                          <div className="text-[10px] text-stone-400">{req.paidAt || 'Cleared'}</div>
                        </div>
                      ) : canPay ? (
                        settlingRequestId === req.id ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <select
                              value={selectedPayMethod}
                              onChange={(e) =>
                                setSelectedPayMethod(e.target.value as FeeTransaction['paymentMethod'])
                              }
                              className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-[11px]"
                            >
                              <option value="UPI">UPI</option>
                              <option value="NetBanking">NetBanking</option>
                              <option value="DebitCard">Card</option>
                              <option value="CampusWallet">Wallet</option>
                            </select>
                            <button
                              onClick={() => handleSettle(req)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setSettlingRequestId(null)}
                              className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSettlingRequestId(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] transition"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Collect / Pay Fee</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-stone-400 italic">Awaiting user settlement</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredDirectory.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    No approved riders match the selected compliance filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
