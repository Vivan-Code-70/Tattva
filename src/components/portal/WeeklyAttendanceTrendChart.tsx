import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Calendar, CheckCircle2, Award, Clock, ArrowUpRight } from 'lucide-react';
import { AttendanceRecord } from '../../types';

interface WeeklyAttendanceTrendChartProps {
  attendanceRecords?: AttendanceRecord[];
  title?: string;
  subtitle?: string;
  roleContext?: 'principal' | 'teacher';
}

export const WeeklyAttendanceTrendChart: React.FC<WeeklyAttendanceTrendChartProps> = ({
  attendanceRecords = [],
  title = 'Weekly Attendance Trend & Punctuality Index',
  subtitle = 'Verified turnout across 5 consecutive academic weeks from RFID gate turnstiles and class registers',
  roleContext = 'principal',
}) => {
  const [viewMode, setViewMode] = useState<'5weeks' | 'daily'>('5weeks');
  const [activeSeries, setActiveSeries] = useState<{
    overall: boolean;
    grade10: boolean;
    grade8: boolean;
    onTime: boolean;
  }>({
    overall: true,
    grade10: true,
    grade8: roleContext === 'principal',
    onTime: true,
  });

  // Calculate actual present ratio from records if present
  const statsFromRecords = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) return null;
    const present = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const late = attendanceRecords.filter((a) => a.status === 'LATE').length;
    const total = attendanceRecords.length;
    return {
      rate: Math.round(((present + late) / total) * 1000) / 10,
      total,
      present,
    };
  }, [attendanceRecords]);

  // Macro 5-Week Aggregated Data
  const fiveWeekData = [
    {
      period: 'Week 1',
      dateRange: 'Oct 05 – Oct 09',
      overall: 97.4,
      grade10: 98.2,
      grade8: 96.6,
      onTime: 95.8,
      turnoutCount: '48 / 49 present',
    },
    {
      period: 'Week 2',
      dateRange: 'Oct 12 – Oct 16',
      overall: 96.8,
      grade10: 97.5,
      grade8: 96.1,
      onTime: 94.2,
      turnoutCount: '47 / 49 present',
    },
    {
      period: 'Week 3',
      dateRange: 'Oct 19 – Oct 23',
      overall: 98.6,
      grade10: 99.1,
      grade8: 98.1,
      onTime: 97.4,
      turnoutCount: '49 / 49 present',
    },
    {
      period: 'Week 4',
      dateRange: 'Oct 26 – Oct 30',
      overall: 99.0,
      grade10: 99.4,
      grade8: 98.6,
      onTime: 98.2,
      turnoutCount: '49 / 49 present',
    },
    {
      period: 'Week 5 (Active)',
      dateRange: 'Nov 02 – Nov 06',
      overall: statsFromRecords ? statsFromRecords.rate : 98.8,
      grade10: 99.2,
      grade8: 98.4,
      onTime: 97.9,
      turnoutCount: '49 / 49 present',
    },
  ];

  // Daily Breakdown for Current Week
  const dailyData = [
    {
      period: 'Mon (Nov 02)',
      dateRange: 'Day 1',
      overall: 98.5,
      grade10: 99.0,
      grade8: 98.0,
      onTime: 97.5,
      turnoutCount: '48 / 49 present',
    },
    {
      period: 'Tue (Nov 03)',
      dateRange: 'Day 2 (Today)',
      overall: 99.2,
      grade10: 100.0,
      grade8: 98.4,
      onTime: 98.8,
      turnoutCount: '49 / 49 present',
    },
    {
      period: 'Wed (Nov 04)',
      dateRange: 'Day 3',
      overall: 98.6,
      grade10: 98.5,
      grade8: 98.7,
      onTime: 97.0,
      turnoutCount: '48 / 49 present',
    },
    {
      period: 'Thu (Nov 05)',
      dateRange: 'Day 4',
      overall: 99.1,
      grade10: 99.5,
      grade8: 98.7,
      onTime: 98.2,
      turnoutCount: '49 / 49 present',
    },
    {
      period: 'Fri (Nov 06)',
      dateRange: 'Day 5',
      overall: 98.9,
      grade10: 99.0,
      grade8: 98.8,
      onTime: 98.0,
      turnoutCount: '49 / 49 present',
    },
  ];

  const chartData = viewMode === '5weeks' ? fiveWeekData : dailyData;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload;
      return (
        <div className="p-3 bg-stone-900/95 dark:bg-stone-950/95 border border-stone-700 text-white rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
          <div className="font-extrabold text-stone-100 flex items-center justify-between gap-4 border-b border-stone-800 pb-1">
            <span>{label}</span>
            <span className="text-[10px] text-stone-400 font-mono">{item?.dateRange}</span>
          </div>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-stone-300">{entry.name}:</span>
                </div>
                <span className="font-mono font-bold" style={{ color: entry.color }}>
                  {entry.value}%
                </span>
              </div>
            ))}
          </div>
          {item?.turnoutCount && (
            <div className="text-[10px] font-mono text-emerald-400 pt-1 border-t border-stone-800">
              Verified Turnout: {item.turnoutCount}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 sm:p-6 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs space-y-4">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-orange-100 dark:bg-stone-800 text-orange-600 dark:text-orange-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100 font-display">
              {title}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              98.8% Avg
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {subtitle}
          </p>
        </div>

        {/* View Switcher Button Group */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setViewMode('5weeks')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === '5weeks'
                ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            5-Week Trajectory
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'daily'
                ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Current Week Daily
          </button>
        </div>
      </div>

      {/* Interactive Series Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-stone-400 text-[11px] font-semibold mr-1">Display Series:</span>
        <button
          onClick={() => setActiveSeries((s) => ({ ...s, overall: !s.overall }))}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1.5 ${
            activeSeries.overall
              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 text-orange-700 dark:text-orange-300'
              : 'border-stone-200 dark:border-stone-700 text-stone-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-orange-600"></span>
          <span>{roleContext === 'principal' ? 'Overall Academy' : 'Subject Turnout'}</span>
        </button>

        <button
          onClick={() => setActiveSeries((s) => ({ ...s, grade10: !s.grade10 }))}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1.5 ${
            activeSeries.grade10
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300'
              : 'border-stone-200 dark:border-stone-700 text-stone-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>Grade 10-A</span>
        </button>

        {roleContext === 'principal' && (
          <button
            onClick={() => setActiveSeries((s) => ({ ...s, grade8: !s.grade8 }))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1.5 ${
              activeSeries.grade8
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-700 dark:text-purple-300'
                : 'border-stone-200 dark:border-stone-700 text-stone-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            <span>Grade 8-B</span>
          </button>
        )}

        <button
          onClick={() => setActiveSeries((s) => ({ ...s, onTime: !s.onTime }))}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1.5 ${
            activeSeries.onTime
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-700 dark:text-emerald-300'
              : 'border-stone-200 dark:border-stone-700 text-stone-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>On-Time Arrival (No Delay)</span>
        </button>
      </div>

      {/* Line Chart Area via Recharts */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
            <XAxis
              dataKey="period"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#88888830' }}
            />
            <YAxis
              domain={[90, 100]}
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#88888830' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />

            {activeSeries.overall && (
              <Line
                type="monotone"
                dataKey="overall"
                name={roleContext === 'principal' ? 'Overall Turnout' : 'Class Average'}
                stroke="#ea580c"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#ea580c' }}
                activeDot={{ r: 6, stroke: '#ea580c', strokeWidth: 2 }}
              />
            )}

            {activeSeries.grade10 && (
              <Line
                type="monotone"
                dataKey="grade10"
                name="Grade 10-A"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#2563eb' }}
              />
            )}

            {roleContext === 'principal' && activeSeries.grade8 && (
              <Line
                type="monotone"
                dataKey="grade8"
                name="Grade 8-B"
                stroke="#9333ea"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#9333ea' }}
              />
            )}

            {activeSeries.onTime && (
              <Line
                type="monotone"
                dataKey="onTime"
                name="On-Time Index"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Metric Summary Footer Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
            Cohort Average
          </span>
          <div className="text-base font-extrabold text-stone-900 dark:text-stone-100 font-mono mt-0.5 flex items-center gap-1">
            <span>98.8%</span>
            <span className="text-[10px] text-emerald-600 font-sans flex items-center font-bold">
              <ArrowUpRight className="w-3 h-3" /> +0.4%
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
            Grade 10-A Turnout
          </span>
          <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
            99.2%
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
            On-Time Punctuality
          </span>
          <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            97.9%
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
            Excused Absences
          </span>
          <div className="text-base font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-0.5">
            1.2% <span className="text-[10px] text-stone-400 font-sans font-normal">(Olympiad)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
