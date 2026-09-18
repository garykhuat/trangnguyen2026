import { Contestant, Judge, ScoreRecord } from './types.ts';

export interface ContestDataResponse {
  contestants: Contestant[];
  judges: Judge[];
  scores: ScoreRecord[];
  activeJudgeId: string;
  updatedAt: string;
}

export async function fetchContestData(): Promise<ContestDataResponse> {
  const res = await fetch(`/api/contest?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  });
  if (!res.ok) {
    throw new Error('Không thể tải dữ liệu cuộc thi từ máy chủ.');
  }
  return res.json();
}

export async function syncDataApi(payload: {
  contestants?: Contestant[];
  judges?: Judge[];
  scores?: ScoreRecord[];
}): Promise<ContestDataResponse> {
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Lỗi khi đồng bộ dữ liệu với máy chủ.');
  }
  return res.json();
}

export async function setActiveJudgeApi(judgeId: string): Promise<void> {
  await fetch('/api/active-judge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ judgeId }),
  });
}

export async function saveScoreApi(
  contestantId: string,
  round: number,
  judgeId: string,
  score: number,
  notes?: string
): Promise<{ success: boolean; score: ScoreRecord; allScores?: ScoreRecord[] }> {
  const res = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contestantId, round, judgeId, score, notes }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Lỗi khi lưu điểm.');
  }
  return res.json();
}

export async function saveBatchScoresApi(
  scores: { contestantId: string; round: number; judgeId: string; score: number; notes?: string }[]
): Promise<{ success: boolean; count: number; savedScores: ScoreRecord[]; allScores?: ScoreRecord[] }> {
  const res = await fetch('/api/scores/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Lỗi khi lưu danh sách điểm.');
  }
  return res.json();
}

export async function saveRound2ScoresApi(
  scores: { contestantId: string; score: number; notes?: string }[]
): Promise<{ success: boolean; scores: ScoreRecord[]; allScores?: ScoreRecord[] }> {
  const res = await fetch('/api/scores/round2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Lỗi khi lưu điểm Vòng 2.');
  }
  return res.json();
}

export async function overrideScoreApi(
  contestantId: string,
  round: number,
  judgeId: string,
  newScore: number,
  notes?: string
): Promise<{ success: boolean; message: string; allScores?: ScoreRecord[] }> {
  const res = await fetch('/api/scores/override', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contestantId, round, judgeId, newScore, notes }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Lỗi khi cập nhật điểm.');
  }
  return res.json();
}

export async function toggleContestantHiddenApi(id: string, hidden?: boolean): Promise<Contestant> {
  const res = await fetch(`/api/contestants/${id}/toggle-hidden`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hidden }),
  });
  if (!res.ok) {
    throw new Error('Lỗi khi thay đổi trạng thái ẩn thí sinh.');
  }
  const data = await res.json();
  return data.contestant;
}

export async function updateContestantApi(id: string, data: Partial<Contestant>): Promise<Contestant> {
  const res = await fetch(`/api/contestants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Lỗi khi cập nhật thông tin thí sinh.');
  }
  const json = await res.json();
  return json.contestant;
}

export async function addContestantApi(data: Partial<Contestant>): Promise<Contestant> {
  const res = await fetch('/api/contestants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Lỗi khi thêm thí sinh mới.');
  }
  const json = await res.json();
  return json.contestant;
}

export async function toggleJudgeHiddenApi(
  id: string,
  hidden?: boolean
): Promise<{ judge: Judge; activeJudgeId?: string }> {
  const res = await fetch(`/api/judges/${id}/toggle-hidden`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hidden }),
  });
  if (!res.ok) {
    throw new Error('Lỗi khi thay đổi trạng thái ẩn giám khảo.');
  }
  return res.json();
}

export async function updateJudgeApi(id: string, data: Partial<Judge>): Promise<Judge> {
  const res = await fetch(`/api/judges/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Lỗi khi cập nhật thông tin giám khảo.');
  }
  const json = await res.json();
  return json.judge;
}

export async function addJudgeApi(data: Partial<Judge>): Promise<Judge> {
  const res = await fetch('/api/judges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Lỗi khi thêm giám khảo mới.');
  }
  const json = await res.json();
  return json.judge;
}

export async function resetDataApi(): Promise<void> {
  const res = await fetch('/api/reset', { method: 'POST' });
  if (!res.ok) {
    throw new Error('Lỗi khi khôi phục dữ liệu ban đầu.');
  }
}

export async function resetAllScoresApi(unhideAllContestants = false): Promise<{
  success: boolean;
  scores: ScoreRecord[];
  contestants?: Contestant[];
  message: string;
}> {
  const res = await fetch('/api/scores/reset-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unhideAllContestants }),
  });
  if (!res.ok) {
    throw new Error('Lỗi khi xóa toàn bộ điểm thí sinh.');
  }
  return res.json();
}
