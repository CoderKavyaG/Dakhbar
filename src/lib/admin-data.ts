import { db } from './db';

const FREE_DAILY_LIMITS: Record<string, number> = {
  'groq:llama-3.1-8b-instant': 14400,
  'groq:openai/gpt-oss-120b': 1000,
  'groq:openai/gpt-oss-20b': 1000,
  'openrouter:free': 50,
};

export async function getAdminData(now = new Date()) {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [total, lastHour, last24Hours, items, usage] = await Promise.all([
    db.rawDocument.count(),
    db.rawDocument.count({ where: { ingested_at: { gte: new Date(now.getTime() - 3600000) } } }),
    db.rawDocument.count({ where: { ingested_at: { gte: new Date(now.getTime() - 86400000) } } }),
    db.rawDocument.findMany({ take: 20, orderBy: [{ ingested_at: 'desc' }, { id: 'desc' }], include: { source: true } }),
    db.llmCall.groupBy({ by: ['provider', 'model'], where: { created_at: { gte: dayStart } }, _count: { _all: true }, _sum: { input_tokens: true, output_tokens: true } }),
  ]);
  const configured = [
    { provider: 'groq', model: process.env.GROQ_STANDARD_MODEL ?? 'llama-3.1-8b-instant' },
    { provider: 'groq', model: process.env.GROQ_LEAD_MODEL ?? 'openai/gpt-oss-120b' },
    ...(process.env.OPENROUTER_FREE_MODEL ? [{ provider: 'openrouter', model: process.env.OPENROUTER_FREE_MODEL }] : []),
  ];
  const keys = new Set([...configured, ...usage].map(row => `${row.provider}:${row.model}`));
  const llmQuota = [...keys].map(key => {
    const [provider, ...modelParts] = key.split(':');
    const model = modelParts.join(':');
    const row = usage.find(item => item.provider === provider && item.model === model);
    const limit = FREE_DAILY_LIMITS[key] ?? (provider === 'openrouter' ? FREE_DAILY_LIMITS['openrouter:free'] : null);
    return { provider, model, calls: row?._count._all ?? 0, inputTokens: row?._sum.input_tokens ?? 0, outputTokens: row?._sum.output_tokens ?? 0, limit };
  });
  return { total, lastHour, last24Hours, items, llmQuota, dayStart };
}
