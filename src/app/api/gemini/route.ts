import { NextRequest, NextResponse } from 'next/server';
import { loadDataFromDisk } from '@/lib/data-loader';

function buildPortfolioContext(): string {
  const data = loadDataFromDisk();
  const summary = data.tradeExecutiveSummary;
  const lines: string[] = ['Portfolio Context Summary:'];

  if (summary) {
    lines.push(`- Total AUM: $${summary.totalAUM?.toFixed(2) ?? 'N/A'}mm`);
    lines.push(`- Total Facilities: ${summary.totalFacilities ?? 'N/A'}`);
    lines.push(`- NPL Ratio: ${summary.nplRatio != null ? (summary.nplRatio * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`- Stage 2+3%: ${summary.stage2Plus3Pct != null ? (summary.stage2Plus3Pct * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`- Provision Coverage: ${summary.provisionCoverage != null ? (summary.provisionCoverage * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`- Watchlist Count: ${summary.watchlistCount ?? 0}`);
    lines.push(`- Watchlist Exposure: $${summary.watchlistExposure?.toFixed(2) ?? 'N/A'}mm`);
    lines.push(`- Delinquency 30+: ${summary.delinquency30Plus != null ? (summary.delinquency30Plus * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`- Delinquency 90+: ${summary.delinquency90Plus != null ? (summary.delinquency90Plus * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`- Collection Efficiency: ${summary.collectionEfficiency != null ? (summary.collectionEfficiency * 100).toFixed(2) + '%' : 'N/A'}`);
  }

  // Entity breakdown
  if (data.entityPerformance.length > 0) {
    lines.push('\nEntity Performance:');
    data.entityPerformance.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Outstanding $${e.outstanding.toFixed(2)}mm, Utilization ${(e.utilization * 100).toFixed(1)}%, Stage2 ${(e.stage2 * 100).toFixed(1)}%, Stage3 ${(e.stage3 * 100).toFixed(1)}%, RAG: ${e.ragStatus}`,
      );
    });
  }

  // Watchlist
  if (data.watchlistAccounts.length > 0) {
    lines.push(`\nWatchlist Accounts: ${data.watchlistAccounts.length} flagged facilities`);
    data.watchlistAccounts.slice(0, 10).forEach((w) => {
      lines.push(
        `  - ${w.obligorName} (${w.entity}): $${w.outstanding.toFixed(2)}mm, DPD ${w.dpd}, EWS ${w.ewsScore}, ${w.stage}`,
      );
    });
  }

  // EWS
  if (data.ewsEntitySummary.length > 0) {
    lines.push('\nEWS Entity Summary:');
    data.ewsEntitySummary.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Avg EWS ${e.avgEWSScore.toFixed(1)}, Score 4+: ${e.score4Plus}, Flagged Exposure $${e.flaggedExposure.toFixed(2)}mm, RAG: ${e.rag}`,
      );
    });
  }

  // Concentration top 5
  if (data.concentrationNodes.length > 0) {
    lines.push('\nTop Concentration (by value):');
    data.concentrationNodes
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .forEach((c) => {
        lines.push(
          `  - ${c.name} (${c.category}): $${c.value.toFixed(2)}mm, ${(c.portfolioShare * 100).toFixed(1)}% share`,
        );
      });
  }

  // FX Risk
  if (data.fxRisk.length > 0) {
    lines.push('\nFX Risk:');
    data.fxRisk.forEach((f) => {
      lines.push(
        `  - ${f.entity} (${f.primaryCurrency}): Vol30D ${(f.volatility30Day * 100).toFixed(1)}%, YTD Deprec ${(f.ytdDepreciation * 100).toFixed(1)}%, RAG: ${f.rag}`,
      );
    });
  }

  // Corporate watchlist
  if (data.corporateWatchlist.length > 0) {
    lines.push(`\nCorporate Watchlist: ${data.corporateWatchlist.length} entries`);
    data.corporateWatchlist.slice(0, 5).forEach((c) => {
      lines.push(
        `  - ${c.borrower} (${c.sector}): Exposure ${c.exposure}, Rating ${c.internalRating}, Status: ${c.status}`,
      );
    });
  }

  // Dataset info
  lines.push(`\nDataset: ${data.datasetInfo.files.length} files loaded at ${data.datasetInfo.loadedAt}`);
  lines.push(`Entities: ${data.datasetInfo.entities.join(', ')}`);
  lines.push(`Countries: ${data.datasetInfo.countries.join(', ')}`);

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

    const context = buildPortfolioContext();

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
