import { NextRequest, NextResponse } from 'next/server';
import { fetchTradeEntityPerformance, fetchTradeExecutiveSummary, fetchTradeWatchlist, fetchTradeConcentrations } from '@/lib/queries/trade';
import { fetchEWSEntitySummary, fetchFXRisk, fetchCountryRisk } from '@/lib/queries/risk';
import { fetchCorporateWatchlist } from '@/lib/queries/corporate';
import { formatCurrencyMM, formatPercent, formatRating } from '@/lib/format';

async function buildPortfolioContext(): Promise<string> {
  const [summary, entityPerf, watchlist, concentrations, ewsSummary, fxRisk, countryRisk, corpWatchlist] = await Promise.all([
    fetchTradeExecutiveSummary().catch(() => null),
    fetchTradeEntityPerformance().catch(() => []),
    fetchTradeWatchlist().catch(() => []),
    fetchTradeConcentrations().catch(() => []),
    fetchEWSEntitySummary().catch(() => []),
    fetchFXRisk().catch(() => []),
    fetchCountryRisk().catch(() => []),
    fetchCorporateWatchlist().catch(() => []),
  ]);

  const lines: string[] = ['Portfolio Context Summary:'];

  if (summary) {
    lines.push(`- Total AUM: ${summary.totalAUM != null ? formatCurrencyMM(summary.totalAUM) : 'N/A'}`);
    lines.push(`- Total Facilities: ${summary.totalFacilities ?? 'N/A'}`);
    lines.push(`- NPL Ratio: ${summary.nplRatio != null ? formatPercent(summary.nplRatio, 2) : 'N/A'}`);
    lines.push(`- Stage 2+3%: ${summary.stage2Plus3Pct != null ? formatPercent(summary.stage2Plus3Pct, 2) : 'N/A'}`);
    lines.push(`- Provision Coverage: ${summary.provisionCoverage != null ? formatPercent(summary.provisionCoverage, 2) : 'N/A'}`);
    lines.push(`- Watchlist Count: ${summary.watchlistCount ?? 0}`);
  }

  if (entityPerf.length > 0) {
    lines.push('\nEntity Performance:');
    entityPerf.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Outstanding ${formatCurrencyMM(e.outstanding)}, Utilization ${formatPercent(e.utilization, 1)}, RAG: ${e.ragStatus}`,
      );
    });
  }

  if (watchlist.length > 0) {
    lines.push(`\nWatchlist Accounts: ${watchlist.length} flagged facilities`);
    watchlist.slice(0, 10).forEach((w) => {
      lines.push(
        `  - ${w.obligorName}: ${formatCurrencyMM(w.outstanding)}, DPD ${w.dpd}, EWS ${w.ewsScore}, ${w.stage}`,
      );
    });
  }

  if (ewsSummary.length > 0) {
    lines.push('\nEWS Entity Summary:');
    ewsSummary.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Avg EWS ${formatRating(e.avgEWSScore)}, Score 4+: ${e.score4Plus}, Flagged Exposure ${formatCurrencyMM(e.flaggedExposure)}, RAG: ${e.rag}`,
      );
    });
  }

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

  if (fxRisk.length > 0) {
    lines.push('\nFX Risk:');
    fxRisk.forEach((f) => {
      lines.push(
        `  - ${f.entity} (${f.primaryCurrency}): Vol30D ${formatPercent(f.volatility30Day, 1)}, YTD Deprec ${formatPercent(f.ytdDepreciation, 1)}, RAG: ${f.rag}`,
      );
    });
  }

  if (countryRisk.length > 0) {
    lines.push('\nCountry Risk:');
    countryRisk.forEach((r) => {
      lines.push(
        `  - ${r.entity}: Composite ${formatRating(r.compositeScore)}, Exposure ${formatCurrencyMM(r.exposure)}, RAG: ${r.rag}`,
      );
    });
  }

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

    const context = await buildPortfolioContext();

    const systemPrompt = `You are a senior credit risk analyst reviewing a lending portfolio dashboard. Use the following portfolio data context to answer the user's question accurately and concisely. If the data doesn't contain enough information to answer, say so clearly.\n\n${context}\n\nProvide a clear, data-driven response. Use specific numbers from the context when available. Keep the answer concise but informative.`;

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
