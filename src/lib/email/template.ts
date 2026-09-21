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
  const rows = input.stories.map(story => {
    const destination = storyDestination(story.id, story.documents.map(item => item.raw_document));
    const href = destination.external ? destination.href : `${input.appUrl}${destination.href}`;
    const topics = story.entities.map(item => item.entity.name).slice(0, 3).join(', ');
    return `<li style="margin:0 0 24px"><p style="margin:0 0 6px;color:#11675f;font:12px Arial,sans-serif">${escapeHtml(topics)}</p><a href="${escapeHtml(href)}" style="color:#161a19;font:600 22px Georgia,serif;line-height:1.2;text-decoration:none">${escapeHtml(story.title)}</a></li>`;
  }).join('');
  const textRows = input.stories.map(story => `- ${story.title}`).join('\n');
  const logo = input.appUrl.startsWith('https://')
    ? `<img src="${escapeHtml(input.appUrl)}/brand/dakhbar-reporter.png" alt="" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;margin:0 0 12px"/>`
    : '';
  return {
    subject: `${input.stories.length} ${input.stories.length === 1 ? 'development' : 'developments'} in your Dअख़बार Brief`,
    html: `<!doctype html><html><body style="margin:0;background:#efeae0;color:#161a19"><main style="max-width:640px;margin:auto;padding:32px"><header style="border-bottom:2px solid #161a19;padding-bottom:18px">${logo}<strong style="font:700 34px Georgia,serif">Dअख़बार</strong><p style="margin:10px 0 0;font:14px Arial,sans-serif;color:#626864">Your morning developer Brief</p></header><h1 style="font:500 36px Georgia,serif;line-height:1.05">${escapeHtml(summary)}</h1><ol style="padding-left:22px">${rows}</ol><footer style="border-top:1px solid #c9c5bc;padding-top:18px;font:12px Arial,sans-serif;color:#626864"><p>This deterministic Brief contains stories from topics you follow. Read the original reporting through each link.</p><p><a href="${input.appUrl}/methodology">How sourcing and ranking work</a> · <a href="${input.appUrl}/privacy">Privacy</a> · <a href="${escapeHtml(input.unsubscribeUrl)}">Unsubscribe from email Briefs</a></p></footer></main></body></html>`,
    text: `Dअख़बार — Your morning developer Brief\n\n${summary}\n\n${textRows}\n\nHow we work: ${input.appUrl}/methodology\nPrivacy: ${input.appUrl}/privacy\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}
