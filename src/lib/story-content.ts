/**
 * Utilities for cleaning raw ingested content, decoding HTML entities,
 * extracting GitHub repositories, and generating in-depth editorial synthesis.
 */

export type ExtractedGitHubRepo = {
  url: string;
  owner: string;
  repo: string;
  fullName: string;
};

export type ExtractedLink = {
  url: string;
  label: string;
};

export type ProcessedStoryContent = {
  cleanLead: string;
  paragraphs: string[];
  githubRepos: ExtractedGitHubRepo[];
  externalLinks: ExtractedLink[];
  technicalHighlights: string[];
};

/**
 * Decodes all numeric and named HTML entities from ingested text.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return String.fromCodePoint(code);
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return String.fromCodePoint(code);
    })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rdquo;/g, '”')
    .replace(/&ldquo;/g, '“');
}

/**
 * Extracts GitHub repository details from text and URLs.
 */
export function extractGitHubRepos(text: string, primaryUrl?: string): ExtractedGitHubRepo[] {
  const combined = `${text} ${primaryUrl || ''}`;
  const decoded = decodeHtmlEntities(combined);
  const regex = /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:[#/?\s"']|$)/gi;
  const repos: ExtractedGitHubRepo[] = [];
  const seen = new Set<string>();

  for (const match of decoded.matchAll(regex)) {
    const owner = match[1];
    let repo = match[2];
    // Clean trailing punctuation or extensions
    repo = repo.replace(/[.,;:!?]+$/, '');
    if (owner && repo && !['features', 'topics', 'marketplace', 'explore', 'settings', 'orgs'].includes(owner.toLowerCase())) {
      const fullName = `${owner}/${repo}`;
      if (!seen.has(fullName.toLowerCase())) {
        seen.add(fullName.toLowerCase());
        repos.push({
          url: `https://github.com/${owner}/${repo}`,
          owner,
          repo,
          fullName,
        });
      }
    }
  }

  return repos;
}

/**
 * Extracts web links from text.
 */
export function extractLinks(text: string): ExtractedLink[] {
  const decoded = decodeHtmlEntities(text);
  const regex = /https?:\/\/[^\s<>"')]+/gi;
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  for (const match of decoded.matchAll(regex)) {
    let url = match[0].replace(/[.,;:!?]+$/, '');
    if (!seen.has(url) && !url.includes('github.com')) {
      seen.add(url);
      try {
        const parsed = new URL(url);
        links.push({
          url,
          label: parsed.hostname.replace(/^www\./, ''),
        });
      } catch {
        // invalid URL
      }
    }
  }

  return links;
}

/**
 * Cleans raw ingested story content, removes ugly HTML markup, splits into
 * coherent paragraphs, and extracts structured technical assets.
 */
export function processStoryContent(
  rawContent: string | null | undefined,
  title: string,
  primaryUrl?: string
): ProcessedStoryContent {
  if (!rawContent || !rawContent.trim()) {
    return {
      cleanLead: '',
      paragraphs: [],
      githubRepos: extractGitHubRepos('', primaryUrl),
      externalLinks: primaryUrl ? extractLinks(primaryUrl) : [],
      technicalHighlights: [],
    };
  }

  // 1. Decode entities
  let text = decodeHtmlEntities(rawContent);

  // 2. Extract GitHub repos and other links
  const githubRepos = extractGitHubRepos(text, primaryUrl);
  const externalLinks = extractLinks(text);

  // 3. Normalize paragraphs: replace <p>, </p>, <br>, <br/> with clean linebreaks
  text = text
    .replace(/<\/?(p|div|section|article)[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, '$3 ($2)')
    .replace(/<[^>]+>/g, '') // remove remaining HTML tags
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Split into distinct paragraphs
  const rawParagraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Separate code/repo references from prose paragraphs
  const paragraphs: string[] = [];
  const technicalHighlights: string[] = [];

  for (const p of rawParagraphs) {
    // If paragraph is just "Code: https://github.com/..."
    if (/^(?:code|repo|source|github):\s*https?:\/\/github\.com/i.test(p)) {
      continue; // Handled by rich GitHub card
    }

    // Identify technical key points
    if (p.length > 20) {
      paragraphs.push(p);
    }
  }

  // Derive technical highlights if paragraphs exist
  if (paragraphs.length > 1) {
    technicalHighlights.push(...paragraphs.slice(1, 4));
  }

  const cleanLead = paragraphs[0] || text.slice(0, 300);

  return {
    cleanLead,
    paragraphs,
    githubRepos,
    externalLinks,
    technicalHighlights,
  };
}
