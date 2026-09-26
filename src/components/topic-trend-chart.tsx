'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { computeTrendStats, type MetricSnapshotData, type TrendRange } from '@/lib/trend';

export type ContributingStoryItem = {
  id: string;
  title: string;
  href: string;
  isExternal: boolean;
  sourceCount: number;
  domain?: string;
  publishedAt: string;
};

export function TopicTrendChart({
  snapshots,
  entityName,
  entityType,
  contributingStories = [],
}: {
  snapshots: MetricSnapshotData[];
  entityName: string;
  entityType: string;
  contributingStories?: ContributingStoryItem[];
}) {
  const [range, setRange] = useState<TrendRange>('7d');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const stats = computeTrendStats(snapshots, range);
  const activePoint = hoveredIndex !== null && stats.points[hoveredIndex] ? stats.points[hoveredIndex] : null;

  return (
    <section className="topic-trend-section" aria-labelledby="topic-trend-title">
      <div className="topic-trend-card">
        {/* Header & Controls */}
        <div className="topic-trend-header">
          <div className="topic-trend-title-area">
            <span className="section-note">Developer Pulse · Mention Trend</span>
            <h2 id="topic-trend-title">Tracking {entityName}</h2>
          </div>

          <div className="trend-range-toggle" role="group" aria-label="Select date range for trend chart">
            <button
              type="button"
              className={range === '24h' ? 'active' : ''}
              onClick={() => { setRange('24h'); setHoveredIndex(null); }}
              aria-pressed={range === '24h'}
            >
              24h
            </button>
            <button
              type="button"
              className={range === '7d' ? 'active' : ''}
              onClick={() => { setRange('7d'); setHoveredIndex(null); }}
              aria-pressed={range === '7d'}
            >
              7d
            </button>
            <button
              type="button"
              className={range === '30d' ? 'active' : ''}
              onClick={() => { setRange('30d'); setHoveredIndex(null); }}
              aria-pressed={range === '30d'}
            >
              30d
            </button>
          </div>
        </div>

        {/* Metric Overview Strip */}
        <div className="trend-metrics-strip">
          <div className="trend-stat-item">
            <span className="trend-stat-label">Daily Mentions</span>
            <div className="trend-stat-value">
              <strong>{activePoint ? activePoint.mentions : stats.currentMentions}</strong>
              <small>{activePoint ? `on ${activePoint.formattedDate}` : 'latest snapshot'}</small>
            </div>
          </div>

          <div className="trend-stat-item">
            <span className="trend-stat-label">Velocity</span>
            <div className="trend-stat-value">
              {stats.currentVelocity !== null ? (
                <span className={`trend-velocity-pill ${stats.currentVelocity > 0 ? 'pos' : stats.currentVelocity < 0 ? 'neg' : 'neutral'}`}>
                  {stats.currentVelocity > 0 ? <TrendingUp size={14} /> : stats.currentVelocity < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                  {stats.currentVelocity > 0 ? '+' : ''}{stats.currentVelocity.toFixed(1)}%
                </span>
              ) : (
                <span className="trend-velocity-pill neutral">Baseline</span>
              )}
            </div>
          </div>

          <div className="trend-stat-item range-coverage">
            <span className="trend-stat-label">Coverage</span>
            <span className={`trend-coverage-badge ${stats.isPartial ? 'partial' : 'full'}`}>
              {stats.isPartial && <Info size={13} className="inline-icon" />}
              {stats.rangeLabel}
            </span>
          </div>
        </div>

        {/* Chart View */}
        {!stats.hasEnoughData ? (
          <div className="trend-empty-container">
            <p className="trend-empty-message">{stats.emptyReason}</p>
            <span className="trend-empty-note">
              Daily mention snapshots for this {entityType} are computed automatically at 00:00 UTC as reporting is ingested across Hacker News, Dev.to, and publisher feeds.
            </span>
          </div>
        ) : (
          <div className="trend-chart-container">
            <svg
              className="trend-sparkline-svg"
              viewBox="0 0 800 140"
              aria-label={`Mention trend sparkline for ${entityName}`}
            >
              <defs>
                <linearGradient id="trend-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--data, #11675f)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--data, #11675f)" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Background Guide Lines */}
              <line x1="20" y1="20" x2="780" y2="20" stroke="var(--line, #c9c5bc)" strokeDasharray="3 3" opacity="0.4" />
              <line x1="20" y1="70" x2="780" y2="70" stroke="var(--line, #c9c5bc)" strokeDasharray="3 3" opacity="0.3" />
              <line x1="20" y1="120" x2="780" y2="120" stroke="var(--line, #c9c5bc)" opacity="0.6" />

              {/* Shaded Area */}
              <polygon points={computeTrendStats(snapshots, range, 800, 140).svgArea} fill="url(#trend-area-grad)" />

              {/* Main Line */}
              <polyline
                points={computeTrendStats(snapshots, range, 800, 140).svgPath}
                className="trend-line-path"
                fill="none"
                stroke="var(--data, #11675f)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Point Circles */}
              {computeTrendStats(snapshots, range, 800, 140).points.map((pt, idx) => {
                const isHovered = hoveredIndex === idx;
                const isLatest = idx === stats.points.length - 1;
                return (
                  <g key={pt.date}>
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1="10"
                        x2={pt.x}
                        y2="120"
                        stroke="var(--data)"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        opacity="0.8"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : isLatest ? 4.5 : 3.5}
                      className={`trend-point-circle ${isHovered ? 'hovered' : ''} ${isLatest ? 'latest' : ''}`}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Semantic HTML Date Axis */}
            <div className="trend-axis-row">
              <span className="trend-axis-date start">{stats.startDate}</span>
              <span className="trend-axis-meta">{stats.points.length} daily snapshots</span>
              <span className="trend-axis-date end">{stats.endDate}</span>
            </div>

            {/* Hover Tooltip Overlay */}
            {activePoint && (
              <div
                className="trend-tooltip"
                style={{
                  left: `${(activePoint.x / 800) * 100}%`,
                }}
              >
                <strong>{activePoint.mentions} mentions</strong>
                <span>{activePoint.formattedDate}</span>
                {activePoint.velocity !== null && (
                  <small>{activePoint.velocity > 0 ? '+' : ''}{activePoint.velocity.toFixed(1)}% DoD</small>
                )}
              </div>
            )}
          </div>
        )}

        {/* Why it's trending breakdown (Prompt 3) */}
        {contributingStories.length > 0 && (
          <div className="trending-breakdown">
            <header className="trending-breakdown-header">
              <h3>Why it’s trending</h3>
              <p>Top coverage contributing to {entityName}’s mention activity</p>
            </header>
            <ol className="trending-stories-list">
              {contributingStories.slice(0, 3).map((story, index) => (
                <li key={story.id} className="trending-story-item">
                  <span className="contributor-rank">{index + 1}</span>
                  <div className="contributor-content">
                    <h4>
                      {story.isExternal ? (
                        <a href={story.href} target="_blank" rel="noopener noreferrer">
                          {story.title} <ArrowUpRight size={14} className="inline-icon" />
                        </a>
                      ) : (
                        <Link href={story.href}>{story.title}</Link>
                      )}
                    </h4>
                    <div className="contributor-meta">
                      <span className="source-badge">
                        {story.sourceCount} {story.sourceCount === 1 ? 'source' : 'sources'}
                      </span>
                      {story.domain && <span className="domain-label">{story.domain}</span>}
                      <time dateTime={story.publishedAt}>
                        {new Date(story.publishedAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
