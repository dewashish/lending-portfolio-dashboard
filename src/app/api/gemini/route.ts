import { NextRequest, NextResponse } from 'next/server';
import { fetchTradeEntityPerformance, fetchTradeExecutiveSummary, fetchTradeWatchlist, fetchTradeConcentrations } from '@/lib/queries/trade';
import { fetchEWSEntitySummary, fetchFXRisk, fetchCountryRisk } from '@/lib/queries/risk';
import { fetchCorporateWatchlist } from '@/lib/queries/corporate';

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
    lines.push(`- Total AUM: $${summary.totalAUM?.toFixed(2) ?? 'N/A'}mm`);
    lines.push(`- Total Facilities: ${summary.totalFacilities ?? 'N/A'}`);
    lines.push(`- NPL Ratio: ${summary.nplRatio != null ? (summary.nplRatio * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`- Stage 2+3%: ${summary.stage2Plus3Pct != null ? (summary.stage2Plus3Pct * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`- Provision Coverage: ${summary.provisionCoverage != null ? (summary.provisionCoverage * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`- Watchlist Count: ${summary.watchlistCount ?? 0}`);
  }

  if (entityPerf.length > 0) {
    lines.push('\nEntity Performance:');
    entityPerf.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Outstanding $${e.outstanding.toFixed(2)}mm, Utilization ${(e.utilization * 100).toFixed(1)}%, RAG: ${e.ragStatus}`,
      );
    });
  }

  if (watchlist.length > 0) {
    lines.push(`\nWatchlist Accounts: ${watchlist.length} flagged facilities`);
    watchlist.slice(0, 10).forEach((w) => {
      lines.push(
        `  - ${w.obligorName}: $${w.outstanding.toFixed(2)}mm, DPD ${w.dpd}, EWS ${w.ewsScore}, ${w.stage}`,
      );
    });
  }

  if (ewsSummary.length > 0) {
    lines.push('\nEWS Entity Summary:');
    ewsSummary.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Avg EWS ${e.avgEWSScore.toFixed(1)}, Score 4+: ${e.score4Plus}, Flagged Exposure $${e.flaggedExposure.toFixed(2)}mm, RAG: ${e.rag}`,
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
          `  - ${c.name} (${c.category}): $${c.value.toFixed(2)}mm, ${(c.portfolioShare * 100).toFixed(1)}% share`,
        );
      });
  }

  if (fxRisk.length > 0) {
    lines.push('\nFX Risk:');
    fxRisk.forEach((f) => {
      lines.push(
        `  - ${f.entity} (${f.primaryCurrency}): Vol30D ${(f.volatility30Day * 100).toFixed(1)}%, YTD Deprec ${(f.ytdDepreciation * 100).toFixed(1)}%, RAG: ${f.rag}`,
      );
    });
  }

  if (countryRisk.length > 0) {
    lines.push('\nCountry Risk:');
    countryRisk.forEach((r) => {
      lines.push(
        `  - ${r.entity}: Composite ${r.compositeScore.toFixed(1)}, Exposure $${r.exposure.toFixed(2)}mm, RAG: ${r.rag}`,
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        answer:
          'The Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable in your .env.local file to enable AI-powered portfolio analysis.\n\nExample:\nGEMINI_API_KEY=your_api_key_here',
      });
    }

    const context = await buildPortfolioContext();

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a senior credit risk analyst reviewing a lending portfolio dashboard. Use the following portfolio data context to answer the user's question accurately and concisely. If the data doesn't contain enough information to answer, say so clearly.

${context}

User Question: ${question}

Provide a clear, data-driven response. Use specific numbers from the context when available. Keep the answer concise but informative.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const answer = response.text();

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
