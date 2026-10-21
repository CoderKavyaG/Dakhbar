import { briefSummary } from '@/lib/brief';
import { storyDestination } from '@/lib/story-evidence';

type EmailStory = {
  id: string;
  title: string;
  entities: { entity: { name: string } }[];
  documents: { raw_document: { url: string; content: string | null; og_description?: string | null } }[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string));
}

export function renderBriefEmail(input: { stories: EmailStory[]; appUrl: string; unsubscribeUrl: string }) {
  const summary = briefSummary(input.stories.length).replace('since you were last here', 'since yesterday');
  const logoUrl = input.appUrl.startsWith('https://')
    ? `${input.appUrl}/brand/dakhbar-reporter.png`
    : 'https://dakhbar.vercel.app/brand/dakhbar-reporter.png';

  const rows = input.stories.map((story, index) => {
    const destination = storyDestination(story.id, story.documents.map(item => item.raw_document));
    const href = destination.external ? destination.href : `${input.appUrl}${destination.href}`;
    const topicsHtml = story.entities.map(item =>
      `<span style="display:inline-block;padding:2px 7px;background:#e2ece8;color:#0e5851;font:bold 11px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;border-radius:3px;margin-right:6px;text-transform:uppercase;letter-spacing:0.3px">${escapeHtml(item.entity.name)}</span>`
    ).slice(0, 3).join('');

    const sourceDomain = story.documents[0]?.raw_document?.url ? (() => {
      try {
        return new URL(story.documents[0].raw_document.url).hostname.replace(/^www\./, '');
      } catch { return ''; }
    })() : '';

    const domainBadge = sourceDomain
      ? `<span style="font:11px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;color:#808682;vertical-align:middle;margin-left:4px">via ${escapeHtml(sourceDomain)}</span>`
      : '';

    const excerpt = story.documents[0]?.raw_document?.og_description?.trim();
    const excerptHtml = excerpt
      ? `<p style="margin:6px 0 0;color:#555d58;font:14px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;line-height:1.45">${escapeHtml(excerpt.slice(0, 180))}${excerpt.length > 180 ? '...' : ''}</p>`
      : '';

    return `<li style="margin:0 0 26px;padding-left:4px">
      <div style="margin:0 0 6px">${topicsHtml}${domainBadge}</div>
      <a href="${escapeHtml(href)}" style="color:#161a19;font:700 20px Georgia,serif;line-height:1.28;text-decoration:none" target="_blank">${escapeHtml(story.title)}</a>
      ${excerptHtml}
    </li>`;
  }).join('');

  const textRows = input.stories.map(story => `- ${story.title}`).join('\n');

  return {
    subject: `${input.stories.length} ${input.stories.length === 1 ? 'development' : 'developments'} in your Dअख़बार Brief`,
    html: `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dअख़बार Brief</title>
</head>
<body style="margin:0;padding:0;background:#efeae0;color:#161a19;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efeae0;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;text-align:left">
          <tr>
            <td>
              <!-- Masthead with Logo -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-bottom:2px solid #161a19;padding-bottom:18px;margin-bottom:24px">
                <tr>
                  <td style="vertical-align:middle;width:56px;padding-right:14px">
                    <a href="${escapeHtml(input.appUrl)}" style="display:block;text-decoration:none" target="_blank">
                      <img src="${escapeHtml(logoUrl)}" alt="Dअख़बार" width="52" height="52" style="display:block;width:52px;height:52px;object-fit:contain;border:0;border-radius:6px" />
                    </a>
                  </td>
                  <td style="vertical-align:middle">
                    <a href="${escapeHtml(input.appUrl)}" style="color:#161a19;text-decoration:none" target="_blank">
                      <strong style="font:700 32px Georgia,serif;letter-spacing:-0.5px;line-height:1;display:block">Dअख़बार</strong>
                    </a>
                    <p style="margin:4px 0 0;font:13px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;color:#626864">Your morning developer Brief · Evidence-backed intelligence</p>
                  </td>
                </tr>
              </table>

              <!-- Lead Title -->
              <h1 style="font:500 34px Georgia,serif;line-height:1.12;margin:0 0 24px;color:#161a19">${escapeHtml(summary)}</h1>

              <!-- Stories -->
              <ol style="padding-left:20px;margin:0 0 32px">
                ${rows}
              </ol>

              <!-- Footer -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #c9c5bc;padding-top:18px;margin-top:28px">
                <tr>
                  <td style="font:12px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;color:#626864;line-height:1.6">
                    <p style="margin:0 0 8px">This deterministic Brief contains stories from topics you follow. Read the original reporting through each link.</p>
                    <p style="margin:0">
                      <a href="${escapeHtml(input.appUrl)}/methodology" style="color:#11675f;text-decoration:underline">How sourcing and ranking work</a> · 
                      <a href="${escapeHtml(input.appUrl)}/privacy" style="color:#11675f;text-decoration:underline">Privacy</a> · 
                      <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#626864;text-decoration:underline">Unsubscribe from email Briefs</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Dअख़बार — Your morning developer Brief\n\n${summary}\n\n${textRows}\n\nHow we work: ${input.appUrl}/methodology\nPrivacy: ${input.appUrl}/privacy\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}
