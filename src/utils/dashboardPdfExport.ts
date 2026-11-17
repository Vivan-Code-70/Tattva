import { jsPDF } from 'jspdf';
import {
  AiLogItem,
  Assignment,
  AttendanceRecord,
  LeaveRequest,
  QuizResult,
  TimetablePeriod,
  UserProfile,
} from '../types';

export interface StudentSubjectCompletionRow {
  subject: string;
  shortName: string;
  completed: number;
  total: number;
  completionPct: number;
  score: number;
  isOpted: boolean;
}

export interface StudentDashboardPdfPayload {
  user: UserProfile;
  studentKey: string;
  neuralGpa: string;
  optedSubjects: string[];
  scores: number[];
  assignments: Assignment[];
  subjectCompletionRows: StudentSubjectCompletionRow[];
  todayDayName: string;
  todayPeriods: TimetablePeriod[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
}

export interface TeacherClassMasteryRow {
  subject: string;
  average: number;
}

export interface TeacherClassScheduleRow {
  period: string;
  time: string;
  subject: string;
  class: string;
  room: string;
}

export interface TeacherDashboardPdfPayload {
  user: UserProfile;
  facultyClass: string;
  assignments: Assignment[];
  classMastery: TeacherClassMasteryRow[];
  todaysClasses: TeacherClassScheduleRow[];
  localAttendance: Record<string, 'present' | 'absent' | 'late'>;
  attendanceRecords: AttendanceRecord[];
  quizResults: QuizResult[];
  aiLogs: AiLogItem[];
}

function drawBrandedHeader(
  doc: jsPDF,
  subtitle: string,
  personName: string,
  metaLine: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Warm orange institutional banner
  doc.setFillColor(234, 88, 12); // #ea580c
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setFillColor(217, 119, 6); // accent stripe
  doc.rect(0, 34, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TATTVASWAYAM FUTURE ACADEMY', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(subtitle, 14, 20);

  doc.setFontSize(8.5);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 14, 13, {
    align: 'right',
  });
  doc.text('Jakkur Campus • Bengaluru', pageWidth - 14, 20, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${personName}  |  ${metaLine}`, 14, 29);

  return 44;
}

function drawSectionHeading(doc: jsPDF, title: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 247, 237); // orange-50
  doc.setDrawColor(253, 186, 116); // orange-300
  doc.roundedRect(14, y, pageWidth - 28, 8, 1.5, 1.5, 'FD');

  doc.setTextColor(154, 52, 18); // orange-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, 18, y + 5.5);

  return y + 12;
}

function ensureSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + neededHeight > pageHeight - 16) {
    doc.addPage();
    return 18;
  }
  return currentY;
}

function addFooters(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(231, 229, 228);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(
      'Tattvaswayam Future Academy Portal • Official Academic Dashboard Export',
      14,
      pageHeight - 6.5
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6.5, {
      align: 'right',
    });
  }
}

export function exportStudentDashboardPdf(payload: StudentDashboardPdfPayload): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const totalTasks = payload.assignments.length;
  const completedTasks = payload.assignments.filter(
    (a) => Boolean(a.done[payload.studentKey])
  ).length;
  const overallCompletionPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const presentCount = payload.attendanceRecords.filter(
    (a) => a.status === 'PRESENT'
  ).length;
  const attendancePct =
    payload.attendanceRecords.length > 0
      ? Math.round((presentCount / payload.attendanceRecords.length) * 100)
      : 98;

  let y = drawBrandedHeader(
    doc,
    'Student Academic Performance & 13-Subject Task Progress Report',
    payload.user.name,
    `${payload.user.title} • Opted Subjects: ${payload.optedSubjects.length}/13`
  );

  // KPI Summary Boxes
  const kpis = [
    { label: 'Cumulative GPA', value: `${payload.neuralGpa}%` },
    { label: 'Task Completion', value: `${overallCompletionPct}% (${completedTasks}/${totalTasks})` },
    { label: 'Attendance Rate', value: `${attendancePct}%` },
    { label: 'Opted Curriculum', value: `${payload.optedSubjects.length} Subjects` },
  ];
  const cardWidth = (pageWidth - 28 - 9) / 4;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(250, 250, 249);
    doc.setDrawColor(231, 229, 228);
    doc.roundedRect(x, y, cardWidth, 17, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(kpi.label.toUpperCase(), x + 3, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(28, 25, 23);
    doc.text(kpi.value, x + 3, y + 12.5);
  });
  y += 23;

  // Section 1: 13-Subject Task Completion & Mastery
  y = drawSectionHeading(
    doc,
    '13-Subject Assigned Task Completion & Academic Mastery',
    y
  );

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text('Subject', 16, y);
  doc.text('Track', 62, y);
  doc.text('Tasks Done', 82, y);
  doc.text('Completion Progress', 108, y);
  doc.text('Mastery', pageWidth - 16, y, { align: 'right' });
  y += 3;
  doc.setDrawColor(214, 211, 209);
  doc.line(14, y, pageWidth - 14, y);
  y += 4.5;

  payload.subjectCompletionRows.forEach((row) => {
    y = ensureSpace(doc, y, 7.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(row.subject, 16, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(row.isOpted ? 234 : 120, row.isOpted ? 88 : 113, row.isOpted ? 12 : 108);
    doc.text(row.isOpted ? 'Opted' : 'Core', 62, y);

    doc.setTextColor(68, 64, 60);
    doc.text(`${row.completed}/${row.total} (${row.completionPct}%)`, 82, y);

    // Progress Bar
    const barX = 108;
    const barW = 54;
    const barH = 3.2;
    doc.setFillColor(231, 229, 228);
    doc.roundedRect(barX, y - 2.7, barW, barH, 1, 1, 'F');

    const fillW = Math.max(0, Math.min(barW, (barW * row.completionPct) / 100));
    if (row.completionPct === 100) {
      doc.setFillColor(16, 185, 129); // emerald
    } else if (row.completionPct >= 50) {
      doc.setFillColor(234, 88, 12); // orange
    } else {
      doc.setFillColor(245, 158, 11); // amber
    }
    if (fillW > 0) {
      doc.roundedRect(barX, y - 2.7, fillW, barH, 1, 1, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(`${row.score}%`, pageWidth - 16, y, { align: 'right' });

    y += 6.5;
  });

  y += 3;

  // Section 2: Assigned Tasks Detail
  y = ensureSpace(doc, y, 24);
  y = drawSectionHeading(doc, `Assigned Coursework Register (${completedTasks}/${totalTasks} Completed)`, y);

  payload.assignments.forEach((item) => {
    y = ensureSpace(doc, y, 6.5);
    const isDone = Boolean(item.done[payload.studentKey]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(isDone ? 5 : 180, isDone ? 150 : 83, isDone ? 105 : 9);
    doc.text(isDone ? '[DONE]' : '[OPEN]', 16, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 25, 23);
    doc.text(item.subject, 32, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(68, 64, 60);
    const clippedTitle =
      item.title.length > 62 ? `${item.title.slice(0, 59)}...` : item.title;
    doc.text(clippedTitle, 64, y);

    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(`Due ${item.due}`, pageWidth - 16, y, { align: 'right' });
    y += 5.5;
  });

  y += 4;

  // Section 3: Today's 12-Hour Schedule
  y = ensureSpace(doc, y, 22);
  y = drawSectionHeading(
    doc,
    `12-Hour Daily Timetable (${payload.todayDayName})`,
    y
  );

  payload.todayPeriods.slice(0, 8).forEach((p) => {
    y = ensureSpace(doc, y, 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(234, 88, 12);
    doc.text(`P${p.periodNum}`, 16, y);

    doc.setTextColor(87, 83, 78);
    doc.text(p.time12, 26, y);

    doc.setTextColor(28, 25, 23);
    doc.text(p.subject, 76, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 113, 108);
    doc.text(p.room, pageWidth - 16, y, { align: 'right' });
    y += 5.5;
  });

  // Section 4: Leave Requests Summary (if any)
  if (payload.leaveRequests.length > 0) {
    y += 4;
    y = ensureSpace(doc, y, 20);
    y = drawSectionHeading(doc, 'Leave & Absence Records', y);
    payload.leaveRequests.forEach((lr) => {
      y = ensureSpace(doc, y, 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(28, 25, 23);
      doc.text(`${lr.from} to ${lr.to}`, 16, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(68, 64, 60);
      const reason = lr.reason.length > 60 ? `${lr.reason.slice(0, 57)}...` : lr.reason;
      doc.text(reason, 62, y);

      doc.setFont('helvetica', 'bold');
      doc.text(lr.status, pageWidth - 16, y, { align: 'right' });
      y += 5.5;
    });
  }

  addFooters(doc);

  const safeSlug = payload.studentKey.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `tattvaswayam-student-dashboard-${safeSlug}-${dateStamp}.pdf`;
  doc.save(fileName);
  return fileName;
}

export function exportTeacherDashboardPdf(payload: TeacherDashboardPdfPayload): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const vivanDone = payload.assignments.filter((a) => Boolean(a.done.vivan)).length;
  const krishvikaDone = payload.assignments.filter((a) => Boolean(a.done.krishvika)).length;
  const totalAssignments = payload.assignments.length;
  const cohortAvgMastery =
    payload.classMastery.length > 0
      ? (
          payload.classMastery.reduce((acc, r) => acc + r.average, 0) /
          payload.classMastery.length
        ).toFixed(1)
      : '90.0';

  let y = drawBrandedHeader(
    doc,
    'Facilitator Cohort Analytics, Roll Call & Coursework Export',
    `${payload.user.name} (${payload.user.title})`,
    `Cohort: ${payload.facultyClass} • Active Assignments: ${totalAssignments}`
  );

  // KPI Summary Boxes
  const kpis = [
    { label: 'Cohort Average', value: `${cohortAvgMastery}%` },
    { label: 'Published Tasks', value: `${totalAssignments} Active` },
    { label: 'Vivan / Krishvika', value: `${vivanDone}/${totalAssignments} • ${krishvikaDone}/${totalAssignments}` },
    { label: 'Quiz & AI Queries', value: `${payload.quizResults.length} / ${payload.aiLogs.length}` },
  ];
  const cardWidth = (pageWidth - 28 - 9) / 4;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(250, 250, 249);
    doc.setDrawColor(231, 229, 228);
    doc.roundedRect(x, y, cardWidth, 17, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(kpi.label.toUpperCase(), x + 3, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(28, 25, 23);
    doc.text(kpi.value, x + 3, y + 12.5);
  });
  y += 23;

  // Section 1: Today's Roll Call Status
  y = drawSectionHeading(doc, 'Student Roll Call & Cohort Check-In', y);
  const roster = [
    { id: 'vivan', name: 'Vivan Sharma', grade: 'Grade 10-A', roll: 'TS-2026-041' },
    { id: 'krishvika', name: 'Krishvika Patel', grade: 'Grade 8-B', roll: 'TS-2026-042' },
  ];
  roster.forEach((stu) => {
    y = ensureSpace(doc, y, 7);
    const status = (payload.localAttendance[stu.id] || 'present').toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(stu.name, 16, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(87, 83, 78);
    doc.text(`${stu.grade} • Roll: ${stu.roll}`, 68, y);

    doc.setFont('helvetica', 'bold');
    if (status === 'PRESENT') doc.setTextColor(5, 150, 105);
    else if (status === 'LATE') doc.setTextColor(217, 119, 6);
    else doc.setTextColor(225, 29, 72);
    doc.text(status, pageWidth - 16, y, { align: 'right' });
    y += 6;
  });

  y += 3;

  // Section 2: Today's Facilitation Schedule
  y = ensureSpace(doc, y, 20);
  y = drawSectionHeading(doc, "Today's Facilitation Classes", y);
  payload.todaysClasses.forEach((cls) => {
    y = ensureSpace(doc, y, 6.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(234, 88, 12);
    doc.text(cls.period, 16, y);

    doc.setTextColor(87, 83, 78);
    doc.text(cls.time, 36, y);

    doc.setTextColor(28, 25, 23);
    doc.text(`${cls.subject} (${cls.class})`, 82, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 113, 108);
    doc.text(cls.room, pageWidth - 16, y, { align: 'right' });
    y += 5.5;
  });

  y += 4;

  // Section 3: 13-Subject Class Mastery & Coursework Completion
  y = ensureSpace(doc, y, 22);
  y = drawSectionHeading(doc, '13-Subject Class Mastery & Assignment Completion', y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text('Subject', 16, y);
  doc.text('Tasks Done (Cohort)', 68, y);
  doc.text('Class Avg Mastery Progress', 112, y);
  doc.text('Avg Score', pageWidth - 16, y, { align: 'right' });
  y += 3;
  doc.setDrawColor(214, 211, 209);
  doc.line(14, y, pageWidth - 14, y);
  y += 4.5;

  payload.classMastery.forEach((row) => {
    y = ensureSpace(doc, y, 7);
    const subjTasks = payload.assignments.filter(
      (a) => a.subject.toLowerCase() === row.subject.toLowerCase()
    );
    const totalSubjChecks = subjTasks.length * 2;
    const doneSubjChecks = subjTasks.reduce(
      (acc, a) => acc + (a.done.vivan ? 1 : 0) + (a.done.krishvika ? 1 : 0),
      0
    );
    const taskPct =
      totalSubjChecks > 0 ? Math.round((doneSubjChecks / totalSubjChecks) * 100) : 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(row.subject, 16, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(68, 64, 60);
    doc.text(`${doneSubjChecks}/${totalSubjChecks} (${taskPct}%)`, 68, y);

    const barX = 112;
    const barW = 54;
    const barH = 3.2;
    doc.setFillColor(231, 229, 228);
    doc.roundedRect(barX, y - 2.7, barW, barH, 1, 1, 'F');
    doc.setFillColor(234, 88, 12);
    doc.roundedRect(
      barX,
      y - 2.7,
      Math.max(0, Math.min(barW, (barW * row.average) / 100)),
      barH,
      1,
      1,
      'F'
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(`${row.average}%`, pageWidth - 16, y, { align: 'right' });

    y += 6.2;
  });

  y += 4;

  // Section 4: Published Coursework Register
  y = ensureSpace(doc, y, 20);
  y = drawSectionHeading(doc, 'Published Coursework & Submission Status', y);
  payload.assignments.forEach((asg) => {
    y = ensureSpace(doc, y, 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(234, 88, 12);
    doc.text(asg.subject, 16, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(28, 25, 23);
    const title = asg.title.length > 56 ? `${asg.title.slice(0, 53)}...` : asg.title;
    doc.text(title, 52, y);

    doc.setFontSize(7.5);
    doc.setTextColor(87, 83, 78);
    const statusText = `V:${asg.done.vivan ? 'Done' : 'Open'} | K:${asg.done.krishvika ? 'Done' : 'Open'} | Due ${asg.due}`;
    doc.text(statusText, pageWidth - 16, y, { align: 'right' });
    y += 5.5;
  });

  // Section 5: Quiz Results Summary (if available)
  if (payload.quizResults.length > 0) {
    y += 4;
    y = ensureSpace(doc, y, 18);
    y = drawSectionHeading(doc, 'Recent Quiz Assessments', y);
    payload.quizResults.slice(0, 8).forEach((qr) => {
      y = ensureSpace(doc, y, 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(28, 25, 23);
      doc.text(qr.userId.toUpperCase(), 16, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(68, 64, 60);
      doc.text(`${qr.subject} — ${qr.topic || 'Core Concept Quiz'}`, 44, y);

      doc.setFont('helvetica', 'bold');
      doc.text(`${qr.score} (${qr.percentage}%)`, pageWidth - 16, y, { align: 'right' });
      y += 5.5;
    });
  }

  addFooters(doc);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `tattvaswayam-teacher-dashboard-${dateStamp}.pdf`;
  doc.save(fileName);
  return fileName;
}
