import React, { useState } from 'react';
import { X, ShieldAlert, KeyRound, ArrowRight, Lock } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSuccessLogin?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSuccessLogin,
}) => {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSuccess = () => {
    setErrorMsg('');
    setPassword('');
    if (onSuccess) onSuccess();
    if (onSuccessLogin) onSuccessLogin();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPwd = password.trim();
    // Validate password admin123
    if (cleanPwd === 'admin123' || cleanPwd.toLowerCase() === 'admin123') {
      handleSuccess();
    } else {
      setErrorMsg('Mật khẩu quản trị viên không chính xác. Vui lòng thử lại.');
    }
  };

  return (
    <div
      id="admin-login-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="admin-login-modal"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-[#0042A3] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0042A3] to-[#0060E6] flex items-center justify-center shadow-sm">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Đăng Nhập Quản Trị Viên</h3>
              <p className="text-xs text-blue-200">Khu vực dành cho Ban Tổ Chức</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Khu vực <strong>Quản Trị Backend</strong> và <strong>Bảng Điểm Xếp Hạng</strong> yêu cầu mật khẩu bảo mật của Quản trị viên để quản lý thí sinh và giám khảo.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mật khẩu Quản Trị Viên:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                id="admin-password-input"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Nhập mật khẩu quản trị viên..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-[#0042A3] focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold mt-1">{errorMsg}</p>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              id="admin-login-submit-btn"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <span>Xác Nhận Đăng Nhập Quản Trị</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
