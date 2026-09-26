import { db } from './db';
import { getOperationalHealth, getPulseSnapshotHealth } from './operational-health';
import { configuredModels, getModelHealth } from './llm/catalog';

export const FREE_DAILY_LIMITS: Record<string, { rpd: number; tpd: number }> = {
  'groq:openai/gpt-oss-120b': { rpd: 1000, tpd: 100000 },
  'groq:openai/gpt-oss-20b': { rpd: 1000, tpd: 500000 },
  'groq:llama-3.1-8b-instant': { rpd: 14400, tpd: 500000 },
  'openrouter:free': { rpd: 50, tpd: 100000 },
};

export type LlmQuotaItem = {
  provider: string;
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  rpdLimit: number | null;
  tpdLimit: number | null;
  rpdPct: number;
  tpdPct: number;
  bindingConstraint: 'tpd' | 'rpd' | 'none';
};

export type LlmFeatureUsage = {
  feature: string;
  label: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export async function getAdminData(now = new Date()) {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [total, lastHour, last24Hours, items, usage, callsToday] = await Promise.all([
    db.rawDocument.count(),
    db.rawDocument.count({ where: { ingested_at: { gte: new Date(now.getTime() - 3600000) } } }),
    db.rawDocument.count({ where: { ingested_at: { gte: new Date(now.getTime() - 86400000) } } }),
    db.rawDocument.findMany({ take: 20, orderBy: [{ ingested_at: 'desc' }, { id: 'desc' }], include: { source: true } }),
    db.llmCall.groupBy({ by: ['provider', 'model'], where: { created_at: { gte: dayStart } }, _count: { _all: true }, _sum: { input_tokens: true, output_tokens: true } }),
    db.llmCall.findMany({
      where: { created_at: { gte: dayStart } },
      select: { story_id: true, input_tokens: true, output_tokens: true },
    }),
  ]);
  const configured = configuredModels().map(model => ({provider:model.name,model:model.model}));
  const keys = new Set([...configured, ...usage].map(row => `${row.provider}:${row.model}`));
  const llmQuota: LlmQuotaItem[] = [...keys].map(key => {
    const [provider, ...modelParts] = key.split(':');
    const model = modelParts.join(':');
    const row = usage.find(item => item.provider === provider && item.model === model);
    const limitObj = FREE_DAILY_LIMITS[key] ?? (provider === 'openrouter' ? FREE_DAILY_LIMITS['openrouter:free'] : null);
    const calls = row?._count._all ?? 0;
    const inputTokens = row?._sum.input_tokens ?? 0;
    const outputTokens = row?._sum.output_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;
    const rpdLimit = limitObj?.rpd ?? null;
    const tpdLimit = limitObj?.tpd ?? null;
    const rpdPct = rpdLimit ? Number(((calls / rpdLimit) * 100).toFixed(1)) : 0;
    const tpdPct = tpdLimit ? Number(((totalTokens / tpdLimit) * 100).toFixed(1)) : 0;
    const bindingConstraint: 'tpd' | 'rpd' | 'none' =
      tpdLimit && rpdLimit ? (tpdPct >= rpdPct ? 'tpd' : 'rpd') : 'none';

    return {
      provider,
      model,
      calls,
      inputTokens,
      outputTokens,
      totalTokens,
      rpdLimit,
      tpdLimit,
      rpdPct,
      tpdPct,
      bindingConstraint,
    };
  });

  const featureStats: Record<string, { label: string; calls: number; inputTokens: number; outputTokens: number }> = {
    brief: { label: 'Daily Brief Edition', calls: 0, inputTokens: 0, outputTokens: 0 },
    ask: { label: 'Ask This Story', calls: 0, inputTokens: 0, outputTokens: 0 },
    research: { label: 'Research Mode Dossier', calls: 0, inputTokens: 0, outputTokens: 0 },
  };

  for (const call of callsToday) {
    if (call.story_id?.startsWith('research:')) {
      featureStats.research.calls++;
      featureStats.research.inputTokens += call.input_tokens;
      featureStats.research.outputTokens += call.output_tokens;
    } else if (call.story_id && !call.story_id.startsWith('brief:')) {
      featureStats.ask.calls++;
      featureStats.ask.inputTokens += call.input_tokens;
      featureStats.ask.outputTokens += call.output_tokens;
    } else {
      featureStats.brief.calls++;
      featureStats.brief.inputTokens += call.input_tokens;
      featureStats.brief.outputTokens += call.output_tokens;
    }
  }

  const llmFeatures: LlmFeatureUsage[] = Object.entries(featureStats).map(([feature, val]) => ({
    feature,
    label: val.label,
    calls: val.calls,
    inputTokens: val.inputTokens,
    outputTokens: val.outputTokens,
    totalTokens: val.inputTokens + val.outputTokens,
  }));

  const [health, models, pulse] = await Promise.all([getOperationalHealth(), getModelHealth(), getPulseSnapshotHealth(now)]);
  return { total, lastHour, last24Hours, items, llmQuota, llmFeatures, dayStart, health, models, pulse };
}
