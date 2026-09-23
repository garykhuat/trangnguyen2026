import React, { useState, useMemo } from 'react';
import {
  Settings,
  Eye,
  EyeOff,
  Edit,
  Plus,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  FileText,
  Search,
  Upload,
  UserCheck,
  Filter,
  Users,
  X,
  Trash2,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { Contestant, Judge, ScoreRecord } from '../types.ts';
import { INITIAL_REGIONS } from '../data/initialData.ts';
import { calculateContestantScores } from '../utils/scoreUtils.ts';
import { ImageUploadField } from '../components/ImageUploadField.tsx';
import { processImageFile } from '../utils/imageUtils.ts';

interface AdminBackendViewProps {
  contestants: Contestant[];
  judges: Judge[];
  scores: ScoreRecord[];
  onToggleHidden: (id: string, currentHidden: boolean) => Promise<void>;
  onUpdateContestant: (id: string, data: Partial<Contestant>) => Promise<void>;
  onAddContestant: (data: Partial<Contestant>) => Promise<void>;
  onSaveRound2Scores: (scores: { contestantId: string; score: number; notes?: string }[]) => Promise<void>;
  onOverrideScore: (contestantId: string, round: number, judgeId: string, newScore: number, notes?: string) => Promise<void>;
  onResetData: () => Promise<void>;
  onResetAllScores?: (unhideAllContestants?: boolean) => Promise<void>;
  onToggleJudgeHidden: (id: string, currentHidden: boolean) => Promise<void>;
  onUpdateJudge: (id: string, data: Partial<Judge>) => Promise<void>;
  onAddJudge?: (data: Partial<Judge>) => Promise<void>;
}

type AdminTab = 'contestants' | 'judges' | 'round2' | 'judges-scores' | 'add-contestant';

export const AdminBackendView: React.FC<AdminBackendViewProps> = ({
  contestants,
  judges,
  scores,
  onToggleHidden,
  onUpdateContestant,
  onAddContestant,
  onSaveRound2Scores,
  onOverrideScore,
  onResetData,
  onResetAllScores,
  onToggleJudgeHidden,
  onUpdateJudge,
  onAddJudge,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('contestants');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset scores state (chạy thử xong / chuẩn bị thi chính thức)
  const [isResetScoresModalOpen, setIsResetScoresModalOpen] = useState(false);
  const [resetUnhideContestants, setResetUnhideContestants] = useState(true);
  const [isResettingScores, setIsResettingScores] = useState(false);
  const [resetScoresSuccess, setResetScoresSuccess] = useState<string | null>(null);

  // Judge management state
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [editJudgeFormData, setEditJudgeFormData] = useState<{
    name: string;
    title: string;
    avatar: string;
  }>({ name: '', title: '', avatar: '' });
  const [isAddingJudge, setIsAddingJudge] = useState(false);
  const [newJudgeFormData, setNewJudgeFormData] = useState<{
    name: string;
    title: string;
    avatar: string;
  }>({
    name: '',
    title: 'Ban Giám Khảo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  });
  const [judgeActionLoading, setJudgeActionLoading] = useState<string | null>(null);
  const [judgeFilterStatus, setJudgeFilterStatus] = useState<'all' | 'active' | 'hidden'>('all');

  // Edit contestant state
  const [editingContestant, setEditingContestant] = useState<Contestant | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Contestant>>({});

  // Round 2 input state
  const [round2Inputs, setRound2Inputs] = useState<Record<string, { score: number; notes: string }>>(() => {
    const initial: Record<string, { score: number; notes: string }> = {};
    for (const c of contestants) {
      const existingR2 = scores.find((s) => s.contestantId === c.id && s.round === 2);
      initial[c.id] = {
        score: existingR2 ? existingR2.score : 0,
        notes: existingR2?.notes || '',
      };
    }
    return initial;
  });

  // Sync round 2 inputs whenever scores or contestants change (e.g. after reset)
  React.useEffect(() => {
    const updated: Record<string, { score: number; notes: string }> = {};
    for (const c of contestants) {
      const existingR2 = scores.find((s) => s.contestantId === c.id && s.round === 2);
      updated[c.id] = {
        score: existingR2 ? existingR2.score : 0,
        notes: existingR2?.notes || '',
      };
    }
    setRound2Inputs(updated);
  }, [scores, contestants]);

  const [savingRound2, setSavingRound2] = useState(false);
  const [saveRound2Success, setSaveRound2Success] = useState(false);

  // Judge scores override state
  const [filterRound, setFilterRound] = useState<number>(1);
  const [filterJudge, setFilterJudge] = useState<string>('all');
  const [editingScoreRecord, setEditingScoreRecord] = useState<{
    contestantId: string;
    contestantName: string;
    round: number;
    judgeId: string;
    judgeName: string;
    currentScore: number;
    notes: string;
  } | null>(null);
  const [overrideScoreValue, setOverrideScoreValue] = useState<number>(10);
  const [overrideNotesValue, setOverrideNotesValue] = useState<string>('');
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);

  // New Contestant state
  const [newContestantData, setNewContestantData] = useState<Partial<Contestant>>({
    name: '',
    title: '',
    department: 'Khối Phát Triển',
    region: 'Khu vực Miền Bắc',
    regionId: 1,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    bio: '',
    motto: '',
    strengths: ['Tư duy chiến lược', 'Giải quyết vấn đề'],
  });

  // Open Edit Contestant modal
  const handleOpenEdit = (contestant: Contestant) => {
    setEditingContestant(contestant);
    setEditFormData({
      name: contestant.name,
      title: contestant.title,
      department: contestant.department,
      region: contestant.region,
      regionId: contestant.regionId,
      avatar: contestant.avatar,
      bio: contestant.bio,
      motto: contestant.motto,
    });
  };

  // Submit Edit Contestant
  const handleSaveContestantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContestant) return;
    try {
      await onUpdateContestant(editingContestant.id, editFormData);
      setEditingContestant(null);
      alert('Đã cập nhật thông tin thí sinh thành công!');
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật thông tin.');
    }
  };

  // Save Round 2 scores
  const handleSaveAllRound2 = async () => {
    setSavingRound2(true);
    setSaveRound2Success(false);
    try {
      const payload = Object.entries(round2Inputs).map(([contestantId, data]: [string, { score: number; notes: string }]) => ({
        contestantId,
        score: Number(data.score),
        notes: data.notes,
      }));
      await onSaveRound2Scores(payload);
      setSaveRound2Success(true);
      setTimeout(() => setSaveRound2Success(false), 3000);
    } catch (err) {
      alert('Lỗi khi lưu điểm Vòng 2.');
    } finally {
      setSavingRound2(false);
    }
  };

  // Submit Override Score
  const handleSaveOverrideScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScoreRecord) return;
    setOverrideStatus('saving');
    try {
      await onOverrideScore(
        editingScoreRecord.contestantId,
        editingScoreRecord.round,
        editingScoreRecord.judgeId,
        overrideScoreValue,
        overrideNotesValue || 'Điểm được Quản trị viên cập nhật'
      );
      setOverrideStatus('success');
      setTimeout(() => {
        setEditingScoreRecord(null);
        setOverrideStatus(null);
      }, 1000);
    } catch (err) {
      setOverrideStatus('error');
    }
  };

  // Judge management handlers
  const activeJudges = judges.filter((j) => !j.hidden);
  const activeJudgeIds = activeJudges.map((j) => j.id);

  const filteredJudges = useMemo(() => {
    return judges.filter((j) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        j.name.toLowerCase().includes(q) ||
        j.code.toLowerCase().includes(q) ||
        j.title.toLowerCase().includes(q);

      const isHidden = Boolean(j.hidden);
      const matchesStatus =
        judgeFilterStatus === 'all' ||
        (judgeFilterStatus === 'active' && !isHidden) ||
        (judgeFilterStatus === 'hidden' && isHidden);

      return matchesSearch && matchesStatus;
    });
  }, [judges, searchQuery, judgeFilterStatus]);

  const handleOpenEditJudge = (judge: Judge) => {
    setEditingJudge(judge);
    setEditJudgeFormData({
      name: judge.name,
      title: judge.title,
      avatar: judge.avatar,
    });
  };

  const handleSaveJudgeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJudge) return;
    setJudgeActionLoading(editingJudge.id);
    try {
      await onUpdateJudge(editingJudge.id, editJudgeFormData);
      setEditingJudge(null);
    } catch (err) {
      alert('Lỗi khi cập nhật thông tin giám khảo.');
    } finally {
      setJudgeActionLoading(null);
    }
  };

  const handleToggleJudge = async (judge: Judge) => {
    setJudgeActionLoading(judge.id);
    try {
      await onToggleJudgeHidden(judge.id, Boolean(judge.hidden));
    } catch (err) {
      alert('Lỗi khi thay đổi trạng thái ẩn giám khảo.');
    } finally {
      setJudgeActionLoading(null);
    }
  };

  const handleCreateNewJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJudgeFormData.name.trim()) return;
    try {
      if (onAddJudge) {
        await onAddJudge(newJudgeFormData);
      }
      setIsAddingJudge(false);
      setNewJudgeFormData({
        name: '',
        title: 'Ban Giám Khảo',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      });
    } catch (err) {
      alert('Lỗi khi thêm giám khảo mới.');
    }
  };

  // Quick preset: Hide bottom 12 contestants based on Round 1 + Round 2 scores
  const handleAutoEliminateBottomHalf = async () => {
    if (
      !confirm(
        'Bạn có chắc chắn muốn tự động ẨN 12 thí sinh có điểm thấp nhất (Vòng 1 & 2) để chỉ giữ lại Top 12 bước vào Vòng 3?'
      )
    ) {
      return;
    }

    // Sort contestants by current R1 + R2 score using active judges
    const scoredContestants = [...contestants].map((c) => {
      const summary = calculateContestantScores(c.id, scores, activeJudgeIds);
      const preliminaryScore = summary.round1Average + summary.round2Score;
      return { id: c.id, preliminaryScore };
    });

    scoredContestants.sort((a, b) => b.preliminaryScore - a.preliminaryScore);

    // Keep top 12 visible, hide bottom 12
    const top12 = scoredContestants.slice(0, 12);
    for (const item of top12) {
      const currentC = contestants.find((c) => c.id === item.id);
      if (currentC?.hidden) {
        await onToggleHidden(item.id, true); // unhide top 12
      }
    }

    const bottom12 = scoredContestants.slice(12);
    for (const item of bottom12) {
      const currentC = contestants.find((c) => c.id === item.id);
      if (!currentC?.hidden) {
        await onToggleHidden(item.id, false); // hide bottom 12
      }
    }
    alert('Đã cập nhật thành công: 12 thí sinh dẫn đầu sẽ hiển thị ở Vòng 3 & Vòng 4, 12 thí sinh còn lại đã được ẩn.');
  };

  // Quick photo upload handlers
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);

  const handleQuickUploadContestantAvatar = async (contestantId: string, file: File) => {
    setUploadingAvatarId(`contestant-${contestantId}`);
    try {
      const avatar = await processImageFile(file, 600, 0.88);
      await onUpdateContestant(contestantId, { avatar });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh thí sinh.');
    } finally {
      setUploadingAvatarId(null);
    }
  };

  const handleQuickUploadJudgeAvatar = async (judgeId: string, file: File) => {
    setUploadingAvatarId(`judge-${judgeId}`);
    try {
      const avatar = await processImageFile(file, 600, 0.88);
      await onUpdateJudge(judgeId, { avatar });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh giám khảo.');
    } finally {
      setUploadingAvatarId(null);
    }
  };

  // Handler for resetting all scores (sau khi chạy thử xong)
  const handleExecuteResetScores = async () => {
    setIsResettingScores(true);
    try {
      if (onResetAllScores) {
        await onResetAllScores(resetUnhideContestants);
      }
      setResetScoresSuccess('Đã xóa sạch toàn bộ điểm số của tất cả thí sinh thành công. Hệ thống đã sẵn sàng cho cuộc thi chính thức!');
      setTimeout(() => {
        setIsResetScoresModalOpen(false);
        setResetScoresSuccess(null);
      }, 1500);
    } catch (err) {
      alert('Có lỗi xảy ra khi xóa điểm thí sinh.');
    } finally {
      setIsResettingScores(false);
    }
  };

  // Filtered scores for judge matrix
  const filteredScores = scores.filter((s) => {
    const matchesRound = s.round === filterRound;
    const matchesJudge = filterJudge === 'all' || s.judgeId === filterJudge;
    return matchesRound && matchesJudge;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Title Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-blue-300 text-xs font-bold border border-slate-700 mb-2">
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            HỆ THỐNG QUẢN TRỊ BACKEND & BAN TỔ CHỨC
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Quản Trị Thí Sinh & Điểm Số
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Khu vực dành cho Ban Tổ Chức: Ẩn/Hiện thí sinh sau các vòng thi (loại thí sinh), nhập hình ảnh & thông tin,
            nhập điểm Vòng 2, và giám sát / chỉnh sửa điểm của các giám khảo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            id="admin-reset-all-scores-btn"
            onClick={() => setIsResetScoresModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-rose-600/20 active:scale-95"
            title="Xóa toàn bộ điểm của tất cả thí sinh sau khi chạy thử xong"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset Toàn Bộ Điểm (Sau Chạy Thử)</span>
          </button>

          <button
            type="button"
            id="reset-db-btn"
            onClick={async () => {
              if (confirm('Khôi phục toàn bộ dữ liệu ban đầu (24 thí sinh, điểm mẫu gốc)?')) {
                await onResetData();
                alert('Đã thiết lập lại dữ liệu thành công!');
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
            title="Khôi phục lại dữ liệu mẫu gốc"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Dữ Liệu Gốc</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          id="admin-tab-contestants"
          onClick={() => setActiveTab('contestants')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'contestants'
              ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <EyeOff className="w-4 h-4" />
          <span>1. Thí Sinh & Loại (Ẩn)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/20 text-white">
            {contestants.length}
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-judges"
          onClick={() => setActiveTab('judges')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'judges'
              ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. Ban Giám Khảo (Ẩn / Sửa tên)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/20 text-white font-extrabold">
            {activeJudges.length}/{judges.length}
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-round2"
          onClick={() => setActiveTab('round2')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'round2'
              ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Vòng 2</span>
        </button>

        <button
          type="button"
          id="admin-tab-judges-scores"
          onClick={() => setActiveTab('judges-scores')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'judges-scores'
              ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>4. Giám Sát & Sửa Điểm GK</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/20 text-white">
            {scores.length}
          </span>
        </button>

        <button
          type="button"
          id="admin-tab-add-contestant"
          onClick={() => setActiveTab('add-contestant')}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'add-contestant'
              ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Thí Sinh</span>
        </button>
      </div>

      {/* ===================== TAB 1: QUẢN LÝ & ẨN THÍ SINH ===================== */}
      {activeTab === 'contestants' && (
        <div className="space-y-4">
          {/* Quick Notice & Auto Elimination Assistant */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Quy chế Ẩn Thí Sinh (Loại bớt sau mỗi vòng):
                </h4>
                <p className="text-xs text-slate-600">
                  Thí sinh có trạng thái <strong className="text-rose-700 font-bold">"Đã Ẩn"</strong> sẽ tự động 
                  <strong> biến mất khỏi trang Vòng 3 và Vòng 4</strong>, đảm bảo giám khảo chỉ chấm các thí sinh được đi tiếp.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="auto-eliminate-btn"
              onClick={handleAutoEliminateBottomHalf}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            >
              ⚡ Tự động ẩn 12 thí sinh điểm thấp
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm thí sinh theo tên, chức danh, SBD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Đang ẩn: <strong className="text-rose-600 font-bold">{contestants.filter((c) => c.hidden).length}</strong> / {contestants.length} thí sinh
            </div>
          </div>

          {/* Contestants Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Thí Sinh</th>
                    <th className="py-3.5 px-4">Chức Danh & Phòng Ban</th>
                    <th className="py-3.5 px-4">Khu Vực</th>
                    <th className="py-3.5 px-4 text-center">Trạng Thái Vòng 3 & 4</th>
                    <th className="py-3.5 px-4 text-center">Hành Động Ẩn / Hiện</th>
                    <th className="py-3.5 px-4 text-right">Chỉnh Sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contestants
                    .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.sbd.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((contestant) => (
                      <tr
                        key={contestant.id}
                        id={`admin-contestant-row-${contestant.id}`}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          contestant.hidden ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative group shrink-0">
                              <img
                                src={contestant.avatar}
                                alt={contestant.name}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100"
                                referrerPolicy="no-referrer"
                              />
                              <label
                                htmlFor={`quick-avatar-file-${contestant.id}`}
                                title="Tải ảnh mới từ thiết bị"
                                className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity"
                              >
                                <Camera className="w-4 h-4" />
                                <span className="text-[9px] font-bold mt-0.5">Tải ảnh</span>
                              </label>
                              <input
                                id={`quick-avatar-file-${contestant.id}`}
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                className="hidden"
                                disabled={uploadingAvatarId === `contestant-${contestant.id}`}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleQuickUploadContestantAvatar(contestant.id, e.target.files[0]);
                                  }
                                }}
                              />
                              {uploadingAvatarId === `contestant-${contestant.id}` && (
                                <div className="absolute inset-0 bg-slate-900/80 rounded-xl flex items-center justify-center">
                                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {contestant.sbd}
                                </span>
                                <label
                                  htmlFor={`quick-avatar-file-${contestant.id}`}
                                  className="text-[11px] font-semibold text-[#0042A3] hover:text-[#00388A] hover:underline cursor-pointer inline-flex items-center gap-1"
                                  title="Tải ảnh chân dung từ máy tính"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>Tải ảnh</span>
                                </label>
                              </div>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {contestant.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0042A3] text-xs">
                            {contestant.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {contestant.department}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                            {contestant.region || `Khu vực ${contestant.regionId}`}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {contestant.hidden ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                              Đã Ẩn (Bị loại)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              Đang Hiển Thị (Đi tiếp)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            id={`toggle-hidden-btn-${contestant.id}`}
                            onClick={() => onToggleHidden(contestant.id, contestant.hidden)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                              contestant.hidden
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                          >
                            {contestant.hidden ? (
                              <>
                                <Eye className="w-3.5 h-3.5" /> Bỏ ẩn thí sinh
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" /> Ẩn (Loại bỏ)
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            id={`edit-contestant-btn-${contestant.id}`}
                            onClick={() => handleOpenEdit(contestant)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" /> Sửa thông tin
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: QUẢN LÝ & ẨN GIÁM KHẢO ===================== */}
      {activeTab === 'judges' && (
        <div className="space-y-4">
          {/* Information & Summary Banner */}
          <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 border border-blue-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <span>Điều Chỉnh Danh Sách & Số Lượng Giám Khảo Chấm Thi</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0042A3] font-black">
                    {activeJudges.length} / {judges.length} GK Đang Chấm
                  </span>
                </h3>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  Quản trị viên có thể nhấn nút <strong className="text-rose-700">"Ẩn giám khảo"</strong> để tạm dừng quyền chấm của giám khảo vắng mặt. Giám khảo bị ẩn sẽ không hiển thị trên tablet để chọn và <strong>không được tính vào điểm trung bình</strong> của thí sinh. Bạn cũng có thể sửa tên, chức danh và ảnh đại diện bất kỳ lúc nào.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="admin-add-judge-btn"
                onClick={() => setIsAddingJudge(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Giám Khảo</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={() => setJudgeFilterStatus(judgeFilterStatus === 'active' ? 'all' : 'active')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                judgeFilterStatus === 'active'
                  ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-300 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              } flex items-center justify-between`}
            >
              <div>
                <div className="text-xs text-slate-500 font-semibold">Giám khảo đang kích hoạt (Tính điểm)</div>
                <div className="text-2xl font-black text-emerald-600 mt-0.5">{activeJudges.length} Giám khảo</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Check className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => setJudgeFilterStatus(judgeFilterStatus === 'hidden' ? 'all' : 'hidden')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                judgeFilterStatus === 'hidden'
                  ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-amber-300'
              } flex items-center justify-between`}
            >
              <div>
                <div className="text-xs text-slate-500 font-semibold">Giám khảo tạm ẩn (Không tính điểm)</div>
                <div className="text-2xl font-black text-amber-600 mt-0.5">{judges.filter((j) => j.hidden).length} Giám khảo</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <EyeOff className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-semibold">Công thức tính điểm trung bình</div>
                <div className="text-sm font-bold text-slate-800 mt-1">Tổng điểm ÷ {activeJudges.length} GK active</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0042A3] flex items-center justify-center font-bold text-xs">
                AVG
              </div>
            </div>
          </div>

          {/* Judges Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Lọc danh sách:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setJudgeFilterStatus('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    judgeFilterStatus === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({judges.length})
                </button>
                <button
                  type="button"
                  onClick={() => setJudgeFilterStatus('active')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    judgeFilterStatus === 'active'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  Đang tham gia ({activeJudges.length})
                </button>
                <button
                  type="button"
                  onClick={() => setJudgeFilterStatus('hidden')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    judgeFilterStatus === 'hidden'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  Đã ẩn ({judges.filter((j) => j.hidden).length})
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Hiển thị <span className="font-bold text-slate-800">{filteredJudges.length}</span> / {judges.length} giám khảo
            </div>
          </div>

          {/* Judges Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Mã & Ảnh Đại Diện</th>
                    <th className="py-3.5 px-4">Họ Và Tên Giám Khảo</th>
                    <th className="py-3.5 px-4">Chức Danh / Vai Trò</th>
                    <th className="py-3.5 px-4 text-center">Trạng Thái Chấm</th>
                    <th className="py-3.5 px-4 text-center">Ẩn / Hiện</th>
                    <th className="py-3.5 px-4 text-right">Chỉnh Sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredJudges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold">Không tìm thấy giám khảo phù hợp với bộ lọc hiện tại.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredJudges.map((judge) => {
                      const isHidden = Boolean(judge.hidden);
                      const isLoading = judgeActionLoading === judge.id;

                    return (
                      <tr
                        key={judge.id}
                        className={`transition-colors ${
                          isHidden ? 'bg-slate-50/70 text-slate-400' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black px-2 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                              {judge.code}
                            </span>
                            <div className="relative group shrink-0">
                              <img
                                src={judge.avatar}
                                alt={judge.name}
                                className={`w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 ${
                                  isHidden ? 'opacity-50 grayscale' : ''
                                }`}
                                referrerPolicy="no-referrer"
                              />
                              <label
                                htmlFor={`quick-judge-avatar-${judge.id}`}
                                title="Tải ảnh mới từ thiết bị"
                                className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span className="text-[8px] font-bold mt-0.5">Tải ảnh</span>
                              </label>
                              <input
                                id={`quick-judge-avatar-${judge.id}`}
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                className="hidden"
                                disabled={uploadingAvatarId === `judge-${judge.id}`}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleQuickUploadJudgeAvatar(judge.id, e.target.files[0]);
                                  }
                                }}
                              />
                              {uploadingAvatarId === `judge-${judge.id}` && (
                                <div className="absolute inset-0 bg-slate-900/80 rounded-xl flex items-center justify-center">
                                  <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                                </div>
                              )}
                            </div>
                            <label
                              htmlFor={`quick-judge-avatar-${judge.id}`}
                              className="text-[11px] font-semibold text-[#0042A3] hover:text-[#00388A] hover:underline cursor-pointer inline-flex items-center gap-1"
                              title="Tải ảnh chân dung từ máy tính"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Đổi ảnh</span>
                            </label>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold">
                          <div className={isHidden ? 'text-slate-500 line-through' : 'text-slate-900'}>
                            {judge.name}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-xs">
                          <div className={isHidden ? 'text-slate-400' : 'text-slate-600'}>
                            {judge.title}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isHidden ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                              Đã Ẩn (Không tính điểm)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Đang Chấm (Tính điểm)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            id={`toggle-judge-btn-${judge.id}`}
                            disabled={isLoading}
                            onClick={() => handleToggleJudge(judge)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                              isHidden
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                          >
                            {isHidden ? (
                              <>
                                <Eye className="w-3.5 h-3.5" /> Mở lại giám khảo
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" /> Ẩn giám khảo
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            id={`edit-judge-btn-${judge.id}`}
                            onClick={() => handleOpenEditJudge(judge)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" /> Sửa tên / chức danh
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: NHẬP ĐIỂM VÒNG 2 ===================== */}
      {activeTab === 'round2' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0042A3] text-xs font-bold border border-blue-200 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0042A3]" />
                Vòng 2
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Vòng 2
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Nhập thang điểm từ 1 đến 10 cho từng thí sinh. Điểm này sẽ được tính vào tổng điểm tích lũy toàn cuộc thi.
              </p>
            </div>

            <button
              type="button"
              id="save-all-round2-btn"
              disabled={savingRound2}
              onClick={handleSaveAllRound2}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs ${
                saveRound2Success
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              {savingRound2 ? 'Đang lưu điểm...' : saveRound2Success ? 'Đã lưu điểm Vòng 2 thành công!' : 'Lưu Toàn Bộ Điểm Vòng 2'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-3 px-4">Thí Sinh</th>
                    <th className="py-3 px-4">Khu Vực</th>
                    <th className="py-3 px-4 w-44">Điểm Vòng 2 (1 - 10)</th>
                    <th className="py-3 px-4">Nhận Xét / Tiêu Chí</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contestants.map((contestant) => {
                    const currentVal = round2Inputs[contestant.id]?.score ?? 0;
                    const currentNotes = round2Inputs[contestant.id]?.notes ?? '';

                    return (
                      <tr key={contestant.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={contestant.avatar}
                              alt={contestant.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="text-[10px] font-black text-[#0042A3]">{contestant.sbd}</span>
                              <div className="font-bold text-slate-900">{contestant.name}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-600">
                          {contestant.region}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              id={`input-round2-score-${contestant.id}`}
                              value={currentVal || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setRound2Inputs((prev) => ({
                                  ...prev,
                                  [contestant.id]: {
                                    ...prev[contestant.id],
                                    score: Math.min(10, Math.max(0, val)),
                                  },
                                }));
                              }}
                              placeholder="0 - 10"
                              className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-[#0042A3] focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                            <span className="text-xs text-slate-400 font-semibold">/ 10</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <input
                            type="text"
                            id={`input-round2-notes-${contestant.id}`}
                            value={currentNotes}
                            onChange={(e) => {
                              const notes = e.target.value;
                              setRound2Inputs((prev) => ({
                                ...prev,
                                [contestant.id]: {
                                  ...prev[contestant.id],
                                  notes,
                                },
                              }));
                            }}
                            placeholder="Ghi chú đánh giá bài thi Vòng 2..."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                          />
                        </td>

                        <td className="py-3 px-4 text-center">
                          {currentVal > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              Đã có điểm: {currentVal}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                              Chưa chấm
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: QUẢN LÝ & SỬA ĐIỂM GIÁM KHẢO ===================== */}
      {activeTab === 'judges-scores' && (
        <div className="space-y-4">
          {/* Quick score reset reminder banner */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  Chạy thử chấm điểm trước cuộc thi?
                </h4>
                <p className="text-xs text-slate-600">
                  Sau khi test xong, bạn có thể xóa sạch toàn bộ {scores.length} lượt điểm của các vòng thi để bắt đầu giải đấu chính thức.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="tab-reset-scores-btn"
              onClick={() => setIsResetScoresModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-sm transition-all"
            >
              Reset sạch điểm thi
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Ma Trận Điểm & Can Thiệp Chỉnh Sửa Điểm Giám Khảo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem toàn bộ các lượt chấm điểm từ Ban Giám Khảo ({activeJudges.length} đang chấm). Ban tổ chức có quyền chỉnh sửa điểm số nếu phát hiện sai sót.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                id="filter-round-select"
                value={filterRound}
                onChange={(e) => setFilterRound(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
              >
                <option value={1}>Lọc Vòng 1 (Khu vực)</option>
                <option value={3}>Lọc Vòng 3 (Bán kết)</option>
                <option value={4}>Lọc Vòng 4 (Chung kết)</option>
              </select>

              <select
                id="filter-judge-select"
                value={filterJudge}
                onChange={(e) => setFilterJudge(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
              >
                <option value="all">
                  {judges.some((j) => j.hidden)
                    ? `Tất cả ${activeJudges.length} Giám khảo đang chấm (${judges.length} tổng)`
                    : `Tất cả ${activeJudges.length} Giám khảo`}
                </option>
                {judges.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.code} - {j.name} {j.hidden ? '(Đã ẩn)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scores Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-3 px-4">Thí Sinh</th>
                    <th className="py-3 px-4">Vòng Thi</th>
                    <th className="py-3 px-4">Giám Khảo Chấm</th>
                    <th className="py-3 px-4 text-center">Điểm Đã Chấm</th>
                    <th className="py-3 px-4">Ghi Chú Của Giám Khảo</th>
                    <th className="py-3 px-4 text-right">Thao Tác Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        Chưa có dữ liệu điểm nào cho bộ lọc này.
                      </td>
                    </tr>
                  ) : (
                    filteredScores.map((scoreRec) => {
                      const contestant = contestants.find((c) => c.id === scoreRec.contestantId);
                      const judge = judges.find((j) => j.id === scoreRec.judgeId);

                      return (
                        <tr key={scoreRec.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {contestant?.name || scoreRec.contestantId}
                            </div>
                            <div className="text-[11px] text-slate-500">{contestant?.sbd}</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-[#0042A3]">
                              Vòng {scoreRec.round}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 text-xs">
                              {judge?.name || scoreRec.judgeId}
                            </div>
                            <div className="text-[11px] text-[#0042A3] font-semibold">
                              {judge?.code || scoreRec.judgeId}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="px-3 py-1 rounded-full font-black text-sm bg-amber-100 text-amber-900 border border-amber-300">
                              {scoreRec.score} / 10
                            </span>
                          </td>

                          <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                            {scoreRec.notes || 'Không có ghi chú'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              id={`override-score-btn-${scoreRec.id}`}
                              onClick={() => {
                                setEditingScoreRecord({
                                  contestantId: scoreRec.contestantId,
                                  contestantName: contestant?.name || scoreRec.contestantId,
                                  round: scoreRec.round,
                                  judgeId: scoreRec.judgeId,
                                  judgeName: judge?.name || scoreRec.judgeId,
                                  currentScore: scoreRec.score,
                                  notes: scoreRec.notes || '',
                                });
                                setOverrideScoreValue(scoreRec.score);
                                setOverrideNotesValue(scoreRec.notes || '');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0042A3] text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" /> Sửa điểm này
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: THÊM THÍ SINH MỚI ===================== */}
      {activeTab === 'add-contestant' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-3xl mx-auto shadow-xs">
          <h3 className="text-lg font-extrabold text-slate-900 mb-1">
            Bổ Sung Thí Sinh Dự Thi Mới
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Thêm thí sinh vào danh sách cuộc thi. Thí sinh mới sẽ tự động được cấp Số Báo Danh (SBD).
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onAddContestant(newContestantData);
                alert('Đã thêm thí sinh mới thành công!');
                setActiveTab('contestants');
              } catch (err) {
                alert('Lỗi khi thêm thí sinh.');
              }
            }}
            className="space-y-4 text-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên thí sinh *
                </label>
                <input
                  type="text"
                  required
                  id="new-contestant-name"
                  value={newContestantData.name}
                  onChange={(e) => setNewContestantData({ ...newContestantData, name: e.target.value })}
                  placeholder="Ví dụ: Hoàng Anh Quân"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chức danh / Vị trí chuyên môn *
                </label>
                <input
                  type="text"
                  required
                  id="new-contestant-title"
                  value={newContestantData.title}
                  onChange={(e) => setNewContestantData({ ...newContestantData, title: e.target.value })}
                  placeholder="Ví dụ: Kỹ sư Phần mềm Cao cấp"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phòng ban / Đơn vị công tác
                </label>
                <input
                  type="text"
                  id="new-contestant-dept"
                  value={newContestantData.department}
                  onChange={(e) => setNewContestantData({ ...newContestantData, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Khu vực thi đấu
                </label>
                <select
                  id="new-contestant-region"
                  value={newContestantData.regionId}
                  onChange={(e) => {
                    const regId = Number(e.target.value);
                    const match = INITIAL_REGIONS.find((r) => r.id === regId);
                    setNewContestantData({
                      ...newContestantData,
                      regionId: regId,
                      region: match?.name || '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                >
                  {INITIAL_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <ImageUploadField
                id="new-contestant-avatar"
                label="Hình ảnh chân dung thí sinh (Upload tệp hoặc dán URL)"
                value={newContestantData.avatar}
                onChange={(avatar) => setNewContestantData({ ...newContestantData, avatar })}
                helperText="Hỗ trợ chọn ảnh từ máy, kéo thả hoặc dán link (tự động nén tối ưu)"
                placeholderText="https://images.unsplash.com/..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiểu sử / Giới thiệu thành tích
              </label>
              <textarea
                rows={3}
                id="new-contestant-bio"
                value={newContestantData.bio}
                onChange={(e) => setNewContestantData({ ...newContestantData, bio: e.target.value })}
                placeholder="Tóm tắt kinh nghiệm và thành tích đạt được..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <button
              type="submit"
              id="submit-new-contestant-btn"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white font-bold text-sm transition-all shadow-md cursor-pointer"
            >
              Thêm Thí Sinh Vào Cuộc Thi
            </button>
          </form>
        </div>
      )}

      {/* ===================== MODAL SỬA THÔNG TIN THÍ SINH ===================== */}
      {editingContestant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base">
                Chỉnh Sửa Thông Tin Thí Sinh: {editingContestant.name} ({editingContestant.sbd})
              </h3>
              <button
                type="button"
                onClick={() => setEditingContestant(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>

            <form onSubmit={handleSaveContestantEdit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên thí sinh
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chức danh
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.title || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phòng ban
                  </label>
                  <input
                    type="text"
                    value={editFormData.department || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <ImageUploadField
                  id="edit-contestant-avatar"
                  label="Hình ảnh chân dung thí sinh (Upload tệp hoặc dán URL)"
                  value={editFormData.avatar || ''}
                  onChange={(avatar) => setEditFormData({ ...editFormData, avatar })}
                  helperText="Hỗ trợ chọn ảnh từ máy, kéo thả hoặc dán link (tự động nén tối ưu)"
                  placeholderText="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiểu sử & Giới thiệu
                </label>
                <textarea
                  rows={3}
                  value={editFormData.bio || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingContestant(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL CHỈNH SỬA ĐIỂM GIÁM KHẢO ===================== */}
      {editingScoreRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Điều Chỉnh Điểm Giám Khảo</h3>
                <p className="text-xs text-blue-100">
                  {editingScoreRecord.judgeName} • Vòng {editingScoreRecord.round}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingScoreRecord(null)}
                className="text-blue-100 hover:text-white text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSaveOverrideScore} className="p-6 space-y-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500">Thí sinh được chấm:</div>
                <div className="font-bold text-slate-900 text-base">
                  {editingScoreRecord.contestantName}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Điểm hiện tại: <strong className="text-[#0042A3] font-black">{editingScoreRecord.currentScore} / 10</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nhập điểm mới (1 - 10):
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  required
                  id="override-score-input"
                  value={overrideScoreValue}
                  onChange={(e) => setOverrideScoreValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-black text-xl text-[#0042A3] text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do điều chỉnh / Ghi chú của Ban Tổ Chức:
                </label>
                <input
                  type="text"
                  value={overrideNotesValue}
                  onChange={(e) => setOverrideNotesValue(e.target.value)}
                  placeholder="Ví dụ: Đính chính điểm sau phúc khảo..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingScoreRecord(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={overrideStatus === 'saving'}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  {overrideStatus === 'saving' ? 'Đang cập nhật...' : 'Cập Nhật Điểm Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL CHỈNH SỬA THÔNG TIN GIÁM KHẢO ===================== */}
      {editingJudge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-base">
                  Sửa Thông Tin {editingJudge.code}: {editingJudge.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingJudge(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJudgeEdit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã Giám Khảo (Cố định):
                </label>
                <input
                  type="text"
                  disabled
                  value={editingJudge.code}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và Tên Giám Khảo <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  id="edit-judge-name-input"
                  value={editJudgeFormData.name}
                  onChange={(e) => setEditJudgeFormData({ ...editJudgeFormData, name: e.target.value })}
                  placeholder="Ví dụ: TS. Nguyễn Văn A..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chức Danh / Vai Trò / Ban Ngành:
                </label>
                <input
                  type="text"
                  required
                  id="edit-judge-title-input"
                  value={editJudgeFormData.title}
                  onChange={(e) => setEditJudgeFormData({ ...editJudgeFormData, title: e.target.value })}
                  placeholder="Ví dụ: Giám đốc Khối Công nghệ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <ImageUploadField
                  id="edit-judge-avatar"
                  label="Ảnh chân dung giám khảo (Upload tệp hoặc dán URL)"
                  value={editJudgeFormData.avatar}
                  onChange={(avatar) => setEditJudgeFormData({ ...editJudgeFormData, avatar })}
                  helperText="Hỗ trợ chọn ảnh từ máy tính/điện thoại, kéo thả hoặc dán link URL"
                  placeholderText="https://..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingJudge(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={judgeActionLoading === editingJudge.id}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  {judgeActionLoading === editingJudge.id ? 'Đang lưu...' : 'Lưu Thay Đổi Giám Khảo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL THÊM GIÁM KHẢO MỚI ===================== */}
      {isAddingJudge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-base">Thêm Giám Khảo Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingJudge(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewJudge} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và Tên Giám Khảo <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  id="new-judge-name-input"
                  value={newJudgeFormData.name}
                  onChange={(e) => setNewJudgeFormData({ ...newJudgeFormData, name: e.target.value })}
                  placeholder="Ví dụ: Giám khảo Nguyễn Văn B"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chức Danh / Vai Trò:
                </label>
                <input
                  type="text"
                  required
                  id="new-judge-title-input"
                  value={newJudgeFormData.title}
                  onChange={(e) => setNewJudgeFormData({ ...newJudgeFormData, title: e.target.value })}
                  placeholder="Ví dụ: Giám đốc Khối Vận hành"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <ImageUploadField
                  id="new-judge-avatar"
                  label="Ảnh chân dung giám khảo (Upload tệp hoặc dán URL)"
                  value={newJudgeFormData.avatar}
                  onChange={(avatar) => setNewJudgeFormData({ ...newJudgeFormData, avatar })}
                  helperText="Hỗ trợ chọn ảnh từ máy tính/điện thoại, kéo thả hoặc dán link URL"
                  placeholderText="https://..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingJudge(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  Thêm Vào Danh Sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: RESET TOÀN BỘ ĐIỂM SAU CHẠY THỬ ===================== */}
      {isResetScoresModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Reset Toàn Bộ Điểm Thí Sinh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Làm sạch dữ liệu sau khi chạy thử app trước giờ thi chính thức
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetScoresModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current stats snapshot */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">Số lượt chấm điểm hiện có trong hệ thống:</span>
                <span className="font-extrabold text-rose-600 text-sm bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                  {scores.length} lượt chấm
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">Tổng số thí sinh:</span>
                <span className="font-extrabold text-slate-900">{contestants.length} thí sinh</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">Số thí sinh hiện đang bị ẩn:</span>
                <span className="font-extrabold text-amber-600">{contestants.filter((c) => c.hidden).length} thí sinh</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Thao tác này sẽ <strong>xóa toàn bộ điểm chấm</strong> của tất cả các vòng (Vòng 1, Vòng 2, Vòng 3, Vòng 4) từ Ban giám khảo và Ban tổ chức, đưa điểm số của tất cả thí sinh về 0.
              </p>
              <div className="text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Lưu ý:</strong> Dữ liệu thông tin cá nhân và hình ảnh của thí sinh vẫn được giữ nguyên vẹn. Bảng xếp hạng và các trang chấm thi sẽ được làm mới hoàn toàn.
                </span>
              </div>
            </div>

            {/* Checkbox: Unhide all contestants if tested */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="checkbox"
                checked={resetUnhideContestants}
                onChange={(e) => setResetUnhideContestants(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#0042A3] focus:ring-blue-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Đồng thời mở lại toàn bộ thí sinh đã bị ẩn (Khôi phục đủ 24 thí sinh sẵn sàng)
                </span>
                <span className="text-slate-500">
                  Tự động bỏ trạng thái ẩn nếu bạn đã bấm thử nghiệm loại bớt thí sinh trong lúc chạy thử.
                </span>
              </div>
            </label>

            {resetScoresSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetScoresSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isResettingScores}
                onClick={() => setIsResetScoresModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                id="confirm-reset-all-scores-btn"
                disabled={isResettingScores}
                onClick={handleExecuteResetScores}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-rose-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isResettingScores ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang Xóa Điểm...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xác Nhận Xóa Sạch Điểm ({scores.length} lượt)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
