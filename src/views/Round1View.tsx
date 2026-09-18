import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Info,
  Building,
} from 'lucide-react';
import { Contestant, Judge, ScoreRecord } from '../types.ts';
import { INITIAL_REGIONS } from '../data/initialData.ts';
import { ScoreSelector } from '../components/ScoreSelector.tsx';
import { ContestantModal } from '../components/ContestantModal.tsx';
import {
  calculateContestantScores,
  getJudgeScoreForContestant,
  getJudgeNotesForContestant,
} from '../utils/scoreUtils.ts';

interface Round1ViewProps {
  contestants: Contestant[];
  judges: Judge[];
  scores: ScoreRecord[];
  activeJudgeId: string;
  onSaveScore: (contestantId: string, round: number, score: number, notes?: string, customJudgeId?: string) => Promise<void>;
  onSaveBatchScores?: (batch: { contestantId: string; round: number; judgeId?: string; score: number; notes?: string }[]) => Promise<void>;
  onOpenJudgeSelector: () => void;
  onUpdateContestant?: (id: string, data: Partial<Contestant>) => Promise<void>;
}

export const Round1View: React.FC<Round1ViewProps> = ({
  contestants,
  judges,
  scores,
  activeJudgeId,
  onSaveScore,
  onSaveBatchScores,
  onOpenJudgeSelector,
  onUpdateContestant,
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState<number>(1);
  const [selectedContestantForModal, setSelectedContestantForModal] = useState<Contestant | null>(null);

  // Local state for pending scores & notes before saving
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Clear pending input buffers when the active judge switches
  useEffect(() => {
    setLocalScores({});
    setLocalNotes({});
    setSavingStatus({});
    setValidationErrors({});
  }, [activeJudgeId]);

  const currentJudge = judges.find((j) => j.id === activeJudgeId) || judges[0];

  // 3 contestants in the currently selected region
  const regionContestants = contestants.filter((c) => c.regionId === selectedRegionId);
  const currentRegionMeta = INITIAL_REGIONS.find((r) => r.id === selectedRegionId) || INITIAL_REGIONS[0];

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
    const existingScore = getJudgeScoreForContestant(contestantId, 1, activeJudgeId, scores);
    const scoreToSave = localScores[contestantId] !== undefined ? localScores[contestantId] : existingScore;

    if (scoreToSave === null || scoreToSave === undefined) {
      setValidationErrors((prev) => ({
        ...prev,
        [contestantId]: 'Vui lòng chọn điểm từ 1 đến 10 trước khi lưu.',
      }));
      return;
    }

    const existingNotes = getJudgeNotesForContestant(contestantId, 1, activeJudgeId, scores);
    const notesToSave = localNotes[contestantId] !== undefined ? localNotes[contestantId] : existingNotes;

    setSavingStatus((prev) => ({ ...prev, [contestantId]: 'saving' }));
    try {
      await onSaveScore(contestantId, 1, scoreToSave, notesToSave, activeJudgeId);
      // Clean up local buffers since it is now synchronized with authoritative state
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

  const handleSaveAllInRegion = async () => {
    const itemsToSave: { contestantId: string; round: number; judgeId?: string; score: number; notes?: string }[] = [];
    
    for (const contestant of regionContestants) {
      const existingScore = getJudgeScoreForContestant(contestant.id, 1, activeJudgeId, scores);
      const scoreToSave = localScores[contestant.id] !== undefined ? localScores[contestant.id] : existingScore;
      if (scoreToSave !== null && scoreToSave !== undefined) {
        const existingNotes = getJudgeNotesForContestant(contestant.id, 1, activeJudgeId, scores);
        const notesToSave = localNotes[contestant.id] !== undefined ? localNotes[contestant.id] : existingNotes;
        itemsToSave.push({
          contestantId: contestant.id,
          round: 1,
          judgeId: activeJudgeId,
          score: scoreToSave,
          notes: notesToSave,
        });
      }
    }

    if (itemsToSave.length === 0) {
      alert('Chưa có điểm nào được chọn cho các thí sinh trong khu vực này.');
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
      // Clear pending
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
      {/* Header & Judge Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-[#002e75] to-[#0042A3] text-white p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-blue-200 text-xs font-bold border border-white/20 mb-2">
            <Users className="w-3.5 h-3.5 text-blue-200" />
            Vòng 1
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Vòng 1
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Mỗi khu vực gồm 3 thí sinh. Giám khảo chấm điểm từ 1 đến 10 cho từng thí sinh và nhấn "Lưu điểm".
            Hệ thống sẽ tự động tổng hợp điểm của tất cả giám khảo.
          </p>
        </div>

        {/* Current Judge info pill */}
        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 flex items-center gap-3 shrink-0">
          <img
            src={currentJudge?.avatar}
            alt={currentJudge?.name}
            className="w-11 h-11 rounded-xl object-cover border border-white/40"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="text-[10px] uppercase font-bold text-blue-200">
              Đang chấm bằng tài khoản:
            </div>
            <div className="text-sm font-extrabold text-white">
              {currentJudge?.name} ({currentJudge?.code})
            </div>
            <button
              type="button"
              id="round1-switch-judge-btn"
              onClick={onOpenJudgeSelector}
              className="text-[11px] text-blue-200 hover:text-white underline cursor-pointer font-semibold"
            >
              Đổi giám khảo khác
            </button>
          </div>
        </div>
      </div>

      {/* Region Buttons (Nút khu vực) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#0042A3]" />
            Chọn nút khu vực thi đấu (Mỗi khu vực có 3 thí sinh):
          </label>
          <span className="text-xs font-semibold text-slate-500">
            Khu vực {selectedRegionId} / 8
          </span>
        </div>

        {/* Responsive buttons grid for 8 regions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {INITIAL_REGIONS.map((region) => {
            const isSelected = region.id === selectedRegionId;
            const regionContestants = contestants.filter((c) => c.regionId === region.id);
            // Count how many of these 3 contestants the current judge has scored
            const scoredCount = regionContestants.filter((c) =>
              scores.some((s) => s.contestantId === c.id && s.round === 1 && s.judgeId === activeJudgeId)
            ).length;

            return (
              <button
                key={region.id}
                type="button"
                id={`region-btn-${region.id}`}
                onClick={() => setSelectedRegionId(region.id)}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[88px] ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white border-[#00388A] shadow-md ring-2 ring-blue-200 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-medium'
                }`}
              >
                <span className={`text-[11px] leading-snug line-clamp-2 text-center font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {region.name}
                </span>
                <span
                  className={`mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    scoredCount === 3
                      ? isSelected
                        ? 'bg-emerald-400 text-slate-900'
                        : 'bg-emerald-100 text-emerald-800'
                      : isSelected
                      ? 'bg-blue-900 text-blue-100'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {scoredCount}/3 Đã chấm
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Region Header Banner */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0042A3] to-[#0060E6] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
            #{selectedRegionId}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {currentRegionMeta.name}
            </h2>
            <p className="text-xs text-slate-600">
              Đang hiển thị 3 thí sinh đại diện cho khu vực / đơn vị này
            </p>
          </div>
        </div>

        {/* Region Navigation shortcuts & Batch Save */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="save-all-region-btn"
            disabled={isSavingAll}
            onClick={handleSaveAllInRegion}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isSavingAll ? 'Đang lưu cả khu vực...' : 'Lưu cả 3 thí sinh KV này'}
          </button>
          <button
            type="button"
            id="prev-region-btn"
            disabled={selectedRegionId === 1}
            onClick={() => setSelectedRegionId((prev) => Math.max(1, prev - 1))}
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Khu vực trước
          </button>
          <button
            type="button"
            id="next-region-btn"
            disabled={selectedRegionId === 8}
            onClick={() => setSelectedRegionId((prev) => Math.min(8, prev + 1))}
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            Khu vực kế tiếp <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Contestants of the Region */}
      <div className="space-y-6">
        {regionContestants.map((contestant, index) => {
          const currentJudgeScore = getJudgeScoreForContestant(contestant.id, 1, activeJudgeId, scores);
          const currentJudgeNotes = getJudgeNotesForContestant(contestant.id, 1, activeJudgeId, scores);
          const scoreValue =
            localScores[contestant.id] !== undefined ? localScores[contestant.id] : currentJudgeScore;
          const notesValue =
            localNotes[contestant.id] !== undefined ? localNotes[contestant.id] : currentJudgeNotes;

          const summary = calculateContestantScores(contestant.id, scores);
          const status = savingStatus[contestant.id] || 'idle';

          return (
            <div
              key={contestant.id}
              id={`round1-contestant-card-${contestant.id}`}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 sm:p-6"
            >
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Left: Avatar & Candidate Info */}
                <div className="w-full lg:w-72 shrink-0 flex flex-col sm:flex-row lg:flex-col gap-4">
                  <div className="relative">
                    <img
                      src={contestant.avatar}
                      alt={contestant.name}
                      className="w-full sm:w-44 lg:w-full h-52 sm:h-44 lg:h-56 rounded-2xl object-cover bg-slate-100 border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-900/80 text-white backdrop-blur-md">
                      {contestant.sbd}
                    </span>
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#0042A3] text-white">
                      Thí sinh #{index + 1}/3
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                      {contestant.name}
                    </h3>
                    <p className="text-xs font-bold text-[#0042A3]">
                      {contestant.title}
                    </p>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{contestant.department}</span>
                    </div>

                    <button
                      type="button"
                      id={`view-profile-btn-${contestant.id}`}
                      onClick={() => setSelectedContestantForModal(contestant)}
                      className="mt-2 text-xs font-bold text-[#0042A3] hover:text-[#00388A] underline flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" /> Xem hồ sơ & tiểu sử chi tiết
                    </button>
                  </div>
                </div>

                {/* Right: Scoring Pad & Auto-Calculations */}
                <div className="flex-1 w-full space-y-5">
                  {/* Score selector 1 - 10 */}
                  <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200">
                    <ScoreSelector
                      contestantId={contestant.id}
                      value={scoreValue}
                      onChange={(val) => handleScoreSelect(contestant.id, val)}
                    />

                    {validationErrors[contestant.id] && (
                      <div className="mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        {validationErrors[contestant.id]}
                      </div>
                    )}

                    {/* Judge notes */}
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Nhận xét / Ghi chú của {currentJudge?.code} (tùy chọn):
                      </label>
                      <input
                        type="text"
                        id={`notes-input-${contestant.id}`}
                        value={notesValue}
                        onChange={(e) => handleNotesChange(contestant.id, e.target.value)}
                        placeholder="Nhập nhận xét về phần trình bày, thái độ, tư duy..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0042A3] bg-white"
                      />
                    </div>

                    {/* Save Button for this contestant */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        {currentJudgeScore !== null ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {currentJudge?.code} đã lưu: {currentJudgeScore} điểm
                            {localScores[contestant.id] !== undefined && localScores[contestant.id] !== currentJudgeScore && (
                              <span className="text-amber-700 font-bold ml-1 text-xs">
                                (Đang chọn {localScores[contestant.id]} chưa lưu)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            {currentJudge?.code} chưa lưu điểm cho thí sinh này
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        id={`save-score-btn-${contestant.id}`}
                        disabled={status === 'saving'}
                        onClick={() => handleSaveContestantScore(contestant.id)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
                          status === 'saved'
                            ? 'bg-emerald-600 text-white'
                            : localScores[contestant.id] !== undefined && localScores[contestant.id] !== currentJudgeScore
                            ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                            : 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white active:scale-95'
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        {status === 'saving'
                          ? 'Đang lưu điểm...'
                          : status === 'saved'
                          ? 'Đã lưu điểm thành công!'
                          : localScores[contestant.id] !== undefined && localScores[contestant.id] !== currentJudgeScore
                          ? 'Lưu điểm vừa chọn'
                          : currentJudgeScore !== null
                          ? 'Lưu lại điểm'
                          : 'Lưu Điểm Cho Thí Sinh Này'}
                      </button>
                    </div>
                  </div>

                  {/* Auto Calculated Summary Display (Tính tổng điểm tự động) */}
                  <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      Tổng hợp điểm tự động từ Ban Giám Khảo (Vòng 1):
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                        <div className="text-[11px] text-slate-500 font-medium">Điểm Bạn Đã Chấm</div>
                        <div className="text-xl font-black text-[#0042A3] mt-0.5">
                          {scoreValue !== null ? `${scoreValue}/10` : '0/10'}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100">
                        <div className="text-[11px] text-slate-500 font-medium">Điểm TB Ban Giám Khảo</div>
                        <div className="text-xl font-black text-[#0042A3] mt-0.5">
                          {summary.round1Count > 0 ? `${summary.round1Average} / 10` : '0/10'}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                        <div className="text-[11px] text-slate-500 font-medium">Tổng Điểm Tích Lũy</div>
                        <div className="text-xl font-black text-amber-700 mt-0.5">
                          {summary.round1Total} điểm
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] text-slate-500 font-medium">Tiến Độ Chấm Thi</div>
                        <div className="text-xl font-black text-slate-800 mt-0.5">
                          {summary.round1Count}/10 GK
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Region Switcher Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
        <button
          type="button"
          disabled={selectedRegionId === 1}
          onClick={() => setSelectedRegionId((prev) => Math.max(1, prev - 1))}
          className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Về Khu Vực {selectedRegionId - 1}
        </button>

        <span className="text-xs font-bold text-slate-600">
          Hoàn tất chấm cho 3 thí sinh tại {currentRegionMeta.name}
        </span>

        <button
          type="button"
          disabled={selectedRegionId === 8}
          onClick={() => setSelectedRegionId((prev) => Math.min(8, prev + 1))}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
        >
          Sang Khu Vực Tiếp Theo {selectedRegionId < 8 ? selectedRegionId + 1 : ''} <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Contestant Modal */}
      <ContestantModal
        contestant={selectedContestantForModal}
        scores={scores}
        onClose={() => setSelectedContestantForModal(null)}
        onUpdateContestant={onUpdateContestant}
      />
    </div>
  );
};
