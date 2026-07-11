/** Shared types for the AVA embedded-analyst experience. */

export type AvaTone = 'bad' | 'warn' | 'good' | 'neutral';

/** One horizontal attribution bar inside an evidence card. */
export interface AvaEvidenceItem {
  label: string;
  /** Formatted value shown at the right edge, e.g. "38%" or "$1.2M". */
  value: string;
  /** Bar length, 0–100. */
  share: number;
  tone: AvaTone;
}

export interface AvaEvidence {
  title: string;
  items: AvaEvidenceItem[];
  footnote?: string;
}

/** One step of AVA's visible reasoning trace ("pulling accounts…"). */
export interface AvaReasoningStep {
  text: string;
  /** Optional mono-font detail, e.g. "12,431 accounts". */
  detail?: string;
}

export interface AvaAnswer {
  reasoning: AvaReasoningStep[];
  /** GitHub-flavored markdown. */
  markdown: string;
  evidence?: AvaEvidence;
  followUps?: AvaFollowUp[];
}

export interface AvaFollowUp {
  /** Chip label; also used as the user's message when clicked. */
  label: string;
  answer: AvaAnswer;
}

/**
 * Where the user is asking from. `insightId` keys into the insight registry;
 * breadcrumb + selection are shown as context chips so the user can see
 * exactly what AVA has picked up.
 */
export interface AvaContext {
  insightId: string;
  /** e.g. ['Consumer', 'Delinquency', 'Static Pool — 30+'] */
  breadcrumb: string[];
  /** Selected data points, e.g. ["Jan'24 · MOB 5 · 6.2%"]. */
  selection?: string[];
  params?: Record<string, string | number | string[]>;
}

export interface AvaInsight {
  suggestedQuestions: (ctx: AvaContext) => string[];
  answer: (ctx: AvaContext, question: string) => AvaAnswer;
}

export interface AvaMessage {
  id: string;
  role: 'user' | 'ava';
  /** User: the question. AVA: full markdown (also inside `answer`). */
  content: string;
  answer?: AvaAnswer;
  context?: AvaContext;
}
