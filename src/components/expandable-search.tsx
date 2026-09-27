'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  X,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  Globe,
  FileText,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { topicPath } from '@/lib/topic-slug';
import type {
  TrendingTopicItem,
  StorySuggestionItem,
  TopicSuggestionItem,
  SourceSuggestionItem,
  SearchSuggestionsResponse,
} from '@/lib/search-suggestions';

const RECENT_SEARCHES_KEY = 'dakhbar_recent_searches';
const MAX_RECENT_SEARCHES = 6;

export function ExpandableSearch({
  initialTrending = [],
}: {
  initialTrending?: TrendingTopicItem[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending, setTrending] = useState<TrendingTopicItem[]>(initialTrending);
  const [stories, setStories] = useState<StorySuggestionItem[]>([]);
  const [topics, setTopics] = useState<TopicSuggestionItem[]>([]);
  const [sources, setSources] = useState<SourceSuggestionItem[]>([]);
  const [researchEligible, setResearchEligible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Fetch initial trending data if not passed
  useEffect(() => {
    if (trending.length === 0) {
      fetch('/api/search/suggestions')
        .then(res => res.json())
        .then((data: SearchSuggestionsResponse) => {
          if (data.trending?.length) {
            setTrending(data.trending);
          }
        })
        .catch(() => {});
    }
  }, [trending.length]);

  // Global keyboard shortcut: Ctrl+K or Cmd+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside listener to dismiss popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search suggestions with debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setStories([]);
      setTopics([]);
      setSources([]);
      setResearchEligible(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data: SearchSuggestionsResponse = await res.json();
          setStories(data.stories || []);
          setTopics(data.topics || []);
          setSources(data.sources || []);
          setResearchEligible(data.researchEligible || false);
        }
      } catch (err) {
        console.error('Failed to fetch search suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 160);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const saveRecentSearch = (term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    try {
      const next = [cleaned, ...recentSearches.filter(s => s.toLowerCase() !== cleaned.toLowerCase())].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      setRecentSearches(next);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {}
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const next = recentSearches.filter(s => s !== term);
      setRecentSearches(next);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {}
  };

  const clearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      setRecentSearches([]);
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  const executeSearch = (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    setIsOpen(false);
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeSearch(query);
    }
  };

  const hasSuggestions = stories.length > 0 || topics.length > 0 || sources.length > 0;
  const showEmptyState = query.trim().length > 0 && !isLoading && !hasSuggestions;

  return (
    <div
      ref={containerRef}
      className={`expandable-search-container ${isOpen ? 'is-open' : ''}`}
      role="search"
    >
      <form onSubmit={handleSubmit} className="expandable-search-form">
        <div className="search-input-wrapper">
          <Search size={16} className="search-input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            id="expandable-search-input"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search stories, topics, sources…"
            aria-label="Search stories, topics and sources"
            aria-expanded={isOpen}
            aria-controls="expandable-search-popover"
          />
          {query ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear query"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="search-shortcut-hint" aria-hidden="true">
              ⌘K
            </kbd>
          )}
          <button type="submit" className="search-submit-btn" aria-label="Submit search">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>

      {isOpen && (
        <div
          id="expandable-search-popover"
          className="expandable-search-popover"
          role="region"
          aria-label="Search suggestions and trending topics"
        >
          {/* STATE 1: Empty Query - Recent Searches + Trending Topics */}
          {!query.trim() && (
            <div className="search-popover-content">
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="search-popover-section recent-searches-section">
                  <div className="section-header-row">
                    <span className="popover-section-title">
                      <Clock size={13} className="inline-icon" /> Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearAllRecentSearches}
                      className="clear-all-link"
                    >
                      Clear history
                    </button>
                  </div>
                  <div className="recent-chips-grid">
                    {recentSearches.map(term => (
                      <div
                        key={term}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setQuery(term);
                          executeSearch(term);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setQuery(term);
                            executeSearch(term);
                          }
                        }}
                        className="recent-search-chip"
                      >
                        <span className="chip-text">{term}</span>
                        <button
                          type="button"
                          onClick={e => removeRecentSearch(term, e)}
                          className="chip-remove-btn"
                          aria-label={`Remove ${term} from recent searches`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sector Explorer & Radar Chips */}
              <div className="search-popover-section sectors-explore-section">
                <div className="section-header-row">
                  <span className="popover-section-title">
                    <Layers size={13} className="inline-icon text-data" /> Explore Sectors & Telemetry
                  </span>
                </div>
                <div className="sector-chips-row">
                  <Link
                    href="/category/ai-companies"
                    onClick={() => setIsOpen(false)}
                    className="sector-chip"
                  >
                    AI & companies
                  </Link>
                  <Link
                    href="/category/infrastructure"
                    onClick={() => setIsOpen(false)}
                    className="sector-chip"
                  >
                    Infrastructure
                  </Link>
                  <Link
                    href="/category/languages-tools"
                    onClick={() => setIsOpen(false)}
                    className="sector-chip"
                  >
                    Languages & tools
                  </Link>
                  <Link
                    href="/pulse"
                    onClick={() => setIsOpen(false)}
                    className="sector-chip sector-chip-pulse"
                  >
                    <span className="pulse-dot-inline" aria-hidden="true" />
                    Pulse Radar
                  </Link>
                </div>
              </div>

              {/* Trending Topics Section (Repurposing /topics directory content) */}
              <div className="search-popover-section trending-section">
                <div className="section-header-row">
                  <span className="popover-section-title">
                    <TrendingUp size={13} className="inline-icon text-data" /> Trending in Developer World
                  </span>
                  <Link
                    href="/pulse"
                    onClick={() => setIsOpen(false)}
                    className="popover-section-action"
                  >
                    <Compass size={12} className="inline-icon" /> Pulse Radar →
                  </Link>
                </div>

                <div className="trending-list-grid">
                  {trending.map(item => (
                    <Link
                      key={item.id}
                      href={topicPath({ name: item.name })}
                      onClick={() => {
                        saveRecentSearch(item.name);
                        setIsOpen(false);
                      }}
                      className="trending-topic-row"
                    >
                      <div className="trending-rank">
                        {String(item.rank).padStart(2, '0')}
                      </div>
                      <div className="trending-info">
                        <div className="trending-category-tag">
                          {item.categoryTitle} · <span className="trending-entity-type">{item.type}</span>
                        </div>
                        <div className="trending-name">{item.name}</div>
                        <div className="trending-meta">
                          <span>{item.storyCount} stories indexed</span>
                          {item.latestVelocity !== null && item.latestVelocity !== 0 ? (
                            <span className="trending-vel pos">
                              +{Math.round(item.latestVelocity)}% velocity
                            </span>
                          ) : item.latestMentions > 0 ? (
                            <span className="trending-vel neutral">
                              {item.latestMentions}/day
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ArrowRight size={14} className="trending-arrow" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: Query Active - Live Categorized Suggestions */}
          {query.trim().length > 0 && (
            <div className="search-popover-content live-results">
              {isLoading && (
                <div className="search-loading-state">
                  <span className="search-loading-spinner" />
                  <span>Searching stories, topics & sources…</span>
                </div>
              )}

              {/* Topics / Entities Match */}
              {topics.length > 0 && (
                <div className="search-popover-section suggestions-section">
                  <span className="popover-section-title">
                    <Layers size={13} className="inline-icon" /> Topics & Technologies ({topics.length})
                  </span>
                  <div className="suggestions-list">
                    {topics.map(topic => (
                      <Link
                        key={topic.id}
                        href={topicPath({ name: topic.name })}
                        onClick={() => {
                          saveRecentSearch(topic.name);
                          setIsOpen(false);
                        }}
                        className="suggestion-item topic-suggestion"
                      >
                        <div className="suggestion-topic-main">
                          <span className="suggestion-title">{topic.name}</span>
                          <Badge variant="outline" className="suggestion-badge">
                            {topic.categoryTitle}
                          </Badge>
                        </div>
                        <div className="suggestion-meta">
                          <span>{topic.storyCount} stories</span>
                          {topic.latestVelocity !== null && topic.latestVelocity > 0 && (
                            <span className="suggestion-vel pos">+{Math.round(topic.latestVelocity)}%</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Stories Match */}
              {stories.length > 0 && (
                <div className="search-popover-section suggestions-section">
                  <span className="popover-section-title">
                    <FileText size={13} className="inline-icon" /> Related Coverage ({stories.length})
                  </span>
                  <div className="suggestions-list">
                    {stories.map(story => (
                      <Link
                        key={story.id}
                        href={story.href}
                        onClick={() => {
                          saveRecentSearch(query);
                          setIsOpen(false);
                        }}
                        className="suggestion-item story-suggestion"
                      >
                        <div className="suggestion-story-body">
                          <span className="suggestion-story-title">{story.title}</span>
                          <div className="suggestion-story-sub">
                            {story.domain && <span className="source-domain-tag">{story.domain}</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources Match */}
              {sources.length > 0 && (
                <div className="search-popover-section suggestions-section">
                  <span className="popover-section-title">
                    <Globe size={13} className="inline-icon" /> Publishing Sources
                  </span>
                  <div className="sources-chips-row">
                    {sources.map(src => (
                      <button
                        key={src.domain}
                        type="button"
                        onClick={() => {
                          executeSearch(src.domain);
                        }}
                        className="source-chip"
                      >
                        <Globe size={12} className="inline-icon" />
                        <span>{src.domain}</span>
                        <span className="source-count">({src.storyCount})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {showEmptyState && (
                <div className="search-no-results">
                  <p>No direct matches found for “{query}”.</p>
                  <span className="search-sub-hint">Press Enter to search all primary reporting and archive documents.</span>
                </div>
              )}

              {/* Footer CTA Bar */}
              <div className="search-popover-footer">
                {researchEligible && (
                  <div className="search-dossier-pill">
                    <Sparkles size={13} className="inline-icon text-data" />
                    <span>Desk Research Dossier available</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => executeSearch(query)}
                  className="search-full-results-btn"
                >
                  <span>Search full archive for “<strong>{query}</strong>”</span>
                  <ArrowRight size={14} className="inline-icon" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
