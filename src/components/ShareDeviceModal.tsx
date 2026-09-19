import React, { useState } from 'react';
import { X, QrCode, Copy, Check, Smartphone, Wifi, ExternalLink, ShieldCheck } from 'lucide-react';

interface ShareDeviceModalProps {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ShareDeviceModal: React.FC<ShareDeviceModalProps> = ({ onClose, showToast }) => {
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(currentUrl)}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const input = document.createElement('input');
        input.value = currentUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      showToast('Đã sao chép đường dẫn kết nối vào bộ nhớ tạm!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Không thể tự động sao chép, vui lòng sao chép thủ công.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Kết Nối Đa Thiết Bị</h3>
              <p className="text-xs text-blue-100">Dành cho Giám Khảo & Ban Tổ Chức truy cập</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Máy chủ đồng bộ thời gian thực đang hoạt động
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              <Wifi className="w-3.5 h-3.5" /> Online
            </span>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
              <img
                src={qrCodeUrl}
                alt="QR Code kết nối cuộc thi"
                className="w-52 h-52 object-contain"
                loading="lazy"
              />
            </div>
            <p className="mt-3 text-xs text-slate-500 text-center font-medium">
              Quét mã QR bằng Camera điện thoại hoặc iPad để truy cập tức thì
            </p>
          </div>

          {/* Link box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Đường dẫn truy cập trực tiếp
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 truncate select-all">
                {currentUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-2">
            <p className="font-bold text-blue-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-blue-600" /> Hướng dẫn các Giám khảo tham gia chấm:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>
                Mở liên kết trên bằng điện thoại/iPad cá nhân của từng Giám khảo.
              </li>
              <li>
                Bấm vào thẻ <strong>Giám khảo</strong> ở góc trên thanh công cụ để chọn đúng tên mình (GK01 - GK10).
              </li>
              <li>
                Chấm điểm các vòng thi. Điểm số, hình ảnh thí sinh và bảng xếp hạng sẽ được máy chủ tự động đồng bộ ngay lập tức đến mọi thiết bị!
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Dữ liệu được lưu trữ tập trung
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
