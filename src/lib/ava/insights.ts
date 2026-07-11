/**
 * AVA insight registry — preloaded analyses keyed by embed point.
 *
 * Each entry supplies context-aware suggested questions and a full analyst
 * answer: a visible reasoning trace, a markdown finding, an evidence card
 * (segment attribution) and follow-up threads. Content is written the way a
 * senior credit-risk analyst would brief a CRO: quantified attribution first,
 * ranked root causes, then actions.
 *
 * This is the demo layer — answers are curated, not computed. The context
 * object still interpolates what the user actually selected (vintages, MOBs,
 * funnel stage, metric) so the experience reads live.
 */

import type { AvaAnswer, AvaContext, AvaInsight } from './types';
import { classifyIntent, composeAnswer, frameworkQuestions } from './question-framework';

/* ── helpers ─────────────────────────────────────────────────────── */

function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function strParam(ctx: AvaContext, key: string, fallback: string): string {
  const v = ctx.params?.[key];
  if (typeof v === 'string' && v) return v;
  if (typeof v === 'number') return String(v);
  return fallback;
}

function arrParam(ctx: AvaContext, key: string): string[] {
  const v = ctx.params?.[key];
  return Array.isArray(v) ? v.map(String) : [];
}

/* ── Consumer · Delinquency · Static Pool (the hero) ─────────────── */

const staticPool: AvaInsight = {
  suggestedQuestions: (ctx) => {
    const metric = strParam(ctx, 'metric', '30+');
    const vintages = arrParam(ctx, 'vintages');
    const cohort = vintages.length
      ? `the ${listJoin(vintages)} cohort${vintages.length > 1 ? 's' : ''}`
      : 'the recent cohorts';
    return [
      `Why is ${metric} deteriorating for ${cohort}?`,
      `Which segments are driving this deterioration?`,
      `How do these cohorts compare with earlier vintages at the same MOB?`,
    ];
  },
  answer: (ctx) => {
    const metric = strParam(ctx, 'metric', '30+');
    const vintages = arrParam(ctx, 'vintages');
    const cohortLabel = vintages.length ? listJoin(vintages) : 'the recent';
    const cohortShort = vintages.length ? vintages.join(', ') : 'recent vintages';
    return {
      reasoning: [
        { text: 'Pulling loan-level records for the selected cohorts', detail: '12,431 accounts · 5 subsidiaries' },
        { text: 'Segmenting by product, channel, geography, ticket and tenure', detail: '6 dimensions × 41 segments' },
        { text: `Benchmarking ${metric} against the trailing six vintages at matched MOB`, detail: 'weighted by disbursed amount' },
        { text: 'Running contribution attribution on the excess delinquency', detail: 'decomposed to segment level' },
      ],
      markdown:
        `**The deterioration in ${metric} for the ${cohortLabel} cohort${vintages.length > 1 ? 's' : ''} is real, but it is not broad-based — it is concentrated in one underwriting decision.**\n\n` +
        `At matched months-on-book, these cohorts are running **+190 bps above** the trailing six-vintage average. Three quarters of that excess sits in a single pocket:\n\n` +
        `- **TAKA Nano-Loan and unsecured Micro-Loan** files sourced through the **DSA / mobile-agent channel** in **Dakar and Thiès** (Baobab Sénégal) contribute **71%** of the incremental ${metric} balances.\n` +
        `- These cohorts were disbursed **after the March score-cut relaxation** (612 → 585) and the DBR cap increase. New-to-credit share jumped from **41% to 58%**, and average ticket drifted **+34%**.\n` +
        `- Early-bucket collections intensity fell **22%** in the same window — the July collector reallocation moved capacity from bucket 1 to bucket 2, so first-missed-payment follow-up slowed from 2.1 to 4.6 days.\n` +
        `- Cohorts booked **before** the policy change look normal at the same MOB, which rules out a macro-only story. The residual macro effect (delayed groundnut-season cash flows in the Thiès belt) explains under 5%.\n\n` +
        `**Root cause, ranked:** ① March credit-policy relaxation (~55% of excess) ② channel mix shift toward DSA sourcing (~25%) ③ early-bucket collections capacity (~15%) ④ macro residual (~5%).\n\n` +
        `**What I would do now:** reinstate the 600 score floor for DSA-sourced unsecured lending, cap NTC share per branch, and re-balance early-bucket calling capacity toward Dakar/Thiès. The June cohort reaches MOB 3 in the next cycle — that is the first clean read on whether the drift is still compounding.`,
      evidence: {
        title: `Attribution of excess ${metric} — ${cohortShort}`,
        items: [
          { label: 'TAKA Nano-Loan · DSA · Dakar/Thiès', value: '38%', share: 100, tone: 'bad' },
          { label: 'Micro-Loan unsecured · DSA', value: '33%', share: 87, tone: 'bad' },
          { label: 'Salary Advance · branch', value: '12%', share: 32, tone: 'warn' },
          { label: 'Secured (Equipment, Home Impr.)', value: '9%', share: 24, tone: 'neutral' },
          { label: 'All other segments', value: '8%', share: 21, tone: 'neutral' },
        ],
        footnote: 'Share of +190 bps excess vs trailing six-vintage benchmark, weighted by POS.',
      },
      followUps: [
        {
          label: 'Show the affected accounts',
          answer: {
            reasoning: [
              { text: 'Filtering the excess-delinquency pocket to loan level', detail: '1,247 accounts match' },
              { text: 'Ranking by principal outstanding', detail: 'top 8 shown' },
            ],
            markdown:
              `**1,247 accounts** sit in the deteriorating pocket (TAKA Nano-Loan / unsecured Micro-Loan, DSA-sourced, Dakar & Thiès). Top exposures by principal outstanding:\n\n` +
              `| Account | Product | Location | Channel | Tenure | POS (USD) | DPD | Score @ orig. |\n` +
              `|---|---|---|---|---|---|---|---|\n` +
              `| SN-104-88231 | Micro-Loan | Dakar — Pikine | DSA | 24m | 4,820 | 43 | 588 |\n` +
              `| SN-104-87914 | Micro-Loan | Thiès | DSA | 18m | 4,610 | 37 | 591 |\n` +
              `| SN-109-90112 | TAKA Nano-Loan | Dakar — Parcelles | TAKA app | 6m | 3,980 | 51 | 586 |\n` +
              `| SN-104-88764 | Micro-Loan | Dakar — Guédiawaye | DSA | 24m | 3,760 | 34 | 597 |\n` +
              `| SN-109-90548 | TAKA Nano-Loan | Thiès | TAKA app | 9m | 3,420 | 46 | 585 |\n` +
              `| SN-104-89007 | Micro-Loan | Kaolack | DSA | 18m | 3,150 | 32 | 601 |\n` +
              `| SN-109-91203 | TAKA Nano-Loan | Dakar — Médina | TAKA app | 6m | 2,980 | 58 | 587 |\n` +
              `| SN-104-89341 | Micro-Loan | Thiès | DSA | 12m | 2,740 | 39 | 593 |\n\n` +
              `**Pattern:** 86% of the pocket scored **585–605 at origination** — exactly the band the March relaxation opened. Median time-to-first-miss is **2.3 instalments**, which points at affordability rather than fraud.`,
            followUps: [
              {
                label: 'Export this list for collections',
                answer: {
                  reasoning: [{ text: 'Preparing prioritized calling list', detail: '1,247 rows · sorted by POS × DPD' }],
                  markdown:
                    `Done — in the live build this exports a prioritized calling list (CSV/XLSX) to the collections queue, sorted by **POS × DPD momentum**, with agent capacity flags for Dakar and Thiès. For this preview, the export is stubbed.\n\n**Suggested batching:** 420 accounts to the Dakar early-bucket team, 310 to Thiès, remainder to the central dialer with a TAKA in-app nudge campaign.`,
                },
              },
            ],
          },
        },
        {
          label: 'Compare with pre-policy cohorts',
          answer: {
            reasoning: [
              { text: 'Splitting vintages at the March policy change', detail: 'pre: 6 vintages · post: 3' },
              { text: 'Matching on months-on-book and product mix' },
            ],
            markdown:
              `**Same book, different rulebook.** At MOB 4, matched for product mix:\n\n` +
              `| | Pre-policy cohorts | Post-policy cohorts |\n|---|---|---|\n` +
              `| 30+ at MOB 4 | 2.4% | 4.3% |\n` +
              `| First-payment default | 1.1% | 2.6% |\n` +
              `| NTC share | 41% | 58% |\n` +
              `| Avg ticket (USD) | 610 | 815 |\n` +
              `| Score floor applied | 612 | 585 |\n\n` +
              `The pre-policy book is aging **normally** — its curve sits inside the two-year vintage corridor. The entire structural break lands on files scored **585–611**, which are defaulting at **3.1×** the rate of the 612+ band at the same MOB. That band would have been declined under the old cut.`,
          },
        },
        {
          label: 'Draft a note to the credit committee',
          answer: {
            reasoning: [{ text: 'Drafting committee note from the analysis above' }],
            markdown:
              `**To:** Group Credit Committee\n**From:** Consumer Risk — Baobab Sénégal\n**Re:** Early deterioration in post-March unsecured cohorts\n\n` +
              `Recent unsecured cohorts are tracking ~190 bps above benchmark on 30+ at matched MOB. Attribution isolates the excess to DSA-sourced TAKA Nano-Loan and Micro-Loan files in Dakar/Thiès scored 585–611 — the band opened by the March score-cut relaxation. Early-bucket follow-up also slowed after the July collector reallocation.\n\n` +
              `**Requested decisions:**\n1. Reinstate the 600 score floor for DSA-sourced unsecured lending, effective next cycle.\n2. Cap new-to-credit share at 45% per branch pending revalidation of the application scorecard.\n3. Return 6 FTE of early-bucket calling capacity to Dakar/Thiès through Q3.\n\n` +
              `Exposure at risk if untreated: **~$2.1M** incremental credit cost over the next four quarters (base case). A one-cycle decision is preferred — the June cohort hits MOB 3 at the next reporting date.`,
          },
        },
      ],
    };
  },
};

/* ── Consumer · Origination · Funnel ─────────────────────────────── */

const originationFunnel: AvaInsight = {
  suggestedQuestions: (ctx) => {
    const stage = strParam(ctx, 'stage', 'this stage');
    return [
      `Why is conversion dropping at "${stage}"?`,
      `Is the "${stage}" drop a volume problem or a quality problem?`,
      `Which branches or channels are losing the most applications here?`,
    ];
  },
  answer: (ctx) => {
    const stage = strParam(ctx, 'stage', 'Document Submitted');
    return {
      reasoning: [
        { text: `Reconstructing application-level flow through "${stage}"`, detail: '8,904 applications MTD' },
        { text: 'Comparing stage conversion vs last month, same date', detail: 'matched-day basis' },
        { text: 'Segmenting drop-offs by channel, branch and product' },
        { text: 'Checking operational telemetry (TAT, rejection reasons)' },
      ],
      markdown:
        `**Conversion at "${stage}" fell from 72% to 58% month-on-month — and it is an operations problem more than a demand problem.**\n\n` +
        `- **e-KYC vendor cutover (biggest driver).** Since the new document-verification vendor went live, image-quality rejections are running **3.1× higher**, and 62% of rejected applicants never re-submit. This alone explains roughly half the drop.\n` +
        `- **Credit-ops turnaround stretched.** Median TAT at this stage moved from **1.8 to 4.2 days**; abandonment climbs steeply after 48 hours, especially for TAKA app applicants who expect same-day decisions.\n` +
        `- **DSA file quality.** 44% of DSA-sourced files arrive missing income proof, versus 18% for branch-sourced — the March sourcing push amplified this.\n\n` +
        `**Demand is intact:** top-of-funnel volume is +6% MoM, so every point of conversion recovered here flows straight to disbursement.\n\n` +
        `**What I would do now:** roll the vendor's image-quality threshold back to spec and add in-app capture guidance; put a 48-hour SLA alarm on this queue; require DSA income-proof checklists at submission. Recoverable volume: **~640 applications/month**, ≈ **$780K** in monthly disbursement at current approval rates.`,
      evidence: {
        title: `Drop-off attribution at "${stage}" (MoM)`,
        items: [
          { label: 'e-KYC image-quality rejections', value: '48%', share: 100, tone: 'bad' },
          { label: 'TAT > 48h abandonment', value: '27%', share: 56, tone: 'bad' },
          { label: 'DSA files missing income proof', value: '17%', share: 35, tone: 'warn' },
          { label: 'Genuine credit declines', value: '8%', share: 17, tone: 'neutral' },
        ],
        footnote: 'Share of the 14pp conversion decline, application-weighted.',
      },
      followUps: [
        {
          label: 'Break it down by branch',
          answer: {
            reasoning: [{ text: 'Ranking branches by stage conversion decline', detail: '38 branches' }],
            markdown:
              `Worst five branches on "${stage}" conversion, MoM:\n\n` +
              `| Branch | Conv. last month | Conv. MTD | Δ | Main driver |\n|---|---|---|---|---|\n` +
              `| Dakar — Pikine | 74% | 51% | −23pp | e-KYC rejects |\n` +
              `| Thiès Centre | 71% | 53% | −18pp | e-KYC rejects |\n` +
              `| Abidjan — Yopougon | 70% | 55% | −15pp | TAT abandonment |\n` +
              `| Bamako — Hamdallaye | 69% | 58% | −11pp | DSA doc quality |\n` +
              `| Kaolack | 73% | 63% | −10pp | e-KYC rejects |\n\n` +
              `The pattern tracks the vendor rollout order — branches migrated in wave 1 show the deepest declines. Wave 3 branches (not yet migrated) are flat, which is strong evidence against a demand explanation.`,
          },
        },
        {
          label: 'Draft an ops action plan',
          answer: {
            reasoning: [{ text: 'Drafting action plan with owners and dates' }],
            markdown:
              `**Action plan — restore "${stage}" conversion to ≥70% within two cycles**\n\n` +
              `1. **Vendor fix (owner: Digital Ops, this week).** Recalibrate image-quality threshold to contract spec; enable client-side capture guidance in the TAKA app.\n` +
              `2. **Queue SLA (owner: Credit Ops, this week).** 48-hour breach alarm with daily escalation to branch managers; temporary overtime for the verification desk.\n` +
              `3. **DSA checklist (owner: Sales, next cycle).** Income-proof mandatory at submission; DSA scorecards updated to include first-pass completeness.\n` +
              `4. **Re-contact campaign (owner: CX, next cycle).** SMS/app nudge to the 1,900 applicants dropped in the last 30 days — historical re-capture rate on such campaigns is ~22%.`,
          },
        },
      ],
    };
  },
};

/* ── Consumer · KPI-level insights ───────────────────────────────── */

const consumerKpiFpd: AvaInsight = {
  suggestedQuestions: () => [
    'Why did FPD% move this month?',
    'Which products and channels are driving FPD?',
    'Is this an underwriting issue or a collections issue?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Isolating first-payment defaults in the newest cohort', detail: '618 FPD accounts' },
      { text: 'Segmenting by product, channel and score band' },
      { text: 'Testing against seasonality and payroll timing' },
    ],
    markdown:
      `**FPD% is up 40 bps MoM, concentrated in unsecured digital originations.**\n\n` +
      `- **TAKA Nano-Loan** FPD is running **2.9%** vs 1.6% for branch-sourced Micro-Loans — the gap doubled after the March score-cut relaxation.\n` +
      `- 71% of FPD accounts scored **585–611** at origination, the newly opened band.\n` +
      `- Salary-linked products are clean: **Salary Advance FPD is stable at 0.8%**, so payroll timing and macro are not the story.\n` +
      `- First-contact attempts on missed first instalments now happen at day 4.6 on average (was 2.1) — the July collector reallocation is compounding the underwriting drift.\n\n` +
      `**Read:** this is primarily an underwriting-band problem with a collections-timing amplifier. FPD is the earliest and most reliable warning in the stack — at this level it predicts roughly +60 bps on 30+ two cycles out.`,
    evidence: {
      title: 'FPD attribution by segment (MoM increase)',
      items: [
        { label: 'TAKA Nano-Loan · score 585–611', value: '52%', share: 100, tone: 'bad' },
        { label: 'Micro-Loan unsecured · DSA', value: '24%', share: 46, tone: 'bad' },
        { label: 'Delayed first-contact effect', value: '15%', share: 29, tone: 'warn' },
        { label: 'All other', value: '9%', share: 17, tone: 'neutral' },
      ],
    },
    followUps: [
      {
        label: 'What happens if nothing changes?',
        answer: {
          reasoning: [{ text: 'Projecting FPD flow-through to 30+/90+ using roll-rate history' }],
          markdown:
            `Using the trailing 12-month roll-rate matrix, the current FPD elevation flows through as:\n\n- **30+ DPD:** +55–70 bps within two cycles\n- **90+ DPD:** +25–35 bps within four cycles\n- **Incremental credit cost:** ~$1.4M annualized at current book size\n\nFPD cohorts cure poorly here — only 31% of first-payment defaulters ever return to current, vs 58% for later-bucket entrants. Early intervention on this pocket has the highest payback in the book.`,
        },
      },
    ],
  }),
};

const consumerKpiDpd30: AvaInsight = {
  suggestedQuestions: () => [
    'What is driving the 30+ DPD trend?',
    'Is the increase flow (new entries) or stock (stuck accounts)?',
    'Which subsidiary is the outlier?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Decomposing 30+ movement into inflow, cure and roll-forward', detail: 'net-flow basis' },
      { text: 'Splitting by subsidiary and product' },
      { text: 'Checking against risk-appetite thresholds' },
    ],
    markdown:
      `**The 30+ increase is an inflow problem, not a resolution problem.**\n\n` +
      `- New entries into 30+ are up **28% MoM**, while cure rates from bucket 1 are actually flat — collections is holding, underwriting drift is pushing more volume in.\n` +
      `- **Baobab Sénégal contributes 64%** of the group-level increase; Côte d'Ivoire and Mali are inside their normal corridor, and Madagascar improved.\n` +
      `- The inflow is the FPD/early-bucket pocket I've flagged elsewhere: post-March unsecured digital originations.\n\n` +
      `**Read:** treat this at origination (score floor, NTC caps), not by adding collections pressure across the board — bucket-1 capacity is the one lever already performing.`,
    evidence: {
      title: '30+ MoM increase by subsidiary',
      items: [
        { label: 'Baobab Sénégal', value: '64%', share: 100, tone: 'bad' },
        { label: 'Baobab RDC', value: '18%', share: 28, tone: 'warn' },
        { label: "Baobab Côte d'Ivoire", value: '11%', share: 17, tone: 'neutral' },
        { label: 'Baobab Mali', value: '9%', share: 14, tone: 'neutral' },
        { label: 'Baobab Banque Madagascar', value: '−2%', share: 3, tone: 'good' },
      ],
    },
  }),
};

const consumerKpiNcl: AvaInsight = {
  suggestedQuestions: () => [
    'Why is net credit loss trending up?',
    'How much of NCL is recovery underperformance?',
    'Where does NCL sit against risk appetite?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Splitting NCL into gross write-offs and recoveries', detail: 'trailing 6 periods' },
      { text: 'Mapping write-offs to their origination vintages' },
    ],
    markdown:
      `**NCL is up 20 bps, and two-thirds of it is vintage flow-through — the 2024 mid-year cohorts reaching write-off age.**\n\n` +
      `- Gross write-offs are up 18% while **recoveries are flat**, so the ratio deterioration is mostly numerator.\n` +
      `- The write-off wave traces back to the mid-2024 vintages at MOB 14–18 — a cohort problem we already knew about, now landing in the P&L as expected.\n` +
      `- Recovery yield on written-off unsecured is **11.2%**, below the 14% plan — the agency handover backlog in Dakar is the main gap.\n\n` +
      `**Read:** current-quarter NCL was largely locked in twelve months ago. The lever that still moves this year's number is recoveries: clearing the agency backlog is worth ~$300K.`,
    evidence: {
      title: 'NCL movement decomposition',
      items: [
        { label: '2024 vintage write-off flow-through', value: '66%', share: 100, tone: 'warn' },
        { label: 'Recovery underperformance', value: '24%', share: 36, tone: 'bad' },
        { label: 'Book mix shift (unsecured share up)', value: '10%', share: 15, tone: 'neutral' },
      ],
    },
  }),
};

/* ── Consumer · other sections ───────────────────────────────────── */

const consumerOverview: AvaInsight = {
  suggestedQuestions: () => [
    'Summarize consumer portfolio health this period',
    'What changed most versus last month?',
    'What should I look at first on this tab?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Scanning all consumer metrics vs prior period and appetite', detail: '23 metrics' },
      { text: 'Ranking movements by materiality × momentum' },
    ],
    markdown:
      `**Consumer book: growing, with one early-warning cluster worth your time.**\n\n` +
      `- **Growth is healthy:** AUM +2.8% MoM with bookings up in four of five subsidiaries; pricing and mix stable.\n` +
      `- **The cluster to watch:** FPD% and 30+ are moving together in Baobab Sénégal's unsecured digital segment — that co-movement is the signature of an underwriting change, not noise. Start at **Delinquency → Static Pool** and select the recent vintages.\n` +
      `- **Collections is performing:** cure rates and resolution are flat-to-better; don't spend review time there.\n` +
      `- **Non-starters** ticked up in Mali but off a small base (worth one question, not a workstream).\n\n` +
      `Everything else on this tab is inside its two-year corridor.`,
    followUps: [
      {
        label: 'Take me through the Sénégal cluster',
        answer: {
          reasoning: [{ text: 'Linking FPD, static pool and channel mix for Baobab Sénégal' }],
          markdown:
            `The three signals line up on one timeline:\n\n1. **March:** score cut relaxed 612 → 585, DBR cap raised — DSA sourcing push begins.\n2. **April–May cohorts:** FPD lifts first (earliest signal), from 1.7% to 2.6%.\n3. **Now:** those cohorts hit MOB 3–5 and surface in the static pool as the +190 bps vintage break.\n\nOne decision (the March relaxation) explains all three charts. The fix is at origination; the static-pool selection flow on the Delinquency tab has the full attribution and a draft committee note.`,
        },
      },
    ],
  }),
};

const consumerDpdDist: AvaInsight = {
  suggestedQuestions: () => [
    'Why is the bucket mix shifting?',
    'Which bucket is growing fastest and why?',
    'Is late-stage stock building up?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Comparing DPD bucket distribution across periods', detail: '6 buckets × 12 periods' },
      { text: 'Separating denominator growth from bucket migration' },
    ],
    markdown:
      `**The mix shift is front-loaded: bucket 1–30 is growing faster than the book, later buckets are stable.**\n\n` +
      `- 1–30 DPD share is up **60 bps**, feeding from the elevated FPD pocket in recent unsecured cohorts.\n` +
      `- 61–90 and 90+ shares are flat — roll-forward from mid buckets hasn't moved, so this is **new inflow, not a collections breakdown**.\n` +
      `- Watch the sequence: if bucket 31–60 share lifts next period, the inflow is rolling rather than curing, and provisioning assumptions for these cohorts should be revisited.\n\n` +
      `**Read:** early-stage inflow with intact mid-bucket performance — consistent with an origination-quality issue in its first innings.`,
  }),
};

const consumerProducts: AvaInsight = {
  suggestedQuestions: () => [
    'Which product is deteriorating fastest?',
    'Compare risk-adjusted performance across products',
    'Is the unsecured mix shift a problem?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Ranking products by delinquency momentum and margin', detail: '9 products' },
      { text: 'Computing risk-adjusted yield per product' },
    ],
    markdown:
      `**TAKA Nano-Loan is the outlier on risk; SME/Croissance is quietly your best risk-adjusted book.**\n\n` +
      `- **TAKA Nano-Loan:** 30+ momentum is +80 bps/cycle for two consecutive cycles. Its yield still covers the risk (risk-adjusted margin ~9.1%), but the trajectory erodes that in ~3 cycles if unchecked.\n` +
      `- **Micro-Loan (unsecured):** deterioration tracks the DSA channel, not the product itself — branch-sourced Micro-Loans are stable.\n` +
      `- **SME/Croissance Loan:** best risk-adjusted margin (11.4%) with flat delinquency — supports a deliberate mix tilt.\n` +
      `- **Equipment & Asset Finance / Home Improvement:** secured book behaving; LGDs benefit from collateral coverage >140%.\n\n` +
      `**Read:** the product P&L argues for shifting incremental origination toward SME/Croissance while the nano-loan scorecard is revalidated.`,
    evidence: {
      title: '30+ momentum by product (bps/cycle)',
      items: [
        { label: 'TAKA Nano-Loan', value: '+80', share: 100, tone: 'bad' },
        { label: 'Micro-Loan (DSA-sourced)', value: '+45', share: 56, tone: 'warn' },
        { label: 'Salary Advance', value: '+10', share: 13, tone: 'neutral' },
        { label: 'SME / Croissance Loan', value: '+4', share: 5, tone: 'good' },
        { label: 'Equipment & Asset Finance', value: '−6', share: 8, tone: 'good' },
      ],
    },
  }),
};

const consumerNetFlow: AvaInsight = {
  suggestedQuestions: () => [
    'Which bucket transition worsened this period?',
    'Are accounts curing or rolling forward?',
    'Where should collections focus next cycle?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Building the net-flow waterfall for the selected period', detail: '6 buckets' },
      { text: 'Comparing each transition to its 12-period average' },
    ],
    markdown:
      `**One transition stands out: bucket 2 → 3 roll-forward is 340 bps above its 12-period average.**\n\n` +
      `- Entry into bucket 1 is elevated (the origination story), but **bucket 1 → cure is holding at 61%** — early collections is absorbing the inflow.\n` +
      `- The strain shows at **31–60 → 61–90**: the July collector reallocation moved capacity *into* bucket 2, yet roll-forward worsened — the incoming files are simply harder (thin-file, first-cycle defaulters who never made payment one).\n` +
      `- Late-stage transitions (90+ → write-off) are on plan.\n\n` +
      `**Read:** don't add more bodies to bucket 2 — change the treatment. First-cycle defaulters need field visits and restructure offers, not more calls. Route them on a separate path from habitual late-payers.`,
  }),
};

/** Bucket-level flow analysis — roll back / stabilization / roll forward for one bucket or cell. */
const collectionsBucket: AvaInsight = {
  suggestedQuestions: (ctx) => {
    const bucket = strParam(ctx, 'bucket', strParam(ctx, 'metric', 'this bucket'));
    return [
      `Why did ${bucket} move this period?`,
      `Is ${bucket} a capacity problem or a defaulter-mix problem?`,
      `What treatment change would improve ${bucket} next cycle?`,
    ];
  },
  answer: (ctx) => {
    const bucket = strParam(ctx, 'bucket', strParam(ctx, 'metric', 'B2 Roll Forward'));
    const period = strParam(ctx, 'period', 'the latest period');
    const value = strParam(ctx, 'value', '');
    const isRollFwd = /roll f/i.test(bucket);
    const isStab = /stabili/i.test(bucket);
    const headline = isRollFwd
      ? `**${bucket} at ${value || 'the current level'} (${period}) is 340 bps above its 12-period average — and the mix of who is in the bucket explains it, not collector effort.**`
      : isStab
        ? `**${bucket} is elevated for ${period}: accounts are neither curing nor rolling — the signature of partial payers who need restructure offers, not more calls.**`
        : `**${bucket} (${period}) is holding inside its corridor — cure performance is not the problem in this book right now.**`;
    return {
      reasoning: [
        { text: `Pulling the ${bucket} transition population for ${period}`, detail: '2,114 accounts in transition' },
        { text: 'Splitting by defaulter type: first-cycle vs repeat vs chronic' },
        { text: 'Cross-referencing collector case loads, PTP kept-rates and payment modes' },
        { text: 'Benchmarking against the 12-period corridor for this bucket' },
      ],
      markdown:
        `${headline}\n\n` +
        `- **Who's in the bucket changed.** First-cycle defaulters (missed their very first or second instalment) are now **46%** of the bucket vs 28% a year ago — they cure at half the rate of habitual late-payers on a pure calling treatment.\n` +
        `- **Capacity is stretched where it matters.** Sénégal early/mid-bucket case loads run **74 accounts/collector** against a ~55 sustainable ceiling; PTP kept-rate in that cell fell 48% → 39% (a fatigue pattern, not a skills gap).\n` +
        `- **Payment friction adds ~90 bps.** Mobile-money mandate bounces in Mali/Sénégal mean some "delinquents" are willing payers hitting an empty-wallet auto-debit — re-mandated accounts cure at 74%.\n` +
        `- Late buckets and write-off flows are on plan; the strain is concentrated at the 31–90 transitions.\n\n` +
        `**What I would change:** route first-cycle defaulters to a separate treatment path (field visit + restructure option within 15 days), rebalance 6–8 FTE into the stretched cell for 60 days, and run a mandate re-setup campaign before dialer escalation.`,
      evidence: {
        title: `${bucket} — movement attribution (${period})`,
        items: [
          { label: 'Defaulter mix shift (first-cycle share up)', value: '48%', share: 100, tone: 'bad' },
          { label: 'Collector capacity / case loads', value: '27%', share: 56, tone: 'warn' },
          { label: 'Mandate / wallet payment friction', value: '17%', share: 35, tone: 'warn' },
          { label: 'Residual (seasonality, macro)', value: '8%', share: 17, tone: 'neutral' },
        ],
        footnote: 'Share of deviation vs 12-period bucket average, account-weighted.',
      },
      followUps: [
        {
          label: 'Show bucket-wise flows this period',
          answer: {
            reasoning: [{ text: 'Building the full bucket transition matrix', detail: '6 buckets × 3 outcomes' }],
            markdown:
              `Bucket-wise outcomes for ${period} (share of opening bucket balance):\n\n` +
              `| Bucket | Roll back ↓ | Stabilized → | Roll forward ↑ | vs 12-per. avg |\n|---|---|---|---|---|\n` +
              `| 1–30 (B1) | 61% | 24% | 15% | RF +1.2pp |\n` +
              `| 31–60 (B2) | 38% | 29% | 33% | **RF +3.4pp** |\n` +
              `| 61–90 (B3) | 22% | 34% | 44% | RF +1.8pp |\n` +
              `| 91–120 (B4) | 11% | 31% | 58% | in corridor |\n` +
              `| 121–150 (B5) | 6% | 28% | 66% | in corridor |\n` +
              `| 150+ (B6) | 3% | 22% | 75% | in corridor |\n\n` +
              `The chain breaks at **B2**: everything upstream and downstream is within corridor. Fixing B2 roll-forward stops the feed into B3/B4 two cycles out.`,
          },
        },
        {
          label: 'Which collectors/agencies are underperforming?',
          answer: {
            reasoning: [{ text: 'Normalizing collector performance for case mix and load', detail: '84 collectors · 3 agencies' }],
            markdown:
              `Adjusted for case mix and load, this is **not** an individual-performance story:\n\n- The bottom-decile collectors are all in the overloaded Dakar/Thiès cell — their kept-rates recover to median when load is simulated at ≤55 accounts.\n- Agency **CRS-Dakar** underperforms on chronic accounts (58% of benchmark recovery) — worth a volume shift to the second agency at renewal.\n- TAKA in-app nudges outperform dialer calls for nano-loans under 15 DPD at ~zero marginal cost; coverage is only 40% — the cheapest win in the stack.`,
          },
        },
      ],
    };
  },
};

/** Collections efficiency KPI level — resolution, roll-forward, stabilization, efficiency. */
const collectionsEfficiency: AvaInsight = {
  suggestedQuestions: (ctx) => {
    const metric = strParam(ctx, 'metric', 'collection performance');
    return [
      `Why did ${metric} move this period?`,
      `Is collections capacity keeping up with delinquency inflow?`,
      `Which bucket and geography should get the next collector hour?`,
    ];
  },
  answer: (ctx) => {
    const metric = strParam(ctx, 'metric', 'Collection performance');
    return {
      reasoning: [
        { text: `Decomposing ${metric} across buckets, geographies and payment modes`, detail: '6 buckets × 5 subsidiaries' },
        { text: 'Comparing collected-vs-due by due-date cohort' },
        { text: 'Testing capacity: case loads, attempts per account, RPC rates' },
      ],
      markdown:
        `**${metric} is being dragged by one cell — Sénégal mid-bucket — while the rest of the grid holds.**\n\n` +
        `- **Collection efficiency (collected/due) is 94.1% group-wide**, inside the 93–96% corridor; Madagascar leads at 97%.\n` +
        `- **Resolution (roll-back) is flat** — early-bucket cure at 61% shows calling capacity is still absorbing the elevated inflow.\n` +
        `- **The miss is B2 roll-forward** (+340 bps vs corridor): case loads at 74/collector against a ~55 ceiling, PTP kept-rate down 9pp — capacity, not competence.\n` +
        `- **Stabilization creep** in B2/B3 marks partial payers who need restructure offers; calling harder doesn't move them.\n\n` +
        `**Read:** don't spread capacity — point it. 6–8 FTE into Sénégal B2 for 60 days plus a first-cycle-defaulter treatment path buys back the corridor before the post-March inflow wave peaks.`,
      evidence: {
        title: 'Collections grid — deviation vs corridor',
        items: [
          { label: 'Sénégal · B2 roll-forward', value: '+340bps', share: 100, tone: 'bad' },
          { label: 'Sénégal · B3 stabilization', value: '+120bps', share: 35, tone: 'warn' },
          { label: 'Mali · mandate bounce rate', value: '+90bps', share: 26, tone: 'warn' },
          { label: 'All other cells', value: 'in corridor', share: 10, tone: 'good' },
        ],
      },
      followUps: [
        {
          label: 'Break efficiency down by payment mode',
          answer: {
            reasoning: [{ text: 'Splitting collected/due by payment rail' }],
            markdown:
              `| Payment mode | Share of due | Efficiency | Trend |\n|---|---|---|---|\n| Mobile-money auto-debit | 48% | 95.8% | stable |\n| Cash at branch | 27% | 93.2% | stable |\n| Field collection | 14% | 91.0% | improving |\n| TAKA in-app | 11% | 96.4% | improving |\n\nThe mandate-bounce issue shows up inside mobile-money: first-attempt success is 88%, but re-presentation within 3 days of wallet inflows recovers most of the gap. Aligning debit timing to income cycles (market days, salary dates) is worth ~1pp of group efficiency.`,
          },
        },
      ],
    };
  },
};

const consumerCollections: AvaInsight = {
  suggestedQuestions: () => [
    'Is collections capacity keeping up with inflow?',
    'Which roll rate deteriorated most?',
    'Why did resolution dip in the worst bucket?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Scanning the roll-rate grid for out-of-corridor cells', detail: '18 series × 12 periods' },
      { text: 'Cross-referencing collector allocation and case loads' },
    ],
    markdown:
      `**Resolution is holding everywhere except one cell: bucket-2 roll-forward in Baobab Sénégal.**\n\n` +
      `- Group-level cure and stabilization rates are within corridor; Madagascar and Côte d'Ivoire are best-in-class this period.\n` +
      `- The Sénégal bucket-2 cell deteriorated 340 bps: case loads there jumped to **74 accounts/collector** (sustainable ceiling ≈ 55) as the post-March inflow wave arrived.\n` +
      `- Promise-to-pay kept-rate fell from 48% to 39% in the same cell — a fatigue signature, not a skills gap.\n\n` +
      `**Read:** this is a capacity-planning miss, not a performance miss. Rebalancing 6–8 FTE or activating the overflow agency for 60 days would bring case loads back under the ceiling before the next inflow wave lands.`,
  }),
};

const consumerNonStarters: AvaInsight = {
  suggestedQuestions: () => [
    'Why did non-starters move this period?',
    'Is this fraud, process, or affordability?',
    'Which products and branches concentrate the non-starters?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Profiling accounts that never made a first payment', detail: '312 accounts' },
      { text: 'Testing fraud markers vs process markers' },
    ],
    markdown:
      `**Non-starters are up 15% MoM — and the profile says process, not fraud.**\n\n` +
      `- 68% of new non-starters have **valid contactability and clean device/ID signals** — inconsistent with organized fraud.\n` +
      `- The cluster: **Bamako (Mali) disbursements** where the mobile-money payout and the first-instalment mandate were set up in different wallets — customers received funds but the auto-debit hit an empty wallet.\n` +
      `- A smaller genuine-fraud tail (~9%) sits in Kinshasa DSA files with recycled device IDs; that pocket is already flagged to the fraud desk.\n\n` +
      `**Read:** fix the wallet-mandate reconciliation at onboarding (one process change) and ~60% of this month's increase should not recur. Non-starter accounts that are re-mandated within 15 days historically cure at 74%.`,
  }),
};

const consumerRiskAnalytics: AvaInsight = {
  suggestedQuestions: () => [
    'Is the approval rate drifting?',
    'Are we rejecting the right applicants?',
    'How is the approved-base quality trending?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Comparing approved vs rejected score distributions', detail: 'MTD vs trailing 6M' },
      { text: 'Swap-set analysis on the March policy change' },
    ],
    markdown:
      `**Approval rate is up 4pp since March — and the swap-in population is where the delinquency is coming from.**\n\n` +
      `- The March relaxation swapped in applicants scoring **585–611**; that band is defaulting at **3.1×** the 612+ band. The swap-in's marginal risk-adjusted return is negative at current pricing.\n` +
      `- Rejection reasons show **income-verification declines falling** while DBR-based declines hold — consistent with thinner documentation passing through DSA sourcing.\n` +
      `- The rejected base contains a **profitable swap-out**: ~420 applicants/month scoring 612+ declined on strict DBR rounding. Recapturing them at standard pricing is low-risk volume that could offset tightening the 585–611 band.\n\n` +
      `**Read:** tighten where the losses are, recapture where they aren't — net origination volume can stay roughly flat while cohort quality resets.`,
  }),
};

const consumerTdd: AvaInsight = {
  suggestedQuestions: () => [
    'What do the due-diligence checks flag this period?',
    'Are pre-disbursal exceptions trending up?',
    'Which checks fail most often post-disbursal?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Aggregating pre/post-disbursal check outcomes', detail: '14 check types' },
      { text: 'Ranking exception rates vs 6-month baseline' },
    ],
    markdown:
      `**Two checks are trending out of corridor; both trace to the same sourcing push.**\n\n` +
      `- **Pre-disbursal:** income-document authenticity exceptions up from 2.1% to 3.8%, concentrated in DSA-sourced unsecured files — the same channel driving the FPD lift.\n` +
      `- **Post-disbursal:** utilization checks show **17% of SME/Croissance proceeds** in Mali flowing to a different stated purpose; historically that predicts +90 bps of 90+ within a year for the affected accounts.\n` +
      `- All other checks (KYC completeness, collateral perfection, insurance attachment) are inside baseline.\n\n` +
      `**Read:** add a second-line sampling review on DSA income documents and a targeted utilization re-verification for the Mali SME cohort — both are contained, cheap interventions today; neither will be in six months.`,
  }),
};

/* ── Group Overview ──────────────────────────────────────────────── */

const overviewHeatmap: AvaInsight = {
  suggestedQuestions: () => [
    'Which subsidiary needs attention first and why?',
    'Explain the red cells in one view',
    'Is any red cell a data problem rather than a risk problem?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Reading all subsidiary × dimension cells against appetite', detail: '5 subsidiaries × 7 dimensions' },
      { text: 'Clustering breaches by shared root cause' },
      { text: 'Checking data freshness per subsidiary feed' },
    ],
    markdown:
      `**The grid shows three stories, not seven problems.**\n\n` +
      `1. **Baobab Sénégal — consumer credit quality (act now).** The 30+ and EWS cells share one cause: post-March unsecured cohorts. This is the group's only *compounding* red — it worsens each cycle until origination policy changes.\n` +
      `2. **Baobab RDC — FX and country risk (monitor).** The red is macro (CDF depreciation pass-through), not portfolio behavior; local-currency collections are actually outperforming. A hedging decision, not a credit decision.\n` +
      `3. **Baobab Mali — provision coverage (verify first).** Coverage reads amber because the last collateral revaluation file is 47 days old — **this may be staleness, not deterioration**. I'd refresh the feed before escalating; ingestion watermarks show Mali is the only lagging source.\n\n` +
      `Madagascar and Côte d'Ivoire are green across all dimensions and improving.`,
    evidence: {
      title: 'Attention ranking (impact × momentum)',
      items: [
        { label: 'Sénégal · consumer 30+ / EWS', value: 'act', share: 100, tone: 'bad' },
        { label: 'RDC · FX & country risk', value: 'monitor', share: 55, tone: 'warn' },
        { label: 'Mali · provision coverage', value: 'verify data', share: 40, tone: 'warn' },
        { label: "Côte d'Ivoire · all dimensions", value: 'stable', share: 12, tone: 'good' },
        { label: 'Madagascar · all dimensions', value: 'improving', share: 8, tone: 'good' },
      ],
    },
  }),
};

const overviewKpis: AvaInsight = {
  suggestedQuestions: () => [
    'Brief me on the group position in 60 seconds',
    'Which KPI moved most and why?',
    'Anything here that breaches risk appetite?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Comparing all group KPIs vs prior period and appetite', detail: '9 KPIs' },
      { text: 'Tracing each material move to its business line' },
    ],
    markdown:
      `**Group in one minute: growth on plan, credit quality diverging by geography, provisions adequate.**\n\n` +
      `- **AUM $342M, +2.4% MoM** — growth is broad-based; no single-name or single-product concentration flag.\n` +
      `- **Group 30+ at 4.1% (+30 bps)** — entirely consumer-driven, and within consumer, entirely Baobab Sénégal. Trade and corporate books are flat.\n` +
      `- **NPL 2.8%, stable.** The 30+ lift hasn't reached NPL yet; it will in 2–3 cycles if the Sénégal cohorts roll — that's the number to defend.\n` +
      `- **Provision coverage 118%** — above the 110% floor even under the stressed roll-forward case.\n` +
      `- **EWS criticals: 3**, all corporate single names in RDC, all already on the watchlist with actions assigned.\n\n` +
      `**One decision matters this cycle:** the Sénégal unsecured score floor. Everything else is monitoring.`,
  }),
};

const overviewComposition: AvaInsight = {
  suggestedQuestions: () => [
    'Is the portfolio mix drifting anywhere risky?',
    'Which subsidiary is growing fastest and is it safe growth?',
    'How concentrated is the book?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Computing mix shift across business lines and subsidiaries', detail: '12-month window' },
      { text: 'Stress-testing concentration (HHI, top-name share)' },
    ],
    markdown:
      `**Mix is drifting toward unsecured consumer — deliberately, but the guardrail is now binding.**\n\n` +
      `- Unsecured consumer is up from **31% to 36%** of group AUM in 12 months; the strategic plan caps it at 38%. At current growth differentials you hit the cap in ~2 quarters.\n` +
      `- **Subsidiary concentration is healthy:** Sénégal is the largest book at 34% — high, but below the 40% single-country appetite; HHI is 0.24 and falling as RDC scales.\n` +
      `- **Growth quality flag:** the fastest-growing cell (Sénégal digital unsecured) is also the deteriorating one — growth and risk are currently the same trade.\n\n` +
      `**Read:** the mix question and the credit-quality question are one question. Tightening the Sénégal score floor slows exactly the segment that is pushing you toward the unsecured cap.`,
  }),
};

const overviewTrends: AvaInsight = {
  suggestedQuestions: () => [
    'Which trend line worries you most?',
    'Are these trends seasonal or structural?',
    'What leads what in these series?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Decomposing each series into trend, seasonal and shock', detail: '7 series × 24 periods' },
      { text: 'Testing lead–lag relationships across metrics' },
    ],
    markdown:
      `**One structural break, everything else seasonal.**\n\n` +
      `- **FPD% (unsecured) shows a level shift in April** — that's the structural one. It leads 30+ by ~2 cycles and NCL by ~4, so today's FPD is next quarter's delinquency chart. The break coincides with the March policy change, not with any macro series I track.\n` +
      `- **30+/60+/90+** are following the FPD script with the expected lag — no independent deterioration.\n` +
      `- **Trade NPL and Corp NPA** are flat within seasonal norms (trade always dips post-harvest settlement).\n` +
      `- **Net credit loss** upticks are the 2024 vintages writing off on schedule — backward-looking, already provisioned.\n\n` +
      `**Read:** fix the FPD driver and the whole panel normalizes over 2–3 quarters. There is no second, hidden problem in these trends.`,
  }),
};

const overviewBusinessLines: AvaInsight = {
  suggestedQuestions: () => [
    'Which business line has the best risk-adjusted performance?',
    'Why is consumer delinquency higher than trade and corporate?',
    'Where would you reallocate capital across lines?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Normalizing performance across lines (yield, loss, capital)', detail: '3 business lines' },
      { text: 'Comparing provision coverage adequacy by stage mix' },
    ],
    markdown:
      `**Consumer earns its risk; corporate is under-earning its capital; trade is the quiet compounder.**\n\n` +
      `- **Consumer:** highest delinquency (4.9% 30+) but also highest risk-adjusted margin (8.7%) — the model works *when underwriting discipline holds*, which is exactly what's being tested in Sénégal.\n` +
      `- **Trade:** 1.8% NPL with self-liquidating structures and the best capital velocity in the group. Marginal capital deployed here has the highest Sharpe-equivalent.\n` +
      `- **Corporate:** 2.4% NPA and thin spreads on the top-20 names; watchlist coverage is adequate but the line's return on allocated capital is ~2pp below hurdle.\n\n` +
      `**Read:** the comparison table argues for incremental capital toward trade, disciplined growth in consumer, and repricing (or exiting) the bottom quartile of corporate relationships at renewal.`,
  }),
};

const overviewScorecard: AvaInsight = {
  suggestedQuestions: () => [
    'Rank the subsidiaries by overall health',
    'Which scorecard row deserves a deep dive?',
    'Compare Sénégal and Côte d’Ivoire — why the divergence?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Scoring each subsidiary across all scorecard dimensions', detail: '5 subsidiaries × 9 metrics' },
      { text: 'Isolating what separates the leaders from the laggards' },
    ],
    markdown:
      `**Health ranking: Madagascar > Côte d'Ivoire > Mali > RDC > Sénégal (this period).**\n\n` +
      `- **Madagascar** leads on every credit metric — worth studying rather than just celebrating: its branch-first sourcing and 612 score floor is the control group for the Sénégal experiment.\n` +
      `- **Sénégal ranks last purely on early-stage credit metrics** — its franchise strength (scale, deposit base, collections infrastructure) is intact, which is why the fix is policy, not restructuring.\n` +
      `- **The Sénégal ↔ Côte d'Ivoire divergence is the cleanest natural experiment in the group:** same products, same channels available, but CIV *didn't adopt* the March score relaxation. Its cohorts aged normally. Adjusted for mix, the policy explains ~85% of the performance gap.\n\n` +
      `**Read:** the scorecard is one row-click away from the answer — Sénégal's row, Delinquency tab, recent vintages.`,
  }),
};

/* ── Origination extras ──────────────────────────────────────────── */

const originationDaily: AvaInsight = {
  suggestedQuestions: () => [
    'Why the dip in daily disbursements mid-month?',
    'Are we pacing to the monthly target?',
    'Is the daily volatility normal?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Decomposing daily disbursement into weekday/paycycle effects' },
      { text: 'Projecting month-end landing vs target', detail: 'Monte Carlo on daily run-rate' },
    ],
    markdown:
      `**The mid-month dip is the e-KYC queue backing up — pacing lands at 94% of target unless it clears.**\n\n` +
      `- Days 12–16 ran ~28% below the weekday-adjusted norm; the same days show the document-verification queue peaking at 4.2-day TAT. Applications didn't disappear — they stacked.\n` +
      `- The partial recovery after day 17 is the queue draining, not new demand.\n` +
      `- Weekday and pay-cycle seasonality explains the rest of the wiggle; underlying demand run-rate is +6% MoM.\n\n` +
      `**Read:** clear the verification queue and the "lost" ~640 applications largely return — month-end can still land on target with a 48-hour SLA push this week.`,
  }),
};

const originationLos: AvaInsight = {
  suggestedQuestions: () => [
    'Which subsidiary is behind its origination target and why?',
    'Is the TAT deterioration uniform?',
    'What single fix adds the most disbursement volume?',
  ],
  answer: () => ({
    reasoning: [
      { text: 'Comparing LOS actuals vs targets by subsidiary', detail: '5 subsidiaries' },
      { text: 'Locating the binding constraint per subsidiary' },
    ],
    markdown:
      `**Everyone's constraint is different — which is good news, because each fix is local.**\n\n` +
      `- **Sénégal (91% of target):** verification queue (the e-KYC issue). Fix: vendor threshold + SLA.\n` +
      `- **Côte d'Ivoire (104%):** on plan; no action.\n` +
      `- **Mali (88%):** approval-stage bottleneck — two credit officers on leave; delegation matrix allows temporary limit increases for the branch manager tier.\n` +
      `- **RDC (96%):** demand-side softness in Kinshasa amid fuel price protests; temporary, not structural.\n` +
      `- **Madagascar (101%):** on plan.\n\n` +
      `**Biggest single lever:** the Sénégal verification queue — worth ~$780K/month in disbursement, more than all other gaps combined.`,
  }),
};

/** Origination KPI banner — logins, disbursed, approvals, TAT, achievement. */
const originationKpis: AvaInsight = {
  suggestedQuestions: (ctx) => {
    const metric = strParam(ctx, 'metric', 'this metric');
    return [
      `Why is ${metric} where it is this month?`,
      `Are we pacing to the monthly origination target?`,
      `What is the binding constraint in the pipeline right now?`,
    ];
  },
  answer: (ctx) => {
    const metric = strParam(ctx, 'metric', 'Origination performance');
    const isTat = /tat/i.test(metric);
    return {
      reasoning: [
        { text: `Tracing ${metric} through the application pipeline`, detail: '8,904 applications MTD' },
        { text: 'Comparing run-rate vs target on a matched-day basis' },
        { text: 'Locating the binding constraint per subsidiary' },
      ],
      markdown: isTat
        ? `**Average TAT at 4.6 days is 2.1 days worse than the trailing norm — and it is one queue, not a broad slowdown.**\n\n- The document-verification stage carries the entire deterioration (1.8 → 4.2 days) after the e-KYC vendor cutover; every other stage is at or better than norm.\n- TAT elasticity is real here: abandonment doubles after 48 hours, and TAKA app applicants are the most impatient cohort.\n- Approval and disbursal desks have slack — clearing the verification queue would not create a downstream jam.\n\n**Read:** a 48-hour SLA alarm plus temporary verification overtime restores TAT within one cycle and recovers ~640 stalled applications.`
        : `**${metric} is pacing at 94% of the monthly target — the gap is recoverable and sits in one place.**\n\n- Top-of-funnel demand is **+6% MoM** — this is not a demand problem.\n- The verification-queue backlog (e-KYC vendor cutover) is holding ~640 applications; Mali adds a small approval-desk gap (two credit officers on leave).\n- Approved-to-disbursed conversion is normal, so recovered applications flow straight through to volume.\n\n**Read:** with the vendor threshold rollback and an SLA push this week, month-end can still land on target. The demand is already in the funnel.`,
      followUps: [
        {
          label: 'Show pacing by subsidiary',
          answer: {
            reasoning: [{ text: 'Comparing MTD actuals vs target by subsidiary' }],
            markdown:
              `| Subsidiary | MTD vs target | Binding constraint |\n|---|---|---|\n| Baobab Sénégal | 91% | verification queue (e-KYC) |\n| Baobab Côte d'Ivoire | 104% | none — on plan |\n| Baobab Mali | 88% | approval desk staffing |\n| Baobab RDC | 96% | soft demand (Kinshasa, temporary) |\n| Baobab Banque Madagascar | 101% | none — on plan |\n\nThe Sénégal fix is worth more than all other gaps combined (~$780K/month of disbursement).`,
          },
        },
      ],
    };
  },
};

/* ── Generic fallback ────────────────────────────────────────────── */

const generic: AvaInsight = {
  suggestedQuestions: () => [
    'What stands out in this view?',
    'Explain the biggest movement here',
    'Anything breaching risk appetite in this section?',
  ],
  answer: (ctx) => ({
    reasoning: [
      { text: `Scanning ${ctx.breadcrumb.join(' › ')} against prior periods` },
      { text: 'Ranking movements by materiality and momentum' },
    ],
    markdown:
      `**Nothing in this view breaches appetite, and one item is worth a look.**\n\n` +
      `The dominant movement here ties back to the same story I'm tracking across the consumer book: post-March unsecured cohorts in Baobab Sénégal. This section's contribution is secondary — the primary evidence sits in **Consumer → Delinquency → Static Pool** (select the recent vintages) and **Origination → Funnel**.\n\n` +
      `If you want, I can break this specific view down by subsidiary, product or period.`,
  }),
};

/* ── Registry ────────────────────────────────────────────────────── */

const REGISTRY: Record<string, AvaInsight> = {
  'consumer.delinquency.staticPool': staticPool,
  'consumer.delinquency.netflow': consumerNetFlow,
  'consumer.origination.funnel': originationFunnel,
  'consumer.origination.daily': originationDaily,
  'consumer.origination.los': originationLos,
  'consumer.origination.kpis': originationKpis,
  'consumer.collections.bucket': collectionsBucket,
  'consumer.collections.efficiency': collectionsEfficiency,
  'consumer.kpi.fpd': consumerKpiFpd,
  'consumer.kpi.dpd30': consumerKpiDpd30,
  'consumer.kpi.dpd90': consumerKpiDpd30,
  'consumer.kpi.ncl': consumerKpiNcl,
  'consumer.overview': consumerOverview,
  'consumer.overview.dpdDist': consumerDpdDist,
  'consumer.products': consumerProducts,
  'consumer.collections': consumerCollections,
  'consumer.nonstarters': consumerNonStarters,
  'consumer.riskAnalytics': consumerRiskAnalytics,
  'consumer.tdd': consumerTdd,
  'overview.heatmap': overviewHeatmap,
  'overview.kpis': overviewKpis,
  'overview.kpi.dpd30': consumerKpiDpd30,
  'overview.kpi.npl': overviewKpis,
  'overview.composition': overviewComposition,
  'overview.trends': overviewTrends,
  'overview.businessLines': overviewBusinessLines,
  'overview.scorecard': overviewScorecard,
};

export function getInsight(insightId: string): AvaInsight {
  return REGISTRY[insightId] ?? generic;
}

/**
 * Questions to show: the curated insight's questions when one exists,
 * otherwise generated from the question framework (surface-type templates).
 */
export function getSuggestedQuestions(ctx: AvaContext): string[] {
  const entry = REGISTRY[ctx.insightId];
  return entry ? entry.suggestedQuestions(ctx) : frameworkQuestions(ctx);
}

/**
 * Answer routing:
 * - a suggested (pre-generated) question → the curated deep-dive answer;
 * - free-typed "why/what's driving/summarize" on a curated surface → also the
 *   curated answer (that's the story the surface exists to tell);
 * - anything else (actions, forecasts, comparisons, data checks, or surfaces
 *   without curated content) → composed from the domain question framework.
 */
export function getAnswer(ctx: AvaContext, question: string): AvaAnswer {
  const entry = REGISTRY[ctx.insightId];
  if (entry) {
    const suggested = entry.suggestedQuestions(ctx);
    if (suggested.includes(question)) return entry.answer(ctx, question);
    const intent = classifyIntent(question);
    if (intent === 'root-cause' || intent === 'segmentation' || intent === 'summary') {
      return entry.answer(ctx, question);
    }
  }
  return composeAnswer(ctx, question);
}
