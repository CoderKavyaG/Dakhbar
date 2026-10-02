'use client';

import React, { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Send, Sparkles, HelpCircle, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { JoinUsButton } from './join-us-button';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useToast } from './ui/toast';

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
  const [isOpen, setIsOpen] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(subscriber);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AskPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [activating, setActivating] = useState(false);
  const { toast } = useToast();

  async function handleActivateSandbox() {
    setActivating(true);
    try {
      const res = await fetch('/api/billing/sandbox-activate', { method: 'POST' });
      if (res.ok) {
        setIsSubscriber(true);
        toast({
          title: 'Desk Access Active',
          message: 'Desk membership activated! You can now query any story.',
          type: 'success',
        });
      }
    } catch {
      toast({ message: 'Could not activate sandbox mode.', type: 'error' });
    } finally {
      setActivating(false);
    }
  }

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
    <section className="story-ask-container" aria-labelledby="story-ask-title">
      {/* 1. Mascot Trigger Banner */}
      <div
        className={`story-mascot-card ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        aria-expanded={isOpen}
      >
        <div className="mascot-avatar-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/dakhbar-reporter.png"
            alt="Dअख़बार Reporter"
            className="mascot-reporter-img"
          />
        </div>

        <div className="mascot-text-group">
          <div className="mascot-tag-row">
            <span className="mascot-tag">🕵️ Dअख़बार Reporter Intelligence</span>
            <Badge className="badge-ask-desk">
              {isSubscriber ? 'Desk Active' : 'Desk Member Feature'}
            </Badge>
          </div>
          <h2 id="story-ask-title" className="mascot-headline">
            Have a question about this story?
          </h2>
          <p className="mascot-dek">
            Click to consult our reporter assistant. Every claim is strictly grounded in the indexed primary sources.
          </p>
        </div>

        <div className="mascot-toggle-action">
          <Button
            type="button"
            variant={isOpen ? 'outline' : 'default'}
            size="sm"
            className="mascot-expand-btn"
            onClick={e => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? (
              <>
                <span>Close</span> <ChevronUp size={14} className="inline-icon" />
              </>
            ) : (
              <>
                <span>Ask Reporter</span> <ChevronDown size={14} className="inline-icon" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Collapsible Q&A Panel */}
      {isOpen && (
        <div className="story-ask-collapsible-panel">
          {!signedIn ? (
            <div className="ask-gate-box">
              <div className="ask-gate-content">
                <p>Join Dअख़बार to check your Desk access and ask grounded questions about this story.</p>
                <div className="ask-gate-action">
                  <JoinUsButton />
                </div>
              </div>
            </div>
          ) : !isSubscriber ? (
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
                  <div className="gate-actions-row">
                    <Button asChild variant="default" className="ask-upgrade-btn">
                      <Link href="/pricing">
                        Unlock with Desk ($5/mo) <ArrowUpRight size={15} />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={activating}
                      onClick={handleActivateSandbox}
                      className="ask-sandbox-btn"
                    >
                      <Zap size={14} className="inline-icon text-data" />
                      {activating ? 'Activating…' : '⚡ Activate Sandbox Desk'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="story-ask-interactive">
              {/* Quick prompt pill chips */}
              <div className="suggested-prompts-bar">
                <span className="prompts-label">Suggested queries:</span>
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
                    placeholder="Ask about technical claims, architecture, or timeline..."
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
        </div>
      )}
    </section>
  );
}
