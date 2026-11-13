import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Award,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Copy,
  Check,
  Bookmark,
  Trash2,
  ArrowRight,
  HelpCircle,
  Compass,
  Lightbulb,
  GraduationCap,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  UserProfile,
  SubjectName,
  QuizQuestion,
  QuizResult,
  AiLogItem,
} from '../types';
import { SUBJECTS } from '../services/storageService';
import { AiService } from '../services/aiService';

interface AiStudyLabViewProps {
  currentUser: UserProfile | null;
  quizResults: QuizResult[];
  onRecordQuizResult: (subject: string, topic: string, score: string, percentage: number) => void;
  aiLogs: AiLogItem[];
  onRecordAiLog?: (subject: string, question: string, answer: string) => void;
  onNavigateToPortal?: () => void;
}

// Curated high-yield syllabus inquiry prompts for the 13 subjects
const SYLLABUS_PROMPTS: Record<string, string[]> = {
  Physics: [
    'Explain wave propagation and phase velocity in dispersive media',
    'Derive the intuitive connection between Bernoulli’s principle and conservation of energy',
    'How does gravitational time dilation occur near high-density masses?',
  ],
  Mathematics: [
    'What is the geometric intuition behind eigenvectors and eigenvalues?',
    'Explain the fundamental theorem of calculus using visual Riemann sums',
    'How does Bayes’ theorem update subjective priors with empirical likelihood?',
  ],
  Chemistry: [
    'Explain sp3, sp2, and sp orbital hybridization using molecular geometry',
    'What differentiates galvanic cells from electrolytic cells during redox reactions?',
    'How does Le Chatelier’s principle govern dynamic chemical equilibria?',
  ],
  Biology: [
    'Trace electron flow through photosystem II and photosystem I in the thylakoid',
    'Explain how CRISPR-Cas9 performs targeted double-strand DNA cleavage',
    'How do voltage-gated ion channels propagate action potentials across axons?',
  ],
  Philosophy: [
    'Contrast utilitarian consequentialism with Kantian categorical imperatives',
    'What is Descartes’ evil demon argument and how does the Cogito resolve it?',
    'Explain the epistemic difference between rationalism and empiricism',
  ],
  English: [
    'Analyze dramatic irony in Shakespearean tragedy with textual examples',
    'How does free indirect discourse affect narrative voice in modernist fiction?',
    'Explain rhetorical devices: chiasmus, zeugma, and anaphora',
  ],
  'Business Studies': [
    'Explain Porter’s Five Forces framework applied to modern digital platforms',
    'What is the difference between debt financing and venture equity dilution?',
    'How does price elasticity of demand influence corporate pricing strategy?',
  ],
  Music: [
    'Explain acoustic harmonics, overtones, and the harmonic series in strings',
    'What distinguishes modal harmony in Indian classical Ragas from Western counterpoint?',
    'How does the circle of fifths explain key modulation and temperament?',
  ],
  Dance: [
    'Explain the nine classical Rasas (Navarasa) in Bharatanatyam expression',
    'What are Laban Movement Analysis components: Body, Effort, Shape, Space?',
    'How does rhythmic kinesthetic pacing synchronize with Tala beats?',
  ],
  Sports: [
    'Explain the physiological transition from aerobic to anaerobic glycolytic threshold',
    'What biomechanical angles optimize vertical ground reaction force in sprinting?',
    'How does periodization structuring prevent overtraining syndrome?',
  ],
  French: [
    'Explain when to use the subjunctive mood vs the indicative in French syntax',
    'What are the rules for past participle agreement with preceding direct objects?',
    'Explain the difference between Passé Composé and Imparfait in narration',
  ],
  Hindi: [
    'Explain the syntactic rules for Sakarmak and Akarmak Kriya in Hindi grammar',
    'What are Sandhi rules: Swar Sandhi, Vyanjan Sandhi, and Visarga Sandhi?',
    'Analyze the philosophical themes in Kabir’s classic Dohe',
  ],
  Kannada: [
    'Explain the historical evolution of Halegannada (Old Kannada) to Hosagannada',
    'What are the primary Vibhakti Pratyayagalu (case markers) in Kannada grammar?',
    'Discuss the egalitarian philosophy of 12th-century Vachana Sahitya',
  ],
};

const SUGGESTED_QUIZ_TOPICS: Record<string, string[]> = {
  Physics: ['Wave Mechanics & Optics', 'Thermodynamics & Carnot Cycle', 'Electromagnetism', 'Rotational Dynamics'],
  Mathematics: ['Calculus & Derivatives', 'Probability & Combinatorics', 'Linear Algebra', 'Trigonometric Identities'],
  Chemistry: ['Atomic Structure & Orbitals', 'Thermodynamics & Enthalpy', 'Organic Reactions & Mechanisms', 'Electrochemistry'],
  Biology: ['Cellular Respiration & Photosynthesis', 'Genetics & Punnett Squares', 'Human Nervous System', 'Ecology & Nutrient Cycles'],
  Philosophy: ['Ethics & Moral Philosophy', 'Epistemology & Theory of Knowledge', 'Logic & Fallacies', 'Political Philosophy'],
  English: ['Literary Devices & Rhetoric', 'Poetic Meter & Rhyme Scheme', 'Grammar & Syntax Precision', 'Modernist Narrative Techniques'],
  'Business Studies': ['Market Structures & Competition', 'Financial Ratios & Cash Flow', 'Marketing Mix (4 Ps)', 'Supply Chain Economics'],
  Music: ['Acoustic Harmonics & Resonance', 'Scale Theory & Modes', 'Time Signatures & Polyphony', 'Rhythmic Subdivisions'],
  Dance: ['Navarasa & Abhinaya Expressions', 'Kinesthetic Balance & Turns', 'Choreographic Space & Form', 'Tala Pacing'],
  Sports: ['Lactate Threshold & VO2 Max', 'Sprint Biomechanics', 'Core Stability & Force Transfer', 'Sports Nutrition & Hydration'],
  French: ['Subjunctive Mood Conjugation', 'Direct & Indirect Object Pronouns', 'Past Tense Pacing', 'Advanced Prepositions'],
  Hindi: ['Sandhi & Samas Formations', 'Karak & Vibhakti Usage', 'Muhavare & Lokoktiyan', 'Poetic Ras & Chhand'],
  Kannada: ['Vibhakti Pratyayas', 'Vachana Sahitya Analysis', 'Halegannada Grammar Rules', 'Samasa Types & Compounds'],
};

interface StudyNote {
  id: string;
  subject: string;
  question: string;
  answer: string;
  savedAt: string;
}

export const AiStudyLabView: React.FC<AiStudyLabViewProps> = ({
  currentUser,
  quizResults,
  onRecordQuizResult,
  aiLogs,
  onRecordAiLog,
  onNavigateToPortal,
}) => {
  // Page mode: 'all' (Dual View), 'study' (Assistant Only), or 'quiz' (Quiz Only)
  const [viewMode, setViewMode] = useState<'all' | 'study' | 'quiz'>('all');

  // ---------------- Study Assistant State ----------------
  const [studySubject, setStudySubject] = useState<SubjectName>('Physics');
  const [studyQuestion, setStudyQuestion] = useState('');
  const [studyAnswer, setStudyAnswer] = useState('');
  const [isAskingStudy, setIsAskingStudy] = useState(false);
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [savedNotes, setSavedNotes] = useState<StudyNote[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('tattvasayam_study_notes');
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [noteSavedMessage, setNoteSavedMessage] = useState<string | null>(null);

  // ---------------- Practice Quiz State ----------------
  const [quizSubject, setQuizSubject] = useState<SubjectName>('Physics');
  const [quizTopic, setQuizTopic] = useState('Wave Mechanics & Optics');
  const [quizDifficulty, setQuizDifficulty] = useState<'Standard' | 'Advanced' | 'Olympiad'>('Standard');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [quizUserAnswers, setQuizUserAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizRecorded, setQuizRecorded] = useState(false);

  // Filter subject-specific inquiries
  const studentKey = currentUser ? currentUser.id.toLowerCase() : 'student';

  // ---------------- Handlers: Study Assistant ----------------
  const handleAskStudyAssistant = async (queryText?: string) => {
    const questionToAsk = (queryText || studyQuestion).trim();
    if (!questionToAsk) return;

    if (queryText) {
      setStudyQuestion(queryText);
    }

    setIsAskingStudy(true);
    setStudyAnswer('');
    setCopiedAnswer(false);

    try {
      const prompt = `${questionToAsk}${
        quizDifficulty === 'Olympiad' ? ' (Explain with advanced derivation or first-principles proof)' : ''
      }`;
      const ans = await AiService.askStudyAssistant(studySubject, prompt);
      setStudyAnswer(ans);

      // Record to parent audit/telemetry if callback provided
      if (onRecordAiLog) {
        onRecordAiLog(studySubject, questionToAsk, ans);
      }
    } catch (err) {
      setStudyAnswer('Unable to generate response at this moment. Please check connection and try again.');
    } finally {
      setIsAskingStudy(false);
    }
  };

  const handleCopyAnswer = () => {
    if (!studyAnswer) return;
    navigator.clipboard.writeText(`[${studySubject}] ${studyQuestion}\n\n${studyAnswer}`);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2500);
  };

  const handleSaveNote = () => {
    if (!studyAnswer || !studyQuestion) return;
    const newNote: StudyNote = {
      id: `NOTE-${Date.now()}`,
      subject: studySubject,
      question: studyQuestion,
      answer: studyAnswer,
      savedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [newNote, ...savedNotes.slice(0, 19)];
    setSavedNotes(updated);
    try {
      localStorage.setItem('tattvasayam_study_notes', JSON.stringify(updated));
    } catch (e) {}
    setNoteSavedMessage('Saved to your Study Notebook');
    setTimeout(() => setNoteSavedMessage(null), 3000);
  };

  const handleDeleteNote = (id: string) => {
    const updated = savedNotes.filter((n) => n.id !== id);
    setSavedNotes(updated);
    try {
      localStorage.setItem('tattvasayam_study_notes', JSON.stringify(updated));
    } catch (e) {}
  };

  // ---------------- Handlers: Practice Quiz ----------------
  const handleGenerateQuiz = async (customTopic?: string) => {
    const topicToUse = (customTopic || quizTopic).trim() || 'Core Principles';
    if (customTopic) setQuizTopic(customTopic);

    setIsGeneratingQuiz(true);
    setQuizQuestions(null);
    setQuizScore(null);
    setQuizUserAnswers({});
    setQuizSubmitted(false);
    setQuizRecorded(false);

    try {
      const qz = await AiService.generateQuiz(quizSubject, `${topicToUse} (${quizDifficulty} Level)`);
      setQuizQuestions(qz);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSelectQuizAnswer = (qIdx: number, oIdx: number) => {
    if (quizSubmitted) return;
    setQuizUserAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleSubmitQuiz = () => {
    if (!quizQuestions) return;
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizUserAnswers[idx] === q.answer) score++;
    });
    setQuizScore(score);
    setQuizSubmitted(true);

    const percentage = Math.round((score / quizQuestions.length) * 100);
    onRecordQuizResult(quizSubject, quizTopic, `${score}/${quizQuestions.length}`, percentage);
    setQuizRecorded(true);
  };

  const handleRetakeQuiz = () => {
    setQuizScore(null);
    setQuizUserAnswers({});
    setQuizSubmitted(false);
    setQuizRecorded(false);
  };

  const activeSyllabusPrompts = SYLLABUS_PROMPTS[studySubject] || [];
  const activeSuggestedTopics = SUGGESTED_QUIZ_TOPICS[quizSubject] || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Editorial Header Section */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-orange-200/80 dark:border-stone-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Dedicated Academic Learning Environment</span>
              <span aria-hidden="true">·</span>
              <span className="text-stone-500 dark:text-stone-400 font-normal">Gemini 3.8 Flash First-Principles Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              AI Subject Study Assistant & Practice Quiz Lab
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Explore in-depth conceptual inquiries across 13 syllabus subjects and challenge yourself with dynamic 5-question diagnostic quizzes with real-time feedback.
            </p>
          </div>

          {/* View Mode Segmented Control */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
            <div className="inline-flex items-center p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  viewMode === 'all'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                Dual Workspace
              </button>
              <button
                onClick={() => setViewMode('study')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'study'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                <span>Study Assistant</span>
              </button>
              <button
                onClick={() => setViewMode('quiz')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'quiz'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-orange-600" />
                <span>Practice Quiz</span>
              </button>
            </div>

            {onNavigateToPortal && (
              <button
                onClick={onNavigateToPortal}
                className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-medium transition flex items-center gap-1.5"
              >
                <span>Back to Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-6 pt-5 border-t border-stone-100 dark:border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-stone-400 dark:text-stone-500 font-medium block">Subjects Available</span>
            <span className="font-bold text-stone-900 dark:text-stone-100 font-mono text-sm">13 Core & Arts</span>
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500 font-medium block">Completed Quizzes</span>
            <span className="font-bold text-stone-900 dark:text-stone-100 font-mono text-sm tabular-nums">
              {quizResults.length} Sessions
            </span>
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500 font-medium block">Saved Study Notes</span>
            <span className="font-bold text-stone-900 dark:text-stone-100 font-mono text-sm tabular-nums">
              {savedNotes.length} Entries
            </span>
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500 font-medium block">Active Student</span>
            <span className="font-bold text-orange-600 dark:text-orange-400 truncate block">
              {currentUser ? currentUser.name : 'Guest Scholar'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div
        className={`grid gap-8 items-start ${
          viewMode === 'all'
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1 max-w-4xl mx-auto'
        }`}
      >
        {/* ========================================================= */}
        {/* SECTION 1: AI SUBJECT STUDY ASSISTANT                      */}
        {/* ========================================================= */}
        {(viewMode === 'all' || viewMode === 'study') && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-7 border border-orange-200/80 dark:border-stone-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-stone-800 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      AI Subject Study Assistant
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Conceptual breakdowns with first-principles scientific proofs
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-stone-400">13 Subjects</span>
              </div>

              {/* Subject Selection Pills */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Select Academic Discipline:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStudySubject(s);
                        setStudyAnswer('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        studySubject === s
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-orange-50 dark:hover:bg-stone-750'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* High-Yield Syllabus Suggestions */}
              {activeSyllabusPrompts.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Curated Syllabus Concept Prompts for {studySubject}:</span>
                  </span>
                  <div className="space-y-1.5">
                    {activeSyllabusPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAskStudyAssistant(p)}
                        className="w-full text-left p-2.5 rounded-xl bg-orange-50/60 dark:bg-stone-800/50 hover:bg-orange-100/70 dark:hover:bg-stone-800 border border-orange-100 dark:border-stone-700/60 text-xs text-stone-800 dark:text-stone-200 transition flex items-center justify-between group"
                      >
                        <span className="line-clamp-1">{p}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inquiry Input Area */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Your Query or Syllabus Topic:
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder={`Ask any question about ${studySubject}... (e.g. key theorem, derivation, lab setup, or exam problem)`}
                    value={studyQuestion}
                    onChange={(e) => setStudyQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAskStudyAssistant();
                      }
                    }}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 placeholder:text-stone-400 resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-stone-400">
                      Press <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded-md border border-stone-200 dark:border-stone-700 font-mono text-[10px]">Ctrl/Cmd+Enter</kbd> to submit
                    </span>
                    <button
                      onClick={() => handleAskStudyAssistant()}
                      disabled={isAskingStudy || !studyQuestion.trim()}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isAskingStudy ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Consulting AI…</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Ask Study Assistant</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Answer Response Box */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-orange-600" />
                    <span>Academic Guidance & Scientific Explanation</span>
                  </span>
                  {studyAnswer && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyAnswer}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-[11px] font-semibold text-stone-700 dark:text-stone-300 transition flex items-center gap-1"
                      >
                        {copiedAnswer ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAnswer ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={handleSaveNote}
                        className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-stone-800 hover:bg-orange-100 text-[11px] font-semibold text-orange-700 dark:text-orange-400 transition flex items-center gap-1 border border-orange-200 dark:border-stone-700"
                      >
                        <Bookmark className="w-3 h-3" />
                        <span>Save Note</span>
                      </button>
                    </div>
                  )}
                </div>

                {noteSavedMessage && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{noteSavedMessage}</span>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-stone-50/70 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 text-xs min-h-[140px] max-h-96 overflow-y-auto leading-relaxed">
                  {isAskingStudy ? (
                    <div className="flex flex-col items-center justify-center py-8 text-stone-500 space-y-2">
                      <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium text-xs">Synthesizing first-principles explanation for {studySubject}…</span>
                    </div>
                  ) : studyAnswer ? (
                    <div className="space-y-3 text-stone-800 dark:text-stone-200">
                      <div className="inline-block px-2.5 py-0.5 rounded-md bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-300 font-bold font-mono text-[11px]">
                        Subject: {studySubject}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-xs sm:text-[13px]">
                        {studyAnswer}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-stone-400 space-y-1 text-center">
                      <Compass className="w-6 h-6 text-stone-300 dark:text-stone-600" />
                      <p className="text-xs">Select a subject or click a syllabus prompt above to begin.</p>
                      <p className="text-[11px] text-stone-400">Responses cite foundational formulas, experimental context, and pedagogical proofs.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Student Saved Study Notes */}
            {savedNotes.length > 0 && (
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-orange-600" />
                    <span>My Saved Study Notebook ({savedNotes.length})</span>
                  </h3>
                  <span className="text-[11px] text-stone-400">Stored locally</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {savedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/70 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-orange-600 dark:text-orange-400 font-mono text-[11px]">
                          {note.subject}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400">{note.savedAt}</span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 transition"
                            title="Delete note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="font-semibold text-stone-900 dark:text-stone-100">
                        {note.question}
                      </div>
                      <p className="text-stone-600 dark:text-stone-300 line-clamp-2 text-[11px]">
                        {note.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 2: AI PRACTICE QUIZ GENERATOR                      */}
        {/* ========================================================= */}
        {(viewMode === 'all' || viewMode === 'quiz') && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-7 border border-orange-200/80 dark:border-stone-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-stone-800 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      AI Practice Quiz Generator
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Adaptive 5-question multi-choice diagnostic assessments
                    </p>
                  </div>
                </div>
                {quizScore !== null && quizQuestions && (
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block tabular-nums">
                      {quizScore}/{quizQuestions.length} Correct ({Math.round((quizScore / quizQuestions.length) * 100)}%)
                    </span>
                    <span className="text-[10px] text-stone-400">Score recorded</span>
                  </div>
                )}
              </div>

              {/* Generator Configuration Deck */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Subject:
                    </label>
                    <select
                      value={quizSubject}
                      onChange={(e) => {
                        const newSub = e.target.value as SubjectName;
                        setQuizSubject(newSub);
                        const suggested = SUGGESTED_QUIZ_TOPICS[newSub];
                        if (suggested && suggested[0]) setQuizTopic(suggested[0]);
                      }}
                      className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Difficulty Level:
                    </label>
                    <div className="flex gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                      {(['Standard', 'Advanced', 'Olympiad'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setQuizDifficulty(lvl)}
                          className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                            quizDifficulty === lvl
                              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Topic / Concept Chapter:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Wave Mechanics & Optics, Rotational Motion, Genetics"
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                      className="flex-1 p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => handleGenerateQuiz()}
                      disabled={isGeneratingQuiz || !quizTopic.trim()}
                      className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating…</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-3.5 h-3.5" />
                          <span>Generate Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Suggested Topics Pills */}
                {activeSuggestedTopics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-stone-400 mr-1">Suggested:</span>
                    {activeSuggestedTopics.map((top) => (
                      <button
                        key={top}
                        type="button"
                        onClick={() => handleGenerateQuiz(top)}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-orange-50 dark:hover:bg-stone-750 text-[11px] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition"
                      >
                        {top}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Render Quiz Questions Container */}
              {isGeneratingQuiz && (
                <div className="py-12 flex flex-col items-center justify-center text-stone-500 space-y-2 border-t border-stone-100 dark:border-stone-800">
                  <div className="w-7 h-7 border-3 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  <span className="font-semibold text-xs">Crafting 5 pedagogical questions on "{quizTopic}"…</span>
                </div>
              )}

              {quizQuestions && !isGeneratingQuiz && (
                <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                  {/* Performance Summary Banner when Submitted */}
                  {quizSubmitted && quizScore !== null && (
                    <div className="p-4 rounded-2xl bg-orange-50 dark:bg-stone-800/80 border border-orange-200 dark:border-stone-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                            Diagnostic Assessment Completed
                          </span>
                        </div>
                        <span className="text-base font-extrabold font-mono text-orange-600 dark:text-orange-400 tabular-nums">
                          {quizScore} / {quizQuestions.length} ({Math.round((quizScore / quizQuestions.length) * 100)}%)
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300">
                        {quizScore === quizQuestions.length
                          ? '🌟 Flawless mastery! First-principles conceptual clarity demonstrated.'
                          : quizScore >= 3
                          ? '👍 Strong competency shown. Review the question explanations below to solidify edge-cases.'
                          : '📚 Recommend revisiting foundational derivations and retaking after review.'}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px]">
                        <button
                          onClick={handleRetakeQuiz}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 transition flex items-center gap-1 font-semibold"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retake Same Quiz</span>
                        </button>
                        <button
                          onClick={() => handleGenerateQuiz()}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition flex items-center gap-1 font-semibold"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generate New Topic</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of 5 Questions */}
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 text-xs">
                    {quizQuestions.map((q, qIdx) => {
                      const isAnswered = quizUserAnswers[qIdx] !== undefined;
                      const isCorrect = quizSubmitted && quizUserAnswers[qIdx] === q.answer;
                      const isWrong = quizSubmitted && quizUserAnswers[qIdx] !== q.answer;

                      return (
                        <div
                          key={qIdx}
                          className={`p-4 rounded-2xl border transition space-y-3 ${
                            quizSubmitted
                              ? isCorrect
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                              : 'bg-stone-50/70 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-bold text-stone-900 dark:text-stone-100 leading-snug">
                              {qIdx + 1}. {q.q}
                            </span>
                            {quizSubmitted && (
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] shrink-0 font-mono ${
                                  isCorrect
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {isCorrect ? 'CORRECT' : 'INCORRECT'}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = quizUserAnswers[qIdx] === oIdx;
                              const isTargetCorrect = quizSubmitted && oIdx === q.answer;

                              return (
                                <label
                                  key={oIdx}
                                  onClick={() => handleSelectQuizAnswer(qIdx, oIdx)}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                                    isSelected
                                      ? 'bg-orange-100/70 dark:bg-orange-950/60 border-orange-400 font-semibold text-stone-900 dark:text-stone-100'
                                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-750 hover:border-orange-300 text-stone-700 dark:text-stone-300'
                                  } ${
                                    quizSubmitted && isTargetCorrect
                                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                                      : ''
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`quiz-q-${qIdx}`}
                                    checked={isSelected}
                                    disabled={quizSubmitted}
                                    onChange={() => handleSelectQuizAnswer(qIdx, oIdx)}
                                    className="text-orange-600 focus:ring-orange-500 shrink-0"
                                  />
                                  <span className="flex-1 leading-normal">{opt}</span>
                                  {quizSubmitted && isTargetCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  )}
                                </label>
                              );
                            })}
                          </div>

                          {/* Post-submission pedagogical explanation */}
                          {quizSubmitted && q.explanation && (
                            <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed bg-white/50 dark:bg-stone-900/50 p-2.5 rounded-xl">
                              <span className="font-bold text-stone-800 dark:text-stone-200 block mb-0.5">
                                Explanation & Principle:
                              </span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submission Controls */}
                  {!quizSubmitted ? (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(quizUserAnswers).length < quizQuestions.length}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        Submit & Check Answers ({Object.keys(quizUserAnswers).length} of {quizQuestions.length} Answered)
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-stone-500 pt-2">
                      <span>Result synced with student academic transcript</span>
                      <button
                        onClick={handleRetakeQuiz}
                        className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset and Retake</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!quizQuestions && !isGeneratingQuiz && (
                <div className="py-12 flex flex-col items-center justify-center text-center text-stone-400 space-y-2 border-t border-stone-100 dark:border-stone-800">
                  <Award className="w-8 h-8 text-stone-300 dark:text-stone-600" />
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-300">
                    No active quiz loaded.
                  </p>
                  <p className="text-[11px] text-stone-400 max-w-sm">
                    Select a subject and chapter above, then click "Generate Quiz" to load 5 tailored practice questions.
                  </p>
                </div>
              )}
            </div>

            {/* Previous Quiz Results Table */}
            {quizResults.length > 0 && (
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recent Student Quiz Transcript ({quizResults.length})</span>
                  </h3>
                  <span className="text-[11px] text-stone-400">Recorded for faculty evaluation</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {quizResults.slice(0, 8).map((qz, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/70 text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          <span>{qz.subject}</span>
                          {qz.topic && (
                            <span className="text-stone-500 dark:text-stone-400 font-normal text-[11px]">
                              · {qz.topic}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          {qz.time} · Student: {qz.userId}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 block tabular-nums">
                          {qz.score} ({qz.percentage}%)
                        </span>
                        <span className="text-[9px] uppercase font-bold text-stone-400">
                          {qz.percentage >= 80 ? 'Mastery' : qz.percentage >= 60 ? 'Proficient' : 'Developing'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
