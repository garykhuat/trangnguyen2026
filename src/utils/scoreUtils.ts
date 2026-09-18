import { ScoreRecord, ContestantRoundScoreSummary } from '../types.ts';

export function calculateContestantScores(
  contestantId: string,
  scores: ScoreRecord[],
  activeJudgeIds?: string[]
): ContestantRoundScoreSummary {
  const isJudgeActive = (judgeId: string) => {
    if (!activeJudgeIds || activeJudgeIds.length === 0) return true;
    return activeJudgeIds.includes(judgeId);
  };

  // Round 1
  const r1Scores = scores.filter(
    (s) => s.contestantId === contestantId && s.round === 1 && isJudgeActive(s.judgeId)
  );
  const r1Total = r1Scores.reduce((sum, s) => sum + Number(s.score || 0), 0);
  const r1Count = r1Scores.length;
  const round1Average = r1Count > 0 ? Number((r1Total / r1Count).toFixed(2)) : 0;

  // Round 2 (Admin input)
  const r2Scores = scores.filter((s) => s.contestantId === contestantId && s.round === 2);
  const r2Score = r2Scores.length > 0 ? Number(r2Scores[0].score || 0) : 0;

  // Round 3
  const r3Scores = scores.filter(
    (s) => s.contestantId === contestantId && s.round === 3 && isJudgeActive(s.judgeId)
  );
  const r3Total = r3Scores.reduce((sum, s) => sum + Number(s.score || 0), 0);
  const r3Count = r3Scores.length;
  const round3Average = r3Count > 0 ? Number((r3Total / r3Count).toFixed(2)) : 0;

  // Round 4
  const r4Scores = scores.filter(
    (s) => s.contestantId === contestantId && s.round === 4 && isJudgeActive(s.judgeId)
  );
  const r4Total = r4Scores.reduce((sum, s) => sum + Number(s.score || 0), 0);
  const r4Count = r4Scores.length;
  const round4Average = r4Count > 0 ? Number((r4Total / r4Count).toFixed(2)) : 0;

  // Overall Total (Sum of round average scores)
  const overallTotal = Number((round1Average + r2Score + round3Average + round4Average).toFixed(2));

  return {
    round1Average,
    round1Total: r1Total,
    round1Count: r1Count,
    round2Score: r2Score,
    round3Average,
    round3Total: r3Total,
    round3Count: r3Count,
    round4Average,
    round4Total: r4Total,
    round4Count: r4Count,
    overallTotal,
  };
}

export function getJudgeScoreForContestant(
  contestantId: string,
  round: number,
  judgeId: string,
  scores: ScoreRecord[]
): number | null {
  const match = scores.find(
    (s) => s.contestantId === contestantId && s.round === round && s.judgeId === judgeId
  );
  return match !== undefined ? match.score : null;
}

export function getJudgeNotesForContestant(
  contestantId: string,
  round: number,
  judgeId: string,
  scores: ScoreRecord[]
): string {
  const match = scores.find(
    (s) => s.contestantId === contestantId && s.round === round && s.judgeId === judgeId
  );
  return match?.notes || '';
}
