import React, { useRef, useState } from 'react';
import { X, Check, UserCheck, ShieldCheck, Shield, Lock, Camera, Loader2 } from 'lucide-react';
import { Judge } from '../types.ts';
import { processImageFile } from '../utils/imageUtils.ts';

interface JudgeSelectorModalProps {
  judges: Judge[];
  currentJudgeId: string;
  onSelectJudge: (judgeId: string) => void;
  onClose: () => void;
  onOpenAdminLogin?: () => void;
  onUpdateJudge?: (id: string, data: Partial<Judge>) => Promise<void>;
}

export const JudgeSelectorModal: React.FC<JudgeSelectorModalProps> = ({
  judges,
  currentJudgeId,
  onSelectJudge,
  onClose,
  onOpenAdminLogin,
  onUpdateJudge,
}) => {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedJudgeForUpload, setSelectedJudgeForUpload] = useState<string | null>(null);

  const handleAvatarClick = (e: React.MouseEvent, judgeId: string) => {
    e.stopPropagation();
    setSelectedJudgeForUpload(judgeId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedJudgeForUpload || !onUpdateJudge) return;

    setUploadingId(selectedJudgeForUpload);
    try {
      const processed = await processImageFile(file, 350, 0.82);
      await onUpdateJudge(selectedJudgeForUpload, { avatar: processed });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh giám khảo');
    } finally {
      setUploadingId(null);
      setSelectedJudgeForUpload(null);
      if (e.target) e.target.value = '';
    }
  };
  // Only display judges that are NOT hidden
  const activeJudges = judges.filter((j) => !j.hidden);

  return (
    <div
      id="judge-selector-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="judge-selector-modal"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6"
      >
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0042A3] to-[#0060E6] flex items-center justify-center shadow-sm shadow-blue-400/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Định Danh Giám Khảo Chấm Thi</h2>
              <p className="text-xs text-slate-300">
                Chọn danh tính của bạn trên tablet này để tiến hành chấm điểm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Danh sách {activeJudges.length} Thành viên Ban Giám Khảo đang hoạt động:
            </p>
            {judges.some((j) => j.hidden) && (
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                (Đã ẩn {judges.filter((j) => j.hidden).length} GK chưa tham gia)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeJudges.map((judge) => {
              const isSelected = judge.id === currentJudgeId;
              return (
                <button
                  key={judge.id}
                  type="button"
                  id={`select-judge-${judge.id}`}
                  onClick={() => {
                    onSelectJudge(judge.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 border-[#0042A3] shadow-sm ring-2 ring-blue-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="relative shrink-0 group">
                    <img
                      src={judge.avatar}
                      alt={judge.name}
                      className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    {onUpdateJudge && (
                      <button
                        type="button"
                        title="Đổi ảnh đại diện giám khảo"
                        onClick={(e) => handleAvatarClick(e, judge.id)}
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-transform hover:scale-110 cursor-pointer"
                      >
                        {uploadingId === judge.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Camera className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {judge.code}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-bold text-[#0042A3] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Đang chọn
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-slate-900 truncate mt-1">
                      {judge.name}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {judge.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Admin Mode Option */}
          {onOpenAdminLogin && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                id="modal-admin-switch-btn"
                onClick={() => {
                  onClose();
                  onOpenAdminLogin();
                }}
                className="w-full p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 text-amber-950 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-extrabold">
                      Tài khoản Quản Trị Viên (Ban Tổ Chức)
                    </div>
                    <div className="text-[11px] text-amber-800 font-medium">
                      Nhập mật khẩu để truy cập Quản trị backend và Bảng xếp hạng
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-200 text-amber-900">
                  Đăng nhập BTC
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Mỗi tablet chọn đúng mã giám khảo để tránh nhầm lẫn điểm.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300 cursor-pointer"
          >
            Đóng
          </button>
        </div>

        {/* Hidden file input for judge avatar upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};
