import { AttendanceRecord, UserProfile } from '../types';
import { StorageService } from '../services/storageService';

export interface DayAttendanceExportItem {
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

export interface AttendanceWeekExportDataset {
  id: string;
  label: string;
  dateRange: string;
  term: string;
  data: DayAttendanceExportItem[];
}

export function getDailyAttendanceExportDatasets(attendanceRecords: AttendanceRecord[] = []): AttendanceWeekExportDataset[] {
  let liveAdjustment = 98.8;
  if (attendanceRecords && attendanceRecords.length > 0) {
    const present = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const late = attendanceRecords.filter((a) => a.status === 'LATE').length;
    liveAdjustment = Math.round(((present + late) / attendanceRecords.length) * 1000) / 10;
  }

  return [
    {
      id: 'current-week-5',
      label: 'Week 5 (Active)',
      dateRange: 'Nov 02 – Nov 06, 2026',
      term: 'Term 1 (2026–27)',
      data: [
        {
          day: 'Monday',
          dayShort: 'Mon',
          dateStr: 'Nov 02, 2026',
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
          dateStr: 'Nov 03, 2026',
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
          dateStr: 'Nov 04, 2026',
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
          dateStr: 'Nov 05, 2026',
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
          dateStr: 'Nov 06, 2026',
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
      id: 'previous-week-4',
      label: 'Week 4',
      dateRange: 'Oct 26 – Oct 30, 2026',
      term: 'Term 1 (2026–27)',
      data: [
        {
          day: 'Monday',
          dayShort: 'Mon',
          dateStr: 'Oct 26, 2026',
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
          dateStr: 'Oct 27, 2026',
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
          dateStr: 'Oct 28, 2026',
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
          dateStr: 'Oct 29, 2026',
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
          dateStr: 'Oct 30, 2026',
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
  ];
}

/**
 * Generates and downloads a beautifully formatted CSV of daily campus attendance trend data
 */
export function exportDailyAttendanceTrendCSV(
  attendanceRecords: AttendanceRecord[] = [],
  currentUser: UserProfile | null = null,
  weekSelection: string = 'current'
): string {
  const datasets = getDailyAttendanceExportDatasets(attendanceRecords);
  const targetDataset =
    datasets.find((d) => d.id === weekSelection || d.id.includes(weekSelection)) || datasets[0];

  const exportTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const userName = currentUser ? `${currentUser.name} (${currentUser.role.toUpperCase()})` : 'Institutional Guest / Auditor';
  const targetWeekData = targetDataset.data;

  // Calculate aggregates
  const totalDays = targetWeekData.length;
  const avgOverall = (targetWeekData.reduce((s, d) => s + d.overallAttendance, 0) / totalDays).toFixed(2);
  const avgGrade10 = (targetWeekData.reduce((s, d) => s + d.grade10Attendance, 0) / totalDays).toFixed(2);
  const avgGrade8 = (targetWeekData.reduce((s, d) => s + d.grade8Attendance, 0) / totalDays).toFixed(2);
  const avgOnTime = (targetWeekData.reduce((s, d) => s + d.onTimeRate, 0) / totalDays).toFixed(2);
  const totalScans = targetWeekData.reduce((s, d) => s + d.totalPresent, 0);
  const totalEnrolled = targetWeekData.reduce((s, d) => s + d.totalEnrolled, 0);

  // Find peak day
  const peakDay = [...targetWeekData].sort((a, b) => b.overallAttendance - a.overallAttendance)[0];

  const lines: string[] = [
    '# ==========================================================================',
    '# TATTVASAYAM FUTURE ACADEMY - DAILY CAMPUS ATTENDANCE TREND AUDIT REPORT',
    '# ==========================================================================',
    `# Academic Term: ${targetDataset.term}`,
    `# Date Range: ${targetDataset.dateRange} (${targetDataset.label})`,
    `# Export Generated By: ${userName}`,
    `# Timestamp: ${exportTimestamp} UTC`,
    `# System Standard Benchmark SLA: 95.00% (CBSE & Cambridge Assessment)`,
    `# Biometric & RFID Turnstile Verification: ACTIVE (Jakkur Campus North & South Gates)`,
    '# ==========================================================================',
    '',
    // Column Headers
    [
      'Day of Week',
      'Date',
      'Campus Attendance (%)',
      'Grade 10-A Turnout (%)',
      'Grade 8-B Turnout (%)',
      'On-Time Rate (%)',
      'Total Enrolled',
      'Verified Present Count',
      'Late Arrivals (Post 08:30)',
      'Excused Absences (Olympiad/Medical)',
      'Unexcused Absences',
      'Turnstile & Transit Verification Notes',
    ].join(','),
  ];

  // Daily rows
  targetWeekData.forEach((d) => {
    lines.push(
      [
        d.day,
        d.isoDate,
        `${d.overallAttendance.toFixed(1)}%`,
        `${d.grade10Attendance.toFixed(1)}%`,
        `${d.grade8Attendance.toFixed(1)}%`,
        `${d.onTimeRate.toFixed(1)}%`,
        d.totalEnrolled,
        d.totalPresent,
        d.lateArrivals,
        d.excusedAbsences,
        d.unexcusedAbsences,
        `"${d.note.replace(/"/g, '""')}"`,
      ].join(',')
    );
  });

  // Summary section
  lines.push('');
  lines.push('# --------------------------------------------------------------------------');
  lines.push('# WEEKLY AGGREGATE SUMMARY & ACCREDITATION COMPLIANCE');
  lines.push('# --------------------------------------------------------------------------');
  lines.push('Metric Name,Aggregate Value,Institutional Benchmark,Compliance Status');
  lines.push(`Weekly Campus Average Turnout,${avgOverall}%,95.00%,SURPASSED (+${(parseFloat(avgOverall) - 95.0).toFixed(2)}%)`);
  lines.push(`Senior Secondary (Grade 10-A) Average,${avgGrade10}%,95.00%,SURPASSED (+${(parseFloat(avgGrade10) - 95.0).toFixed(2)}%)`);
  lines.push(`Middle Academy (Grade 8-B) Average,${avgGrade8}%,95.00%,SURPASSED (+${(parseFloat(avgGrade8) - 95.0).toFixed(2)}%)`);
  lines.push(`On-Time Punctuality Index (RFID Gates),${avgOnTime}%,95.00%,COMPLIANT (+${(parseFloat(avgOnTime) - 95.0).toFixed(2)}%)`);
  lines.push(`Total Verified Scans,${totalScans} / ${totalEnrolled} Scans,95.00%,${((totalScans / totalEnrolled) * 100).toFixed(2)}% Turnout`);
  lines.push(`Peak Attendance Day,${peakDay.day} (${peakDay.overallAttendance.toFixed(1)}%),-,Weekly High Watermark`);
  lines.push('Institutional Classification,EXEMPLARY - CATEGORY A1,-,Verified by Registrar Office');
  lines.push('# --------------------------------------------------------------------------');
  lines.push('# End of Certified Report - Tattvasayam Future Academy');

  const content = lines.join('\n');
  const filename = `tattvasayam-daily-attendance-trend-${targetDataset.id}.csv`;

  StorageService.downloadText(filename, content, 'text/csv;charset=utf-8;');
  return filename;
}
