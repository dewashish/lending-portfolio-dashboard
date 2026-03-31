import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { pdfBase64, recipientEmail, reportTitle } = await request.json();

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return NextResponse.json({ error: 'PDF data is required.' }, { status: 400 });
    }
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return NextResponse.json({ error: 'Recipient email is required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Email service is not configured. Please set the RESEND_API_KEY environment variable.' },
        { status: 500 },
      );
    }

    const title = reportTitle || 'Executive Summary';
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Use Resend HTTP API directly (no SDK needed)
    const senderDomain = process.env.RESEND_SENDER_DOMAIN || 'onboarding@resend.dev';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Avalora Reports <${senderDomain}>`,
        to: [recipientEmail],
        subject: `${title} — ${dateStr}`,
        text: [
          `Please find attached the ${title}.`,
          '',
          `Generated on ${dateStr} by Avalora Portfolio Monitor.`,
          '',
          'This is an automated message. Please do not reply.',
        ].join('\n'),
        attachments: [
          {
            filename: `${title.replace(/[^a-zA-Z0-9 _-]/g, '')}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'Unknown error');
      console.error('[email/send] Resend API error:', res.status, errBody);
      return NextResponse.json(
        { error: `Email service error: ${res.status}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email/send] Error:', err);
    return NextResponse.json(
      { error: 'Failed to send email.' },
      { status: 500 },
    );
  }
}
