import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Download,
  Filter,
  BarChart2,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  Building,
  Users,
  FileSpreadsheet,
  Mail,
} from 'lucide-react';
import { AttendanceRecord } from '../types';
import { StorageService } from '../services/storageService';
import { exportDailyAttendanceTrendCSV } from '../utils/attendanceExport';

export interface DailyAttendanceTrendChartProps {
  attendanceRecords?: AttendanceRecord[];
  className?: string;
  defaultWeek?: 'current' | 'prev' | 'oct19';
  onExportCSV?: (filename: string) => void;
  onOpenWorkspace?: (mode: 'sheets' | 'gmail') => void;
}

interface DayAttendanceData {
  day: string;
  dayShort: string;
  dateStr: string;
  isoDate: string;
  overallAttendance: number;
  grade10Attendance: number;
  grade8Attendance: number;
  onTimeRate: number;
  totalEnrolled: number;
  totalPresent: number;
  lateArrivals: number;
  excusedAbsences: number;
  unexcusedAbsences: number;
  note: string;
}

interface WeekDataset {
  id: string;
  label: string;
  dateRange: string;
  data: DayAttendanceData[];
}

export const DailyAttendanceTrendChart: React.FC<DailyAttendanceTrendChartProps> = ({
  attendanceRecords = [],
  className = '',
  defaultWeek = 'current',
  onExportCSV,
  onOpenWorkspace,
}) => {
  const [selectedWeekId, setSelectedWeekId] = useState<string>('current');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [cohortFilter, setCohortFilter] = useState<'all' | 'grade10' | 'grade8'>('all');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const [activeSeries, setActiveSeries] = useState<{
    overall: boolean;
    grade10: boolean;
    grade8: boolean;
    onTime: boolean;
  }>({
    overall: true,
    grade10: true,
    grade8: true,
    onTime: true,
  });

  // Calculate live ratio from prop attendanceRecords if available
  const liveStats = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) return null;
    const present = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const late = attendanceRecords.filter((a) => a.status === 'LATE').length;
    const excused = attendanceRecords.filter((a) => a.status === 'EXCUSED').length;
    const total = attendanceRecords.length;
    const rate = Math.round(((present + late) / total) * 1000) / 10;
    return { rate, present, late, excused, total };
  }, [attendanceRecords]);

  // Daily Campus Attendance data partitioned by academic week
  const weekDatasets: WeekDataset[] = useMemo(() => {
    const liveAdjustment = liveStats ? liveStats.rate : 98.8;

    return [
      {
        id: 'current',
        label: 'Current Academic Week (Week 5)',
        dateRange: 'Nov 02 – Nov 06, 2026',
        data: [
          {
            day: 'Monday',
            dayShort: 'Mon',
            dateStr: 'Nov 02',
            isoDate: '2026-11-02',
            overallAttendance: 98.4,
            grade10Attendance: 99.1,
            grade8Attendance: 97.8,
            onTimeRate: 97.5,
            totalEnrolled: 442,
            totalPresent: 435,
            lateArrivals: 4,
            excusedAbsences: 5,
            unexcusedAbsences: 2,
            note: 'Morning weather clear, transit routes punctual',
          },
          {
            day: 'Tuesday',
            dayShort: 'Tue',
            dateStr: 'Nov 03',
            isoDate: '2026-11-03',
            overallAttendance: 99.3,
            grade10Attendance: 100.0,
            grade8Attendance: 98.6,
            onTimeRate: 98.9,
            totalEnrolled: 442,
            totalPresent: 439,
            lateArrivals: 2,
            excusedAbsences: 3,
            unexcusedAbsences: 0,
            note: 'Peak weekly turnout • 100% Grade 10-A physics lab presence',
          },
          {
            day: 'Wednesday',
            dayShort: 'Wed',
            dateStr: 'Nov 04',
            isoDate: '2026-11-04',
            overallAttendance: liveAdjustment > 0 ? liveAdjustment : 98.6,
            grade10Attendance: 98.8,
            grade8Attendance: 98.4,
            onTimeRate: 97.1,
            totalEnrolled: 442,
            totalPresent: 436,
            lateArrivals: 5,
            excusedAbsences: 5,
            unexcusedAbsences: 1,
            note: 'Inter-school robotics tournament delegation excused',
          },
          {
            day: 'Thursday',
            dayShort: 'Thu',
            dateStr: 'Nov 05',
            isoDate: '2026-11-05',
            overallAttendance: 99.1,
            grade10Attendance: 99.5,
            grade8Attendance: 98.7,
            onTimeRate: 98.2,
            totalEnrolled: 442,
            totalPresent: 438,
            lateArrivals: 3,
            excusedAbsences: 3,
            unexcusedAbsences: 1,
            note: 'Special masterclass session on quantum computing',
          },
          {
            day: 'Friday',
            dayShort: 'Fri',
            dateStr: 'Nov 06',
            isoDate: '2026-11-06',
            overallAttendance: 98.9,
            grade10Attendance: 99.2,
            grade8Attendance: 98.5,
            onTimeRate: 98.0,
            totalEnrolled: 442,
            totalPresent: 437,
            lateArrivals: 3,
            excusedAbsences: 4,
            unexcusedAbsences: 1,
            note: 'Weekly assembly & philosophical debate turnout verified',
          },
        ],
      },
      {
        id: 'prev',
        label: 'Previous Academic Week (Week 4)',
        dateRange: 'Oct 26 – Oct 30, 2026',
        data: [
          {
            day: 'Monday',
            dayShort: 'Mon',
            dateStr: 'Oct 26',
            isoDate: '2026-10-26',
            overallAttendance: 98.2,
            grade10Attendance: 98.9,
            grade8Attendance: 97.5,
            onTimeRate: 96.8,
            totalEnrolled: 442,
            totalPresent: 434,
            lateArrivals: 6,
            excusedAbsences: 6,
            unexcusedAbsences: 2,
            note: 'Post-weekend transit verification',
          },
          {
            day: 'Tuesday',
            dayShort: 'Tue',
            dateStr: 'Oct 27',
            isoDate: '2026-10-27',
            overallAttendance: 99.1,
            grade10Attendance: 99.6,
            grade8Attendance: 98.5,
            onTimeRate: 98.4,
            totalEnrolled: 442,
            totalPresent: 438,
            lateArrivals: 3,
            excusedAbsences: 3,
            unexcusedAbsences: 1,
            note: 'CBSE Regional Olympiad trial runs',
          },
          {
            day: 'Wednesday',
            dayShort: 'Wed',
            dateStr: 'Oct 28',
            isoDate: '2026-10-28',
            overallAttendance: 99.3,
            grade10Attendance: 99.8,
            grade8Attendance: 98.9,
            onTimeRate: 98.7,
            totalEnrolled: 442,
            totalPresent: 439,
            lateArrivals: 2,
            excusedAbsences: 2,
            unexcusedAbsences: 1,
            note: '100% homeroom verified attendance',
          },
          {
            day: 'Thursday',
            dayShort: 'Thu',
            dateStr: 'Oct 29',
            isoDate: '2026-10-29',
            overallAttendance: 99.5,
            grade10Attendance: 100.0,
            grade8Attendance: 99.1,
            onTimeRate: 99.1,
            totalEnrolled: 442,
            totalPresent: 440,
            lateArrivals: 1,
            excusedAbsences: 2,
            unexcusedAbsences: 0,
            note: 'Annual science symposium keynote sessions',
          },
          {
            day: 'Friday',
            dayShort: 'Fri',
            dateStr: 'Oct 30',
            isoDate: '2026-10-30',
            overallAttendance: 99.0,
            grade10Attendance: 99.3,
            grade8Attendance: 98.7,
            onTimeRate: 98.1,
            totalEnrolled: 442,
            totalPresent: 438,
            lateArrivals: 4,
            excusedAbsences: 3,
            unexcusedAbsences: 1,
            note: 'Pre-weekend club electives and music rehearsal',
          },
        ],
      },
      {
        id: 'oct19',
        label: 'Mid-Term Evaluation Week (Week 3)',
        dateRange: 'Oct 19 – Oct 23, 2026',
        data: [
          {
            day: 'Monday',
            dayShort: 'Mon',
            dateStr: 'Oct 19',
            isoDate: '2026-10-19',
            overallAttendance: 97.9,
            grade10Attendance: 98.5,
            grade8Attendance: 97.2,
            onTimeRate: 96.5,
            totalEnrolled: 442,
            totalPresent: 433,
            lateArrivals: 7,
            excusedAbsences: 7,
            unexcusedAbsences: 2,
            note: 'Term examination orientation',
          },
          {
            day: 'Tuesday',
            dayShort: 'Tue',
            dateStr: 'Oct 20',
            isoDate: '2026-10-20',
            overallAttendance: 98.7,
            grade10Attendance: 99.2,
            grade8Attendance: 98.1,
            onTimeRate: 97.6,
            totalEnrolled: 442,
            totalPresent: 436,
            lateArrivals: 4,
            excusedAbsences: 4,
            unexcusedAbsences: 2,
            note: 'Mathematics practical assessments',
          },
          {
            day: 'Wednesday',
            dayShort: 'Wed',
            dateStr: 'Oct 21',
            isoDate: '2026-10-21',
            overallAttendance: 98.9,
            grade10Attendance: 99.4,
            grade8Attendance: 98.3,
            onTimeRate: 97.8,
            totalEnrolled: 442,
            totalPresent: 437,
            lateArrivals: 3,
            excusedAbsences: 4,
            unexcusedAbsences: 1,
            note: 'Physical chemistry laboratory evaluations',
          },
          {
            day: 'Thursday',
            dayShort: 'Thu',
            dateStr: 'Oct 22',
            isoDate: '2026-10-22',
            overallAttendance: 99.2,
            grade10Attendance: 99.7,
            grade8Attendance: 98.7,
            onTimeRate: 98.5,
            totalEnrolled: 442,
            totalPresent: 438,
            lateArrivals: 2,
            excusedAbsences: 3,
            unexcusedAbsences: 1,
            note: 'Cambridge diagnostic assessment cohort',
          },
          {
            day: 'Friday',
            dayShort: 'Fri',
            dateStr: 'Oct 23',
            isoDate: '2026-10-23',
            overallAttendance: 98.6,
            grade10Attendance: 99.0,
            grade8Attendance: 98.2,
            onTimeRate: 97.4,
            totalEnrolled: 442,
            totalPresent: 436,
            lateArrivals: 5,
            excusedAbsences: 5,
            unexcusedAbsences: 1,
            note: 'Literature seminar and linguistics viva',
          },
        ],
      },
    ];
  }, [liveStats]);

  const activeWeekDataset = useMemo(() => {
    return weekDatasets.find((w) => w.id === selectedWeekId) || weekDatasets[0];
  }, [selectedWeekId, weekDatasets]);

  const dailyData = activeWeekDataset.data;

  // Aggregate stats for the active week
  const weekAggregates = useMemo(() => {
    const totalDays = dailyData.length;
    const avgOverall = dailyData.reduce((sum, d) => sum + d.overallAttendance, 0) / totalDays;
    const avgGrade10 = dailyData.reduce((sum, d) => sum + d.grade10Attendance, 0) / totalDays;
    const avgGrade8 = dailyData.reduce((sum, d) => sum + d.grade8Attendance, 0) / totalDays;
    const avgOnTime = dailyData.reduce((sum, d) => sum + d.onTimeRate, 0) / totalDays;
    const totalScans = dailyData.reduce((sum, d) => sum + d.totalPresent, 0);
    const totalPossible = dailyData.reduce((sum, d) => sum + d.totalEnrolled, 0);

    let peakDay = dailyData[0];
    dailyData.forEach((d) => {
      if (d.overallAttendance > peakDay.overallAttendance) {
        peakDay = d;
      }
    });

    return {
      avgOverall: Math.round(avgOverall * 100) / 100,
      avgGrade10: Math.round(avgGrade10 * 100) / 100,
      avgGrade8: Math.round(avgGrade8 * 100) / 100,
      avgOnTime: Math.round(avgOnTime * 100) / 100,
      totalScans,
      totalPossible,
      peakDay,
      targetDelta: Math.round((avgOverall - 95.0) * 100) / 100,
    };
  }, [dailyData]);

  // Export Daily Attendance CSV
  const handleExportCSV = () => {
    const fname = exportDailyAttendanceTrendCSV(attendanceRecords, null, selectedWeekId);
    if (onExportCSV) {
      onExportCSV(fname);
    }
  };

  // Custom Tooltip for Recharts
  const CustomAttendanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayItem = dailyData.find(
        (d) => d.dayShort === label || d.day === label || `${d.dayShort} (${d.dateStr})` === label
      ) || payload[0]?.payload;

      return (
        <div className="p-3.5 bg-stone-900/95 dark:bg-stone-950/95 border border-stone-700/80 text-white rounded-2xl shadow-2xl text-xs space-y-2 backdrop-blur-md min-w-[240px]">
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
            <div>
              <span className="font-extrabold text-stone-100 text-sm">{dayItem?.day}</span>
              <span className="text-[11px] text-stone-400 block font-mono">
                {dayItem?.dateStr} • {dayItem?.isoDate}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
              {dayItem?.overallAttendance}% Campus
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {payload.map((entry: any, idx: number) => (
              <div key={`tt-${idx}`} className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-stone-300 font-medium">{entry.name}:</span>
                </div>
                <span className="font-mono font-bold" style={{ color: entry.color }}>
                  {entry.value}%
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-800 space-y-1 text-[10px] text-stone-300 font-mono">
            <div className="flex justify-between">
              <span className="text-stone-400">Verified Gate Turnout:</span>
              <span className="text-emerald-400 font-bold">
                {dayItem?.totalPresent} / {dayItem?.totalEnrolled} students
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Late Arrivals (Post 08:30):</span>
              <span className="text-amber-400">{dayItem?.lateArrivals} students</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Excused (Medical/Olympiad):</span>
              <span className="text-blue-400">{dayItem?.excusedAbsences} students</span>
            </div>
          </div>

          {dayItem?.note && (
            <div className="text-[10px] text-stone-400 italic pt-1 border-t border-stone-800/60 leading-tight">
              "{dayItem.note}"
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Recharts formatted chart data with display label
  const formattedChartData = useMemo(() => {
    return dailyData.map((d) => ({
      ...d,
      displayLabel: `${d.dayShort} (${d.dateStr})`,
    }));
  }, [dailyData]);

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/70 shadow-xs space-y-5 transition-all ${className}`}
    >
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-orange-100 dark:border-stone-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <TrendingUp className="w-5 h-5 shrink-0" />
            </span>
            <h3 className="font-extrabold text-base sm:text-lg text-stone-900 dark:text-stone-100 font-display">
              Weekly Campus Attendance Percentage
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {weekAggregates.avgOverall}% Weekly Avg
            </span>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-stone-800 dark:text-orange-300 border border-orange-200 dark:border-stone-700">
              CBSE / Cambridge Target: 95.0%
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl">
            Interactive daily attendance trend chart tracking verified RFID gate scans, homeroom roll calls, and punctuality across weekdays for {activeWeekDataset.dateRange}.
          </p>
        </div>

        {/* Controls: Week Selector, View Mode, Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-orange-200 dark:border-stone-700 bg-orange-50/70 dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {weekDatasets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Type Toggle: Area vs Bar */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                chartType === 'area'
                  ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
              title="Area Trend Curve"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Trend Spline</span>
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
              title="Daily Turnout Bars"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Day Bars</span>
            </button>
          </div>

          {/* CSV Download Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-xl transition"
            title="Download Daily Attendance Dataset"
          >
            <Download className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-stone-800/40 border border-orange-200/60 dark:border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
            Weekly Campus Turnout
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-orange-600 dark:text-orange-400 font-mono mt-0.5 flex items-baseline gap-1.5">
            <span>{weekAggregates.avgOverall}%</span>
            <span className="text-[11px] text-emerald-600 font-sans font-bold flex items-center">
              <ArrowUpRight className="w-3 h-3" />+{weekAggregates.targetDelta}%
            </span>
          </div>
          <span className="text-[10px] text-stone-400 block truncate">
            Benchmark: 95.0% SLA met
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-stone-800/40 border border-blue-200/60 dark:border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
            Grade 10-A Average
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
            {weekAggregates.avgGrade10}%
          </div>
          <span className="text-[10px] text-stone-400 block truncate">
            Senior secondary cohort
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-stone-800/40 border border-purple-200/60 dark:border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
            Grade 8-B Average
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-0.5">
            {weekAggregates.avgGrade8}%
          </div>
          <span className="text-[10px] text-stone-400 block truncate">
            Middle academy cohort
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-stone-800/40 border border-emerald-200/60 dark:border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
            On-Time Punctuality
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 flex items-baseline gap-1.5">
            <span>{weekAggregates.avgOnTime}%</span>
            <span className="text-[10px] text-emerald-600 font-sans font-medium">Pre-08:30</span>
          </div>
          <span className="text-[10px] text-stone-400 block truncate">
            Peak Day: {weekAggregates.peakDay.day} ({weekAggregates.peakDay.overallAttendance}%)
          </span>
        </div>
      </div>

      {/* Series Filter Checkboxes */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl border border-stone-200/70 dark:border-stone-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-stone-500 dark:text-stone-400 font-bold text-[11px] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-orange-600" />
            <span>Active Series:</span>
          </span>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, overall: !s.overall }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1.5 ${
              activeSeries.overall
                ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 text-orange-700 dark:text-orange-300'
                : 'border-stone-200 dark:border-stone-700 text-stone-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
            <span>Campus Overall %</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, grade10: !s.grade10 }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1.5 ${
              activeSeries.grade10
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300'
                : 'border-stone-200 dark:border-stone-700 text-stone-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Grade 10-A %</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, grade8: !s.grade8 }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1.5 ${
              activeSeries.grade8
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-700 dark:text-purple-300'
                : 'border-stone-200 dark:border-stone-700 text-stone-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <span>Grade 8-B %</span>
          </button>

          <button
            onClick={() => setActiveSeries((s) => ({ ...s, onTime: !s.onTime }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1.5 ${
              activeSeries.onTime
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                : 'border-stone-200 dark:border-stone-700 text-stone-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>On-Time Punctuality %</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
          <span className="w-2.5 h-0.5 bg-red-500 inline-block"></span>
          <span>Target Benchmark: 95.0%</span>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div className="h-72 sm:h-80 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart
              data={formattedChartData}
              margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorGrade10" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorGrade8" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
              <XAxis
                dataKey="displayLabel"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#88888830' }}
              />
              <YAxis
                domain={[92, 100]}
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#88888830' }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomAttendanceTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
              />

              {/* Benchmark Reference Line */}
              <ReferenceLine
                y={95.0}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Target (95%)',
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />

              {activeSeries.overall && (
                <Area
                  type="monotone"
                  dataKey="overallAttendance"
                  name="Campus Overall %"
                  stroke="#ea580c"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorOverall)"
                  dot={{ r: 4, strokeWidth: 2, fill: '#ea580c' }}
                  activeDot={{ r: 7, stroke: '#ea580c', strokeWidth: 2 }}
                />
              )}

              {activeSeries.grade10 && (
                <Area
                  type="monotone"
                  dataKey="grade10Attendance"
                  name="Grade 10-A %"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorGrade10)"
                  dot={{ r: 3, fill: '#2563eb' }}
                />
              )}

              {activeSeries.grade8 && (
                <Area
                  type="monotone"
                  dataKey="grade8Attendance"
                  name="Grade 8-B %"
                  stroke="#9333ea"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorGrade8)"
                  dot={{ r: 3, fill: '#9333ea' }}
                />
              )}

              {activeSeries.onTime && (
                <Line
                  type="monotone"
                  dataKey="onTimeRate"
                  name="On-Time Rate %"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                />
              )}
            </AreaChart>
          ) : (
            <BarChart
              data={formattedChartData}
              margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
              <XAxis
                dataKey="displayLabel"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#88888830' }}
              />
              <YAxis
                domain={[92, 100]}
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#88888830' }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomAttendanceTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
              />
              <ReferenceLine
                y={95.0}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Target (95%)',
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />

              {activeSeries.overall && (
                <Bar
                  dataKey="overallAttendance"
                  name="Campus Overall %"
                  fill="#ea580c"
                  radius={[6, 6, 0, 0]}
                />
              )}
              {activeSeries.grade10 && (
                <Bar
                  dataKey="grade10Attendance"
                  name="Grade 10-A %"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                />
              )}
              {activeSeries.grade8 && (
                <Bar
                  dataKey="grade8Attendance"
                  name="Grade 8-B %"
                  fill="#9333ea"
                  radius={[6, 6, 0, 0]}
                />
              )}
              {activeSeries.onTime && (
                <Bar
                  dataKey="onTimeRate"
                  name="On-Time Rate %"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Daily Breakdown Cards (Mon–Fri) */}
      <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-600" />
            <span>Daily Weekday Turnout Breakdown ({activeWeekDataset.dateRange})</span>
          </span>
          <span className="text-[11px] text-stone-400 font-mono">
            Verified Total: {weekAggregates.totalScans} / {weekAggregates.totalPossible} Scans
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {dailyData.map((d, index) => {
            const isPeak = d.day === weekAggregates.peakDay.day;
            const prevDay = index > 0 ? dailyData[index - 1] : null;
            const diff = prevDay
              ? Math.round((d.overallAttendance - prevDay.overallAttendance) * 10) / 10
              : 0;

            return (
              <div
                key={d.day}
                onMouseEnter={() => setHoveredDay(d.day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  hoveredDay === d.day
                    ? 'border-orange-500 bg-orange-50/70 dark:bg-stone-800 shadow-md scale-[1.02]'
                    : isPeak
                    ? 'border-orange-300 dark:border-orange-900/60 bg-orange-50/30 dark:bg-stone-800/60'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100">
                    {d.dayShort}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">{d.dateStr}</span>
                </div>

                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="text-lg font-black text-orange-600 dark:text-orange-400 font-mono">
                    {d.overallAttendance}%
                  </span>
                  {prevDay && (
                    <span
                      className={`text-[10px] font-mono font-bold flex items-center ${
                        diff >= 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {diff >= 0 ? `+${diff}%` : `${diff}%`}
                    </span>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800/80 space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Present:</span>
                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                      {d.totalPresent}/{d.totalEnrolled}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Punctual:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {d.onTimeRate}%
                    </span>
                  </div>
                </div>

                {isPeak && (
                  <div className="mt-2 pt-1 border-t border-orange-200/50 dark:border-orange-900/40">
                    <span className="text-[9px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider block">
                      ★ Weekly Peak
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SUMMARY TABLE: EXACT WEEKLY PERCENTAGE VALUES & COHORT BREAKDOWN */}
      <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100 flex items-center gap-2 font-display">
              <Layers className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Weekly Attendance Summary Table (Exact Percentage Values)</span>
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Quick-read tabular alternative to the visual trend line across academic cohorts ({activeWeekDataset.dateRange})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white dark:bg-stone-800 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-stone-700 rounded-xl hover:bg-orange-50 dark:hover:bg-stone-700 shadow-xs transition"
              title="Download daily attendance trend data as formatted CSV"
            >
              <Download className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Export CSV</span>
            </button>

            {onOpenWorkspace && (
              <>
                <button
                  onClick={() => onOpenWorkspace('sheets')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-xs transition"
                  title="Export this attendance matrix to Google Sheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Google Sheets</span>
                </button>

                <button
                  onClick={() => onOpenWorkspace('gmail')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-stone-700 rounded-xl hover:bg-orange-100 dark:hover:bg-stone-800 shadow-xs transition"
                  title="Email attendance report via Gmail"
                >
                  <Mail className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>Gmail</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabular Matrix */}
        <div className="overflow-x-auto rounded-xl border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200 dark:border-stone-700">
                <th className="p-2.5">Academic Day & Date</th>
                <th className="p-2.5 text-center">Campus Overall %</th>
                <th className="p-2.5 text-center">Grade 10-A %</th>
                <th className="p-2.5 text-center">Grade 8-B %</th>
                <th className="p-2.5 text-center">On-Time %</th>
                <th className="p-2.5 text-center">Verified Scans</th>
                <th className="p-2.5 text-center">Tardy (Post 08:30)</th>
                <th className="p-2.5 text-center">Excused</th>
                <th className="p-2.5">Accreditation SLA & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-mono">
              {dailyData.map((d, idx) => {
                const isPeak = d.day === weekAggregates.peakDay.day;
                return (
                  <tr
                    key={d.day}
                    className={`transition-colors ${
                      isPeak
                        ? 'bg-orange-50/50 dark:bg-orange-950/20 font-semibold'
                        : idx % 2 === 0
                        ? 'bg-white dark:bg-stone-900'
                        : 'bg-stone-50/50 dark:bg-stone-900/40'
                    }`}
                  >
                    <td className="p-2.5 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-stone-900 dark:text-stone-100">{d.day}</span>
                        <span className="text-[11px] text-stone-400 font-mono">({d.dateStr})</span>
                        {isPeak && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                            ★ Peak
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-extrabold text-orange-600 dark:text-orange-400 text-sm">
                      {d.overallAttendance.toFixed(1)}%
                    </td>
                    <td className="p-2.5 text-center text-blue-600 dark:text-blue-400 font-bold">
                      {d.grade10Attendance.toFixed(1)}%
                    </td>
                    <td className="p-2.5 text-center text-purple-600 dark:text-purple-400 font-bold">
                      {d.grade8Attendance.toFixed(1)}%
                    </td>
                    <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                      {d.onTimeRate.toFixed(1)}%
                    </td>
                    <td className="p-2.5 text-center text-stone-700 dark:text-stone-300">
                      {d.totalPresent} / {d.totalEnrolled}
                    </td>
                    <td className="p-2.5 text-center text-amber-600 dark:text-amber-400 font-bold">
                      {d.lateArrivals}
                    </td>
                    <td className="p-2.5 text-center text-blue-500">
                      {d.excusedAbsences}
                    </td>
                    <td className="p-2.5 font-sans text-stone-600 dark:text-stone-400 text-[11px] max-w-xs truncate">
                      {d.note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-orange-100/70 dark:bg-stone-800/90 font-bold text-stone-900 dark:text-stone-100 text-xs border-t-2 border-orange-300 dark:border-stone-700">
                <td className="p-3 font-sans uppercase tracking-wider text-[11px]">
                  Weekly Aggregate Average:
                </td>
                <td className="p-3 text-center font-mono font-black text-orange-700 dark:text-orange-400 text-sm">
                  {weekAggregates.avgOverall}%
                </td>
                <td className="p-3 text-center font-mono text-blue-600 dark:text-blue-400 font-black">
                  {weekAggregates.avgGrade10}%
                </td>
                <td className="p-3 text-center font-mono text-purple-600 dark:text-purple-400 font-black">
                  {weekAggregates.avgGrade8}%
                </td>
                <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-black">
                  {weekAggregates.avgOnTime}%
                </td>
                <td className="p-3 text-center font-mono text-stone-800 dark:text-stone-200 font-bold">
                  {weekAggregates.totalScans} / {weekAggregates.totalPossible}
                </td>
                <td className="p-3 text-center font-mono text-stone-500">-</td>
                <td className="p-3 text-center font-mono text-stone-500">-</td>
                <td className="p-3 font-sans text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  ✓ Exemplary Status (+{weekAggregates.targetDelta}% vs 95.0% SLA Target)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
