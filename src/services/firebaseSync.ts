import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { Contestant, Judge, ScoreRecord } from '../types.ts';
import { INITIAL_CONTESTANTS, INITIAL_JUDGES, INITIAL_SCORES } from '../data/initialData.ts';

const CONTESTANTS_COL = 'contestants';
const JUDGES_COL = 'judges';
const SCORES_COL = 'scores';
const META_COL = 'meta';

/**
 * Initializes Cloud Firestore database with seed data if currently empty.
 */
export async function initializeFirestoreIfEmpty(): Promise<void> {
  try {
    const contestantSnap = await getDocs(collection(db, CONTESTANTS_COL));
    if (contestantSnap.empty) {
      console.log('[Firestore] Empty cloud database detected. Seeding initial data...');
      const batch = writeBatch(db);

      // Seed contestants
      INITIAL_CONTESTANTS.forEach((c) => {
        const ref = doc(db, CONTESTANTS_COL, c.id);
        batch.set(ref, c);
      });

      // Seed judges
      INITIAL_JUDGES.forEach((j) => {
        const ref = doc(db, JUDGES_COL, j.id);
        batch.set(ref, j);
      });

      // Seed scores
      INITIAL_SCORES.forEach((s) => {
        const ref = doc(db, SCORES_COL, s.id);
        batch.set(ref, s);
      });

      // Meta
      const metaRef = doc(db, META_COL, 'state');
      batch.set(metaRef, {
        activeJudgeId: 'GK01',
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
      console.log('[Firestore] Initial seed data committed successfully.');
    }
  } catch (err) {
    console.error('[Firestore] Error initializing database:', err);
  }
}

/**
 * Real-time listener for contestants across all devices.
 */
export function subscribeToContestants(
  callback: (contestants: Contestant[]) => void
): () => void {
  const colRef = collection(db, CONTESTANTS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) return;
      const list: Contestant[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Contestant);
      });
      // Sort stably by SBD
      list.sort((a, b) => a.sbd.localeCompare(b.sbd));
      callback(list);
    },
    (error) => {
      console.error('[Firestore] Error in contestants subscription:', error);
    }
  );
}

/**
 * Real-time listener for judges across all devices.
 */
export function subscribeToJudges(
  callback: (judges: Judge[]) => void
): () => void {
  const colRef = collection(db, JUDGES_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) return;
      const list: Judge[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Judge);
      });
      list.sort((a, b) => a.id.localeCompare(b.id));
      callback(list);
    },
    (error) => {
      console.error('[Firestore] Error in judges subscription:', error);
    }
  );
}

/**
 * Real-time listener for score records across all devices.
 */
export function subscribeToScores(
  callback: (scores: ScoreRecord[]) => void
): () => void {
  const colRef = collection(db, SCORES_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ScoreRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ScoreRecord);
      });
      callback(list);
    },
    (error) => {
      console.error('[Firestore] Error in scores subscription:', error);
    }
  );
}

/**
 * Updates a contestant profile in Firestore (name, avatar, title, etc.)
 */
export async function updateContestantInFirestore(
  id: string,
  data: Partial<Contestant>
): Promise<void> {
  const ref = doc(db, CONTESTANTS_COL, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  // Also bump global meta
  await updateDoc(doc(db, META_COL, 'state'), {
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Updates a judge in Firestore (name, avatar, title, etc.)
 */
export async function updateJudgeInFirestore(
  id: string,
  data: Partial<Judge>
): Promise<void> {
  const ref = doc(db, JUDGES_COL, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, META_COL, 'state'), {
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Adds or updates a single score in Firestore
 */
export async function saveScoreInFirestore(score: ScoreRecord): Promise<void> {
  const ref = doc(db, SCORES_COL, score.id);
  await setDoc(ref, {
    ...score,
    timestamp: new Date().toISOString(),
  });
  await updateDoc(doc(db, META_COL, 'state'), {
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Batch saves multiple scores in Firestore (e.g. for Round 1 or 4)
 */
export async function saveBatchScoresInFirestore(scores: ScoreRecord[]): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  scores.forEach((s) => {
    const ref = doc(db, SCORES_COL, s.id);
    batch.set(ref, { ...s, timestamp: now });
  });
  const metaRef = doc(db, META_COL, 'state');
  batch.set(metaRef, { updatedAt: now }, { merge: true });
  await batch.commit();
}

/**
 * Resets all scores in Firestore
 */
export async function resetAllScoresInFirestore(unhideAllContestants = false): Promise<void> {
  const scoreSnap = await getDocs(collection(db, SCORES_COL));
  const batch = writeBatch(db);
  scoreSnap.forEach((d) => {
    batch.delete(d.ref);
  });

  if (unhideAllContestants) {
    const contestantSnap = await getDocs(collection(db, CONTESTANTS_COL));
    contestantSnap.forEach((d) => {
      batch.update(d.ref, { hidden: false });
    });
  }

  const metaRef = doc(db, META_COL, 'state');
  batch.set(metaRef, { updatedAt: new Date().toISOString() }, { merge: true });
  await batch.commit();
}

/**
 * Resets full contest to original sample data in Firestore
 */
export async function resetFullContestInFirestore(): Promise<void> {
  const batch = writeBatch(db);

  // Clear existing
  const [cSnap, jSnap, sSnap] = await Promise.all([
    getDocs(collection(db, CONTESTANTS_COL)),
    getDocs(collection(db, JUDGES_COL)),
    getDocs(collection(db, SCORES_COL)),
  ]);

  cSnap.forEach((d) => batch.delete(d.ref));
  jSnap.forEach((d) => batch.delete(d.ref));
  sSnap.forEach((d) => batch.delete(d.ref));

  // Seed default
  INITIAL_CONTESTANTS.forEach((c) => {
    batch.set(doc(db, CONTESTANTS_COL, c.id), c);
  });
  INITIAL_JUDGES.forEach((j) => {
    batch.set(doc(db, JUDGES_COL, j.id), j);
  });
  INITIAL_SCORES.forEach((s) => {
    batch.set(doc(db, SCORES_COL, s.id), s);
  });

  batch.set(doc(db, META_COL, 'state'), {
    activeJudgeId: 'GK01',
    updatedAt: new Date().toISOString(),
  });

  await batch.commit();
}
