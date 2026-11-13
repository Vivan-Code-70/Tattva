import { QuizQuestion } from '../types';

export class AiService {
  /**
   * Answer student study query for one of the 13 subjects
   */
  public static async askStudyAssistant(subject: string, question: string): Promise<string> {
    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, question }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.answer) return data.answer;
      }
    } catch (e) {
      // Backend not running or offline, proceed to intelligent fallback
    }

    return this.getFallbackStudyAnswer(subject, question);
  }

  /**
   * Draft structured 45-minute lesson plan for teachers
   */
  public static async draftLessonPlan(topic: string): Promise<string> {
    try {
      const response = await fetch('/api/ai/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.lessonPlan) return data.lessonPlan;
      }
    } catch (e) {}

    return this.getFallbackLessonPlan(topic);
  }

  /**
   * Generate 5 multiple-choice quiz questions
   */
  public static async generateQuiz(subject: string, topic: string): Promise<QuizQuestion[]> {
    try {
      const response = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, topic }),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          return data.questions;
        }
      }
    } catch (e) {}

    return this.getFallbackQuiz(subject, topic);
  }

  /**
   * Draft personalized report card remark
   */
  public static async draftRemark(studentName: string, grade: string, scores: { subject: string; score: number }[]): Promise<string> {
    try {
      const response = await fetch('/api/ai/remark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, grade, scores }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.remark) return data.remark;
      }
    } catch (e) {}

    return this.getFallbackRemark(studentName, grade, scores);
  }

  /**
   * Triage a support message
   */
  public static async triageMessage(message: string): Promise<{
    valid: boolean;
    urgent: boolean;
    category: string;
    summary: string;
  }> {
    try {
      const response = await fetch('/api/ai/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (e) {}

    // Intelligent client-side heuristic triage
    const t = message.toLowerCase();
    const isSafety = /(bully|bullied|unsafe|threat|harass|hurt|hitting|abuse|danger|scared|suicide|panic)/.test(t);
    const hasIssueKeywords = /(not working|doesn'?t work|can'?t|cannot|unable|error|problem|issue|wrong|missing|failed|stuck|crash|bug|incorrect|not showing|not loading|didn'?t receive|receipt|payment|otp|password)/.test(t);
    const hasPortalDomain = /(login|otp|password|assignment|timetable|fee|receipt|attendance|calendar|report|library|counsel|leave|quiz|gate|marks|grade|portal|page|button|kiosk|account)/.test(t);

    const valid = message.length >= 10 && (isSafety || (hasIssueKeywords && hasPortalDomain) || hasIssueKeywords);
    return {
      valid,
      urgent: isSafety,
      category: isSafety ? 'Student Welfare & Safety' : hasPortalDomain ? 'Portal & Academic Systems' : 'General Support',
      summary: message.length > 120 ? message.slice(0, 117) + '…' : message,
    };
  }

  // --- Fallback Generators with rich academic content ---

  private static getFallbackStudyAnswer(subject: string, question: string): string {
    const q = question.toLowerCase();

    if (subject === 'Physics') {
      if (q.includes('wave') || q.includes('frequency') || q.includes('amplitude')) {
        return `In wave mechanics, wave speed is governed by v = f · λ (velocity = frequency × wavelength). When a wave propagates across boundaries, its frequency remains unchanged as it is dictated by the harmonic oscillator source, whereas wavelength alters proportionally to wave speed within the medium. Amplitude determines wave energy density (proportional to amplitude squared).`;
      }
      if (q.includes('gravity') || q.includes('newton') || q.includes('force')) {
        return `Newton's Universal Law of Gravitation establishes that every mass attracts every other mass with force F = G(m1·m2)/r². At Earth's surface, this resolves to standard acceleration g ≈ 9.81 m/s². The gravitational potential energy is defined as U = -G(M·m)/r.`;
      }
      return `Physics at Tattvasayam Future Academy emphasizes fundamental first principles and experimental verification. In ${subject}, "${question}" addresses core physical conservation laws (momentum, mass-energy, and charge conservation). Consider both the microscopic molecular mechanism and the macroscopic mathematical model.`;
    }

    if (subject === 'Mathematics') {
      if (q.includes('calculus') || q.includes('derivative') || q.includes('integral')) {
        return `Derivatives represent instantaneous rates of change via lim (h→0) [f(x+h) - f(x)] / h. Geometrically, it corresponds to the tangent slope. Integrals compute net accumulated quantity (area under the Riemann sum). The Fundamental Theorem of Calculus links both as inverse operations: d/dx ∫[a to x] f(t)dt = f(x).`;
      }
      return `Mathematics forms the analytical core of our neural curriculum. For "${question}", apply systematic decomposition: 1) Identify given variables and constraints, 2) Map into an algebraic equation or geometric projection, and 3) Verify symmetry and boundary conditions.`;
    }

    if (subject === 'Philosophy') {
      return `Philosophical inquiry at Tattvasayam investigates epistemological justification, ethics of autonomous systems, and ontology. Regarding "${question}": Evaluate both deontological frameworks (duty and moral principles) and utilitarian perspectives (net systemic outcome), synthesized through ancient Indian darshanas and modern cognitive theories.`;
    }

    return `Tattvasayam Future Academy Academic Study Insight [${subject}]: Regarding "${question}":\nKey takeaway: Examine the foundational concept, its primary mathematical or contextual relationship, and verify real-world application in laboratory or field work. Always cross-reference with faculty lecture notes in Room 101-105.`;
  }

  private static getFallbackLessonPlan(topic: string): string {
    return `Tattvasayam Future Academy — 45-Minute Lesson Plan
Topic: ${topic}
Target Cohort: Secondary / Senior Academic Division

1. Learning Objectives (5 min):
   • Identify and articulate core conceptual models of ${topic}.
   • Solve practical analytical problems applying first-principles reasoning.

2. Instructional Activities & Timings:
   • 00–08 min: Diagnostic Warm-up & Cognitive Hook: Phenomenon demonstration on holographic smart-board.
   • 08–22 min: Concept Architecture: Direct instruction with interactive simulation and schematic breakdown.
   • 22–35 min: Collaborative Guided Mastery: Dual-student problem set and peer verification.
   • 35–42 min: Synthesis & Application: Real-world engineering / societal case study.
   • 42–45 min: Metacognitive Exit Reflection.

3. Formative Assessment Question:
   "How does varying the primary boundary condition alter system equilibrium in ${topic}? Justify mathematically or conceptually."`;
  }

  private static getFallbackQuiz(subject: string, topic: string): QuizQuestion[] {
    if (subject === 'Physics') {
      return [
        {
          q: 'What is the relationship between wave speed (v), frequency (f), and wavelength (λ)?',
          options: ['v = f · λ', 'v = f / λ', 'v = λ / f', 'v = f² · λ'],
          answer: 0,
          explanation: 'Wave speed equals frequency multiplied by wavelength (v = fλ).',
        },
        {
          q: 'When a mechanical sound wave transitions from air into dense water, what happens to its frequency?',
          options: ['It doubles', 'It halves', 'It remains constant', 'It drops to zero'],
          answer: 2,
          explanation: 'Frequency is determined strictly by the oscillating source and remains invariant across media.',
        },
        {
          q: 'Which SI unit measures luminous intensity in standardized physics metrics?',
          options: ['Lumen', 'Candela', 'Lux', 'Watt per steradian'],
          answer: 1,
          explanation: 'Candela (cd) is the base SI unit of luminous intensity.',
        },
        {
          q: 'A 2 kg mass accelerates at 4.5 m/s². What is the net applied force according to Newton’s second law?',
          options: ['2.25 N', '6.5 N', '9.0 N', '18.0 N'],
          answer: 2,
          explanation: 'F = m · a = 2 kg × 4.5 m/s² = 9.0 N.',
        },
        {
          q: 'What does the area under a Force vs. Displacement graph physically signify?',
          options: ['Work done (Energy)', 'Momentum', 'Power', 'Impulse'],
          answer: 0,
          explanation: 'Work W = ∫ F · dx, representing energy transferred.',
        },
      ];
    }

    if (subject === 'Biology') {
      return [
        {
          q: 'During oxygenic photosynthesis, where do the light-dependent reactions take place inside chloroplasts?',
          options: ['Stroma', 'Thylakoid membrane', 'Outer envelope', 'Mitochondrial matrix'],
          answer: 1,
          explanation: 'Thylakoid membranes contain chlorophyll photosystems I and II.',
        },
        {
          q: 'Which nitrogenous base is found in RNA molecules but completely absent in DNA?',
          options: ['Thymine', 'Uracil', 'Cytosine', 'Guanine'],
          answer: 1,
          explanation: 'Uracil substitutes for thymine in RNA transcripts.',
        },
        {
          q: 'What term defines biological maintenance of stable internal physiological equilibrium?',
          options: ['Hemostasis', 'Homeostasis', 'Heterosis', 'Hydrolysis'],
          answer: 1,
          explanation: 'Homeostasis is the active maintenance of steady internal conditions.',
        },
        {
          q: 'Which cellular organelle is responsible for post-translational modification and protein sorting?',
          options: ['Golgi apparatus', 'Ribosome', 'Centrosome', 'Peroxisome'],
          answer: 0,
          explanation: 'The Golgi apparatus modifies, sorts, and packages proteins for secretion or targeted delivery.',
        },
        {
          q: 'In Mendelian genetics, what is the phenotypic ratio in the F2 generation of a classic monohybrid cross?',
          options: ['1:2:1', '3:1', '9:3:3:1', '2:1'],
          answer: 1,
          explanation: 'A heterozygous cross (Aa × Aa) produces 3 dominant to 1 recessive phenotype.',
        },
      ];
    }

    // Default general academic quiz
    return [
      {
        q: `In the study of ${subject} (${topic || 'Core Curriculum'}), which analytical principle provides the highest empirical rigor?`,
        options: ['Peer-reviewed experimental verification', 'Subjective anecdotal consensus', 'Unverified extrapolation', 'Single-sample estimation'],
        answer: 0,
        explanation: 'Empirical verification under controlled experimental conditions establishes rigorous scientific evidence.',
      },
      {
        q: 'What characterizes an exponential growth function f(x) = a · b^x when b > 1?',
        options: ['Linear decrease', 'Accelerating rate of growth proportional to value', 'Fixed constant increment', 'Sinusoidal oscillation'],
        answer: 1,
        explanation: 'In exponential growth with base > 1, the growth rate is directly proportional to the current magnitude.',
      },
      {
        q: 'Which cognitive framework focuses on understanding concepts through first-principles decomposition?',
        options: ['Rote regurgitation', 'Analytical reduction and systematic synthesis', 'Heuristic bias confirmation', 'Superficial memorization'],
        answer: 1,
        explanation: 'First-principles reasoning breaks problems down into fundamental truths and synthesizes conclusions upward.',
      },
      {
        q: 'In academic writing and scientific reporting, why is primary citation indispensable?',
        options: ['To inflate document word counts', 'To establish provenance, accountability, and reproducibility', 'To obscure methodological gaps', 'To avoid formatting requirements'],
        answer: 1,
        explanation: 'Accurate citations ensure academic integrity, verifiable provenance, and scientific repeatability.',
      },
      {
        q: 'What is the primary indicator of mastery in Tattvasayam’s 13-subject neural assessment framework?',
        options: ['Application of conceptual schemas to novel, complex scenarios', 'Memorization of question bank answers', 'Speed of submission without precision', 'Passive lecture attendance alone'],
        answer: 0,
        explanation: 'True mastery involves transferring core mental models to solve complex, novel challenges.',
      },
    ];
  }

  private static getFallbackRemark(studentName: string, grade: string, scores: { subject: string; score: number }[]): string {
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const lowest = sorted[sorted.length - 1];

    return `${studentName} (${grade}) demonstrates outstanding academic poise at Tattvasayam Future Academy. Exceptional intellectual agility is evident in ${top.subject} (${top.score}%), reflecting profound analytical acumen and consistent investigative dedication. With purposeful focus on bridging conceptual depth in ${lowest.subject} (${lowest.score}%) through structured peer workshops and library resource engagement, ${studentName} is poised for continued scholastic distinction across our neural interdisciplinary curriculum.`;
  }
}
