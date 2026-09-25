const KEY = 'cat-a-pult-save-v1';
export interface Save { stars: number[]; best: number[]; muted: boolean }
export function readSave(): Save {
  const fallback: Save = { stars: Array(8).fill(0), best: Array(8).fill(0), muted: false };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    if ('stars' in raw && Array.isArray(raw.stars) && raw.stars.length === 8 && raw.stars.every(v => Number.isInteger(v) && v >= 0 && v <= 3)) fallback.stars = raw.stars;
    if ('best' in raw && Array.isArray(raw.best) && raw.best.length === 8 && raw.best.every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0)) fallback.best = raw.best;
    if ('muted' in raw && typeof raw.muted === 'boolean') fallback.muted = raw.muted;
  } catch { /* Private windows and disabled storage still support a full session. */ }
  return fallback;
}
export function writeSave(save: Save) { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* Session remains playable. */ } }
