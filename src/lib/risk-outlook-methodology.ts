// ── Risk Outlook Methodology & Assumptions ──────────────────────
// Structured content for the Methodology sub-tab.

export interface MethodologyEntry {
  id: string;
  title: string;
  subTab: string;
  description: string;
  assumptions: string[];
  calculationMethod: string;
  dataInputs: string[];
  limitations: string[];
  references: string[];
}

export const METHODOLOGY_SECTIONS: MethodologyEntry[] = [
  // ── ECL & Provisions ────────────────────────────────────────────
  {
    id: 'ecl-forecast',
    title: 'ECL Forecast by Stage',
    subTab: 'ECL & Provisions',
    description:
      'Projects Expected Credit Loss (ECL) under IFRS 9 across three impairment stages over a quarterly horizon, weighted by macroeconomic scenarios.',
    assumptions: [
      'IFRS 9 three-stage model: Stage 1 = 12-month ECL (performing, no SICR), Stage 2 = lifetime ECL (significant increase in credit risk), Stage 3 = lifetime ECL (credit-impaired).',
      'Scenario weights: Base 50%, Adverse 30%, Severe 20%.',
      'Portfolio balance assumed stable under Base, contracts 5% under Adverse, 10% under Severe.',
      'PD, LGD, and EAD parameters recalibrated quarterly.',
    ],
    calculationMethod:
      'ECL = PD × LGD × EAD. Stage 1 PD = 12-month marginal PD. Stage 2/3 PD = lifetime cumulative PD. LGD = downturn-adjusted by collateral type. EAD = drawn + CCF × undrawn. Final ECL is the probability-weighted average across scenarios.',
    dataInputs: [
      'Internal PD models (TTC and PIT calibrations)',
      'LGD estimates by collateral type and seniority',
      'EAD including off-balance-sheet credit conversion factors',
      'Macroeconomic scenario forecasts (GDP, unemployment, house prices)',
    ],
    limitations: [
      'Scenario weights are management judgement, not statistically derived.',
      'Model assumes linear macro-PD relationship; non-linearities under extreme stress are not captured.',
      'Staging criteria rely on relative PD change thresholds which may lag market signals.',
    ],
    references: [
      'IFRS 9 Financial Instruments (IASB, 2014)',
      'BCBS Guidance on credit risk and accounting for expected credit losses (2015)',
    ],
  },
  {
    id: 'ecl-waterfall',
    title: 'ECL Waterfall Bridge',
    subTab: 'ECL & Provisions',
    description:
      'Decomposes the quarter-over-quarter change in ECL into contributing drivers, showing how each factor increases or decreases the closing provision.',
    assumptions: [
      'Period = quarter-over-quarter (Q-o-Q).',
      'Drivers isolated sequentially: new originations first, then derecognitions, stage transfers, parameter changes, macro overlay, and write-offs.',
      'Each driver is calculated independently — interaction effects are allocated to the Macro Overlay residual.',
    ],
    calculationMethod:
      'Opening ECL + New Originations (ECL on new loans) − Derecognitions (ECL released on matured/repaid) ± Stage Transfers (net ECL from inter-stage migrations) ± PD/LGD Changes (parameter recalibration) ± Macro Overlay (forward-looking adjustment) − Write-offs = Closing ECL.',
    dataInputs: [
      'Loan-level origination and derecognition activity',
      'Stage migration data from credit risk systems',
      'Updated PD/LGD model outputs',
      'Management overlay amounts and justifications',
    ],
    limitations: [
      'Sequential decomposition means order of drivers affects allocation.',
      'Macro overlay captures residual effects and management judgement, which may be opaque.',
    ],
    references: [
      'IFRS 9 Financial Instruments (IASB, 2014)',
      'EY IFRS 9 Impairment Banking Survey (2023)',
    ],
  },
  {
    id: 'provision-coverage',
    title: 'Provision Coverage Forecast',
    subTab: 'ECL & Provisions',
    description:
      'Projects provision coverage ratio (total provisions / gross loans) and NPL coverage (Stage 3 provisions / Stage 3 exposure) under each scenario.',
    assumptions: [
      'Coverage = Total Provisions / Gross Loans.',
      'NPL Coverage = Stage 3 Provisions / Stage 3 Exposure. Minimum threshold = 100% for Stage 3.',
      'Portfolio balance assumed stable under Base, contracts 5% under Adverse, 10% under Severe.',
    ],
    calculationMethod:
      'Projected coverage = ECL forecast amount / projected portfolio balance per scenario. Coverage trends follow ECL projections adjusted for portfolio run-off and new origination assumptions.',
    dataInputs: [
      'ECL forecast outputs by stage and scenario',
      'Projected portfolio balances from business planning',
    ],
    limitations: [
      'Portfolio balance assumptions are simplified; actual growth may diverge.',
      'Does not capture collateral value changes affecting coverage adequacy.',
    ],
    references: [
      'IFRS 9 Financial Instruments (IASB, 2014)',
    ],
  },

  // ── Stress Testing ──────────────────────────────────────────────
  {
    id: 'scenario-loss-matrix',
    title: 'Scenario Loss Matrix',
    subTab: 'Stress Testing',
    description:
      'Shows projected credit losses by product segment under four macroeconomic scenarios, displayed as a heatmap of loss rates and absolute loss amounts.',
    assumptions: [
      '4 macro scenarios: Base (current consensus GDP/unemployment), Mild Recession (GDP −1.5%, unemployment +2pp), Severe Recession (GDP −4%, unemployment +5pp, property −25%), Stagflation (GDP −1%, rates +400bp, inflation +5pp).',
      'Scenario probabilities: Base 50%, Mild 25%, Severe 15%, Stagflation 10%.',
      'Multipliers calibrated per product: secured products less sensitive (home loan multiplier 1.5–2.5×), unsecured more sensitive (credit card 2.0–3.5×).',
    ],
    calculationMethod:
      'Stressed PD = Base PD × scenario multiplier (from macro-PD regression). Stressed LGD = Base LGD × collateral haircut factor. Loss = Stressed PD × Stressed LGD × EAD.',
    dataInputs: [
      'Base PD/LGD by product segment',
      'Macro-PD regression coefficients',
      'Exposure at default by segment',
      'Collateral haircut assumptions by scenario',
    ],
    limitations: [
      'Linear multiplier approach may underestimate tail-risk losses.',
      'Cross-product correlation effects not modelled.',
      'Scenario definitions are point estimates, not distributions.',
    ],
    references: [
      'EBA 2025 EU-Wide Stress Test Methodology',
      'Basel III Capital Framework (BCBS, 2023)',
    ],
  },
  {
    id: 'cet1-trajectory',
    title: 'CET1 Capital Trajectory',
    subTab: 'Stress Testing',
    description:
      'Projects Common Equity Tier 1 capital ratio under each stress scenario, showing the path from current levels to stressed minima over the forecast horizon.',
    assumptions: [
      'Starting CET1 = current reported ratio.',
      'Pre-provision operating profit (PPOP) assumed stable across scenarios.',
      'RWA increases under stress due to credit risk migration increasing RWA density.',
      'No management actions or capital raises assumed (static balance sheet).',
      'Regulatory minimums: 4.5% Pillar 1, ~8% total (Pillar 1 + Pillar 2 + buffers).',
    ],
    calculationMethod:
      'CET1(t) = [Capital(t−1) + PPOP − Provisions − Tax] / RWA(t). RWA(t) = RWA(t−1) × (1 + RWA_growth_factor per scenario). Capital depleted by stressed credit losses net of pre-provision profit.',
    dataInputs: [
      'Current CET1 ratio and capital composition',
      'Pre-provision operating profit forecast',
      'Stressed provision estimates from scenario loss matrix',
      'RWA sensitivity to rating migration',
    ],
    limitations: [
      'Static balance sheet assumption ignores potential de-risking actions.',
      'PPOP stability assumption may not hold under extreme stress.',
      'Market risk and operational risk losses not modelled.',
    ],
    references: [
      'Basel III Capital Framework (BCBS, 2023)',
      'EBA 2025 EU-Wide Stress Test Methodology',
    ],
  },
  {
    id: 'sensitivity-tornado',
    title: 'ECL Sensitivity Tornado',
    subTab: 'Stress Testing',
    description:
      'Ranks macroeconomic risk factors by their impact on ECL when shocked independently, showing upside and downside effects.',
    assumptions: [
      'Each factor shocked independently (ceteris paribus).',
      'Shock magnitudes: Unemployment ±2pp, GDP ±3%, House Prices ±20%, Interest Rates ±300bp, Oil Prices ±50%.',
      'Model uses log-linear regression of historical default rates on macro factors.',
    ],
    calculationMethod:
      'ECL re-estimated with each factor at shocked level while holding others at base. Impact = (Shocked ECL − Base ECL) / Base ECL × 100%. Factors ranked by absolute impact.',
    dataInputs: [
      'Base ECL estimate',
      'Macro-credit regression model coefficients',
      'Historical macro variable distributions for shock calibration',
    ],
    limitations: [
      'Ceteris paribus assumption ignores macro factor correlations.',
      'Log-linear model may not capture threshold effects.',
      'Shock magnitudes are standardised, not tail-calibrated.',
    ],
    references: [
      "Moody's Analytics — Macro-credit linkage methodologies",
      'Basel III stress testing standards (BCBS, 2018)',
    ],
  },

  // ── PD & Migration ──────────────────────────────────────────────
  {
    id: 'migration-matrix',
    title: 'Forward PD Migration Matrix',
    subTab: 'PD & Migration',
    description:
      'Displays the probability of each rating grade transitioning to every other grade over a 1-year horizon, adjusted for current credit cycle conditions.',
    assumptions: [
      '8-grade internal rating scale (AAA to D).',
      'Point-in-time matrix reflecting current macro conditions (not long-run average).',
      'Default (D) is an absorbing state.',
      'Z-factor adjustment: Z > 0 in expansion (fewer downgrades), Z < 0 in downturn (more downgrades).',
    ],
    calculationMethod:
      'Forward-looking migration = Long-run average matrix adjusted by Z-factor (systematic credit cycle indicator). Z estimated from current GDP gap and credit spread. P_forward = P_longrun^(1 + α×Z) with diagonal adjustment to maintain row sums = 1.',
    dataInputs: [
      'Long-run average transition matrix from internal rating history (minimum 10 years)',
      'Current GDP gap and credit spread for Z-factor estimation',
      'Rating assignment data for all rated facilities',
    ],
    limitations: [
      'Z-factor calibration requires sufficient history across credit cycles.',
      'Absorbing state assumption for D prevents modelling recoveries.',
      'Matrix applies uniformly across sectors; sector-specific migration not captured.',
    ],
    references: [
      'S&P Global Market Intelligence — Rating migration analysis',
      'CreditMetrics Technical Document (J.P. Morgan, 1997)',
    ],
  },
  {
    id: 'pd-term-structure',
    title: 'PD Term Structure',
    subTab: 'PD & Migration',
    description:
      'Shows cumulative default probability curves by rating grade over a 1–5 year horizon, derived from the forward migration matrix.',
    assumptions: [
      'Cumulative PD derived from forward migration matrix.',
      'Conditional independence assumed across annual horizons.',
      'Term structure is monotonically non-decreasing by construction.',
    ],
    calculationMethod:
      'Cumulative PD(T) = 1 − ∏(k=1 to T) [1 − PD(k|survive to k−1)]. PD(k) from k-step transition matrix (M^k). Higher-rated grades have flatter curves; lower grades steepen rapidly.',
    dataInputs: [
      'Forward migration matrix (see Migration Matrix methodology)',
      'Default column probabilities from each matrix power',
    ],
    limitations: [
      'Conditional independence may not hold during prolonged stress.',
      'Matrix power approach assumes stationary transition probabilities.',
    ],
    references: [
      "Moody's Analytics — PD term structure construction",
      'IFRS 9 lifetime PD estimation guidance',
    ],
  },
  {
    id: 'rating-distribution',
    title: 'Rating Distribution Shift',
    subTab: 'PD & Migration',
    description:
      'Compares current portfolio rating composition to projected distribution after applying the forward migration matrix, adjusted for new originations and run-off.',
    assumptions: [
      'Projection applies forward migration matrix to current portfolio composition.',
      'New originations assumed at 15% of portfolio at weighted-average quality (BBB equivalent).',
      'Run-off proportional to current distribution.',
    ],
    calculationMethod:
      'Projected Distribution = Current Distribution × Migration Matrix, adjusted for expected origination volume at BBB-equivalent quality and expected maturities/payoffs.',
    dataInputs: [
      'Current portfolio rating distribution',
      'Forward migration matrix',
      'Expected origination volume and quality mix',
      'Expected run-off and maturity profile',
    ],
    limitations: [
      'BBB assumption for new originations may not reflect actual underwriting.',
      'Proportional run-off ignores rating-specific prepayment behaviour.',
    ],
    references: [
      'S&P Global — Annual Global Corporate Default Studies',
    ],
  },

  // ── Vintage Forecast ────────────────────────────────────────────
  {
    id: 'vintage-delinquency',
    title: 'Vintage Delinquency Forecast',
    subTab: 'Vintage Forecast',
    description:
      'Shows historical and projected 90+ DPD delinquency curves by origination vintage, with solid lines for actuals and dashed lines for forecasts.',
    assumptions: [
      '90+ DPD rate by MOB (months on books).',
      'S-curve seasoning pattern: low early, steepening MOB 6–18, plateau MOB 24+.',
      'Recent vintages may have different ultimate loss levels due to underwriting changes.',
      'Macro adjustment = (forecast unemployment / current unemployment)^elasticity.',
      'Elasticity: ~0.6–0.8 for unsecured, ~0.3–0.5 for secured products.',
    ],
    calculationMethod:
      'Actual rates from historical cohort tracking. Projected rates: fit logistic curve to observed data points, extrapolate with macro adjustment factor. Logistic model: rate = ultimate / (1 + exp(−k × (MOB − midpoint))).',
    dataInputs: [
      'Historical delinquency by vintage and MOB',
      'Logistic curve fit parameters per vintage',
      'Unemployment forecast for macro adjustment',
      'Elasticity estimates from historical vintage-macro correlation',
    ],
    limitations: [
      'Logistic curve may not fit well for vintages with few observed data points.',
      'Single macro factor (unemployment) may not capture all drivers.',
      'Underwriting quality changes between vintages are assumed but not directly measured.',
    ],
    references: [
      'Experian Insights — Vintage analysis methodology',
      'OCC Comptroller\'s Handbook — Credit Risk Management',
    ],
  },
  {
    id: 'roll-rate-forecast',
    title: 'Roll Rate Forecast',
    subTab: 'Vintage Forecast',
    description:
      'Projects bucket-to-bucket transition rates (roll forward, cure, and stable) over a 3-month forecast horizon.',
    assumptions: [
      'Markov chain assumption: transition probability depends only on current state, not history.',
      'Stationary within each forecast month but allowed to shift across months.',
      'Trend factor derived from macro direction indicator.',
      'Deteriorating environment: roll rates increase 2–5% per month; improving: decrease similarly.',
      'Cure rates decrease proportionally as roll-forward rates increase.',
    ],
    calculationMethod:
      'Month 1 rates = trailing 3-month average of observed roll rates. Month 2 = Month 1 × (1 + trend factor). Month 3 = Month 2 × (1 + trend factor). Trend factor: positive = deteriorating, negative = improving.',
    dataInputs: [
      'Historical roll rate observations (trailing 3 months)',
      'Macro direction indicator (composite of GDP, unemployment, PMI)',
      'Trend factor calibration from historical macro-roll rate analysis',
    ],
    limitations: [
      'Markov assumption ignores payment history and borrower heterogeneity.',
      'Linear trend extrapolation may over- or under-shoot in turning-point periods.',
      '3-month horizon is short; longer horizons would compound estimation error.',
    ],
    references: [
      'OCC Comptroller\'s Handbook — Allowance for Credit Losses',
      'BCBS Guidance on credit risk modelling (2005)',
    ],
  },

  // ── Macro & EWS ─────────────────────────────────────────────────
  {
    id: 'leading-indicators',
    title: 'Leading Indicators Scorecard',
    subTab: 'Macro & EWS',
    description:
      'Monitors macro and behavioural early warning signals with z-scores, trends, and RAG status to detect emerging credit deterioration.',
    assumptions: [
      'Z-score computed against trailing 36-month distribution.',
      'RAG thresholds: Green = |z| < 1.0, Amber = 1.0 ≤ |z| < 2.0, Red = |z| ≥ 2.0.',
      'Direction-aware: for "lower is better" metrics (unemployment), positive z = Red direction; for "higher is better" (GDP, PMI), negative z = Red direction.',
    ],
    calculationMethod:
      'Z = (current − mean_36m) / stdev_36m. Trend = sign of 3-month moving average slope. Behavioural indicators: Payment Index = weighted avg days-to-payment / contractual days. Migration Velocity = net downgrade volume / total rated facilities. 30DPD Entry Rate = new 30+ entries / total current facilities.',
    dataInputs: [
      'Macro data feeds (unemployment, GDP, PMI, inflation)',
      'Internal portfolio behavioural data (payment timing, rating migrations, DPD entries)',
      'Trailing 36-month history for z-score calculation',
    ],
    limitations: [
      'Z-score assumes normal distribution of indicators; fat tails may cause delayed alerts.',
      '36-month lookback may be too short for secular trends.',
      'Binary RAG classification loses information about magnitude within bands.',
    ],
    references: [
      'McKinsey "Credit Monitoring for Competitive Advantage"',
      'BIS Working Papers — Early warning indicators for banking crises',
    ],
  },
  {
    id: 'macro-credit-linkage',
    title: 'Macro-Credit Linkage',
    subTab: 'Macro & EWS',
    description:
      'Visualises the lead-lag relationship between macroeconomic variables and portfolio credit metrics, showing how current macro readings predict future credit performance.',
    assumptions: [
      'Lead-lag relationships calibrated from historical correlation analysis (minimum 5-year data).',
      'Optimal lag determined by maximum cross-correlation.',
      'Relationships assumed stable over forecast horizon.',
    ],
    calculationMethod:
      '3 calibrated pairings: (1) Unemployment leads 90+ DPD rate by ~4 months (cross-correlation 0.72). (2) GDP growth leads write-off rate by ~6 months (cross-correlation −0.65). (3) PMI leads new default rate by ~3 months (cross-correlation −0.58). Displayed as time-shifted overlays. Implied forecast: current macro reading implies credit metric trajectory using regression coefficients.',
    dataInputs: [
      'Monthly macro data series (unemployment, GDP proxy, PMI)',
      'Monthly credit metric series (90+ DPD rate, write-off rate, default rate)',
      'Cross-correlation analysis outputs and regression coefficients',
    ],
    limitations: [
      'Correlation ≠ causation; structural breaks can invalidate historical relationships.',
      'Fixed lag assumption ignores that lead times may vary with cycle phase.',
      'Limited to 3 pairings; other macro factors may be relevant.',
    ],
    references: [
      "Moody's Analytics — Macro-credit linkage methodologies",
      'Federal Reserve — Credit risk modelling guidance',
    ],
  },
];

export const METHODOLOGY_REFERENCES = [
  'IFRS 9 Financial Instruments (IASB, 2014) — ECL staging criteria, forward-looking incorporation',
  'Basel III Capital Framework (BCBS, 2023) — CET1 requirements, stress testing standards',
  'EBA 2025 EU-Wide Stress Test Methodology — Scenario design, loss projection approaches',
  'CECL (ASC 326) — Lifetime expected loss estimation for US GAAP context',
  "Moody's Analytics — PD term structure construction, macro-credit linkage methodologies",
  'McKinsey "Credit Monitoring for Competitive Advantage" — EWS design, leading indicator selection',
  'S&P Global Market Intelligence — Rating migration analysis, default studies',
  'Experian Insights — Vintage analysis methodology, seasoning curve estimation',
];
