import { CalendarEvent, CounselingRequest, TimetablePeriod } from '../types';

/**
 * Escapes characters for iCalendar RFC 5545 text values
 */
function escapeIcsText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Formats YYYY-MM-DD to ICS date string: YYYYMMDD
 */
function formatIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

/**
 * Adds 1 day to YYYY-MM-DD for exclusive ICS all-day event end date
 */
function getNextDayIcsDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Formats a timestamp into ICS UTC format: YYYYMMDDTHHMMSSZ
 */
function formatIcsDateTimeUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

export interface IcsExportOptions {
  calendarName?: string;
  description?: string;
  events: CalendarEvent[];
  counseling?: CounselingRequest[];
  categoryFilter?: 'all' | 'exam' | 'holiday' | 'expo' | 'counseling';
  startDate?: string;
  endDate?: string;
}

/**
 * Generates an RFC 5545 compliant .ics string from academy events and counseling
 */
export function generateIcsContent(options: IcsExportOptions): string {
  const calName = options.calendarName || 'Tattvasayam Future Academy - Academic Calendar';
  const calDesc = options.description || 'Institutional Academic Schedule, Exams, Exhibitions, and Counseling';
  const nowUtc = formatIcsDateTimeUtc(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tattvasayam Future Academy//Academic Calendar 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    `X-WR-CALDESC:${escapeIcsText(calDesc)}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];

  // Filter events
  let filteredEvents = options.events;
  if (options.categoryFilter && options.categoryFilter !== 'all') {
    filteredEvents = filteredEvents.filter((e) => e.type === options.categoryFilter);
  }
  if (options.startDate) {
    filteredEvents = filteredEvents.filter((e) => e.date >= options.startDate!);
  }
  if (options.endDate) {
    filteredEvents = filteredEvents.filter((e) => e.date <= options.endDate!);
  }

  // Academic Events
  filteredEvents.forEach((ev, idx) => {
    const uid = `event-${idx}-${ev.date}-${ev.title.replace(/\s+/g, '-').toLowerCase()}@tattvasayam.edu.in`;
    const dtStart = formatIcsDate(ev.date);
    const dtEnd = getNextDayIcsDate(ev.date);
    const categoryUpper = (ev.type || 'ACADEMIC').toUpperCase();

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.title)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    } else {
      lines.push(`DESCRIPTION:${escapeIcsText(`Category: ${ev.type}. Official event of Tattvasayam Future Academy.`)}`);
    }
    lines.push('LOCATION:Tattvasayam Future Academy\\, 2060 Jakkur Plantation Rd\\, Bengaluru');
    lines.push(`CATEGORIES:${categoryUpper}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  });

  // Counseling Sessions (if included and not filtered out)
  if (
    options.counseling &&
    (!options.categoryFilter || options.categoryFilter === 'all' || options.categoryFilter === 'counseling')
  ) {
    options.counseling.forEach((c) => {
      if (c.status === 'REJECTED') return;
      if (options.startDate && c.date < options.startDate) return;
      if (options.endDate && c.date > options.endDate) return;

      const uid = `counseling-${c.id}-${c.date}@tattvasayam.edu.in`;
      const dtStart = formatIcsDate(c.date);
      const dtEnd = getNextDayIcsDate(c.date);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${nowUtc}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:Counseling Session: ${escapeIcsText(c.by.toUpperCase())} (${c.mode})`);
      lines.push(
        `DESCRIPTION:${escapeIcsText(`Agenda: ${c.agenda}\\nStatus: ${c.status}\\nCounselor/Admin: ${c.who.toUpperCase()}`)}`
      );
      lines.push(`LOCATION:${escapeIcsText(c.mode || 'Jakkur Campus Guidance Centre')}`);
      lines.push('CATEGORIES:COUNSELING');
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    });
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser download of an .ics file
 */
export function downloadIcsFile(icsContent: string, fileName = 'tattvasayam-academic-calendar.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a direct Google Calendar Web Link (action=TEMPLATE) to add a single event with 1 click
 */
export function generateGoogleCalendarWebLink(event: {
  title: string;
  date: string;
  description?: string;
  location?: string;
}): string {
  const dtStart = formatIcsDate(event.date);
  const dtEnd = getNextDayIcsDate(event.date);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${dtStart}/${dtEnd}`,
    details: event.description || 'Tattvasayam Future Academy Academic Schedule',
    location: event.location || 'Tattvasayam Future Academy, Jakkur, Bengaluru',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
