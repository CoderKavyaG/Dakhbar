import Link from 'next/link';
import { Sparkles, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { computeEvidenceRichness } from '@/lib/research';

export function ResearchDossierCta({
  query,
  isSubscriber,
  storyCount,
  evidenceCount,
}: {
  query: string;
  isSubscriber: boolean;
  storyCount: number;
  evidenceCount?: number;
}) {
  if (!query.trim() || storyCount < 2) return null;

  const richness = computeEvidenceRichness(storyCount, evidenceCount);

  return (
    <div className={`research-dossier-card ${richness.isPreliminary ? 'dossier-preliminary' : ''}`}>
      <div className="dossier-card-main">
        <div className="dossier-header-row">
          {richness.tier === 'preliminary' ? (
            <Badge className="badge-preliminary">
              <AlertCircle size={12} className="inline-icon" /> Preliminary Coverage ({storyCount} stories)
            </Badge>
          ) : richness.tier === 'comprehensive' ? (
            <Badge className="badge-comprehensive">
              <Sparkles size={12} className="inline-icon" /> Comprehensive Synthesis ({storyCount} stories)
            </Badge>
          ) : (
            <Badge className="badge-research">
              <Sparkles size={12} className="inline-icon" /> Desk Research Mode ({storyCount} stories)
            </Badge>
          )}
          <span className="dossier-stories-count">
            {evidenceCount ? `${evidenceCount} sources assembled` : `${storyCount} stories indexed`}
          </span>
        </div>

        <h3 className="dossier-title">
          {richness.tier === 'preliminary'
            ? `Preliminary dossier available for “${query}” (limited coverage)`
            : richness.tier === 'comprehensive'
            ? `Generate Comprehensive Dossier for “${query}”`
            : `Generate Research Dossier for “${query}”`}
        </h3>
        <p className="dossier-description">
          {richness.tier === 'preliminary'
            ? `Synthesize available reporting into a verified brief and timeline. Note: fewer independent reports exist for this topic.`
            : `Synthesize multi-story coverage into a source-grounded Executive Brief, deterministic chronological Timeline, and verified Key Takeaways.`}
        </p>

        <div className="dossier-features-row">
          <span>
            <ShieldCheck size={13} className="inline-icon text-data" /> Source citations verified
          </span>
          <span>
            <Sparkles size={13} className="inline-icon text-data" /> 24h shared topic cache
          </span>
          {richness.isPreliminary && (
            <span className="text-muted">
              <AlertCircle size={13} className="inline-icon" /> Limited breadth
            </span>
          )}
        </div>
      </div>

      <div className="dossier-action-wrap">
        {isSubscriber ? (
          <Button asChild variant="default" className="dossier-btn">
            <Link href={`/research?q=${encodeURIComponent(query)}`}>
              {richness.tier === 'preliminary'
                ? 'Open Preliminary Dossier'
                : richness.tier === 'comprehensive'
                ? 'Open Comprehensive Dossier'
                : 'Open Research Dossier'}{' '}
              <ArrowRight size={15} className="inline-icon" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="default" className="dossier-btn">
            <Link href="/pricing">
              <Lock size={14} className="inline-icon" /> Unlock with Desk
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
