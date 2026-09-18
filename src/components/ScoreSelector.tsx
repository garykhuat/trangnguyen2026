import React from 'react';
import { Star } from 'lucide-react';

interface ScoreSelectorProps {
  value: number | null;
  onChange: (score: number) => void;
  disabled?: boolean;
  contestantId?: string;
}

export const ScoreSelector: React.FC<ScoreSelectorProps> = ({
  value,
  onChange,
  disabled,
  contestantId = 'c',
}) => {
  const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Chọn điểm (1 - 10):
        </span>
        {value !== null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            Đã chọn: {value} điểm
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
        {scores.map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              id={`score-btn-${contestantId}-${num}`}
              disabled={disabled}
              onClick={() => onChange(num)}
              className={`min-h-[46px] rounded-xl font-bold text-base transition-all duration-200 flex flex-col items-center justify-center border select-none cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white border-[#00388A] shadow-md ring-2 ring-blue-300 transform -translate-y-0.5'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{num}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
