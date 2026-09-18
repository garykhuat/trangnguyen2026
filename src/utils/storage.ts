import { Contestant, Judge, ScoreRecord } from '../types.ts';

const STORAGE_KEYS = {
  CONTESTANTS: 'vpbank_contest_contestants',
  JUDGES: 'vpbank_contest_judges',
  SCORES: 'vpbank_contest_scores',
  ACTIVE_JUDGE_ID: 'active_judge_id',
  USER_ROLE: 'contest_user_role',
  LAST_UPDATED: 'vpbank_contest_last_updated',
};

/**
 * Safely parse JSON from localStorage with fallback
 */
function safeParse<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.warn(`[Storage] Failed to read "${key}" from localStorage:`, err);
    return fallback;
  }
}

/**
 * Safely stringify and write to localStorage, catching QuotaExceededError
 */
function safeSet(key: string, value: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString());
    return true;
  } catch (err: any) {
    console.warn(`[Storage] Failed to write "${key}" to localStorage:`, err);
    // If quota exceeded, attempt to clear non-essential cache or log warning
    return false;
  }
}

// ======================== Contestants ========================
export function loadStoredContestants(): Contestant[] | null {
  const data = safeParse<Contestant[] | null>(STORAGE_KEYS.CONTESTANTS, null);
  if (Array.isArray(data) && data.length > 0) {
    return data;
  }
  return null;
}

export function saveStoredContestants(contestants: Contestant[]): boolean {
  return safeSet(STORAGE_KEYS.CONTESTANTS, contestants);
}

// ======================== Judges ========================
export function loadStoredJudges(): Judge[] | null {
  const data = safeParse<Judge[] | null>(STORAGE_KEYS.JUDGES, null);
  if (Array.isArray(data) && data.length > 0) {
    return data;
  }
  return null;
}

export function saveStoredJudges(judges: Judge[]): boolean {
  return safeSet(STORAGE_KEYS.JUDGES, judges);
}

// ======================== Scores ========================
export function loadStoredScores(): ScoreRecord[] | null {
  const data = safeParse<ScoreRecord[] | null>(STORAGE_KEYS.SCORES, null);
  if (Array.isArray(data)) {
    return data;
  }
  return null;
}

export function saveStoredScores(scores: ScoreRecord[]): boolean {
  return safeSet(STORAGE_KEYS.SCORES, scores);
}

// ======================== Metadata & Reset ========================
export function getLastUpdatedTimestamp(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_UPDATED);
  } catch {
    return null;
  }
}

export function clearAllStoredContestData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONTESTANTS);
    localStorage.removeItem(STORAGE_KEYS.JUDGES);
    localStorage.removeItem(STORAGE_KEYS.SCORES);
    localStorage.removeItem(STORAGE_KEYS.LAST_UPDATED);
  } catch (err) {
    console.warn('[Storage] Error clearing contest data:', err);
  }
}
