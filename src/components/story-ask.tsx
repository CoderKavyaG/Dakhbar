'use client';

import React, { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Send, Sparkles, HelpCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { JoinUsButton } from './join-us-button';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

type AskSource = {
  citation: number;
  title: string;
  domain: string;
  reportedAt: string;
  excerpt: string;
  url: string;
};

type AskPayload = {
  upgradeUrl?: string;
  answer: string | null;
  generated: boolean;
  cached: boolean;
  reason?: string;
  evidence?: AskSource[];
  message?: string;
};

function answerWithCitations(answer: string, evidence: AskSource[]) {
  return answer.split(/(\[\d+\])/g).map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (!match) return part;
    const source = evidence.find(item => item.citation === Number(match[1]));
    return source ? (
      <a
        key={index}
        className="ask-citation"
        href={'#ask-source-' + source.citation}
        aria-label={'Jump to source ' + source.citation}
      >
        [{source.citation}]
      </a>
    ) : (
      part
    );
  });
}

const SUGGESTED_QUESTIONS = [
  'What are the core technical takeaways?',
  'What is the reported impact and timeline?',
  'Who is the primary source behind this?',
];

export function StoryAsk({
  storyId,
  subscriber,
  signedIn,
}: {
  storyId: string;
  subscriber: boolean;
  signedIn: boolean;
}) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AskPayload | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAsk(queryText: string) {
    if (!queryText.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: queryText.trim() }),
      });
      const payload = (await response.json()) as AskPayload;
      if (response.status === 401) {
        setResult({ ...payload, message: 'Please sign in to ask questions about this story.' });
        return;
      }
      if (response.status === 403 && payload.upgradeUrl) {
        setResult({
          ...payload,
          message: payload.message ?? 'Ask this story is included with Desk membership.',
        });
        return;
      }
      if (!response.ok) {
        setResult({
          ...payload,
          message:
            payload.message ??
            'A grounded answer was not available from the linked reports. Read the original coverage below.',
        });
        return;
      }
      setResult(payload);
    } catch {
      setResult({
        answer: null,
        generated: false,
        cached: false,
        reason: 'network_error',
        message:
          'The story question service is temporarily unavailable. The original reports remain below.',
      });
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleAsk(question);
  }

  return (
    <section className="story-ask-card" aria-labelledby="story-ask-title">
      <header className="story-ask-header">
        <div className="ask-header-title-row">
          <div className="ask-icon-badge">
            <Sparkles size={16} className="text-data" />
          </div>
          <div>
            <div className="ask-badge-row">
              <span className="section-note">Grounded Intelligence</span>
              <Badge className="badge-ask-desk">
                {subscriber ? 'Desk Active' : 'Desk Member Feature'}
              </Badge>
            </div>
            <h2 id="story-ask-title">Ask This Story</h2>
          </div>
        </div>
        <p className="ask-header-desc">
          Ask specific questions strictly grounded in the indexed primary reporting. Every factual
          sentence includes an inline source citation.
        </p>
      </header>

      {!signedIn ? (
        <div className="ask-gate-box">
          <div className="ask-gate-content">
            <p>Join Dअख़बार to check your Desk access and ask grounded questions about this story.</p>
            <div className="ask-gate-action">
              <JoinUsButton />
            </div>
          </div>
        </div>
      ) : !subscriber ? (
        <div className="ask-gate-box">
          <div className="ask-gate-content">
            <div className="ask-teaser-preview">
              <span className="teaser-label">Example queries Desk members ask:</span>
              <ul className="teaser-questions-list">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <li key={idx}>
                    <HelpCircle size={13} className="inline-icon text-data" /> {q}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ask-upgrade-prompt">
              <p>
                Story Q&A is included with Desk. Original reporting stays free and open to everyone below.
              </p>
              <Button asChild variant="default" className="ask-upgrade-btn">
                <Link href="/pricing">
                  Unlock Story Intelligence with Desk <ArrowUpRight size={15} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="story-ask-interactive">
          {/* Quick prompt pill chips */}
          <div className="suggested-prompts-bar">
            <span className="prompts-label">Suggested:</span>
            <div className="prompt-chips">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuestion(q);
                    handleAsk(q);
                  }}
                  disabled={busy}
                  className="prompt-chip-btn"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form className="story-ask-form" onSubmit={submit}>
            <div className="ask-input-group">
              <input
                id="story-question"
                value={question}
                onChange={event => setQuestion(event.target.value)}
                maxLength={500}
                placeholder="Ask about technical details, claims, or timeline..."
                disabled={busy}
                className="story-ask-input"
                aria-label="Ask a question about this story"
              />
              <Button type="submit" disabled={busy || !question.trim()} className="ask-submit-btn">
                {busy ? (
                  'Analyzing…'
                ) : (
                  <>
                    <span>Ask</span> <Send size={14} className="inline-icon" />
                  </>
                )}
              </Button>
            </div>
            <div className="ask-input-footer">
              <small className="ask-scope-hint">
                <ShieldCheck size={12} className="inline-icon text-data" /> Scoped strictly to this story’s primary source reports.
              </small>
            </div>
          </form>
        </div>
      )}

      {/* Answer & Citations Result Box */}
      {result && (
        <div className="ask-result-panel" aria-live="polite">
          {result.answer && result.generated ? (
            <div className="ask-success-box">
              <div className="ask-result-meta">
                <CheckCircle2 size={15} className="text-data inline-icon" />
                <span className="ask-meta-label">
                  {result.cached
                    ? 'Verified from cached evidence'
                    : 'Grounded against indexed primary reports'}
                </span>
              </div>
              <div className="ask-answer-text">
                {answerWithCitations(result.answer, result.evidence ?? [])}
              </div>
            </div>
          ) : (
            <div className="ask-fallback-box" role="status">
              <p>{result.message ?? 'A grounded answer was not available. Read the original reports below.'}</p>
              {result.upgradeUrl && (
                <Link href={result.upgradeUrl} className="fallback-upgrade-link">
                  Explore Desk →
                </Link>
              )}
            </div>
          )}

          {/* Evidence Citations Footnotes */}
          {result.evidence && result.evidence.length > 0 && (
            <div className="ask-evidence-section">
              <h4 className="evidence-heading">Cited Sources for This Answer</h4>
              <ol className="ask-evidence-list" aria-label="Evidence used for this story question">
                {result.evidence.map(source => (
                  <li id={'ask-source-' + source.citation} key={source.citation} className="ask-evidence-item">
                    <div className="evidence-item-header">
                      <span className="evidence-citation-pill">[{source.citation}]</span>
                      <span className="evidence-domain">{source.domain}</span>
                      <time className="evidence-time">
                        {new Date(source.reportedAt).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <h5 className="evidence-title">{source.title}</h5>
                    <p className="evidence-excerpt">{source.excerpt}</p>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-source-link"
                    >
                      Read original reporting on {source.domain} <ArrowUpRight size={13} />
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
