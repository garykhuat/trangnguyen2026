import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Search,
  Printer,
  ChevronDown,
  Building,
  CheckCircle2,
  EyeOff,
  Flame,
} from 'lucide-react';
import { Contestant, Judge, ScoreRecord } from '../types.ts';
import { calculateContestantScores } from '../utils/scoreUtils.ts';
import { ContestantModal } from '../components/ContestantModal.tsx';

interface LeaderboardViewProps {
  contestants: Contestant[];
  scores: ScoreRecord[];
  judges?: Judge[];
  onToggleHidden: (id: string, currentHidden: boolean) => Promise<void>;
  onUpdateContestant?: (id: string, data: Partial<Contestant>) => Promise<void>;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  contestants,
  scores,
  judges = [],
  onToggleHidden,
  onUpdateContestant,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(null);

  const activeJudges = useMemo(() => judges.filter((j) => !j.hidden), [judges]);
  const activeJudgeIds = useMemo(() => activeJudges.map((j) => j.id), [activeJudges]);

  // Compute and rank all contestants by overall total score descending based on active judges
  const rankedContestants = useMemo(() => {
    const list = contestants.map((c) => {
      const summary = calculateContestantScores(c.id, scores, activeJudgeIds);
      return {
        contestant: c,
        summary,
      };
    });

    list.sort((a, b) => b.summary.overallTotal - a.summary.overallTotal);
    return list;
  }, [contestants, scores, activeJudgeIds]);

  const filteredRanked = useMemo(() => {
    return rankedContestants.filter(({ contestant }) => {
      const matchesSearch =
        contestant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contestant.sbd.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contestant.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contestant.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !contestant.hidden) ||
        (statusFilter === 'hidden' && contestant.hidden);

      return matchesSearch && matchesStatus;
    });
  }, [rankedContestants, searchQuery, statusFilter]);

  const top3 = rankedContestants.slice(0, 3);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Title & Podium Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#002e75] to-[#0042A3] text-white p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            BẢNG XẾP HẠNG & TỔNG HỢP TOÀN BỘ ĐIỂM SỐ
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bảng Tổng Sắp Cuộc Thi
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Tổng hợp tự động điểm trung bình từ {activeJudges.length} Giám Khảo đang hoạt động và Ban Tổ Chức qua Vòng 1, Vòng 2, Vòng 3, Vòng 4.
          </p>
        </div>

        <button
          type="button"
          id="print-leaderboard-btn"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-white/20 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          In Bảng Điểm
        </button>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Top 2: Á quân 1 */}
        {top3[1] && (
          <div
            id="podium-top-2"
            onClick={() => setSelectedContestant(top3[1].contestant)}
            className="order-2 md:order-1 bg-white rounded-3xl border-2 border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-3 py-1 bg-slate-300 text-slate-800 font-black text-xs rounded-bl-2xl flex items-center gap-1">
              <Medal className="w-3.5 h-3.5 text-slate-600" /> TOP 2 • Á QUÂN 1
            </div>

            <div className="flex items-center gap-3.5 mt-2">
              <img
                src={top3[1].contestant.avatar}
                alt={top3[1].contestant.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-300 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-slate-500">
                  {top3[1].contestant.sbd}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 truncate">
                  {top3[1].contestant.name}
                </h3>
                <p className="text-xs text-[#0042A3] font-semibold truncate">
                  {top3[1].contestant.title}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Tổng điểm:</span>
              <span className="text-xl font-black text-slate-800">
                {top3[1].summary.overallTotal} đ
              </span>
            </div>
          </div>
        )}

        {/* Top 1: Quán quân */}
        {top3[0] && (
          <div
            id="podium-top-1"
            onClick={() => setSelectedContestant(top3[0].contestant)}
            className="order-1 md:order-2 bg-gradient-to-b from-amber-50 to-white rounded-3xl border-2 border-amber-400 p-5 flex flex-col justify-between shadow-md hover:shadow-lg transition-all cursor-pointer relative overflow-hidden transform md:-translate-y-2"
          >
            <div className="absolute top-0 right-0 px-3.5 py-1 bg-amber-400 text-amber-950 font-black text-xs rounded-bl-2xl flex items-center gap-1 shadow-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-900" /> TOP 1 • QUÁN QUÂN
            </div>

            <div className="flex items-center gap-3.5 mt-2">
              <img
                src={top3[0].contestant.avatar}
                alt={top3[0].contestant.name}
                className="w-20 h-20 rounded-2xl object-cover border-3 border-amber-400 shadow-md ring-2 ring-amber-200"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-amber-700">
                  {top3[0].contestant.sbd}
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 truncate">
                  {top3[0].contestant.name}
                </h3>
                <p className="text-xs text-amber-800 font-bold truncate">
                  {top3[0].contestant.title}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-between">
              <span className="text-xs text-amber-900 font-bold">Tổng điểm chung cuộc:</span>
              <span className="text-2xl font-black text-amber-600">
                {top3[0].summary.overallTotal} đ
              </span>
            </div>
          </div>
        )}

        {/* Top 3: Á quân 2 */}
        {top3[2] && (
          <div
            id="podium-top-3"
            onClick={() => setSelectedContestant(top3[2].contestant)}
            className="order-3 md:order-3 bg-white rounded-3xl border-2 border-amber-700/30 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-3 py-1 bg-amber-700/20 text-amber-900 font-black text-xs rounded-bl-2xl flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-800" /> TOP 3 • Á QUÂN 2
            </div>

            <div className="flex items-center gap-3.5 mt-2">
              <img
                src={top3[2].contestant.avatar}
                alt={top3[2].contestant.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-700/40 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-slate-500">
                  {top3[2].contestant.sbd}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 truncate">
                  {top3[2].contestant.name}
                </h3>
                <p className="text-xs text-[#0042A3] font-semibold truncate">
                  {top3[2].contestant.title}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Tổng điểm:</span>
              <span className="text-xl font-black text-slate-800">
                {top3[2].summary.overallTotal} đ
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="search-leaderboard-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm thí sinh trong bảng xếp hạng..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            id="status-leaderboard-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
          >
            <option value="all">Tất cả ({rankedContestants.length} thí sinh)</option>
            <option value="active">Đang đi tiếp ({rankedContestants.filter(r => !r.contestant.hidden).length})</option>
            <option value="hidden">Đã bị loại/ẩn ({rankedContestants.filter(r => r.contestant.hidden).length})</option>
          </select>
        </div>
      </div>

      {/* Full Detailed Standings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-3 text-center w-16">Hạng</th>
                <th className="py-3 px-4">Thí Sinh</th>
                <th className="py-3 px-3 text-center">Vòng 1</th>
                <th className="py-3 px-3 text-center">Vòng 2</th>
                <th className="py-3 px-3 text-center">Vòng 3</th>
                <th className="py-3 px-3 text-center">Vòng 4</th>
                <th className="py-3 px-4 text-center font-black text-[#0042A3]">Tổng Điểm</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRanked.map(({ contestant, summary }, index) => {
                const isTop1 = index === 0;
                const isTop2 = index === 1;
                const isTop3 = index === 2;

                return (
                  <tr
                    key={contestant.id}
                    id={`leaderboard-row-${contestant.id}`}
                    onClick={() => setSelectedContestant(contestant)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                      contestant.hidden ? 'opacity-65 bg-slate-50/40' : ''
                    } ${isTop1 ? 'bg-amber-50/30' : ''}`}
                  >
                    <td className="py-3 px-3 text-center font-black">
                      {isTop1 ? (
                        <span className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 inline-flex items-center justify-center text-xs shadow-xs">
                          1
                        </span>
                      ) : isTop2 ? (
                        <span className="w-8 h-8 rounded-full bg-slate-300 text-slate-800 inline-flex items-center justify-center text-xs">
                          2
                        </span>
                      ) : isTop3 ? (
                        <span className="w-8 h-8 rounded-full bg-amber-700 text-white inline-flex items-center justify-center text-xs">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">#{index + 1}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={contestant.avatar}
                          alt={contestant.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-[#0042A3]">
                              {contestant.sbd}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {contestant.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {contestant.title} • {contestant.region}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-800 text-xs">
                        {summary.round1Count > 0 ? `${summary.round1Average}` : '0'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {summary.round1Count}/10 GK
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-800 text-xs">
                        {summary.round2Score > 0 ? `${summary.round2Score}` : '0'}
                      </div>
                      <div className="text-[10px] text-slate-400">Điểm BTC</div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-800 text-xs">
                        {summary.round3Count > 0 ? `${summary.round3Average}` : '0'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {summary.round3Count > 0 ? `${summary.round3Count}/10 GK` : '-'}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-800 text-xs">
                        {summary.round4Count > 0 ? `${summary.round4Average}` : '0'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {summary.round4Count > 0 ? `${summary.round4Count}/10 GK` : '-'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="px-3 py-1 rounded-xl bg-blue-50 text-[#0042A3] font-black text-sm border border-blue-200 inline-block">
                        {summary.overallTotal} đ
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {contestant.hidden ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Đã loại (Ẩn)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đang đi tiếp
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contestant Modal */}
      <ContestantModal
        contestant={selectedContestant}
        scores={scores}
        onClose={() => setSelectedContestant(null)}
        onToggleHidden={onToggleHidden}
        onUpdateContestant={onUpdateContestant}
      />
    </div>
  );
};
