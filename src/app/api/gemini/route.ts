import { NextRequest, NextResponse } from 'next/server';
import { fetchTradeEntityPerformance, fetchTradeExecutiveSummary, fetchTradeWatchlist, fetchTradeConcentrations } from '@/lib/queries/trade';
import { fetchEWSEntitySummary, fetchFXRisk, fetchCountryRisk } from '@/lib/queries/risk';
import { fetchCorporateWatchlist, fetchCorporateExecutiveSummary } from '@/lib/queries/corporate';
import { fetchConsumerOverall } from '@/lib/queries/consumer';
import { fetchConsolidatedScorecard } from '@/lib/queries/overview';
import { formatCurrencyMM, formatPercent, formatRating } from '@/lib/format';
import type { ScopeSelection } from '@/lib/types';

async function buildPortfolioContext(scope?: ScopeSelection): Promise<string> {
  const [
    scorecard,
    summary,
    entityPerf,
    watchlist,
    concentrations,
    ewsSummary,
    fxRisk,
    countryRisk,
    corpWatchlist,
    corpSummary,
    consumerOverall,
  ] = await Promise.all([
    fetchConsolidatedScorecard(scope).catch(() => []),
    fetchTradeExecutiveSummary(scope).catch(() => null),
    fetchTradeEntityPerformance(scope).catch(() => []),
    fetchTradeWatchlist(scope).catch(() => []),
    fetchTradeConcentrations(undefined, scope).catch(() => []),
    fetchEWSEntitySummary(scope).catch(() => []),
    fetchFXRisk(scope).catch(() => []),
    fetchCountryRisk(scope).catch(() => []),
    fetchCorporateWatchlist(scope).catch(() => []),
    fetchCorporateExecutiveSummary(scope).catch(() => null),
    fetchConsumerOverall(scope).catch(() => []),
  ]);

  const scopeLabel = !scope || scope.level === 'group'
    ? 'Group (all subsidiaries)'
    : scope.level === 'region'
      ? `Region (regionId: ${scope.regionId})`
      : `Subsidiary (subsidiaryId: ${scope.subsidiaryId})`;

  const lines: string[] = [`Portfolio Context — Scope: ${scopeLabel}`];

  // ── Consolidated Scorecard ──────────────────────────────────
  if (scorecard.length > 0) {
    lines.push('\nConsolidated Scorecard by Subsidiary:');
    scorecard.forEach((s) => {
      lines.push(
        `  - ${s.subsidiary} (${s.shortCode}, ${s.country}): Consumer AUM ${s.consumerAumUsd != null ? formatCurrencyMM(s.consumerAumUsd) : 'N/A'}, ` +
        `Trade Outstanding ${s.tradeOutstandingUsd != null ? formatCurrencyMM(s.tradeOutstandingUsd) : 'N/A'}, ` +
        `30+ DPD ${s.consumerDelinquency30Plus != null ? formatPercent(s.consumerDelinquency30Plus, 2) : 'N/A'}, ` +
        `90+ DPD ${s.consumerDelinquency90Plus != null ? formatPercent(s.consumerDelinquency90Plus, 2) : 'N/A'}, ` +
        `Trade NPL ${s.tradeNplRatio != null ? formatPercent(s.tradeNplRatio, 2) : 'N/A'}, ` +
        `Corp Watchlist ${s.corporateWatchlistCount}, ` +
        `EWS Avg ${s.avgEwsScore != null ? formatRating(s.avgEwsScore) : 'N/A'} (${s.ewsRagStatus ?? 'N/A'}), ` +
        `FX YTD Deprec ${s.fxYtdDepreciation != null ? formatPercent(s.fxYtdDepreciation, 1) : 'N/A'} (${s.fxRagStatus ?? 'N/A'}), ` +
        `Country Risk ${s.countryRiskScore != null ? formatRating(s.countryRiskScore) : 'N/A'} (${s.countryRiskRagStatus ?? 'N/A'})`,
      );
    });

    // Group totals
    const totalConsumerAUM = scorecard.reduce((s, r) => s + (r.consumerAumUsd ?? 0), 0);
    const totalTradeOutstanding = scorecard.reduce((s, r) => s + (r.tradeOutstandingUsd ?? 0), 0);
    lines.push(`  Group Totals: Consumer AUM ${formatCurrencyMM(totalConsumerAUM)}, Trade Outstanding ${formatCurrencyMM(totalTradeOutstanding)}`);
  }

  // ── Consumer Finance Summary ────────────────────────────────
  if (consumerOverall.length > 0) {
    lines.push('\nConsumer Finance Metrics:');
    const amountMetrics = new Set([
      'Total AUM', 'On-Book AUM', 'Off-Book AUM', 'New Bookings',
      'Write-offs', 'Recoveries', 'NCL', 'Average Ticket Size',
      'Life-to-Date Disbursement',
    ]);
    consumerOverall.forEach((m) => {
      const entries = Object.entries(m.values).filter(([, v]) => v != null && typeof v === 'number');
      if (entries.length === 0) return;
      const [latestPeriod, latestValue] = entries[entries.length - 1];
      const val = latestValue as number;
      const formatted = amountMetrics.has(m.metric) ? formatCurrencyMM(val) : formatPercent(val, 2);
      lines.push(`  - ${m.metric} (${latestPeriod}): ${formatted}`);
    });
  }

  // ── Trade Finance Summary ───────────────────────────────────
  if (summary) {
    lines.push('\nTrade Finance Summary:');
    lines.push(`  - Total AUM: ${summary.totalAUM != null ? formatCurrencyMM(summary.totalAUM) : 'N/A'}`);
    lines.push(`  - Total Facilities: ${summary.totalFacilities ?? 'N/A'}`);
    lines.push(`  - NPL Ratio: ${summary.nplRatio != null ? formatPercent(summary.nplRatio, 2) : 'N/A'}`);
    lines.push(`  - Stage 2+3%: ${summary.stage2Plus3Pct != null ? formatPercent(summary.stage2Plus3Pct, 2) : 'N/A'}`);
    lines.push(`  - Provision Coverage: ${summary.provisionCoverage != null ? formatPercent(summary.provisionCoverage, 2) : 'N/A'}`);
    lines.push(`  - Watchlist Count: ${summary.watchlistCount ?? 0}`);
  }

  // ── Corporate Finance Summary ───────────────────────────────
  if (corpSummary) {
    lines.push('\nCorporate Finance Summary:');
    lines.push(`  - Total POS (Principal Outstanding): ${formatCurrencyMM(corpSummary.totalPOS)}`);
    lines.push(`  - Total Disbursement: ${formatCurrencyMM(corpSummary.totalDisbursement)}`);
    lines.push(`  - Delinquency Rate: ${formatPercent(corpSummary.delinquencyRate, 2)}`);
    lines.push(`  - NPA Rate: ${formatPercent(corpSummary.npaRate, 2)}`);
    lines.push(`  - Avg Security Cover: ${formatPercent(corpSummary.avgSecurityCover, 1)}`);
    lines.push(`  - Covenant Breach Rate: ${formatPercent(corpSummary.covenantBreachRate, 2)}`);
    lines.push(`  - Provision Coverage Ratio: ${formatPercent(corpSummary.provisionCoverageRatio, 2)}`);
    lines.push(`  - Watchlist Count: ${corpSummary.watchlistCount}`);
  }

  // ── Trade Entity Performance ────────────────────────────────
  if (entityPerf.length > 0) {
    lines.push('\nTrade Entity Performance:');
    entityPerf.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Outstanding ${formatCurrencyMM(e.outstanding)}, Utilization ${formatPercent(e.utilization, 1)}, RAG: ${e.ragStatus}`,
      );
    });
  }

  // ── Trade Watchlist ─────────────────────────────────────────
  if (watchlist.length > 0) {
    lines.push(`\nTrade Watchlist: ${watchlist.length} flagged facilities`);
    watchlist.slice(0, 10).forEach((w) => {
      lines.push(
        `  - ${w.obligorName}: ${formatCurrencyMM(w.outstanding)}, DPD ${w.dpd}, EWS ${w.ewsScore}, ${w.stage}`,
      );
    });
  }

  // ── EWS Summary ─────────────────────────────────────────────
  if (ewsSummary.length > 0) {
    lines.push('\nEWS Entity Summary:');
    ewsSummary.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Avg EWS ${formatRating(e.avgEWSScore)}, Score 4+: ${e.score4Plus}, Flagged Exposure ${formatCurrencyMM(e.flaggedExposure)}, RAG: ${e.rag}`,
      );
    });
  }

  // ── Concentrations ──────────────────────────────────────────
  if (concentrations.length > 0) {
    lines.push('\nTop Concentration (by value):');
    concentrations
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .forEach((c) => {
        lines.push(
          `  - ${c.name} (${c.category}): ${formatCurrencyMM(c.value)}, ${formatPercent(c.portfolioShare, 1)} share`,
        );
      });
  }

  // ── FX Risk ─────────────────────────────────────────────────
  if (fxRisk.length > 0) {
    lines.push('\nFX Risk:');
    fxRisk.forEach((f) => {
      lines.push(
        `  - ${f.entity} (${f.primaryCurrency}): Vol30D ${formatPercent(f.volatility30Day, 1)}, YTD Deprec ${formatPercent(f.ytdDepreciation, 1)}, Exposure ${formatCurrencyMM(f.portfolioExposure)}, RAG: ${f.rag}`,
      );
    });
  }

  // ── Country Risk ────────────────────────────────────────────
  if (countryRisk.length > 0) {
    lines.push('\nCountry Risk:');
    countryRisk.forEach((r) => {
      lines.push(
        `  - ${r.entity}: Composite ${formatRating(r.compositeScore)}, Exposure ${formatCurrencyMM(r.exposure)}, RAG: ${r.rag}`,
      );
    });
  }

  // ── Corporate Watchlist ─────────────────────────────────────
  if (corpWatchlist.length > 0) {
    lines.push(`\nCorporate Watchlist: ${corpWatchlist.length} entries`);
    corpWatchlist.slice(0, 5).forEach((c) => {
      lines.push(
        `  - ${c.borrower} (${c.sector}): Exposure ${c.exposure}, Rating ${c.internalRating}, Status: ${c.status}`,
      );
    });
  }

  return lines.join('\n');
}

function parseScopeFromBody(body: Record<string, unknown>): ScopeSelection | undefined {
  const { scope } = body;
  if (!scope || typeof scope !== 'object') return undefined;
  const s = scope as Record<string, unknown>;
  const level = s.level as string;
  if (!level || !['group', 'region', 'subsidiary'].includes(level)) return undefined;
  return {
    level: level as ScopeSelection['level'],
    regionId: typeof s.regionId === 'number' ? s.regionId : undefined,
    subsidiaryId: typeof s.subsidiaryId === 'number' ? s.subsidiaryId : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { answer: 'Please provide a valid question.' },
        { status: 400 },
      );
    }

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        answer:
          'The AI API key is not configured. Please set the KIE_API_KEY environment variable to enable AI-powered portfolio analysis.',
      });
    }

    const scope = parseScopeFromBody(body);
    const context = await buildPortfolioContext(scope);

    const systemPrompt = `You are a senior credit risk analyst reviewing a lending portfolio dashboard for a multi-geography financial holding group (Avaloura Group). The group has 5 subsidiaries across South Asia, Middle East, Eastern Europe, and Latin America operating in Consumer Finance, Trade Finance, and Corporate Finance.

Use the following portfolio data context to answer the user's question accurately and concisely. If the data doesn't contain enough information to answer, say so clearly.

${context}

Provide a clear, data-driven response. Use specific numbers from the context when available. Keep the answer concise but informative. When comparing entities, highlight RAG statuses and key risk indicators.`;

    const res = await fetch('https://api.kie.ai/gemini-3-flash/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-3-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Kie API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content ?? 'No response received.';

    return NextResponse.json({ answer });
  } catch (err: unknown) {
    console.error('Gemini API error:', err);
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json(
      { answer: `Error processing your question: ${message}` },
      { status: 500 },
    );
  }
}
