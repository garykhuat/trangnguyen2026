import React, { useState, useMemo } from 'react';
import { Search, MapPin, Building, EyeOff, CheckCircle, Award } from 'lucide-react';
import { Contestant, ScoreRecord } from '../types.ts';
import { ContestantModal } from '../components/ContestantModal.tsx';
import { calculateContestantScores } from '../utils/scoreUtils.ts';
import { INITIAL_REGIONS } from '../data/initialData.ts';

interface ContestantsViewProps {
  contestants: Contestant[];
  scores: ScoreRecord[];
  onToggleHidden: (id: string, currentHidden: boolean) => void;
  onUpdateContestant?: (id: string, data: Partial<Contestant>) => Promise<void>;
}

export const ContestantsView: React.FC<ContestantsViewProps> = ({
  contestants,
  scores,
  onToggleHidden,
  onUpdateContestant,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'hidden'>('all');
  const [activeContestant, setActiveContestant] = useState<Contestant | null>(null);

  const filteredContestants = useMemo(() => {
    return contestants.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.sbd.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRegion = selectedRegion === 'all' || c.regionId === selectedRegion;

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && !c.hidden) ||
        (selectedStatus === 'hidden' && c.hidden);

      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [contestants, searchQuery, selectedRegion, selectedStatus]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Danh Sách Thí Sinh Cuộc Thi
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#0042A3] border border-blue-200">
              {contestants.length} Thí sinh
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Hiển thị 24 thí sinh đại diện cho 8 khu vực. Nhấp vào bất kỳ thí sinh nào để xem popup thông tin chi tiết.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-contestant-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên, chức danh, SBD..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0042A3] focus:border-[#0042A3] bg-slate-50/50"
            />
          </div>

          {/* Region filter */}
          <div>
            <select
              id="region-filter-select"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0042A3] bg-white"
            >
              <option value="all">Tất cả khu vực / đơn vị (8 khu vực)</option>
              {INITIAL_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              id="status-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0042A3] bg-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang thi đấu (Không bị ẩn)</option>
              <option value="hidden">Đã bị ẩn (Loại khỏi Vòng 3 & 4)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contestants Grid (24 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredContestants.map((contestant) => {
          const summary = calculateContestantScores(contestant.id, scores);
          return (
            <div
              key={contestant.id}
              id={`contestant-card-${contestant.id}`}
              onClick={() => setActiveContestant(contestant)}
              className={`group relative rounded-2xl bg-white border p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                contestant.hidden
                  ? 'border-slate-200 opacity-75 bg-slate-50/70'
                  : 'border-slate-200 hover:border-[#0042A3]'
              }`}
            >
              <div>
                {/* Image and badges */}
                <div className="relative mb-3.5">
                  <img
                    src={contestant.avatar}
                    alt={contestant.name}
                    className="w-full h-48 rounded-xl object-cover bg-slate-100 group-hover:scale-[1.01] transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  {/* SBD badge */}
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-900/80 text-white backdrop-blur-md">
                    {contestant.sbd}
                  </span>

                  {/* Hidden / Active Status indicator */}
                  {contestant.hidden ? (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                      <EyeOff className="w-3 h-3" /> Đã ẩn
                    </span>
                  ) : (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                      <CheckCircle className="w-3 h-3" /> Đang thi
                    </span>
                  )}
                </div>

                {/* Info */}
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#0042A3] transition-colors">
                  {contestant.name}
                </h3>
                <p className="text-xs font-semibold text-[#0042A3] line-clamp-1 mt-0.5">
                  {contestant.title}
                </p>

                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1 line-clamp-1">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{contestant.department}</span>
                  </div>
                  <div className="flex items-center gap-1 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{contestant.region}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Scores */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Điểm TB V1:</span>
                  <span className="font-bold text-slate-900">
                    {summary.round1Count > 0 ? `${summary.round1Average}` : '0'}
                  </span>
                </div>

                <span className="text-xs font-bold text-[#0042A3] group-hover:underline">
                  Xem chi tiết &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredContestants.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm">Không tìm thấy thí sinh nào phù hợp với bộ lọc.</p>
        </div>
      )}

      {/* Popup Chi Tiết Thí Sinh */}
      <ContestantModal
        contestant={activeContestant}
        scores={scores}
        onClose={() => setActiveContestant(null)}
        onToggleHidden={onToggleHidden}
        onUpdateContestant={onUpdateContestant}
      />
    </div>
  );
};
