export const EMBEDDING_DIMENSIONS = 384;

function hash(value: string, seed: number) {
  let result = seed >>> 0;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function createEmbedding(text: string): number[] {
  const tokens = text.toLocaleLowerCase('en-US').match(/[\p{L}\p{N}+#.]+/gu) ?? [];
  const features = [...tokens, ...tokens.slice(1).map((token, index) => token + '::' + tokens[index + 1])];
  const vector = Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (const feature of features) {
    const bucket = hash(feature, 2166136261) % EMBEDDING_DIMENSIONS;
    const sign = (hash(feature, 2246822519) & 1) === 0 ? 1 : -1;
    vector[bucket] += sign * (feature.includes('::') ? 1.35 : 1);
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm === 0 ? vector : vector.map(value => value / norm);
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length) throw new Error('Embedding dimensions do not match');
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

export function toVectorLiteral(vector: number[]) {
  if (vector.length !== EMBEDDING_DIMENSIONS || vector.some(value => !Number.isFinite(value))) throw new Error('Invalid embedding');
  return '[' + vector.join(',') + ']';
}

export function parseVector(value: string) {
  const parsed = value.slice(1, -1).split(',').map(Number);
  if (parsed.length !== EMBEDDING_DIMENSIONS || parsed.some(item => !Number.isFinite(item))) throw new Error('Invalid stored embedding');
  return parsed;
}
