'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Compass,
  Sparkles,
  Layers,
  Cpu,
  Server,
  Code2,
  Check,
  Search,
  ArrowRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { EntityFollowControl } from './entity-follow-control';
import { BrandMark } from './brand-mark';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

type PopularEntity = { id: string; name: string; type: string; _count: { stories: number } };

interface FollowingEmptyProps {
  entities: PopularEntity[];
}

// Curated starter pack presets
const STARTER_PACKS = [
  {
    id: 'ai-labs',
    title: 'AI & Foundation Models',
    badge: 'Popular',
    icon: Sparkles,
    description: 'Frontier labs, LLMs, fine-tuning runtimes, and agent architecture.',
    topics: ['OpenAI', 'Anthropic', 'DeepSeek', 'PyTorch', 'Hugging Face', 'Mistral AI'],
  },
  {
    id: 'modern-web',
    title: 'Modern Web & UI',
    badge: 'Frontend',
    icon: Code2,
    description: 'High-performance frameworks, JavaScript engines, and design systems.',
    topics: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Bun', 'Vue.js'],
  },
  {
    id: 'cloud-infra',
    title: 'Cloud & Distributed Systems',
    badge: 'DevOps',
    icon: Server,
    description: 'Container orchestrators, managed cloud, distributed SQL, and caching.',
    topics: ['Kubernetes', 'Docker', 'PostgreSQL', 'Redis', 'Amazon Web Services', 'Terraform'],
  },
  {
    id: 'systems-compilers',
    title: 'Systems & Runtime Security',
    badge: 'Core',
    icon: Cpu,
    description: 'Memory-safe systems programming, modern runtimes, and local databases.',
    topics: ['Rust', 'Go', 'Linux', 'SQLite', 'WebAssembly', 'C++'],
  },
];

export function FollowingEmpty({ entities }: FollowingEmptyProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Normalize and group entities
  const filteredEntities = useMemo(() => {
    return entities.filter(entity => {
      const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'ai') {
        const aiNames = ['openai', 'anthropic', 'deepseek', 'pytorch', 'hugging face', 'mistral ai', 'model context protocol', 'nvidia', 'tensorflow'];
        return aiNames.some(name => entity.name.toLowerCase().includes(name));
      }
      if (selectedCategory === 'infra') {
        const infraNames = ['kubernetes', 'docker', 'postgresql', 'redis', 'amazon', 'aws', 'sqlite', 'mysql', 'supabase', 'mongodb', 'cloudflare', 'terraform', 'prisma'];
        return infraNames.some(name => entity.name.toLowerCase().includes(name));
      }
      if (selectedCategory === 'tools') {
        const toolNames = ['react', 'next.js', 'typescript', 'tailwind', 'bun', 'deno', 'rust', 'go', 'python', 'javascript', 'vue.js', 'svelte', 'angular', 'github'];
        return toolNames.some(name => entity.name.toLowerCase().includes(name));
      }
      return true;
    });
  }, [entities, selectedCategory, searchQuery]);

  return (
    <section className="following-onboarding-shell" aria-labelledby="onboarding-heading">
      {/* Compact Editorial Header */}
      <div className="onboarding-compact-hero">
        <div className="onboarding-title-row">
          <div>
            <span className="section-note">Personal Edition Onboarding</span>
            <h2 id="onboarding-heading">Curate Your Followed Feed</h2>
          </div>
          <p className="onboarding-compact-desc">
            Follow the frameworks, companies, and platforms you rely on. As soon as you follow a topic, your personal daily edition streams here.
          </p>
        </div>
      </div>

      {/* Quick Starter Packs Section */}
      <div className="starter-packs-section">
        <div className="starter-packs-header">
          <div className="header-left">
            <Flame size={16} className="text-data inline-icon" />
            <span className="section-note">Recommended Stacks</span>
            <h3>Quick Starter Packs</h3>
          </div>
          <p>Choose an entire curated ecosystem to start your personal feed in one glance</p>
        </div>

        <div className="starter-packs-grid">
          {STARTER_PACKS.map(pack => {
            const Icon = pack.icon;
            // Find entity objects matching topics in pack
            const packEntities = entities.filter(e =>
              pack.topics.some(t => t.toLowerCase() === e.name.toLowerCase())
            );

            return (
              <div key={pack.id} className="starter-pack-card">
                <div className="pack-card-top">
                  <div className="pack-icon-title">
                    <div className="pack-icon-wrap">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 className="pack-title">{pack.title}</h4>
                      <Badge className="pack-badge">{pack.badge}</Badge>
                    </div>
                  </div>
                  <p className="pack-desc">{pack.description}</p>
                </div>

                <div className="pack-chips-grid">
                  {packEntities.map(entity => (
                    <div key={entity.id} className="pack-chip-wrap">
                      <EntityFollowControl
                        entity={{ id: entity.id, name: entity.name }}
                        returnTo="/?tab=following"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Categorized Topic Explorer */}
      <div className="topic-explorer-section">
        <div className="explorer-header">
          <div>
            <span className="section-note">Granular Customization</span>
            <h3>Explore & Follow Individual Topics</h3>
          </div>

          <div className="explorer-controls">
            {/* Search Input */}
            <div className="explorer-search-wrap">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g. React, Docker, OpenAI)..."
                className="explorer-search-input"
                aria-label="Filter topics by name"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="category-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === 'all'}
                onClick={() => setSelectedCategory('all')}
                className={`category-tab-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              >
                All ({entities.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === 'ai'}
                onClick={() => setSelectedCategory('ai')}
                className={`category-tab-btn ${selectedCategory === 'ai' ? 'active' : ''}`}
              >
                AI & Models
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === 'infra'}
                onClick={() => setSelectedCategory('infra')}
                className={`category-tab-btn ${selectedCategory === 'infra' ? 'active' : ''}`}
              >
                Cloud & Infra
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === 'tools'}
                onClick={() => setSelectedCategory('tools')}
                className={`category-tab-btn ${selectedCategory === 'tools' ? 'active' : ''}`}
              >
                Languages & Tools
              </button>
            </div>
          </div>
        </div>

        {/* Topic Grid */}
        <div className="onboarding-topic-grid">
          {filteredEntities.map(entity => (
            <div key={entity.id} className="onboarding-topic-card">
              <div className="topic-card-info">
                <EntityFollowControl
                  entity={{ id: entity.id, name: entity.name }}
                  returnTo="/?tab=following"
                />
                <span className="topic-story-count">
                  {entity._count.stories} {entity._count.stories === 1 ? 'story' : 'stories'}
                </span>
              </div>
            </div>
          ))}

          {filteredEntities.length === 0 && (
            <div className="no-topics-found">
              <p>No topics matching &quot;{searchQuery}&quot; found in this category.</p>
              <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                Reset filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation CTA */}
      <div className="onboarding-footer-cta">
        <p>Want to read breaking coverage before tailoring your topics?</p>
        <Button asChild variant="outline">
          <Link href="/">
            Explore Today&apos;s Edition <ArrowRight size={14} className="inline-icon" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
