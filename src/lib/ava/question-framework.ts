/**
 * AVA question framework — how a risk manager interrogates any surface.
 *
 * Two jobs:
 * 1. `frameworkQuestions(ctx)` — generate the contextual questions to SHOW,
 *    based on what kind of surface the user is on (KPI, cohort matrix, flow,
 *    funnel, table…) and what they selected.
 * 2. `classifyIntent(q)` + `composeAnswer(ctx, q)` — when the user types a
 *    free question, recognize what KIND of question it is and compose a
 *    structured analyst answer from the domain model (used when no curated
 *    insight covers it).
 */

import type { AvaAnswer, AvaContext } from './types';
import { CUTS, findMetric } from './domain';

/* ── Surface taxonomy ────────────────────────────────────────────── */

export type SurfaceKind =
  | 'kpi'            // single headline number
  | 'trend'          // time-series card/grid
  | 'cohort-matrix'  // vintage/static-pool triangle
  | 'flow'           // roll rates, net flow, bucket transitions
  | 'funnel'         // origination pipeline
  | 'heatmap'        // entity × dimension RAG grid
  | 'distribution'   // mix / composition charts
  | 'table'          // detail tables
  | 'section';       // whole-tab / section level

/** Infer the surface kind from the insight id when not set explicitly. */
export function surfaceFor(ctx: AvaContext): SurfaceKind {
  const id = ctx.insightId;
  if (id.includes('.kpi')) return 'kpi';
  if (id.includes('staticPool')) return 'cohort-matrix';
  if (id.includes('netflow') || id.includes('collections')) return 'flow';
  if (id.includes('funnel')) return 'funnel';
  if (id.includes('heatmap')) return 'heatmap';
  if (id.includes('trend') || id.includes('daily')) return 'trend';
  if (id.includes('composition') || id.includes('dpdDist') || id.includes('products')) return 'distribution';
  if (id.includes('scorecard') || id.includes('los') || id.includes('tdd') || id.includes('businessLines')) return 'table';
  return 'section';
}

/* ── Question generation per surface ─────────────────────────────── */

function subjectOf(ctx: AvaContext): string {
  const sel = ctx.selection?.[0];
  const metric = typeof ctx.params?.metric === 'string' ? ctx.params.metric : undefined;
  return sel ?? metric ?? ctx.breadcrumb[ctx.breadcrumb.length - 1] ?? 'this view';
}

export function frameworkQuestions(ctx: AvaContext): string[] {
  const subject = subjectOf(ctx);
  switch (surfaceFor(ctx)) {
    case 'kpi':
      return [
        `Why did ${subject} move this period?`,
        `Which segments are driving ${subject}?`,
        `Where does ${subject} sit against appetite and its 12-month corridor?`,
      ];
    case 'cohort-matrix':
      return [
        `Why are these cohorts deteriorating at this MOB?`,
        `Which segments inside these vintages are driving it?`,
        `How do they compare with earlier vintages at the same MOB?`,
      ];
    case 'flow':
      return [
        `Which bucket transition worsened most, and why?`,
        `Is this inflow-driven or a cure-rate problem?`,
        `Where should collections capacity move next cycle?`,
      ];
    case 'funnel':
      return [
        `Where is the funnel leaking the most volume?`,
        `Is the drop at ${subject} operational or credit-driven?`,
        `What single fix recovers the most disbursement?`,
      ];
    case 'heatmap':
      return [
        `Which entity needs attention first, and why?`,
        `Do the red cells share a common root cause?`,
        `Is any red cell stale data rather than real risk?`,
      ];
    case 'trend':
      return [
        `Is this trend seasonal or structural?`,
        `What leads what in these series?`,
        `Project this trend two cycles out — what breaks first?`,
      ];
    case 'distribution':
      return [
        `Is the mix drifting somewhere risky?`,
        `Which segment has the best risk-adjusted performance?`,
        `What would you rebalance, and by how much?`,
      ];
    case 'table':
      return [
        `What stands out in this table?`,
        `Rank these rows by risk momentum`,
        `Which row deserves a deep dive?`,
      ];
    default:
      return [
        `Summarize this section — what matters this period?`,
        `What changed most versus last month?`,
        `Anything here breaching risk appetite?`,
      ];
  }
}

/* ── Intent classification for free-text questions ───────────────── */

export type Intent =
  | 'root-cause' | 'trend' | 'segmentation' | 'comparison'
  | 'forecast' | 'action' | 'data-quality' | 'summary';

const INTENT_RULES: [Intent, RegExp][] = [
  ['data-quality', /\b(stale|data (issue|problem|quality)|reconcil|missing|wrong|correct)\b/i],
  ['forecast', /\b(project|forecast|next (quarter|cycle|month)|will|expect|trajectory|outlook|two cycles)\b/i],
  ['action', /\b(what (would|should)|recommend|fix|do about|action|mitigat|prioriti[sz]e|where should)\b/i],
  ['comparison', /\b(compare|versus|vs\.?|better|worse|benchmark|against|earlier|previous|pre-)\b/i],
  ['segmentation', /\b(which (segment|product|branch|channel|region|bucket|entity|row)|driving|driver|concentrat|breakdown|split|cut)\b/i],
  ['trend', /\b(trend|seasonal|structural|momentum|leads|lag|series|over time)\b/i],
  ['summary', /\b(summari|brief|overview|what matters|stand[s]? out|tldr)\b/i],
  ['root-cause', /\b(why|what happened|cause|explain|reason)\b/i],
];

export function classifyIntent(question: string): Intent {
  for (const [intent, re] of INTENT_RULES) {
    if (re.test(question)) return intent;
  }
  return 'root-cause';
}

/* ── Generic structured answer composition ───────────────────────── */

/**
 * Composes a domain-grounded answer when no curated insight covers the
 * question. Uses the metric's risk semantics (direction, lead–lag, levers)
 * and the demo's running narrative so free-text questions still get a
 * credible analyst response.
 */
export function composeAnswer(ctx: AvaContext, question: string): AvaAnswer {
  const intent = classifyIntent(question);
  const subject = subjectOf(ctx);
  const where = ctx.breadcrumb.join(' › ');
  const metric = findMetric(subject) ?? findMetric(ctx.breadcrumb.join(' '));

  const reasoning = [
    { text: `Parsing the question against ${where}`, detail: `intent: ${intent.replace('-', ' ')}` },
    { text: 'Pulling account-level records behind this view', detail: 'product · channel · geography · vintage · score band' },
    { text: intent === 'forecast' ? 'Projecting with roll-rate and vintage-curve models' : 'Benchmarking against trailing periods and risk appetite' },
  ];

  const leverLines = metric
    ? metric.levers.map((l) => `- **${l[0].toUpperCase()}${l.slice(1)}**`).join('\n')
    : CUTS.slice(0, 4).map((c) => `- By **${c}**`).join('\n');

  let markdown: string;
  switch (intent) {
    case 'action':
      markdown =
        `**Here's what I would do about ${subject}, in order of payback:**\n\n${leverLines}\n\n` +
        `The first lever moves the number fastest because it attacks the concentration I'm seeing in the underlying accounts — DSA-sourced unsecured files in Baobab Sénégal remain the common thread across the book this period. ` +
        (metric?.leads ? `Remember the timing: ${subject} leads ${metric.leads}, so acting this cycle shows up in the lagging metrics with that delay.` : `Sequence matters less than starting this cycle — each period of delay compounds through the roll-rate chain.`);
      break;
    case 'forecast':
      markdown =
        `**Projecting ${subject} two cycles out, base case:** the current trajectory holds ` +
        `${metric?.goodDirection === 'down' ? 'mildly adverse' : 'flat-to-improving'} unless origination policy changes.\n\n` +
        `- **Base:** current momentum decays ~40% per cycle as the post-March cohorts season past their peak-stress MOB.\n` +
        `- **Adverse:** if the June cohort repeats the April pattern at MOB 3, add roughly another half of the current excess.\n` +
        `- **Managed:** with the score-floor reinstatement, new inflow normalizes in 1–2 cycles; the stock takes ~4 cycles to work through.\n\n` +
        (metric?.leads ? `${subject} leads ${metric.leads} — that's your checkpoint for whether the base case is holding.` : `The next reporting cycle is the first clean checkpoint.`);
      break;
    case 'comparison':
      markdown =
        `**Comparison on ${subject}:** the split that matters here is pre- vs post-March origination policy.\n\n` +
        `Pre-policy cohorts and peer segments are aging inside their two-year corridor; the divergence concentrates in files scored 585–611, DSA-sourced, in Baobab Sénégal. Adjusted for mix, that policy band explains most of the gap you're looking at. ` +
        `Madagascar and Côte d'Ivoire — which kept the old cut — are the clean control group.`;
      break;
    case 'segmentation':
      markdown =
        `**Segment attribution for ${subject}:** the excess is concentrated, not broad-based.\n\n` +
        `- **Product:** TAKA Nano-Loan and unsecured Micro-Loan carry ~70% of it\n` +
        `- **Channel:** DSA / mobile-agent sourcing over-indexes ~3× vs branch\n` +
        `- **Geography:** Dakar & Thiès dominate; other regions are in corridor\n` +
        `- **Score band:** 585–611 at origination (the March relaxation band) defaults at ~3× the 612+ band\n\n` +
        `Cutting by any other dimension (ticket, tenure, age) adds little once these four are controlled.`;
      break;
    case 'trend':
      markdown =
        `**Reading the ${subject} series:** one structural break, the rest is seasonality.\n\n` +
        `The level shift dates to April — coinciding with the March underwriting change, not with any macro series. ` +
        (metric?.leads ? `${subject} leads ${metric.leads}; use that lag to time interventions and to know when to expect the lagging charts to turn.` : `Watch two more cycles to confirm momentum decay before calling it contained.`);
      break;
    case 'data-quality':
      markdown =
        `**Data check on ${subject}:** ingestion watermarks show all subsidiary feeds current except **Mali (47 days)** — any Mali-linked cell here should be re-verified before escalation.\n\n` +
        `Field-level DQ checks on the underlying table pass except for collateral revaluation dates. I'd refresh the Mali feed before treating this as a risk signal.`;
      break;
    case 'summary':
      markdown =
        `**${where} in brief:** performance is inside appetite except the early-stage credit cluster in Baobab Sénégal's unsecured digital book.\n\n` +
        `Growth is on plan, collections is holding, provisions are adequate. The one decision that matters this cycle is the origination score floor — everything else on this surface is monitoring.`;
      break;
    default: // root-cause
      markdown =
        `**On ${subject}:** the movement traces to the post-March unsecured cohorts in Baobab Sénégal — the common root cause running through the book this period.\n\n` +
        `- The affected accounts are DSA-sourced, scored 585–611 at origination, concentrated in Dakar/Thiès\n` +
        `- Early-bucket collections timing (first contact at day 4.6 vs 2.1) is a secondary amplifier\n` +
        (metric?.leads ? `- Timing: ${subject} leads ${metric.leads} — the lagging metrics will follow unless origination tightens\n` : '') +
        `\nIf you want, I can attribute this specific view by product, channel, geography or score band.`;
  }

  return {
    reasoning,
    markdown,
    followUps: [
      {
        label: intent === 'action' ? 'Show the supporting evidence' : 'What would you do about it?',
        answer: {
          reasoning: [{ text: 'Composing recommendation from the levers for this metric' }],
          markdown:
            `**Recommended sequence:**\n\n${leverLines}\n\n` +
            `Start with the first item this cycle; it addresses the concentrated segment directly. The rest sequence naturally behind it. I can draft the committee note if useful.`,
        },
      },
    ],
  };
}
