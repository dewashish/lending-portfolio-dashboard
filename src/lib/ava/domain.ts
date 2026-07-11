/**
 * AVA domain model — what a lending business knows at account level, the
 * dimensional cuts that matter, and the risk semantics of every metric family.
 *
 * Grounded in the two businesses this platform serves:
 *
 * · Baobab Group — African microfinance (Sénégal, Côte d'Ivoire, Mali, RDC,
 *   Madagascar): group & individual micro-loans, SME/Croissance lending,
 *   TAKA nano-loans via mobile app, salary advances, equipment/agri asset
 *   finance, home improvement. Channels: branch loan officers, DSA/mobile
 *   agents, TAKA digital. Repayment: cash at branch, mobile money mandates.
 *
 * · Beltone "Seven" — Egyptian consumer finance: point-of-sale installment
 *   lending across merchant networks (electronics, furniture, education,
 *   healthcare, e-commerce), app-based limits, salaried + informal income
 *   segments. Channels: merchant POS, app, tele-sales. Repayment: card
 *   auto-debit, wallet, cash collection points.
 *
 * The mirror of this file lives as a reusable skill in
 * `.agent/skills/analyzing-lending-portfolios/SKILL.md`.
 */

/* ── Account-level data model ────────────────────────────────────── */

export interface FieldGroup {
  group: string;
  fields: string[];
}

/** What sits behind every cell on the dashboard, at loan-account level. */
export const ACCOUNT_FIELDS: FieldGroup[] = [
  {
    group: 'Identity & relationship',
    fields: [
      'loan account number', 'customer id', 'customer type (new-to-credit / new-to-bank / repeat / top-up)',
      'group lending id (Baobab group loans)', 'co-borrower / guarantor flags',
    ],
  },
  {
    group: 'Product & structure',
    fields: [
      'product / variant', 'secured flag & collateral type', 'sanctioned amount', 'ticket band',
      'tenure (months)', 'pricing (rate, fees)', 'EMI / installment amount', 'repayment frequency',
      'merchant / dealer id (Seven POS)', 'scheme / subvention flag',
    ],
  },
  {
    group: 'Origination & underwriting',
    fields: [
      'disbursement date (vintage)', 'application id & funnel timestamps', 'sourcing channel (branch / DSA / app / merchant / tele-sales)',
      'branch / merchant outlet', 'loan officer / agent id', 'application score & scorecard version',
      'bureau score & bureau depth (thin-file flag)', 'policy flags (deviations, manual overrides)',
      'income (verified / stated), income band', 'DBR / FOIR at origination', 'occupation & employer segment (salaried / informal / micro-entrepreneur)',
    ],
  },
  {
    group: 'Demographics & geography',
    fields: [
      'age band', 'gender', 'region / city / district', 'urban–rural flag', 'sector of activity (trade, agri, services, transport)',
    ],
  },
  {
    group: 'Exposure & performance (time series, monthly)',
    fields: [
      'principal outstanding (POS)', 'ENR', 'DPD (days past due)', 'DPD bucket', 'IFRS-9 stage',
      'months on book (MOB)', 'payments made / missed count', 'first-payment-default flag',
      'restructure / rescheduled flag', 'write-off flag & date', 'utilization (for limit products)',
    ],
  },
  {
    group: 'Collections activity',
    fields: [
      'assigned queue / agency', 'contact attempts & right-party-contact flag', 'promise-to-pay (taken / kept)',
      'field visit outcomes', 'payment mode (mobile money / cash / auto-debit)', 'mandate status (active / bounced)',
      'settlement / waiver flags', 'recovery amount post write-off',
    ],
  },
];

/* ── Dimensional cuts ────────────────────────────────────────────── */

/** The cuts a risk manager segments any metric by, in typical priority order. */
export const CUTS = [
  'vintage (disbursement month)', 'product / variant', 'secured vs unsecured', 'subsidiary / country',
  'region / branch / merchant outlet', 'sourcing channel', 'customer type (NTC / repeat)',
  'score band at origination', 'ticket band', 'tenure band', 'income band / segment',
  'DPD bucket', 'months on book', 'loan officer / DSA / agency',
] as const;

/* ── Metric families & risk semantics ────────────────────────────── */

export type MetricFamily = 'growth' | 'origination' | 'quality' | 'flow' | 'collections' | 'loss';

export interface MetricDef {
  label: string;
  family: MetricFamily;
  /** 'down' = lower is better (delinquency); 'up' = higher is better (resolution). */
  goodDirection: 'up' | 'down';
  /** What this metric predicts, and how many cycles ahead. */
  leads?: string;
  /** The management levers that actually move it. */
  levers: string[];
}

export const METRICS: Record<string, MetricDef> = {
  'FPD%': {
    label: 'First payment default', family: 'quality', goodDirection: 'down',
    leads: '30+ by ~2 cycles, NCL by ~4',
    levers: ['score cut-off', 'income verification', 'mandate setup at disbursal', 'welcome-call coverage'],
  },
  '30+ DPD': {
    label: '30+ delinquency', family: 'quality', goodDirection: 'down',
    leads: '90+ by ~2 cycles',
    levers: ['origination policy', 'early-bucket calling capacity', 'channel mix'],
  },
  '90+ DPD': {
    label: '90+ delinquency', family: 'quality', goodDirection: 'down',
    leads: 'write-offs / NCL by ~3 cycles',
    levers: ['mid-bucket treatment paths', 'restructure policy', 'field collections'],
  },
  'Net Credit Loss': {
    label: 'Net credit loss', family: 'loss', goodDirection: 'down',
    levers: ['recovery capacity & agency mix', 'settlement policy', 'origination quality 12–18M prior'],
  },
  'Roll Forward': {
    label: 'Roll-forward rate', family: 'flow', goodDirection: 'down',
    leads: 'next-bucket stock by 1 cycle',
    levers: ['collector case loads', 'treatment path by defaulter type', 'PTP follow-through'],
  },
  'Roll Backward': {
    label: 'Roll-back / resolution rate', family: 'flow', goodDirection: 'up',
    levers: ['calling intensity & timing', 'payment friction (mandates, wallets)', 'incentive design'],
  },
  'Stabilization': {
    label: 'Stabilization rate', family: 'flow', goodDirection: 'down',
    levers: ['restructure offers', 'partial-payment nudges', 'field visits for sticky accounts'],
  },
  'Collection Efficiency': {
    label: 'Collection efficiency (collected / due)', family: 'collections', goodDirection: 'up',
    leads: 'bucket inflow by 1 cycle',
    levers: ['mandate success rate', 'collector allocation', 'due-date alignment to income cycles'],
  },
  'Approval Rate': {
    label: 'Approval rate', family: 'origination', goodDirection: 'up',
    levers: ['score cut-off', 'policy rules', 'documentation requirements'],
  },
  'Conversion': {
    label: 'Funnel conversion', family: 'origination', goodDirection: 'up',
    levers: ['TAT per stage', 'document requirements & capture UX', 'channel file quality'],
  },
  'Non-Starter Rate': {
    label: 'Non-starter rate', family: 'quality', goodDirection: 'down',
    levers: ['mandate/wallet reconciliation at onboarding', 'fraud screens', 'first-EMI timing'],
  },
};

/** Resolve a metric definition from a loose label (e.g. "B2 Roll Forward", "30+ Amt%"). */
export function findMetric(label: string): MetricDef | undefined {
  const l = label.toLowerCase();
  if (l.includes('fpd')) return METRICS['FPD%'];
  if (l.includes('roll f')) return METRICS['Roll Forward'];
  if (l.includes('roll b') || l.includes('resolution') || l.includes('normaliz')) return METRICS['Roll Backward'];
  if (l.includes('stabili')) return METRICS['Stabilization'];
  if (l.includes('90')) return METRICS['90+ DPD'];
  if (l.includes('30') || l.includes('60') || l.includes('dpd') || l.includes('x+')) return METRICS['30+ DPD'];
  if (l.includes('ncl') || l.includes('credit loss') || l.includes('write')) return METRICS['Net Credit Loss'];
  if (l.includes('collect')) return METRICS['Collection Efficiency'];
  if (l.includes('approv')) return METRICS['Approval Rate'];
  if (l.includes('conver') || l.includes('funnel') || l.includes('tat') || l.includes('login') || l.includes('disburs')) return METRICS['Conversion'];
  if (l.includes('non-start') || l.includes('non start')) return METRICS['Non-Starter Rate'];
  return undefined;
}
