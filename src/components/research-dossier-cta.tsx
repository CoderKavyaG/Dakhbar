import Link from 'next/link';
import {
  TabloidSparkles as Sparkles,
  TabloidLock as Lock,
  TabloidArrowRight as ArrowRight,
  TabloidShieldCheck as ShieldCheck,
  TabloidClock as Clock,
} from '@/components/pop-tabloid-icons';
import { AlertCircle } from 'lucide-react';
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
              <AlertCircle size={12} className="inline-icon" /> Early Coverage
            </Badge>
          ) : richness.tier === 'comprehensive' ? (
            <Badge className="badge-comprehensive">
              <Sparkles size={12} className="inline-icon" /> In-Depth Deep Dive
            </Badge>
          ) : (
            <Badge className="badge-research">
              <Sparkles size={12} className="inline-icon" /> Topic Deep Dive
            </Badge>
          )}
          <span className="dossier-stories-count">
            {evidenceCount
              ? `${storyCount} stories from ${evidenceCount} sources`
              : `${storyCount} stories covered`}
          </span>
        </div>

        <h3 className="dossier-title">
          {richness.tier === 'preliminary'
            ? `Early overview for “${query}”`
            : richness.tier === 'comprehensive'
            ? `Explore the complete story on “${query}”`
            : `Deep dive into “${query}”`}
        </h3>
        <p className="dossier-description">
          {richness.tier === 'preliminary'
            ? `Read an early summary and timeline from initial reporting. More sources will be added as news develops.`
            : `Get a clear summary, full timeline of reports, and key takeaways gathered across all ${storyCount} stories.`}
        </p>

        <div className="dossier-features-row">
          <span className="dossier-feature-pill">
            <ShieldCheck size={13} className="inline-icon text-data" /> Cited sources
          </span>
          <span className="dossier-feature-pill">
            <Clock size={13} className="inline-icon text-data" /> Chronological timeline
          </span>
          {richness.isPreliminary && (
            <span className="dossier-feature-pill text-muted">
              <AlertCircle size={13} className="inline-icon" /> Developing coverage
            </span>
          )}
        </div>
      </div>

      <div className="dossier-action-wrap">
        {isSubscriber ? (
          <Button asChild variant="default" className="dossier-btn">
            <Link href={`/research?q=${encodeURIComponent(query)}`}>
              Read Deep Dive <ArrowRight size={15} className="inline-icon" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="default" className="dossier-btn">
            <Link href="/pricing">
              <Lock size={14} className="inline-icon" /> Read with Desk
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
