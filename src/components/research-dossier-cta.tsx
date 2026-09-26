import Link from 'next/link';
import { Sparkles, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ResearchDossierCta({
  query,
  isSubscriber,
  storyCount,
}: {
  query: string;
  isSubscriber: boolean;
  storyCount: number;
}) {
  if (!query.trim() || storyCount < 2) return null;

  return (
    <div className="research-dossier-card">
      <div className="dossier-card-main">
        <div className="dossier-header-row">
          <Badge className="badge-research">
            <Sparkles size={12} className="inline-icon" /> Desk Research Mode
          </Badge>
          <span className="dossier-stories-count">{storyCount} stories assembled</span>
        </div>

        <h3 className="dossier-title">Generate Research Dossier for “{query}”</h3>
        <p className="dossier-description">
          Synthesize multi-story coverage into a source-grounded Executive Brief, deterministic
          chronological Timeline, and verified Key Takeaways.
        </p>

        <div className="dossier-features-row">
          <span>
            <ShieldCheck size={13} className="inline-icon text-data" /> Source citations verified
          </span>
          <span>
            <Sparkles size={13} className="inline-icon text-data" /> 24h shared topic cache
          </span>
        </div>
      </div>

      <div className="dossier-action-wrap">
        {isSubscriber ? (
          <Button asChild variant="default" className="dossier-btn">
            <Link href={`/research?q=${encodeURIComponent(query)}`}>
              Open Research Dossier <ArrowRight size={15} className="inline-icon" />
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
