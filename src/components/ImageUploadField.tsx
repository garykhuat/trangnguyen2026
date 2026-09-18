import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Link as LinkIcon, X, Check, AlertCircle } from 'lucide-react';
import { processImageFile } from '../utils/imageUtils.ts';

interface ImageUploadFieldProps {
  id?: string;
  value: string;
  onChange: (dataUrlOrUrl: string) => void;
  label?: string;
  helperText?: string;
  placeholderText?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  id = 'image-upload',
  value,
  onChange,
  label = 'Hình ảnh chân dung',
  helperText = 'Kéo thả tệp ảnh hoặc nhấp để chọn từ máy tính / điện thoại (PNG, JPG, WebP)',
  placeholderText = 'https://...',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn định dạng tệp hình ảnh (PNG, JPG, JPEG, WEBP).');
      return;
    }
    setErrorMessage(null);
    setProcessing(true);
    try {
      const processed = await processImageFile(file, 600, 0.88);
      onChange(processed);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể xử lý hình ảnh này.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFile(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-bold text-slate-700">
          {label}
        </label>
        {/* Toggle between File Upload and URL */}
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3 h-3" />
            <span>Tải tệp lên</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'url'
                ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Dán URL ảnh</span>
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div className="space-y-2">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center ${
              isDragging
                ? 'border-[#0042A3] bg-blue-50/70 scale-[0.99]'
                : value
                ? 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-[#0042A3]'
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              id={id}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {processing ? (
              <div className="py-4 flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-[#0042A3] border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-[#0042A3]">
                  Đang tối ưu và tải hình ảnh...
                </span>
              </div>
            ) : value ? (
              <div className="flex items-center gap-4 w-full p-1">
                <div className="relative shrink-0">
                  <img
                    src={value}
                    alt="Preview"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Ảnh đã chọn sẵn sàng</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    Nhấp vào đây hoặc kéo thả ảnh mới để thay thế
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0042A3] text-[11px] font-bold border border-blue-200 transition-colors cursor-pointer"
                    >
                      Chọn ảnh khác
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold border border-rose-200 transition-colors cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-3 flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0042A3]/15 to-[#0060E6]/15 text-[#0042A3] flex items-center justify-center mb-1">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Nhấp để tải ảnh lên <span className="text-slate-400 font-normal">hoặc kéo thả vào đây</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Hỗ trợ JPG, PNG, WebP (Tự động nén tối ưu độ nét)
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* URL Input Tab */
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              id={`${id}-url`}
              type="url"
              value={value}
              onChange={(e) => {
                setErrorMessage(null);
                onChange(e.target.value);
              }}
              placeholder={placeholderText}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-[#0042A3] focus:outline-hidden"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {value && (
            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={value}
                alt="Preview"
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                referrerPolicy="no-referrer"
                onError={() => setErrorMessage('Không thể tải trước hình ảnh từ liên kết URL này.')}
              />
              <div className="text-[11px] text-slate-600 truncate">
                <div className="font-semibold text-slate-800">Xem trước ảnh từ link URL</div>
                <div className="truncate text-slate-400">{value}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-rose-600 text-xs p-2 bg-rose-50 rounded-xl border border-rose-200 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {helperText && !errorMessage && (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      )}
    </div>
  );
};
