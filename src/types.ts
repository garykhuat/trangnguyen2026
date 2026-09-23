export type UserRole = 'judge' | 'admin';

export interface Judge {
  id: string;
  code: string;
  name: string;
  title: string;
  avatar: string;
  hidden?: boolean; // Cho phép ẩn bớt giám khảo nếu cần
}

export interface Contestant {
  id: string;
  sbd: string; // Số báo danh ví dụ: SBD-001 -> SBD-024
  name: string;
  title: string; // Chức danh
  department: string; // Phòng ban
  region: string; // Khu vực 1 -> Khu vực 8 (mỗi khu vực 3 thí sinh)
  regionId: number; // 1 -> 8
  avatar: string;
  bio: string;
  strengths: string[];
  motto: string;
  hidden: boolean; // Ẩn khỏi vòng 3 và vòng 4
  statusNote?: string;
}

export interface ScoreRecord {
  id: string;
  contestantId: string;
  round: number; // 1, 2, 3, 4
  judgeId: string; // GK01 -> GK05 or ADMIN
  score: number; // 1 -> 10
  notes?: string;
  updatedAt: string;
}

export interface Round2Score {
  contestantId: string;
  score: number; // Điểm vòng 2 do BTC/Admin nhập (thang điểm 1-10)
  notes?: string;
  updatedAt: string;
}

export interface ContestantRoundScoreSummary {
  round1Average: number;
  round1Total: number;
  round1Count: number;
  round2Score: number;
  round3Average: number;
  round3Total: number;
  round3Count: number;
  round4Average: number;
  round4Total: number;
  round4Count: number;
  overallTotal: number;
}
