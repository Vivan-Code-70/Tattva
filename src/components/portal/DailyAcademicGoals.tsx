import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Target,
  Trophy,
  RotateCcw,
  BookOpen,
  Check,
} from 'lucide-react';
import { soundEffects } from '../../utils/audioChime';
import { getStudentOptedSubjects } from '../../services/storageService';

export interface DailyStudyGoal {
  id: string;
  title: string;
  subject: string;
  estimatedMinutes: number;
  completed: boolean;
  priority?: 'high' | 'medium' | 'normal';
  isCustom?: boolean;
}

interface DailyAcademicGoalsProps {
  studentKey: string;
  studentName: string;
  onNavigateToStudyLab?: () => void;
}

const DEFAULT_GOALS_BY_STUDENT: Record<string, DailyStudyGoal[]> = {
  vivan: [
    {
      id: 'viv-goal-1',
      title: 'Review Riemann sums & definite integrals calculus derivations',
      subject: 'Mathematics',
      estimatedMinutes: 25,
      completed: true,
      priority: 'high',
    },
    {
      id: 'viv-goal-2',
      title: 'Record pendulum harmonic oscillation cycles in Physics simulator',
      subject: 'Physics',
      estimatedMinutes: 20,
      completed: true,
      priority: 'high',
    },
    {
      id: 'viv-goal-3',
      title: 'Synthesize 1-page thesis outline for Kantian deontology essay',
      subject: 'Philosophy & Ethics',
      estimatedMinutes: 30,
      completed: false,
      priority: 'medium',
    },
    {
      id: 'viv-goal-4',
      title: 'Complete 15 conversational French vocabulary & structure drills',
      subject: 'French',
      estimatedMinutes: 15,
      completed: false,
      priority: 'normal',
    },
    {
      id: 'viv-goal-5',
      title: 'Practice 5-question AI Study Lab neural network forward-pass quiz',
      subject: 'Emerging Tech & AI',
      estimatedMinutes: 15,
      completed: false,
      priority: 'normal',
    },
  ],
  krishvika: [
    {
      id: 'kri-goal-1',
      title: 'Solve 10 quadratic & linear equations with two variables',
      subject: 'Mathematics',
      estimatedMinutes: 25,
      completed: true,
      priority: 'high',
    },
    {
      id: 'kri-goal-2',
      title: 'Annotate cell organelles & mitosis phase diagrams in Biology',
      subject: 'Biology & Life Sciences',
      estimatedMinutes: 20,
      completed: true,
      priority: 'high',
    },
    {
      id: 'kri-goal-3',
      title: 'Summarize 4 dohas by Sant Kabir with contextual interpretation',
      subject: 'Hindi Language & Literature',
      estimatedMinutes: 20,
      completed: false,
      priority: 'medium',
    },
    {
      id: 'kri-goal-4',
      title: 'Complete interactive periodic table stoichiometry practice drill',
      subject: 'Chemistry',
      estimatedMinutes: 15,
      completed: false,
      priority: 'normal',
    },
    {
      id: 'kri-goal-5',
      title: 'Draft notes on sustainable agriculture techniques in Civics',
      subject: 'Social Sciences & Civics',
      estimatedMinutes: 20,
      completed: false,
      priority: 'normal',
    },
  ],
};

export const DailyAcademicGoals: React.FC<DailyAcademicGoalsProps> = ({
  studentKey,
  studentName,
  onNavigateToStudyLab,
}) => {
  const storageKey = `tfa_daily_academic_goals_${studentKey}`;

  const [goals, setGoals] = useState<DailyStudyGoal[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Could not load daily goals from localStorage', err);
      }
    }
    return DEFAULT_GOALS_BY_STUDENT[studentKey] || DEFAULT_GOALS_BY_STUDENT.vivan;
  });

  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newMinutes, setNewMinutes] = useState(20);
  const [showAddForm, setShowAddForm] = useState(false);

  // Opted subjects list for dropdown
  const optedSubjects = getStudentOptedSubjects(studentKey);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(goals));
      } catch (err) {
        console.warn('Could not save daily goals to localStorage', err);
      }
    }
  }, [goals, storageKey]);

  // Re-load if studentKey changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGoals(parsed);
          return;
        }
      }
    } catch {
      // fallback
    }
    setGoals(DEFAULT_GOALS_BY_STUDENT[studentKey] || DEFAULT_GOALS_BY_STUDENT.vivan);
  }, [studentKey, storageKey]);

  // Calculations for circular progress bar
  const totalCount = goals.length;
  const completedCount = goals.filter((g) => g.completed).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalMinutes = goals.reduce((acc, g) => acc + g.estimatedMinutes, 0);
  const remainingMinutes = goals
    .filter((g) => !g.completed)
    .reduce((acc, g) => acc + g.estimatedMinutes, 0);

  // Circular progress SVG constants
  const size = 68;
  const strokeWidth = 5.5;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleToggle = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const willComplete = !g.completed;
          if (willComplete) {
            soundEffects.playSuccessChime();
          }
          return { ...g, completed: willComplete };
        }
        return g;
      })
    );
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newGoal: DailyStudyGoal = {
      id: `custom-goal-${Date.now()}`,
      title: newTitle.trim(),
      subject: newSubject || optedSubjects[0] || 'Mathematics',
      estimatedMinutes: Number(newMinutes) || 20,
      completed: false,
      priority: 'normal',
      isCustom: true,
    };

    setGoals((prev) => [newGoal, ...prev]);
    setNewTitle('');
    setShowAddForm(false);
    soundEffects.playSuccessChime();
  };

  const handleDelete = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleResetDefaults = () => {
    const defaults = DEFAULT_GOALS_BY_STUDENT[studentKey] || DEFAULT_GOALS_BY_STUDENT.vivan;
    setGoals(defaults);
    soundEffects.playSuccessChime();
  };

  const filteredGoals = goals.filter((g) => {
    if (filter === 'active') return !g.completed;
    if (filter === 'completed') return g.completed;
    return true;
  });

  return (
    <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs flex flex-col justify-between space-y-4">
      {/* Header with Title and Circular Progress Ring */}
      <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-600" />
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
              Daily Academic Goals
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-300 font-mono">
              Today's Targets
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Actionable micro-tasks for {studentName.split(' ')[0]} • Check off to stay in peak mastery rhythm
          </p>
        </div>

        {/* Small Circular Progress Bar */}
        <div className="flex items-center gap-2.5 shrink-0 bg-stone-50 dark:bg-stone-800/60 p-2 rounded-xl border border-stone-200/70 dark:border-stone-700/60">
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                className="stroke-stone-200 dark:stroke-stone-700 fill-none"
                strokeWidth={strokeWidth}
              />
              {/* Foreground progress circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                className={`fill-none transition-all duration-700 ease-out ${
                  percentage === 100
                    ? 'stroke-emerald-500'
                    : 'stroke-orange-600 dark:stroke-orange-500'
                }`}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            {/* Center percentage label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className={`font-mono font-extrabold text-xs ${
                  percentage === 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-900 dark:text-stone-100'
                }`}
              >
                {percentage}%
              </span>
              <span className="text-[9px] font-bold text-stone-400 font-mono leading-none">
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
              {percentage === 100 ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                  <Trophy className="w-3 h-3" />
                  All Done!
                </span>
              ) : (
                `${completedCount} of ${totalCount} Done`
              )}
            </div>
            <div className="text-[10px] text-stone-400 font-mono">
              {remainingMinutes > 0 ? `${remainingMinutes}m remaining` : 'Goals conquered'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Add Goal Actions */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
              filter === 'all'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
              filter === 'active'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            Active ({totalCount - completedCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
              filter === 'completed'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            Done ({completedCount})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-orange-700 dark:text-orange-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Goal</span>
          </button>
          <button
            onClick={handleResetDefaults}
            title="Reset to default daily targets"
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Add Form Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleAddGoal}
          className="p-3 bg-orange-50/70 dark:bg-stone-800/60 rounded-xl border border-orange-200 dark:border-stone-700 space-y-2.5 text-xs animate-in fade-in"
        >
          <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>New Actionable Study Target</span>
          </div>
          <input
            type="text"
            required
            placeholder="e.g. Solve 5 rotational dynamics problems..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={newSubject || optedSubjects[0] || 'Mathematics'}
              onChange={(e) => setNewSubject(e.target.value)}
              className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200 outline-none"
            >
              {optedSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 text-[11px] text-stone-500">
              <Clock className="w-3 h-3" />
              <span>Est.</span>
              <input
                type="number"
                min="5"
                max="120"
                step="5"
                value={newMinutes}
                onChange={(e) => setNewMinutes(Number(e.target.value))}
                className="w-14 px-1.5 py-1 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 font-mono text-center"
              />
              <span>min</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-2 py-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-2xs"
              >
                Save Target
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Goal Items List */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {filteredGoals.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            {filter === 'completed' ? (
              <span>No completed tasks yet. Check off a goal above to get started!</span>
            ) : (
              <span>All clear! No active study goals left for the day.</span>
            )}
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const isDone = goal.completed;
            return (
              <div
                key={goal.id}
                onClick={() => handleToggle(goal.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-xs select-none ${
                  isDone
                    ? 'bg-stone-50/60 dark:bg-stone-800/30 border-stone-200 dark:border-stone-800 opacity-75'
                    : 'bg-white dark:bg-stone-850 border-orange-200/70 dark:border-stone-700 hover:border-orange-500 shadow-2xs'
                }`}
              >
                {/* Checkbox Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(goal.id);
                  }}
                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-stone-300 dark:border-stone-600 hover:border-orange-500 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-semibold leading-snug transition-all ${
                      isDone
                        ? 'line-through text-stone-400 dark:text-stone-500'
                        : 'text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    {goal.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                    <span className="font-medium px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {goal.subject}
                    </span>
                    <span className="flex items-center gap-1 text-stone-400 font-mono">
                      <Clock className="w-3 h-3" />
                      {goal.estimatedMinutes} min
                    </span>
                    {goal.priority === 'high' && !isDone && (
                      <span className="px-1.5 py-0.2 rounded font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Priority
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete if custom */}
                {goal.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(goal.id);
                    }}
                    title="Remove custom goal"
                    className="text-stone-300 hover:text-rose-500 transition p-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info & Quick Link */}
      <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
        <span className="font-mono">
          Total target: {totalMinutes}m ({Math.round(totalMinutes / 60 * 10) / 10}h)
        </span>
        {onNavigateToStudyLab && (
          <button
            onClick={onNavigateToStudyLab}
            className="font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Practice Lab &rarr;</span>
          </button>
        )}
      </div>
    </div>
  );
};
