export interface SendAlertEmailParams {
  to: string;
  siteName: string;
  siteNo: string;
  triggerLevel: string;
  gageHeight: number | null;
  streamflow: number | null;
  timestamp: string | null;
  token: string;
  apiKey: string;
}

export interface SendConfirmationEmailParams {
  to: string;
  siteName: string;
  triggerLevel: string;
  token: string;
  apiKey: string;
}

const FROM = 'alerts@gheistand.dev';
const FROM_DEV = 'onboarding@resend.dev';
const BASE_URL = 'https://flood.gheistand.dev';

function formatTriggerLevel(level: string): string {
  const map: Record<string, string> = {
    action: 'Action Stage',
    flood: 'Flood Stage',
    major: 'Major Flood Stage',
    percentile_90: '90th Percentile',
    percentile_95: '95th Percentile',
  };
  return map[level] ?? level;
}

async function sendEmail(params: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}): Promise<string | null> {
  const from = params.apiKey.startsWith('re_') ? FROM : FROM_DEV;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Resend error:', text);
    return null;
  }
  const data = await res.json() as { id?: string };
  return data.id ?? null;
}

export async function sendAlertEmail(params: SendAlertEmailParams): Promise<string | null> {
  const levelLabel = formatTriggerLevel(params.triggerLevel);
  const subject = `⚠️ Flood Alert: ${params.siteName} — ${levelLabel} reached`;
  const html = `
<html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
<h2 style="color: #d97706;">⚠️ Illinois Flood Dashboard Alert</h2>
<p><strong>${params.siteName}</strong> has reached <strong>${levelLabel}</strong>.</p>
<h3>Current conditions:</h3>
<ul>
  <li>Gage height: <strong>${params.gageHeight?.toFixed(2) ?? 'N/A'} ft</strong></li>
  <li>Streamflow: <strong>${params.streamflow ? params.streamflow.toLocaleString() + ' cfs' : 'N/A'}</strong></li>
  <li>As of: ${params.timestamp ?? 'unknown'}</li>
</ul>
<p><a href="${BASE_URL}/?gage=${params.siteNo}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">View Live Conditions</a></p>
<hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
<p style="font-size: 12px; color: #6b7280;">
  <a href="${BASE_URL}/alerts/unsubscribe?token=${params.token}">Unsubscribe from this alert</a><br/>
  Powered by ISWS/CHAMP · Illinois State Water Survey
</p>
</body></html>`;
  return sendEmail({ apiKey: params.apiKey, to: params.to, subject, html });
}

export async function sendConfirmationEmail(params: SendConfirmationEmailParams): Promise<string | null> {
  const levelLabel = formatTriggerLevel(params.triggerLevel);
  const subject = `You're subscribed to flood alerts for ${params.siteName}`;
  const html = `
<html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
<h2 style="color: #2563eb;">✅ Flood Alert Subscription Confirmed</h2>
<p>You'll receive an email when <strong>${params.siteName}</strong> reaches <strong>${levelLabel}</strong>.</p>
<p>You can unsubscribe at any time using the link below or in any future alert email.</p>
<p><a href="${BASE_URL}/alerts/unsubscribe?token=${params.token}" style="color: #6b7280;">Unsubscribe</a></p>
<hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
<p style="font-size: 12px; color: #6b7280;">Powered by ISWS/CHAMP · Illinois State Water Survey</p>
</body></html>`;
  return sendEmail({ apiKey: params.apiKey, to: params.to, subject, html });
}
