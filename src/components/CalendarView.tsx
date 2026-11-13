import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Download,
  Filter,
  Check,
  ExternalLink,
  MapPin,
  CalendarCheck,
  FileDown,
  Sparkles,
  Share2,
} from 'lucide-react';
import { CalendarEvent, CounselingRequest, UserProfile } from '../types';
import { GoogleCalendarSync } from './GoogleCalendarSync';
import { GoogleCalendarItem } from '../services/googleCalendarService';
import {
  generateIcsContent,
  downloadIcsFile,
  generateGoogleCalendarWebLink,
} from '../utils/icsExport';

interface CalendarViewProps {
  events: CalendarEvent[];
  counseling: CounselingRequest[];
  currentUser: UserProfile | null;
  onAddEvent?: (event: CalendarEvent) => void;
  onToast?: (msg: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface UnifiedCalendarItem {
  id: string;
  source: 'academy' | 'counseling' | 'gcal';
  type: 'exam' | 'holiday' | 'expo' | 'counseling' | 'gcal';
  title: string;
  subtitle?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  htmlLink?: string;
  rawGcal?: GoogleCalendarItem;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  counseling,
  currentUser,
  onAddEvent,
  onToast,
}) => {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 = October
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-15');

  // Filter state
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    'all' | 'exam' | 'holiday' | 'expo' | 'counseling' | 'gcal'
  >('all');

  // Google Calendar Integration State
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarItem[]>([]);
  const [showGoogleEvents, setShowGoogleEvents] = useState(true);

  // ICS Export Dropdown State
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Admin add event form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('2026-10-24');
  const [newType, setNewType] = useState<'holiday' | 'exam' | 'expo' | 'counseling'>('exam');
  const [newDesc, setNewDesc] = useState('');

  const triggerToast = (msg: string) => {
    if (onToast) onToast(msg);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Days calculations
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Unified Map for fast lookup
  const dateItemsMap = useMemo(() => {
    const map = new Map<string, UnifiedCalendarItem[]>();

    const append = (date: string, item: UnifiedCalendarItem) => {
      // Apply active filter
      if (activeCategoryFilter !== 'all' && item.type !== activeCategoryFilter) {
        return;
      }
      const existing = map.get(date);
      if (existing) existing.push(item);
      else map.set(date, [item]);
    };

    // 1. Academy Institutional Events
    events.forEach((e, idx) => {
      append(e.date, {
        id: `acad-${idx}-${e.date}`,
        source: 'academy',
        type: e.type,
        title: e.title,
        subtitle: e.description,
        date: e.date,
        location: 'Tattvasayam Future Academy, Jakkur, Bengaluru',
      });
    });

    // 2. Counseling Requests (Role-scoped)
    counseling.forEach((c) => {
      if (c.status === 'REJECTED') return;
      if (!currentUser) return;
      const canView =
        currentUser.role === 'admin' ||
        currentUser.role === 'principal' ||
        currentUser.id.toLowerCase().includes(c.by) ||
        c.who === currentUser.id;

      if (canView) {
        append(c.date, {
          id: `counsel-${c.id}`,
          source: 'counseling',
          type: 'counseling',
          title: `Counseling: ${c.by.toUpperCase()}`,
          subtitle: `${c.mode} • ${c.agenda} (${c.status})`,
          date: c.date,
          location: c.mode,
        });
      }
    });

    // 3. Google Calendar Events (if connected and overlay enabled)
    if (showGoogleEvents && googleEvents.length > 0) {
      googleEvents.forEach((ge) => {
        // Parse date from start.dateTime or start.date
        let dateStr = '';
        let timeStr = '';
        if (ge.start.dateTime) {
          const d = new Date(ge.start.dateTime);
          dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (ge.start.date) {
          dateStr = ge.start.date;
          timeStr = 'All Day';
        }

        if (dateStr) {
          append(dateStr, {
            id: `gcal-${ge.id}`,
            source: 'gcal',
            type: 'gcal',
            title: ge.summary || '(Untitled Event)',
            subtitle: ge.description,
            date: dateStr,
            time: timeStr,
            location: ge.location,
            htmlLink: ge.htmlLink,
            rawGcal: ge,
          });
        }
      });
    }

    return map;
  }, [events, counseling, currentUser, googleEvents, showGoogleEvents, activeCategoryFilter]);

  const getItemsForDate = (dateStr: string) => dateItemsMap.get(dateStr) || [];
  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !onAddEvent) return;
    onAddEvent({
      date: newDate,
      title: newTitle.trim(),
      type: newType,
      description: newDesc.trim() || undefined,
    });
    setNewTitle('');
    setNewDesc('');
    setShowAddForm(false);
  };

  // .ICS Export Handlers
  const handleExportAllIcs = () => {
    const icsString = generateIcsContent({
      events,
      counseling,
      calendarName: 'Tattvasayam Future Academy - Full Academic Schedule 2026',
    });
    downloadIcsFile(icsString, 'tattvasayam-academic-schedule-2026.ics');
    triggerToast('Downloaded complete academic calendar in .ics format.');
    setShowExportMenu(false);
  };

  const handleExportFilteredIcs = (category: 'exam' | 'holiday' | 'expo' | 'counseling') => {
    const labelMap = {
      exam: 'Examinations',
      holiday: 'Institutional Holidays',
      expo: 'Expos & Exhibitions',
      counseling: 'Counseling Sessions',
    };
    const icsString = generateIcsContent({
      events,
      counseling,
      categoryFilter: category,
      calendarName: `Tattvasayam Future Academy - ${labelMap[category]} 2026`,
    });
    downloadIcsFile(icsString, `tattvasayam-${category}-schedule.ics`);
    triggerToast(`Exported ${labelMap[category]} .ics file successfully!`);
    setShowExportMenu(false);
  };

  const handleExportCurrentMonthIcs = () => {
    const startIso = `${currentYear}-${pad(currentMonth + 1)}-01`;
    const endIso = `${currentYear}-${pad(currentMonth + 1)}-${pad(totalDays)}`;
    const icsString = generateIcsContent({
      events,
      counseling,
      startDate: startIso,
      endDate: endIso,
      calendarName: `Tattvasayam Schedule - ${MONTH_NAMES[currentMonth]} ${currentYear}`,
    });
    downloadIcsFile(
      icsString,
      `tattvasayam-schedule-${MONTH_NAMES[currentMonth].toLowerCase()}-${currentYear}.ics`
    );
    triggerToast(`Exported schedule for ${MONTH_NAMES[currentMonth]} ${currentYear}.`);
    setShowExportMenu(false);
  };

  const handleExportSingleItemIcs = (item: UnifiedCalendarItem) => {
    const icsString = generateIcsContent({
      events: [{ date: item.date, title: item.title, type: item.type as any, description: item.subtitle }],
      calendarName: item.title,
    });
    downloadIcsFile(
      icsString,
      `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`
    );
    triggerToast(`Exported "${item.title}" to .ics.`);
  };

  return (
    <div className="space-y-5">
      {/* Google Calendar Sync Card */}
      <GoogleCalendarSync
        academyEvents={events}
        onGoogleEventsUpdated={(items) => setGoogleEvents(items)}
        showGoogleEvents={showGoogleEvents}
        onToggleShowGoogleEvents={(show) => setShowGoogleEvents(show)}
        onToast={triggerToast}
      />

      {/* Main Calendar Navigation & Actions Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100">
              Academic & Counseling Calendar
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Official institutional timetable, examinations, neural expos, and synchronized Google Calendar events
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export .ICS Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-xl transition border border-stone-200 dark:border-stone-700"
              title="Export academic schedule as RFC 5545 .ics file for Google Calendar, Apple Calendar, or Outlook"
            >
              <FileDown className="w-3.5 h-3.5 text-orange-600" />
              <span>Export .ICS</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-64 p-2 bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-orange-200 dark:border-stone-700 z-50 text-xs space-y-1">
                <div className="px-3 py-1.5 font-bold uppercase text-[10px] text-stone-400 tracking-wider">
                  Download .ICS Format
                </div>

                <button
                  onClick={handleExportAllIcs}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold flex items-center justify-between"
                >
                  <span>Complete Academic Year</span>
                  <span className="text-[10px] text-orange-600 font-mono">All</span>
                </button>

                <button
                  onClick={handleExportCurrentMonthIcs}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold flex items-center justify-between"
                >
                  <span>Current Month Only</span>
                  <span className="text-[10px] text-stone-400">
                    {MONTH_NAMES[currentMonth].slice(0, 3)}
                  </span>
                </button>

                <div className="border-t border-stone-100 dark:border-stone-700 my-1" />

                <button
                  onClick={() => handleExportFilteredIcs('exam')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 flex items-center justify-between"
                >
                  <span>Exams & Tests Only</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </button>

                <button
                  onClick={() => handleExportFilteredIcs('holiday')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 flex items-center justify-between"
                >
                  <span>Institutional Holidays Only</span>
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                </button>

                <button
                  onClick={() => handleExportFilteredIcs('counseling')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 flex items-center justify-between"
                >
                  <span>Counseling Sessions</span>
                  <span className="w-2 h-2 rounded-full bg-stone-700" />
                </button>
              </div>
            )}
          </div>

          {/* Admin Publish Event */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publish Event</span>
            </button>
          )}

          {/* Month Stepper */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl p-1 border border-stone-200 dark:border-stone-700">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-300 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-stone-800 dark:text-stone-200 min-w-[125px] text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-white dark:hover:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-300 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider mr-1">
          Filter:
        </span>
        <button
          onClick={() => setActiveCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            activeCategoryFilter === 'all'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
          }`}
        >
          All Events
        </button>
        <button
          onClick={() => setActiveCategoryFilter('exam')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            activeCategoryFilter === 'exam'
              ? 'bg-amber-600 text-white'
              : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
          }`}
        >
          Exams
        </button>
        <button
          onClick={() => setActiveCategoryFilter('holiday')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            activeCategoryFilter === 'holiday'
              ? 'bg-orange-500 text-white'
              : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
          }`}
        >
          Holidays
        </button>
        <button
          onClick={() => setActiveCategoryFilter('expo')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            activeCategoryFilter === 'expo'
              ? 'bg-purple-600 text-white'
              : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
          }`}
        >
          Expos & Exhibitions
        </button>
        <button
          onClick={() => setActiveCategoryFilter('counseling')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            activeCategoryFilter === 'counseling'
              ? 'bg-stone-800 text-white dark:bg-stone-700'
              : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
          }`}
        >
          Counseling
        </button>
        {googleEvents.length > 0 && (
          <button
            onClick={() => setActiveCategoryFilter('gcal')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition ${
              activeCategoryFilter === 'gcal'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-stone-800 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
            }`}
          >
            <span>Google Calendar</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {googleEvents.length}
            </span>
          </button>
        )}
      </div>

      {/* Admin Add Event Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateEvent}
          className="p-5 bg-orange-50/70 dark:bg-stone-900 rounded-2xl border border-orange-200 dark:border-amber-900 space-y-3 text-xs"
        >
          <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
            Publish New Academic Calendar Event
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Event Title:
              </label>
              <input
                required
                placeholder="e.g. Physics Quantum Lab Exhibition"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-orange-200 dark:border-stone-700 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">Date:</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-orange-200 dark:border-stone-700 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">Category:</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-orange-200 dark:border-stone-700 text-xs"
              >
                <option value="exam">Examination</option>
                <option value="holiday">Holiday</option>
                <option value="expo">Exhibition / Expo</option>
                <option value="counseling">Counseling</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
              Description (Optional):
            </label>
            <input
              placeholder="e.g. Venue: Open Learning Resource Centre, Hall B"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-orange-200 dark:border-stone-700 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition"
            >
              Publish to Calendar
            </button>
          </div>
        </form>
      )}

      {/* Grid + Day Detail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-stone-400 dark:text-stone-500 mb-2">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[82px] rounded-xl bg-stone-50/50 dark:bg-stone-950/20" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(dayNum)}`;
              const dayItems = getItemsForDate(dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[82px] p-1.5 rounded-xl border transition cursor-pointer flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? 'border-orange-600 bg-orange-50/80 dark:bg-orange-950/30 ring-2 ring-orange-500/20 shadow-xs'
                      : 'border-orange-100 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-orange-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-orange-600 dark:text-orange-400 font-extrabold'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayItems.some((it) => it.type === 'gcal') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Google Calendar event" />
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayItems.slice(0, 2).map((item) => {
                      let badgeBg = 'bg-orange-500 text-white';
                      if (item.type === 'exam') {
                        badgeBg =
                          'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800';
                      } else if (item.type === 'expo') {
                        badgeBg =
                          'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-800';
                      } else if (item.type === 'counseling') {
                        badgeBg = 'bg-stone-800 text-white dark:bg-stone-700';
                      } else if (item.type === 'gcal') {
                        badgeBg =
                          'bg-blue-600 text-white dark:bg-blue-700 shadow-xs';
                      }

                      return (
                        <div
                          key={item.id}
                          className={`text-[9px] px-1 py-0.5 rounded font-semibold truncate ${badgeBg}`}
                          title={`${item.title}${item.time ? ` (${item.time})` : ''}`}
                        >
                          {item.type === 'gcal' && '📅 '}
                          {item.title}
                        </div>
                      );
                    })}
                    {dayItems.length > 2 && (
                      <span className="text-[9px] text-stone-400 font-mono font-medium block">
                        +{dayItems.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail Drawer */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
          <div className="border-b border-orange-100 dark:border-stone-800 pb-3">
            <span className="text-xs uppercase font-bold text-orange-600 tracking-wider">
              Schedule Details
            </span>
            <h3 className="text-lg font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
          </div>

          {selectedItems.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No academic exams, holidays, counseling, or synced Google Calendar events scheduled for this date.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                    item.type === 'gcal'
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                      : 'bg-orange-50/50 dark:bg-stone-800/60 border-orange-200 dark:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-extrabold text-stone-900 dark:text-stone-100 text-sm leading-snug">
                      {item.title}
                    </span>
                    <span
                      className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.type === 'gcal'
                          ? 'bg-blue-600 text-white'
                          : item.type === 'exam'
                          ? 'bg-amber-600 text-white'
                          : item.type === 'expo'
                          ? 'bg-purple-600 text-white'
                          : item.type === 'counseling'
                          ? 'bg-stone-800 text-white'
                          : 'bg-orange-600 text-white'
                      }`}
                    >
                      {item.type === 'gcal' ? 'Google Calendar' : item.type}
                    </span>
                  </div>

                  {item.time && (
                    <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{item.time}</span>
                    </div>
                  )}

                  {item.subtitle && (
                    <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed">
                      {item.subtitle}
                    </p>
                  )}

                  {item.location && (
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}

                  {/* Quick Export & Actions for this event */}
                  <div className="pt-2 border-t border-orange-100 dark:border-stone-700/60 flex flex-wrap items-center gap-2">
                    {/* Export .ICS */}
                    <button
                      onClick={() => handleExportSingleItemIcs(item)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 transition flex items-center gap-1"
                      title="Download .ics for this event"
                    >
                      <Download className="w-3 h-3 text-orange-600" />
                      <span>Export .ics</span>
                    </button>

                    {/* Google Calendar Web link */}
                    {item.type !== 'gcal' && (
                      <a
                        href={generateGoogleCalendarWebLink({
                          title: item.title,
                          date: item.date,
                          description: item.subtitle,
                          location: item.location,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 transition flex items-center gap-1"
                        title="Add this event to Google Calendar Web"
                      >
                        <ExternalLink className="w-3 h-3 text-blue-600" />
                        <span>Add to Google Cal</span>
                      </a>
                    )}

                    {/* Open in Google Calendar if already a G-Cal event */}
                    {item.htmlLink && (
                      <a
                        href={item.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-950/60 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open in Google Calendar</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
