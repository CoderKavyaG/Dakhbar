import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeHtmlEntities,
  extractGitHubRepos,
  extractLinks,
  processStoryContent,
} from '../src/lib/story-content';

test('decodeHtmlEntities decodes common hex, dec and named entities', () => {
  const raw = 'Code: &lt;a href="https:&#x2F;&#x2F;github.com&#x2F;owner&#x2F;repo"&gt;repo&lt;/a&gt; &amp; &quot;quote&quot; &#39;apostrophe&#39;';
  const decoded = decodeHtmlEntities(raw);
  assert.equal(
    decoded,
    'Code: <a href="https://github.com/owner/repo">repo</a> & "quote" \'apostrophe\''
  );
});

test('extractGitHubRepos extracts owner/repo tuples and dedupes them', () => {
  const text = 'Check out https://github.com/facebook/react and also https://github.com/facebook/react/issues and https://github.com/hp6/ai-arena';
  const repos = extractGitHubRepos(text);
  assert.equal(repos.length, 2);
  assert.equal(repos[0].fullName, 'facebook/react');
  assert.equal(repos[0].url, 'https://github.com/facebook/react');
  assert.equal(repos[1].fullName, 'hp6/ai-arena');
  assert.equal(repos[1].url, 'https://github.com/hp6/ai-arena');
});

test('extractLinks parses external non-github URLs', () => {
  const text = 'Live demo at https://tinyaiarena.com and see repo at https://github.com/hp6/ai-arena';
  const links = extractLinks(text);
  assert.equal(links.length, 1);
  assert.equal(links[0].url, 'https://tinyaiarena.com');
  assert.equal(links[0].label, 'tinyaiarena.com');
});

test('processStoryContent transforms messy HN markup into clean prose and structured data', () => {
  const rawHnPost = `Did you ever click on an "AI Arena" expecting glorious battle and instead get a boring benchmark? If so, this project is for you: proper life-or-death fights between four models on a picturesque 8&times;8 grid. May the most intelligent one win!<p>Click on any of the matches to spectate them.<p>Code: <a href="https:&#x2F;&#x2F;github.com&#x2F;hp6&#x2F;ai-arena" rel="nofollow">https:&#x2F;&#x2F;github.com&#x2F;hp6&#x2F;ai-arena</a>`;

  const result = processStoryContent(rawHnPost, 'TinyAIArena', 'https://tinyaiarena.com');
  assert.ok(result.cleanLead.includes('Did you ever click on an "AI Arena"'));
  assert.equal(result.cleanLead.includes('<p>'), false);
  assert.equal(result.cleanLead.includes('&#x2F;'), false);
  assert.equal(result.paragraphs.length, 2);
  assert.equal(result.paragraphs[1], 'Click on any of the matches to spectate them.');
  assert.equal(result.githubRepos.length, 1);
  assert.equal(result.githubRepos[0].fullName, 'hp6/ai-arena');
  assert.equal(result.githubRepos[0].url, 'https://github.com/hp6/ai-arena');
});
