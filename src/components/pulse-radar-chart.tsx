'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RadarDataset, RadarEntityPoint, RadarQuadrant } from '@/lib/radar';
import { QUADRANT_LABELS } from '@/lib/radar';

export function PulseRadarChart({ dataset }: { dataset: RadarDataset }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredEntity, setHoveredEntity] = useState<RadarEntityPoint | null>(null);

  const categories = [
    { slug: 'all', label: 'All Sectors' },
    { slug: 'ai-companies', label: 'AI & companies' },
    { slug: 'infrastructure', label: 'Infrastructure' },
    { slug: 'languages-tools', label: 'Languages & tools' },
  ];

  const filteredEntities = dataset.plottedEntities.filter(
    e => selectedCategory === 'all' || e.category.slug === selectedCategory
  );

  const { viewBoxWidth, viewBoxHeight } = dataset;
  const padding = { left: 40, right: 40, top: 40, bottom: 40 };
  const plotWidth = viewBoxWidth - padding.left - padding.right;
  const plotHeight = viewBoxHeight - padding.top - padding.bottom;
  const centerX = padding.left + plotWidth / 2;
  const centerY = padding.top + plotHeight / 2;

  return (
    <div className="pulse-radar-container">
      {/* Category Filter Pills */}
      <div className="radar-filter-bar">
        <span className="filter-label">Filter Sector:</span>
        <div className="radar-filter-pills">
          {categories.map(cat => {
            const count =
              cat.slug === 'all'
                ? dataset.plottedEntities.length
                : dataset.plottedEntities.filter(e => e.category.slug === cat.slug).length;
            const isActive = selectedCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                className={`radar-category-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.slug)}
              >
                {cat.label} <span className="cat-count">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Scatter Radar Chart */}
      <div className="radar-chart-wrapper">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="pulse-radar-svg"
          aria-label="Developer Pulse Radar Scatter Chart"
        >
          {/* Background Quadrant Boxes */}
          {/* Top-Left: Emerging & Accelerating (Breakout) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth / 2}
            height={plotHeight / 2}
            className="quadrant-rect quadrant-breakout"
          />
          {/* Top-Right: Established & Accelerating (Surging) */}
          <rect
            x={centerX}
            y={padding.top}
            width={plotWidth / 2}
            height={plotHeight / 2}
            className="quadrant-rect quadrant-surging"
          />
          {/* Bottom-Right: Established & Stable (Foundations) */}
          <rect
            x={centerX}
            y={centerY}
            width={plotWidth / 2}
            height={plotHeight / 2}
            className="quadrant-rect quadrant-foundations"
          />
          {/* Bottom-Left: Emerging & Stable (Niche) */}
          <rect
            x={padding.left}
            y={centerY}
            width={plotWidth / 2}
            height={plotHeight / 2}
            className="quadrant-rect quadrant-niche"
          />

          {/* Center Crosshairs */}
          <line
            x1={centerX}
            y1={padding.top}
            x2={centerX}
            y2={viewBoxHeight - padding.bottom}
            className="radar-crosshair"
          />
          <line
            x1={padding.left}
            y1={centerY}
            x2={viewBoxWidth - padding.right}
            y2={centerY}
            className="radar-crosshair"
          />

          {/* Outer Border */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            className="radar-border"
          />

          {/* Quadrant Watermark Titles */}
          <text x={padding.left + 14} y={padding.top + 22} className="quadrant-watermark">
            BREAKOUT STARS
          </text>
          <text x={viewBoxWidth - padding.right - 14} y={padding.top + 22} textAnchor="end" className="quadrant-watermark">
            SURGING LEADERS
          </text>
          <text x={viewBoxWidth - padding.right - 14} y={viewBoxHeight - padding.bottom - 12} textAnchor="end" className="quadrant-watermark">
            CORE FOUNDATIONS
          </text>
          <text x={padding.left + 14} y={viewBoxHeight - padding.bottom - 12} className="quadrant-watermark">
            NICHE & STEADY
          </text>

          {/* Axis Labels */}
          {/* X Axis Labels */}
          <text x={padding.left + 8} y={centerY - 8} className="axis-label-text">
            ← Emerging Volume
          </text>
          <text x={viewBoxWidth - padding.right - 8} y={centerY - 8} textAnchor="end" className="axis-label-text">
            Established Volume →
          </text>

          {/* Y Axis Labels */}
          <text x={centerX - 12} y={padding.top + 18} textAnchor="end" className="axis-label-text">
            ↑ Accelerating (+Velocity)
          </text>
          <text x={centerX - 12} y={viewBoxHeight - padding.bottom - 12} textAnchor="end" className="axis-label-text">
            Steady / Baseline ↓
          </text>

          {/* Plotted Entity Dots */}
          {filteredEntities.map((entity, index) => {
            const isHovered = hoveredEntity?.id === entity.id;
            const dotRadius = isHovered ? 7 : Math.min(6, Math.max(3.5, 2.5 + entity.averageDailyMentions * 0.45));

            let dotColor = 'var(--data)';
            if (entity.quadrant === 'established_accelerating') dotColor = '#16a34a'; // Green surge
            else if (entity.quadrant === 'emerging_accelerating') dotColor = '#9333ea'; // Purple breakout
            else if (entity.quadrant === 'established_stable') dotColor = '#2563eb'; // Blue foundation
            else dotColor = '#64748b'; // Slate niche

            // Show labels for all entities in sector view, or prominent/active entities in 'all' view
            const isProminent =
              selectedCategory !== 'all' ||
              entity.averageDailyMentions >= 0.8 ||
              Math.abs(entity.velocityPercent) > 0 ||
              isHovered;

            // Short label for dense chart rendering
            const displayLabel =
              entity.name === 'Model Context Protocol'
                ? 'MCP'
                : entity.name === 'Amazon Web Services'
                ? 'AWS'
                : entity.name;

            // Subtle vertical stagger for zero-velocity dense clusters
            const staggerY =
              entity.quadrant === 'emerging_stable' && entity.velocityPercent === 0
                ? ((index % 5) - 2) * 6
                : 0;

            const finalSvgY = Math.min(viewBoxHeight - padding.bottom - 14, Math.max(padding.top + 18, entity.svgY + staggerY));

            // Custom micro-adjustments for dense clusters
            let customDy = 0;
            if (entity.name === 'Model Context Protocol') {
              customDy = -8;
            } else if (entity.name === 'Microsoft') {
              customDy = 10;
            } else if (entity.name === 'Python') {
              customDy = -6;
            } else if (entity.name === 'React') {
              customDy = 6;
            } else if (entity.name === 'Meta') {
              customDy = -6;
            }

            // Flip label to left if near right boundary
            const isNearRight = entity.svgX > viewBoxWidth - padding.right - 65;
            const labelX = isNearRight ? entity.svgX - dotRadius - 5 : entity.svgX + dotRadius + 5;
            const textAnchor = isNearRight ? 'end' : 'start';

            return (
              <g
                key={entity.id}
                className="radar-entity-group"
                onMouseEnter={() => setHoveredEntity(entity)}
                onMouseLeave={() => setHoveredEntity(null)}
              >
                {/* Clickable Circle Dot */}
                <circle
                  cx={entity.svgX}
                  cy={finalSvgY}
                  r={dotRadius}
                  fill={dotColor}
                  stroke="var(--paper)"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="radar-entity-circle"
                />

                {/* Entity Name Label */}
                {isProminent && (
                  <text
                    x={labelX}
                    y={finalSvgY + 3.5 + customDy}
                    textAnchor={textAnchor}
                    className={`radar-entity-text ${isHovered ? 'hovered' : ''}`}
                  >
                    {displayLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hovered Entity Details Card Overlay */}
        {hoveredEntity && (
          <div
            className="radar-hover-card"
            style={{
              left: `${(hoveredEntity.svgX / viewBoxWidth) * 100}%`,
              top: `${(hoveredEntity.svgY / viewBoxHeight) * 100}%`,
            }}
          >
            <div className="hover-card-header">
              <span className="hover-entity-name">{hoveredEntity.name}</span>
              <Badge className="hover-quadrant-badge">
                {hoveredEntity.quadrantLabel}
              </Badge>
            </div>
            <div className="hover-card-metrics">
              <div>
                <small>7d Avg Volume</small>
                <strong>{hoveredEntity.averageDailyMentions} / day</strong>
              </div>
              <div>
                <small>Velocity</small>
                <strong className={hoveredEntity.velocityPercent > 0 ? 'pos-vel' : 'neutral-vel'}>
                  {hoveredEntity.velocityPercent > 0 ? `+${hoveredEntity.velocityPercent}%` : `${hoveredEntity.velocityPercent}%`}
                </strong>
              </div>
              <div>
                <small>Sector</small>
                <span>{hoveredEntity.category.label}</span>
              </div>
            </div>
            <Link href={`/topics/${hoveredEntity.slug}`} className="hover-topic-link">
              View Topic Intelligence <ArrowUpRight size={13} className="inline-icon" />
            </Link>
          </div>
        )}
      </div>

      {/* Quadrant Summary Grid */}
      <div className="radar-quadrants-breakdown">
        {(['established_accelerating', 'emerging_accelerating', 'established_stable', 'emerging_stable'] as RadarQuadrant[]).map(
          quadKey => {
            const info = QUADRANT_LABELS[quadKey];
            const entitiesInQuad = dataset.quadrants[quadKey].filter(
              e => selectedCategory === 'all' || e.category.slug === selectedCategory
            );

            return (
              <div key={quadKey} className={`quadrant-summary-card quad-${quadKey}`}>
                <div className="quad-card-header">
                  <div>
                    <h3>{info.title}</h3>
                    <small>{info.subtitle}</small>
                  </div>
                  <Badge className="quad-count-badge">
                    {entitiesInQuad.length}
                  </Badge>
                </div>

                <div className="quad-entities-list">
                  {entitiesInQuad.slice(0, 6).map(e => (
                    <Link key={e.id} href={`/topics/${e.slug}`} className="quad-entity-pill">
                      <span>{e.name}</span>
                      <small className={e.velocityPercent > 0 ? 'pill-pos' : 'pill-neutral'}>
                        {e.averageDailyMentions}/d · {e.velocityPercent > 0 ? `+${e.velocityPercent}%` : `${e.velocityPercent}%`}
                      </small>
                    </Link>
                  ))}
                  {entitiesInQuad.length > 6 && (
                    <span className="quad-more-text">+{entitiesInQuad.length - 6} more</span>
                  )}
                  {entitiesInQuad.length === 0 && (
                    <span className="quad-empty-text">No entities in this quadrant for selected sector</span>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
