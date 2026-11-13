/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  UserCheck,
  Bookmark,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Filter,
  ArrowRight,
  ShieldAlert,
  Hash,
  MapPin,
  Check,
  X,
  Library,
  BookMarked,
  Receipt,
  User,
  GraduationCap,
  Bus,
} from 'lucide-react';
import {
  BookItem,
  BookLoan,
  BookHoldRequest,
  UserProfile,
  UserRole,
  BusRouteInfo,
  TransportOptInRequest,
  FeeTransaction,
} from '../../types';
import { USER_PROFILES, SUBJECTS } from '../../services/storageService';
import { TransportOptInPanel } from './TransportOptInPanel';

interface LibrarianDashboardProps {
  user: UserProfile;
  books: BookItem[];
  bookLoans: BookLoan[];
  bookHolds: BookHoldRequest[];
  onIssueBook: (loanData: {
    bookId: string;
    borrowerKey: string;
    borrowerName: string;
    borrowerRole: string;
    borrowerGrade?: string;
    dueDate: string;
  }) => void;
  onReturnBook: (loanId: string, bookId: string) => void;
  onRenewLoan: (loanId: string, newDueDate: string) => void;
  onAddBook: (newBook: Omit<BookItem, 'id' | 'availableCopies'> & { availableCopies?: number }) => void;
  onFulfillHold: (holdId: string) => void;
  onCancelHold: (holdId: string) => void;
  busRoute?: BusRouteInfo;
  transportRequests?: TransportOptInRequest[];
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

export const LibrarianDashboard: React.FC<LibrarianDashboardProps> = ({
  user,
  books,
  bookLoans,
  bookHolds,
  onIssueBook,
  onReturnBook,
  onRenewLoan,
  onAddBook,
  onFulfillHold,
  onCancelHold,
  busRoute,
  transportRequests = [],
  onRequestTransport,
  onPayTransportFee,
}) => {
  const [activeTab, setActiveTab] = useState<'circulation' | 'catalog' | 'holds' | 'analytics' | 'transport'>('circulation');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [loanStatusFilter, setLoanStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);

  // New Loan Form State
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedBorrowerKey, setSelectedBorrowerKey] = useState('vivan');
  const [loanPeriodDays, setLoanPeriodDays] = useState(14);

  // New Book Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newSubject, setNewSubject] = useState('Physics');
  const [newIsbn, setNewIsbn] = useState('');
  const [newCallNumber, setNewCallNumber] = useState('');
  const [newShelf, setNewShelf] = useState('Stack 1 • Shelf A');
  const [newTotalCopies, setNewTotalCopies] = useState(3);
  const [newYear, setNewYear] = useState(2025);
  const [newEdition, setNewEdition] = useState('1st Edition');
  const [newTags, setNewTags] = useState('Reference, Advanced');

  // Quick Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Calculated Metrics
  const totalVolumeCount = useMemo(() => {
    return books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
  }, [books]);

  const activeLoans = useMemo(() => {
    return bookLoans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
  }, [bookLoans]);

  const overdueLoans = useMemo(() => {
    return bookLoans.filter((l) => l.status === 'OVERDUE');
  }, [bookLoans]);

  const pendingHolds = useMemo(() => {
    return bookHolds.filter((h) => h.status === 'PENDING' || h.status === 'READY_FOR_PICKUP');
  }, [bookHolds]);

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesSearch =
        searchQuery === '' ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.isbn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.callNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.subject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject =
        selectedSubjectFilter === 'ALL' || b.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();

      return matchesSearch && matchesSubject;
    });
  }, [books, searchQuery, selectedSubjectFilter]);

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return bookLoans.filter((loan) => {
      if (loanStatusFilter === 'ALL') return true;
      return loan.status === loanStatusFilter;
    });
  }, [bookLoans, loanStatusFilter]);

  // Handle Submit New Loan
  const handleSubmitIssueLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      showToast('Please select a book volume to issue.');
      return;
    }
    const book = books.find((b) => b.id === selectedBookId);
    if (!book || book.availableCopies <= 0) {
      showToast('No copies available in stock for this volume.');
      return;
    }

    const borrower = USER_PROFILES[selectedBorrowerKey];
    if (!borrower) {
      showToast('Invalid borrower selected.');
      return;
    }

    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + loanPeriodDays);
    const dueDateStr = dueDateObj.toISOString().split('T')[0];

    onIssueBook({
      bookId: book.id,
      borrowerKey: selectedBorrowerKey,
      borrowerName: borrower.name,
      borrowerRole: borrower.role,
      borrowerGrade: borrower.role === 'student' ? 'Grade 10-A' : 'Faculty',
      dueDate: dueDateStr,
    });

    showToast(`"${book.title}" successfully checked out to ${borrower.name}.`);
    setShowIssueModal(false);
    setSelectedBookId('');
  };

  // Handle Add Book
  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) {
      showToast('Please specify book title and author.');
      return;
    }

    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onAddBook({
      title: newTitle.trim(),
      author: newAuthor.trim(),
      subject: newSubject,
      isbn: newIsbn.trim() || `978-81-${Math.floor(100000 + Math.random() * 900000)}`,
      callNumber: newCallNumber.trim() || `${newSubject.slice(0, 3).toUpperCase()}.${newAuthor.slice(0, 3).toUpperCase()}.01`,
      shelfLocation: newShelf,
      totalCopies: Number(newTotalCopies) || 1,
      availableCopies: Number(newTotalCopies) || 1,
      publishedYear: Number(newYear) || 2025,
      edition: newEdition,
      tags: tagsArray,
    });

    showToast(`Added volume "${newTitle}" to the Open Resource Catalog.`);
    setShowAddBookModal(false);
    setNewTitle('');
    setNewAuthor('');
    setNewIsbn('');
    setNewCallNumber('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-teal-900 border border-teal-500 text-teal-100 shadow-2xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Welcome Ribbon */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-teal-900 via-stone-900 to-slate-900 border border-teal-800/80 shadow-md text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0">
            <Library className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 text-[10px] font-bold uppercase tracking-wider border border-teal-400/30">
                Restricted Resource Desk
              </span>
              <span className="text-xs text-teal-300 font-mono">ID: {user.id}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {user.name} • Chief Academic Librarian
            </h2>
            <p className="text-xs text-teal-200/80 mt-0.5">
              Open Learning Resource Centre • RFID Circulation, Cataloguing & Scholar Hold Registry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <BookMarked className="w-4 h-4" />
            <span>Issue Loan</span>
          </button>
          <button
            onClick={() => setShowAddBookModal(true)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-teal-400/40 text-teal-100 font-bold text-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Volume</span>
          </button>
        </div>
      </div>

      {/* 4 Vital Library Pulse Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-teal-100 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Total Catalog Titles
            </span>
            <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 font-mono mt-1">
              {books.length}
            </div>
          </div>
          <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-2 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{totalVolumeCount} Physical Copies</span>
          </span>
        </div>

        <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-teal-100 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Active Loans Out
            </span>
            <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400 font-mono mt-1">
              {activeLoans.length}
            </div>
          </div>
          <span className="text-[11px] text-stone-500 mt-2">
            In scholar & faculty circulation
          </span>
        </div>

        <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-teal-100 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Overdue Returns
            </span>
            <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1">
              {overdueLoans.length}
            </div>
          </div>
          <span className="text-[11px] text-rose-500 font-semibold mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>₹{overdueLoans.reduce((acc, l) => acc + (l.fineAmount || 0), 0)} Pending Fines</span>
          </span>
        </div>

        <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-teal-100 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Scholar Hold Requests
            </span>
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
              {pendingHolds.length}
            </div>
          </div>
          <span className="text-[11px] text-amber-600 font-semibold mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Queue awaiting checkout</span>
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('circulation')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'circulation'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Circulation Desk ({activeLoans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'catalog'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Catalog & Inventory ({books.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('holds')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'holds'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Reservations & Holds</span>
          {pendingHolds.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono">
              {pendingHolds.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Library Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('transport')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'transport'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>Bus Transport</span>
        </button>
      </div>

      {/* ================= TAB 1: CIRCULATION DESK ================= */}
      {activeTab === 'circulation' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Filter Circulation:</span>
              <div className="flex gap-1.5">
                {(['ALL', 'ACTIVE', 'OVERDUE', 'RETURNED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setLoanStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      loanStatusFilter === status
                        ? 'bg-teal-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowIssueModal(true)}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue New Checkout</span>
            </button>
          </div>

          {/* Circulation Loans Table */}
          <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-teal-100 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                  Circulation Registry & Return Terminal
                </h3>
                <p className="text-xs text-stone-500">
                  Track issued volumes, loan periods, overdue fines (₹5/day), and book renewal requests
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-teal-600">
                {filteredLoans.length} Records Shown
              </span>
            </div>

            {filteredLoans.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-700" />
                <p className="text-xs font-semibold">No loans match the selected filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-3">Loan ID</th>
                      <th className="p-3">Book Title</th>
                      <th className="p-3">Borrower</th>
                      <th className="p-3">Issue Date</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Fine (INR)</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredLoans.map((loan) => {
                      const isOverdue = loan.status === 'OVERDUE';
                      const isReturned = loan.status === 'RETURNED';

                      return (
                        <tr key={loan.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                          <td className="p-3 font-mono text-stone-400 font-bold">{loan.id}</td>
                          <td className="p-3">
                            <span className="font-extrabold text-stone-900 dark:text-stone-100 block">
                              {loan.bookTitle}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              Vol ID: {loan.bookId}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-stone-800 dark:text-stone-200 block">
                              {loan.borrowerName}
                            </span>
                            <span className="text-[10px] text-teal-600 font-mono">
                              {loan.borrowerGrade || loan.borrowerRole}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-stone-500">{loan.issueDate}</td>
                          <td className="p-3 font-mono">
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-stone-700 dark:text-stone-300'}>
                              {loan.dueDate}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] font-mono ${
                                isReturned
                                  ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                                  : isOverdue
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {loan.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {loan.fineAmount > 0 ? (
                              <span className="text-rose-600">₹{loan.fineAmount}</span>
                            ) : (
                              <span className="text-stone-400">₹0</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {!isReturned ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => onReturnBook(loan.id, loan.bookId)}
                                  className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] transition"
                                  title="Check book back into inventory"
                                >
                                  Return Book
                                </button>
                                <button
                                  onClick={() => {
                                    const nextDue = new Date();
                                    nextDue.setDate(nextDue.getDate() + 14);
                                    onRenewLoan(loan.id, nextDue.toISOString().split('T')[0]);
                                    showToast(`Renewed loan for ${loan.bookTitle} by +14 days.`);
                                  }}
                                  className="px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-semibold text-[10px] transition"
                                  title="Extend loan by 14 days"
                                >
                                  Renew (+14d)
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-stone-400 italic">
                                Returned on {loan.returnDate || 'record'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: CATALOG & INVENTORY ================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Search & Subject Filter Header */}
          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search catalog by title, author, ISBN, call number, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-stone-500 whitespace-nowrap">Subject:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Disciplines</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAddBookModal(true)}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Book</span>
              </button>
            </div>
          </div>

          {/* Book Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => {
              const isAvailable = book.availableCopies > 0;
              return (
                <div
                  key={book.id}
                  className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-teal-400 dark:hover:border-teal-600 transition shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-bold uppercase font-mono">
                        {book.subject}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {book.availableCopies} of {book.totalCopies} Available
                      </span>
                    </div>

                    <h4 className="font-extrabold text-stone-900 dark:text-stone-100 text-sm leading-snug">
                      {book.title}
                    </h4>
                    <p className="text-xs text-stone-500">By {book.author}</p>

                    <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] space-y-1 text-stone-500">
                      <div className="flex justify-between">
                        <span>Shelf Location:</span>
                        <span className="font-mono text-stone-800 dark:text-stone-200 font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-teal-600" />
                          {book.shelfLocation}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Call Number:</span>
                        <span className="font-mono text-stone-800 dark:text-stone-200">
                          {book.callNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>ISBN:</span>
                        <span className="font-mono text-stone-800 dark:text-stone-200">
                          {book.isbn}
                        </span>
                      </div>
                    </div>

                    {book.tags && book.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {book.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[9px] font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400 font-mono">{book.id}</span>
                    <button
                      onClick={() => {
                        setSelectedBookId(book.id);
                        setShowIssueModal(true);
                      }}
                      disabled={!isAvailable}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        isAvailable
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      <span>{isAvailable ? 'Issue Copy' : 'All Borrowed'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: HOLDS & RESERVATIONS ================= */}
      {activeTab === 'holds' && (
        <div className="space-y-6">
          <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-teal-100 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                  Active Scholar Reservations & Hold Queue
                </h3>
                <p className="text-xs text-stone-500">
                  Holds queued by students & faculty for high-demand reference textbooks
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600">
                {bookHolds.length} Total Requests
              </span>
            </div>

            {bookHolds.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <Bookmark className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-700" />
                <p className="text-xs font-semibold">No active holds in the queue.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookHolds.map((hold) => {
                  const isPending = hold.status === 'PENDING';
                  const isReady = hold.status === 'READY_FOR_PICKUP';
                  const isFulfilled = hold.status === 'FULFILLED';
                  const isCancelled = hold.status === 'CANCELLED';

                  return (
                    <div
                      key={hold.id}
                      className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-400">{hold.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              isReady
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                : isFulfilled
                                ? 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                                : isCancelled
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {hold.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                          {hold.bookTitle}
                        </h4>
                        <div className="text-stone-500 text-[11px] flex items-center gap-2">
                          <span>Requested by: <strong>{hold.requesterName}</strong> ({hold.requesterRole})</span>
                          <span>•</span>
                          <span>Date: {hold.requestDate}</span>
                        </div>
                        {hold.notes && (
                          <p className="text-[11px] text-stone-600 dark:text-stone-400 italic">
                            Notes: "{hold.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {isPending && (
                          <>
                            <button
                              onClick={() => {
                                onFulfillHold(hold.id);
                                showToast(`Marked hold ${hold.id} as ready for pickup.`);
                              }}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition"
                            >
                              Ready for Pickup
                            </button>
                            <button
                              onClick={() => {
                                onCancelHold(hold.id);
                                showToast(`Hold request ${hold.id} cancelled.`);
                              }}
                              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold rounded-lg text-xs transition"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {isReady && (
                          <button
                            onClick={() => {
                              onFulfillHold(hold.id);
                              showToast(`Hold ${hold.id} completed. Book checked out.`);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
                          >
                            Check Out Now
                          </button>
                        )}
                        {(isFulfilled || isCancelled) && (
                          <span className="text-[11px] text-stone-400 font-medium">Archive</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: LIBRARY ANALYTICS ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject Distribution */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-teal-100 dark:border-stone-800 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <span>Subject Inventory Breakdown</span>
              </h3>
              <p className="text-xs text-stone-500">
                Distribution of catalog volumes across Tattvasayam curriculum disciplines
              </p>

              <div className="space-y-2.5 pt-2">
                {SUBJECTS.slice(0, 8).map((subj) => {
                  const count = books.filter((b) => b.subject.toLowerCase() === subj.toLowerCase()).length;
                  const pct = Math.round((count / (books.length || 1)) * 100);
                  return (
                    <div key={subj} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-stone-800 dark:text-stone-200">{subj}</span>
                        <span className="text-stone-500 font-mono">
                          {count} titles ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Circulation Performance Metrics */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-teal-100 dark:border-stone-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  <span>Borrower Punctuality & Turnstile Metrics</span>
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Circulation efficiency index calculated over active cohort loans
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-900">
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 uppercase font-bold block">
                      On-Time Return Rate
                    </span>
                    <span className="text-2xl font-extrabold text-teal-900 dark:text-teal-100 font-mono mt-0.5 block">
                      94.2%
                    </span>
                    <span className="text-[10px] text-stone-500 mt-1 block">Within 14-day window</span>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900">
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold block">
                      Avg. Loan Duration
                    </span>
                    <span className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 font-mono mt-0.5 block">
                      11.4 Days
                    </span>
                    <span className="text-[10px] text-stone-500 mt-1 block">Optimal turnover rate</span>
                  </div>

                  <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold block">
                      RFID Scan Accuracy
                    </span>
                    <span className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-mono mt-0.5 block">
                      99.8%
                    </span>
                    <span className="text-[10px] text-stone-500 mt-1 block">Gate turnstile sync</span>
                  </div>

                  <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold block">
                      Active Fine Balance
                    </span>
                    <span className="text-2xl font-extrabold text-rose-600 font-mono mt-0.5 block">
                      ₹{overdueLoans.reduce((acc, l) => acc + (l.fineAmount || 0), 0)}
                    </span>
                    <span className="text-[10px] text-stone-500 mt-1 block">Across overdue books</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-teal-900 text-teal-100 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Curator Note: Next batch of Cambridge A-Level textbooks arriving Monday.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: STAFF BUS TRANSPORT OPT-IN ================= */}
      {activeTab === 'transport' && (
        <TransportOptInPanel
          user={user}
          busRoute={busRoute}
          transportRequests={transportRequests}
          onRequestTransport={onRequestTransport}
          onPayTransportFee={onPayTransportFee}
        />
      )}

      {/* ================= MODAL 1: ISSUE BOOK LOAN ================= */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-teal-200 dark:border-teal-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-base">
                  Issue Catalog Volume
                </h3>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIssueLoan} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Select Book Volume (In-Stock)
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-stone-100"
                  required
                >
                  <option value="">-- Choose volume from catalog --</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.availableCopies <= 0}>
                      {b.title} — {b.availableCopies} available ({b.shelfLocation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Borrower Scholar / Faculty
                </label>
                <select
                  value={selectedBorrowerKey}
                  onChange={(e) => setSelectedBorrowerKey(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-stone-100"
                >
                  <option value="vivan">Vivan Sharma (Grade 10-A • TFA-2026-089)</option>
                  <option value="krishvika">Krishvika Patel (Grade 8-B • TFA-2026-104)</option>
                  <option value="susmita">Ms. Susmita Roy (Facilitator • Physics)</option>
                  <option value="principal">Dr. B. R. Shenoy (Principal)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Loan Period Window
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 28].map((days) => (
                    <button
                      type="button"
                      key={days}
                      onClick={() => setLoanPeriodDays(days)}
                      className={`p-2 rounded-xl font-bold border transition text-center ${
                        loanPeriodDays === days
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-[11px] text-stone-600 dark:text-stone-400">
                Due Date will be calculated as{' '}
                <strong className="text-teal-600 font-mono">
                  {new Date(Date.now() + loanPeriodDays * 86400000).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
                . Overdue charge applies at ₹5/day beyond this date.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs"
                >
                  Confirm Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ADD NEW BOOK ================= */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-teal-200 dark:border-teal-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-base">
                  Add Volume to Open Catalog
                </h3>
              </div>
              <button
                onClick={() => setShowAddBookModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Principles of Quantum Computation"
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Author(s) *
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="e.g. Michael Nielsen & Isaac Chuang"
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Subject Discipline
                  </label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-semibold"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Total Copies
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTotalCopies}
                    onChange={(e) => setNewTotalCopies(Number(e.target.value))}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Stack & Shelf Location
                  </label>
                  <input
                    type="text"
                    value={newShelf}
                    onChange={(e) => setNewShelf(e.target.value)}
                    placeholder="e.g. Stack 2 • Shelf C"
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Call Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCallNumber}
                    onChange={(e) => setNewCallNumber(e.target.value)}
                    placeholder="e.g. 530.NIE.01"
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    ISBN (Optional)
                  </label>
                  <input
                    type="text"
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    placeholder="978-0521635035"
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Published Year
                  </label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Mechanics, Quantum, Olympiad"
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs"
                >
                  Add to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
