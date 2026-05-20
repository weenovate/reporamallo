import 'server-only';
import { STOPWORDS_ES } from './stopwords-es';

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function isWordCandidate(w: string): boolean {
  if (w.length < 4) return false;
  if (/^\d+$/.test(w)) return false;
  if (STOPWORDS_ES.has(w)) return false;
  if (STOPWORDS_ES.has(stripAccents(w))) return false;
  return true;
}

/**
 * Extracto: primeros N caracteres del texto plano, recortado en limite de palabra
 * y con tres puntos al final si fue truncado.
 */
export function buildExtract(text: string, maxChars: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) return cleaned;
  const slice = cleaned.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

type Candidate = { token: string; score: number; original: string };

/**
 * Tags: ranking simple por TF + bigramas frecuentes. Devuelve top-N
 * con la forma original mas comun del token.
 */
export function extractTags(text: string, count: number): string[] {
  if (!text.trim()) return [];

  // Mantenemos paragraph-level para detectar bigramas que no crucen oraciones
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const unigramScore = new Map<string, number>();
  const unigramOriginal = new Map<string, string>();
  const bigramScore = new Map<string, number>();
  const bigramOriginal = new Map<string, string>();

  for (const sentence of sentences) {
    const words = tokenize(sentence);
    const original = sentence.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (isWordCandidate(w)) {
        const key = stripAccents(w);
        unigramScore.set(key, (unigramScore.get(key) ?? 0) + 1);
        if (!unigramOriginal.has(key) && original[i]) unigramOriginal.set(key, original[i]);
      }
      if (i + 1 < words.length) {
        const w2 = words[i + 1];
        if (isWordCandidate(w) && isWordCandidate(w2)) {
          const key = `${stripAccents(w)} ${stripAccents(w2)}`;
          bigramScore.set(key, (bigramScore.get(key) ?? 0) + 1);
          if (!bigramOriginal.has(key) && original[i] && original[i + 1]) {
            bigramOriginal.set(key, `${original[i]} ${original[i + 1]}`);
          }
        }
      }
    }
  }

  const unigrams: Candidate[] = Array.from(unigramScore.entries()).map(([k, v]) => ({
    token: k,
    score: v,
    original: unigramOriginal.get(k) ?? k,
  }));
  const bigrams: Candidate[] = Array.from(bigramScore.entries())
    .filter(([, v]) => v >= 2)
    .map(([k, v]) => ({
      token: k,
      score: v * 2.2, // boost a bigramas
      original: bigramOriginal.get(k) ?? k,
    }));

  // Si un bigrama es muy frecuente, descontar sus unigramas para evitar duplicacion
  for (const bg of bigrams) {
    const [a, b] = bg.token.split(' ');
    const ua = unigrams.find((u) => u.token === a);
    const ub = unigrams.find((u) => u.token === b);
    if (ua) ua.score -= bg.score / 3;
    if (ub) ub.score -= bg.score / 3;
  }

  const all = [...unigrams, ...bigrams]
    .filter((c) => c.score > 1)
    .sort((a, b) => b.score - a.score);

  const result: string[] = [];
  const seen = new Set<string>();
  for (const c of all) {
    const label = c.original.toLowerCase();
    if (seen.has(label)) continue;
    seen.add(label);
    result.push(label);
    if (result.length >= count) break;
  }
  return result;
}
