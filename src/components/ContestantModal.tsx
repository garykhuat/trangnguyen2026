import React, { useState } from 'react';
import { X, Award, Briefcase, MapPin, Building, Star, CheckCircle, ShieldAlert, Camera, RefreshCw } from 'lucide-react';
import { Contestant, ScoreRecord } from '../types.ts';
import { calculateContestantScores } from '../utils/scoreUtils.ts';
import { processImageFile } from '../utils/imageUtils.ts';

interface ContestantModalProps {
  contestant: Contestant | null;
  scores: ScoreRecord[];
  onClose: () => void;
  onToggleHidden?: (id: string, currentHidden: boolean) => void;
  onUpdateContestant?: (id: string, data: Partial<Contestant>) => Promise<void>;
}

export const ContestantModal: React.FC<ContestantModalProps> = ({
  contestant,
  scores,
  onClose,
  onToggleHidden,
  onUpdateContestant,
}) => {
  if (!contestant) return null;

  const [uploading, setUploading] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalAvatar(null);
  }, [contestant.id]);

  const displayAvatar = localAvatar || contestant.avatar;

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const processed = await processImageFile(file, 450, 0.82);
      setLocalAvatar(processed);
      if (onUpdateContestant) {
        await onUpdateContestant(contestant.id, { avatar: processed });
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh thí sinh.');
    } finally {
      setUploading(false);
    }
  };

  const scoreSummary = calculateContestantScores(contestant.id, scores);

  return (
    <div
      id="contestant-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="contestant-modal-content"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          id="modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Đóng popup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Card Body */}
        <div className="p-6 relative">
          {/* Top Badges (SBD & Status) */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pr-12">
            <span className="px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-slate-100 text-slate-800 border border-slate-200">
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

          {/* Avatar and Primary Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5 pb-5 border-b border-slate-100">
            <div className="relative group shrink-0">
              <img
                src={displayAvatar}
                alt={contestant.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-200 shadow-sm bg-slate-100"
                referrerPolicy="no-referrer"
              />
              <label
                htmlFor={`modal-avatar-upload-${contestant.id}`}
                title="Tải ảnh mới từ máy tính / điện thoại"
                className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity backdrop-blur-[1px]"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-xs font-bold">Đổi ảnh</span>
              </label>
              <input
                id={`modal-avatar-upload-${contestant.id}`}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                disabled={uploading}
                onChange={handleUploadFile}
              />
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/80 rounded-2xl flex flex-col items-center justify-center text-white text-xs gap-1.5">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  <span className="font-semibold text-[11px]">Đang nén ảnh...</span>
                </div>
              )}
              {/* Quick upload pill button directly visible on touch / mobile */}
              <label
                htmlFor={`modal-avatar-upload-${contestant.id}`}
                className="absolute -bottom-2 -right-2 px-2.5 py-1 bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white rounded-full text-[11px] font-bold shadow-md cursor-pointer flex items-center gap-1 border-2 border-white transition-transform active:scale-95"
              >
                <Camera className="w-3 h-3" />
                <span>Tải ảnh</span>
              </label>
            </div>
            <div className="flex-1 pb-1">
              <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
                {contestant.name}
              </h2>
              <div className="flex items-center gap-1.5 text-[#0042A3] font-semibold text-sm mt-1">
                <Briefcase className="w-4 h-4 text-[#0042A3] shrink-0" />
                <span>{contestant.title}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs mt-1">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {contestant.department}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {contestant.region}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Score Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-center p-2 rounded-lg bg-white shadow-xs border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">Vòng 1</div>
              <div className="text-lg font-bold text-[#0042A3] mt-0.5">
                {scoreSummary.round1Count > 0 ? `${scoreSummary.round1Average}/10` : '0/10'}
              </div>
              <div className="text-[10px] text-slate-400">
                {scoreSummary.round1Count} Giám khảo chấm
              </div>
            </div>
            <div className="text-center p-2 rounded-lg bg-white shadow-xs border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">Vòng 2</div>
              <div className="text-lg font-bold text-amber-600 mt-0.5">
                {scoreSummary.round2Score > 0 ? `${scoreSummary.round2Score}/10` : '0/10'}
              </div>
              <div className="text-[10px] text-slate-400">Điểm BTC ban hành</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-white shadow-xs border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">Vòng 3</div>
              <div className="text-lg font-bold text-[#0042A3] mt-0.5">
                {scoreSummary.round3Count > 0 ? `${scoreSummary.round3Average}/10` : '0/10'}
              </div>
              <div className="text-[10px] text-slate-400">
                {scoreSummary.round3Count} Giám khảo chấm
              </div>
            </div>
            <div className="text-center p-2 rounded-lg bg-white shadow-xs border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">Vòng 4</div>
              <div className="text-lg font-bold text-emerald-600 mt-0.5">
                {scoreSummary.round4Count > 0 ? `${scoreSummary.round4Average}/10` : '0/10'}
              </div>
              <div className="text-[10px] text-slate-400">
                {scoreSummary.round4Count} Giám khảo chấm
              </div>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#0042A3]" />
                Giới thiệu & Thành tích nổi bật
              </h3>
              <p className="bg-slate-50 p-3.5 rounded-xl text-slate-600 leading-relaxed border border-slate-100">
                {contestant.bio || 'Chưa cập nhật thông tin tiểu sử chi tiết.'}
              </p>
            </div>

            {contestant.motto && (
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">
                  Phương châm thi đấu
                </h3>
                <blockquote className="border-l-4 border-[#0042A3] pl-3 italic text-slate-600">
                  "{contestant.motto}"
                </blockquote>
              </div>
            )}

            {contestant.strengths && contestant.strengths.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                  Thế mạnh chuyên môn
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contestant.strengths.map((str, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-[#0042A3] border border-blue-100"
                    >
                      {str}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {onToggleHidden && (
              <button
                type="button"
                id={`modal-toggle-hidden-${contestant.id}`}
                onClick={() => onToggleHidden(contestant.id, contestant.hidden)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
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
              className="ml-auto px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
