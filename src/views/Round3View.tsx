import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  ShieldAlert,
  Building,
  MapPin,
} from 'lucide-react';
import { Contestant, Judge, ScoreRecord } from '../types.ts';
import { ScoreSelector } from '../components/ScoreSelector.tsx';
import { ContestantModal } from '../components/ContestantModal.tsx';
import {
  calculateContestantScores,
  getJudgeScoreForContestant,
  getJudgeNotesForContestant,
} from '../utils/scoreUtils.ts';

interface Round3ViewProps {
  contestants: Contestant[];
  judges: Judge[];
  scores: ScoreRecord[];
  activeJudgeId: string;
  onSaveScore: (contestantId: string, round: number, score: number, notes?: string, customJudgeId?: string) => Promise<void>;
  onSaveBatchScores?: (batch: { contestantId: string; round: number; judgeId?: string; score: number; notes?: string }[]) => Promise<void>;
  onOpenJudgeSelector: () => void;
  onNavigateToAdmin: () => void;
  onUpdateContestant?: (id: string, data: Partial<Contestant>) => Promise<void>;
}

export const Round3View: React.FC<Round3ViewProps> = ({
  contestants,
  judges,
  scores,
  activeJudgeId,
  onSaveScore,
  onSaveBatchScores,
  onOpenJudgeSelector,
  onNavigateToAdmin,
  onUpdateContestant,
}) => {
  const [selectedContestantForModal, setSelectedContestantForModal] = useState<Contestant | null>(null);

  // Local state for pending scores & notes before saving
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Reset buffers on judge change
  useEffect(() => {
    setLocalScores({});
    setLocalNotes({});
    setSavingStatus({});
    setValidationErrors({});
  }, [activeJudgeId]);

  const activeJudges = judges.filter((j) => !j.hidden);
  const currentJudge = activeJudges.find((j) => j.id === activeJudgeId) || activeJudges[0] || judges[0];

  // CRITICAL REQUIREMENT: Thí sinh bị ẩn sẽ KHÔNG hiển thị ở trang vòng 3 (sắp xếp theo SBD)
  const qualifiedContestants = useMemo(() => {
    return contestants
      .filter((c) => !c.hidden)
      .sort((a, b) =>
        (a.sbd || '').localeCompare(b.sbd || '', undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [contestants]);
  const hiddenCount = contestants.filter((c) => c.hidden).length;

  const handleScoreSelect = (contestantId: string, score: number) => {
    setLocalScores((prev) => ({ ...prev, [contestantId]: score }));
    setSavingStatus((prev) => ({ ...prev, [contestantId]: 'idle' }));
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy[contestantId];
      return copy;
    });
  };

  const handleNotesChange = (contestantId: string, notes: string) => {
    setLocalNotes((prev) => ({ ...prev, [contestantId]: notes }));
    setSavingStatus((prev) => ({ ...prev, [contestantId]: 'idle' }));
  };

  const handleSaveContestantScore = async (contestantId: string) => {
    const existingScore = getJudgeScoreForContestant(contestantId, 3, activeJudgeId, scores);
    const scoreToSave = localScores[contestantId] !== undefined ? localScores[contestantId] : existingScore;

    if (scoreToSave === null || scoreToSave === undefined) {
      setValidationErrors((prev) => ({
        ...prev,
        [contestantId]: 'Vui lòng chọn điểm từ 1 đến 10 trước khi lưu.',
      }));
      return;
    }

    const existingNotes = getJudgeNotesForContestant(contestantId, 3, activeJudgeId, scores);
    const notesToSave = localNotes[contestantId] !== undefined ? localNotes[contestantId] : existingNotes;

    setSavingStatus((prev) => ({ ...prev, [contestantId]: 'saving' }));
    try {
      await onSaveScore(contestantId, 3, scoreToSave, notesToSave, activeJudgeId);
      setLocalScores((prev) => {
        const copy = { ...prev };
        delete copy[contestantId];
        return copy;
      });
      setLocalNotes((prev) => {
        const copy = { ...prev };
        delete copy[contestantId];
        return copy;
      });
      setSavingStatus((prev) => ({ ...prev, [contestantId]: 'saved' }));
      setTimeout(() => {
        setSavingStatus((prev) => ({ ...prev, [contestantId]: 'idle' }));
      }, 3000);
    } catch (err) {
      console.error(err);
      setSavingStatus((prev) => ({ ...prev, [contestantId]: 'error' }));
    }
  };

  const handleSaveAllRound3 = async () => {
    const itemsToSave: { contestantId: string; round: number; judgeId?: string; score: number; notes?: string }[] = [];
    
    for (const contestant of qualifiedContestants) {
      const existingScore = getJudgeScoreForContestant(contestant.id, 3, activeJudgeId, scores);
      const scoreToSave = localScores[contestant.id] !== undefined ? localScores[contestant.id] : existingScore;
      if (scoreToSave !== null && scoreToSave !== undefined) {
        const existingNotes = getJudgeNotesForContestant(contestant.id, 3, activeJudgeId, scores);
        const notesToSave = localNotes[contestant.id] !== undefined ? localNotes[contestant.id] : existingNotes;
        itemsToSave.push({
          contestantId: contestant.id,
          round: 3,
          judgeId: activeJudgeId,
          score: scoreToSave,
          notes: notesToSave,
        });
      }
    }

    if (itemsToSave.length === 0) {
      alert('Chưa có điểm nào được chọn cho Vòng 3.');
      return;
    }

    setIsSavingAll(true);
    try {
      if (onSaveBatchScores) {
        await onSaveBatchScores(itemsToSave);
      } else {
        for (const item of itemsToSave) {
          await onSaveScore(item.contestantId, item.round, item.score, item.notes, item.judgeId);
        }
      }
      setLocalScores({});
      setLocalNotes({});
      const newStatus: Record<string, 'saved'> = {};
      itemsToSave.forEach((it) => {
        newStatus[it.contestantId] = 'saved';
      });
      setSavingStatus(newStatus);
      setTimeout(() => setSavingStatus({}), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Round Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#002e75] to-[#0042A3] text-white p-5 sm:p-6 rounded-3xl shadow-sm border border-blue-900/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-blue-200 text-xs font-bold border border-white/20 mb-2">
            <Award className="w-3.5 h-3.5 text-blue-200" />
            Vòng 3
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Vòng 3
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl">
            Trang chỉ hiển thị các thí sinh xuất sắc lọt vào Vòng 3. Thí sinh bị ẩn/loại ở vòng trước đã được loại trừ tự động.
          </p>
        </div>
      </div>

      {/* Qualification Bar */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0042A3] to-[#0060E6] text-white flex items-center justify-center font-black">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900">
              Danh Sách {qualifiedContestants.length} Thí Sinh Lọt Vào Vòng 3
            </div>
            <p className="text-xs text-slate-600">
              {hiddenCount > 0
                ? `Đã loại trừ ${hiddenCount} thí sinh bị ẩn từ vòng trước.`
                : 'Hiện tại chưa có thí sinh nào bị ẩn. Quản trị viên có thể vào mục Quản trị Backend để ẩn bớt thí sinh bị loại.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {qualifiedContestants.length > 0 && (
            <button
              type="button"
              id="save-all-round3-btn"
              disabled={isSavingAll}
              onClick={handleSaveAllRound3}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSavingAll ? 'Đang lưu tất cả...' : 'Lưu toàn bộ điểm Vòng 3'}
            </button>
          )}

          <button
            type="button"
            id="round3-admin-link-btn"
            onClick={onNavigateToAdmin}
            className="px-4 py-2 rounded-xl bg-white border border-blue-200 text-[#0042A3] text-xs font-bold hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <ShieldAlert className="w-4 h-4 text-[#0042A3]" />
            Mở Quản lý Ẩn thí sinh (Backend)
          </button>
        </div>
      </div>

      {/* Contestants Grid / List for Round 3 */}
      {qualifiedContestants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-6">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Chưa có thí sinh nào trong Vòng 3</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Tất cả thí sinh đang ở trạng thái bị ẩn hoặc chưa được cấu hình.
          </p>
          <button
            type="button"
            onClick={onNavigateToAdmin}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white font-bold text-sm cursor-pointer"
          >
            Đến trang Quản trị để quản lý thí sinh
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {qualifiedContestants.map((contestant) => {
            const currentJudgeScore = getJudgeScoreForContestant(contestant.id, 3, activeJudgeId, scores);
            const currentJudgeNotes = getJudgeNotesForContestant(contestant.id, 3, activeJudgeId, scores);
            const scoreValue =
              localScores[contestant.id] !== undefined ? localScores[contestant.id] : currentJudgeScore;
            const notesValue =
              localNotes[contestant.id] !== undefined ? localNotes[contestant.id] : currentJudgeNotes;

            const summary = calculateContestantScores(contestant.id, scores);
            const status = savingStatus[contestant.id] || 'idle';
            const validationError = validationErrors[contestant.id];
            const hasUnsavedChange = localScores[contestant.id] !== undefined && localScores[contestant.id] !== currentJudgeScore;

            return (
              <div
                key={contestant.id}
                id={`round3-contestant-card-${contestant.id}`}
                className={`bg-white rounded-3xl border shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between ${
                  hasUnsavedChange
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : currentJudgeScore !== null
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Candidate Information with Image */}
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={contestant.avatar}
                      alt={contestant.name}
                      onClick={() => setSelectedContestantForModal(contestant)}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover bg-slate-100 border-2 border-blue-100 shadow-xs cursor-pointer hover:opacity-90 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-blue-50 text-[#0042A3] border border-blue-200">
                          {contestant.sbd}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          Lọt vào Vòng 3
                        </span>
                      </div>
                      <h3
                        onClick={() => setSelectedContestantForModal(contestant)}
                        className="text-lg font-extrabold text-slate-900 hover:text-[#0042A3] cursor-pointer truncate"
                      >
                        {contestant.name}
                      </h3>
                      <p className="text-xs font-bold text-[#0042A3] line-clamp-1">
                        {contestant.title}
                      </p>
                      <div className="flex flex-col gap-0.5 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 truncate">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {contestant.department}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {contestant.region}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score Selector (1-10) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-3">
                    <ScoreSelector
                      contestantId={contestant.id}
                      value={scoreValue}
                      onChange={(val) => handleScoreSelect(contestant.id, val)}
                    />

                    {validationError && (
                      <div className="mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        {validationError}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="mt-3">
                      <input
                        type="text"
                        id={`round3-notes-${contestant.id}`}
                        value={notesValue}
                        onChange={(e) => handleNotesChange(contestant.id, e.target.value)}
                        placeholder="Nhận xét của bạn cho Vòng 3 (tùy chọn)..."
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0042A3] bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom: Auto-Calculated Totals & Save Button */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  {/* Auto Calculated Summary */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="text-[10px] text-slate-500 font-medium">Bạn Đã Chấm</div>
                      <div className="text-base font-black text-[#0042A3]">
                        {scoreValue !== null ? `${scoreValue}/10` : '0/10'}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-medium">Điểm TB Vòng 3</div>
                      <div className="text-base font-black text-slate-800">
                        {summary.round3Count > 0 ? `${summary.round3Average}/10` : '0/10'}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="text-[10px] text-slate-500 font-medium">BGK Đã Chấm</div>
                      <div className="text-base font-black text-amber-700">
                        {summary.round3Count}/{activeJudges.length} GK
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs">
                      {currentJudgeScore !== null ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {currentJudge?.code} đã lưu: {currentJudgeScore}đ
                          {hasUnsavedChange && (
                            <span className="text-amber-700 font-bold ml-1 text-xs">
                              (Đang chọn {scoreValue} chưa lưu)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Chưa lưu điểm
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      id={`round3-save-btn-${contestant.id}`}
                      disabled={status === 'saving'}
                      onClick={() => handleSaveContestantScore(contestant.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        status === 'saved'
                          ? 'bg-emerald-600 text-white'
                          : hasUnsavedChange
                          ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95 shadow-sm'
                          : 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white active:scale-95 shadow-sm shadow-blue-500/20'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {status === 'saving'
                        ? 'Đang lưu...'
                        : status === 'saved'
                        ? 'Đã lưu điểm!'
                        : hasUnsavedChange
                        ? 'Lưu điểm vừa chọn'
                        : currentJudgeScore !== null
                        ? 'Lưu lại điểm'
                        : 'Lưu điểm Vòng 3'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contestant Modal */}
      <ContestantModal
        contestant={selectedContestantForModal}
        scores={scores}
        totalJudgesCount={activeJudges.length}
        onClose={() => setSelectedContestantForModal(null)}
        onUpdateContestant={onUpdateContestant}
      />
    </div>
  );
};
