import React from 'react';
import { X, Award, Briefcase, MapPin, Building, CheckCircle, ShieldAlert } from 'lucide-react';
import { Contestant, ScoreRecord } from '../types.ts';
import { calculateContestantScores } from '../utils/scoreUtils.ts';

interface ContestantModalProps {
  contestant: Contestant | null;
  scores: ScoreRecord[];
  totalJudgesCount?: number;
  onClose: () => void;
  onToggleHidden?: (id: string, currentHidden: boolean) => void;
  onUpdateContestant?: (id: string, data: Partial<Contestant>) => Promise<void>;
}

export const ContestantModal: React.FC<ContestantModalProps> = ({
  contestant,
  scores,
  totalJudgesCount = 5,
  onClose,
  onToggleHidden,
}) => {
  if (!contestant) return null;

  const scoreSummary = calculateContestantScores(contestant.id, scores);

  return (
    <div
      id="contestant-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="contestant-modal-content"
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[88vh] transition-all duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          id="modal-close-btn"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 w-9 h-9 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shadow-xs backdrop-blur-xs"
          aria-label="Đóng popup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 relative space-y-5">
          {/* Top Badges (SBD & Status) */}
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <span className="px-3 py-1 rounded-lg text-xs font-black tracking-wide font-mono bg-blue-50 text-[#0042A3] border border-blue-200">
              {contestant.sbd}
            </span>
            {contestant.hidden ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Đã bị ẩn / Loại khỏi Vòng 3 & 4
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Đang tham gia thi đấu
              </span>
            )}
          </div>

          {/* Avatar and Primary Info - Large portrait photo & responsive layout */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 pb-5 border-b border-slate-100">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <img
                src={contestant.avatar}
                alt={contestant.name}
                className="w-44 h-56 sm:w-48 sm:h-64 md:w-56 md:h-72 rounded-2xl object-cover border-2 border-slate-200 shadow-md bg-slate-100"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 w-full text-center sm:text-left flex flex-col justify-center">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                {contestant.name}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[#0042A3] font-bold text-sm sm:text-base mt-2">
                <Briefcase className="w-4 h-4 text-[#0042A3] shrink-0" />
                <span>{contestant.title}</span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-slate-500 text-xs sm:text-sm mt-2">
                <span className="flex items-center gap-1 font-medium">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {contestant.department}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {contestant.region}
                </span>
              </div>

              {contestant.motto && (
                <div className="mt-4 pt-3.5 border-t border-slate-100">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1 text-left sm:text-left">
                    Phương châm thi đấu:
                  </div>
                  <blockquote className="border-l-3 border-[#0042A3] pl-3 italic text-slate-700 text-xs sm:text-sm text-left">
                    "{contestant.motto}"
                  </blockquote>
                </div>
              )}
            </div>
          </div>

          {/* Quick Score Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-center p-2.5 rounded-xl bg-white shadow-xs border border-slate-100">
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Vòng 1</div>
              <div className="text-base sm:text-lg font-bold text-[#0042A3] mt-0.5">
                {scoreSummary.round1Count > 0 ? `${scoreSummary.round1Average}/10` : '0/10'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {scoreSummary.round1Count}/{totalJudgesCount} GK chấm
              </div>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-white shadow-xs border border-slate-100">
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Vòng 2</div>
              <div className="text-base sm:text-lg font-bold text-amber-600 mt-0.5">
                {scoreSummary.round2Score > 0 ? `${scoreSummary.round2Score}/10` : '0/10'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Điểm BTC ban hành</div>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-white shadow-xs border border-slate-100">
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Vòng 3</div>
              <div className="text-base sm:text-lg font-bold text-[#0042A3] mt-0.5">
                {scoreSummary.round3Count > 0 ? `${scoreSummary.round3Average}/10` : '0/10'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {scoreSummary.round3Count}/{totalJudgesCount} GK chấm
              </div>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-white shadow-xs border border-slate-100">
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Vòng 4</div>
              <div className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5">
                {scoreSummary.round4Count > 0 ? `${scoreSummary.round4Average}/10` : '0/10'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {scoreSummary.round4Count}/{totalJudgesCount} GK chấm
              </div>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#0042A3]" />
                Giới thiệu & Thành tích nổi bật
              </h3>
              <p className="bg-slate-50 p-4 rounded-xl text-slate-600 leading-relaxed border border-slate-100 text-xs sm:text-sm">
                {contestant.bio || 'Chưa cập nhật thông tin tiểu sử chi tiết.'}
              </p>
            </div>

            {contestant.strengths && contestant.strengths.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                  Thế mạnh chuyên môn
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contestant.strengths.map((str, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#0042A3] border border-blue-100"
                    >
                      {str}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions - Fixed footer */}
        <div className="px-4 py-3 sm:px-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {onToggleHidden && (
            <button
              type="button"
              id={`modal-toggle-hidden-${contestant.id}`}
              onClick={() => onToggleHidden(contestant.id, contestant.hidden)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                contestant.hidden
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              {contestant.hidden ? 'Bỏ ẩn (Cho phép thi Vòng 3 & 4)' : 'Ẩn thí sinh (Loại khỏi Vòng 3 & 4)'}
            </button>
          )}

          <button
            type="button"
            id="modal-close-confirm-btn"
            onClick={onClose}
            className="ml-auto px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
