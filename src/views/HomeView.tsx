import React from 'react';
import {
  Users,
  Target,
  Award,
  Crown,
  BarChart3,
  Settings,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Flame,
} from 'lucide-react';
import { ActivePage, UserRole } from '../components/Header.tsx';
import { Contestant, Judge, ScoreRecord } from '../types.ts';

interface HomeViewProps {
  onNavigate: (page: ActivePage) => void;
  contestants: Contestant[];
  judges: Judge[];
  scores: ScoreRecord[];
  activeJudgeId: string;
  onOpenJudgeSelector: () => void;
  onSelectJudge?: (judgeId: string) => void;
  userRole: UserRole;
  onOpenAdminLogin?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  contestants,
  judges,
  scores,
  activeJudgeId,
  onOpenJudgeSelector,
  onSelectJudge,
  userRole,
  onOpenAdminLogin,
}) => {
  const activeJudges = judges.filter((j) => !j.hidden);

  // Statistics
  const totalContestants = contestants.length;
  const activeContestants = contestants.filter((c) => !c.hidden).length;
  const hiddenContestants = contestants.filter((c) => c.hidden).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Welcome Banner & Current Judge Identity */}
      <div
        id="home-welcome-banner"
        style={{ background: 'linear-gradient(135deg, #0042A3 0%, #002e75 50%, #001a47 100%)' }}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0042A3] via-[#002e75] to-[#001a47] text-white p-6 sm:p-8 shadow-xl border border-[#0042A3]/40"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-bold border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
              CỔNG CHẤM ĐIỂM CHÍNH THỨC DÀNH CHO BAN GIÁM KHẢO
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Trạng Nguyên 2026 - Tea & Tech
            </h1>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div>
            <div className="text-xs text-blue-200">Tổng Thí Sinh</div>
            <div className="text-2xl font-black text-white">{totalContestants} Thí sinh</div>
          </div>
          <div>
            <div className="text-xs text-blue-200">Vào Vòng 3 & 4</div>
            <div className="text-2xl font-black text-emerald-400">{activeContestants} Đang đi tiếp</div>
          </div>
          <div>
            <div className="text-xs text-blue-200">Đã Ẩn / Loại</div>
            <div className="text-2xl font-black text-rose-400">{hiddenContestants} Thí sinh</div>
          </div>
          <div>
            <div className="text-xs text-blue-200">Ban Giám Khảo</div>
            <div className="text-2xl font-black text-amber-300">
              {activeJudges.length} Giám Khảo
            </div>
          </div>
        </div>
      </div>

      {/* Main Requested Navigation Menu Tiles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#0042A3]" />
            Nội dung chính
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Chạm vào từng mục để bắt đầu chấm thi hoặc xem thông tin
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Menu item 1: Danh sách thí sinh */}
          <button
            type="button"
            id="home-menu-contestants"
            onClick={() => onNavigate('contestants')}
            className="group relative text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#0042A3] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-start gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0042A3] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0042A3] transition-colors">
                  Danh Sách Thí Sinh
                </h3>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0042A3] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Xem toàn bộ 24 thí sinh dự thi, hình ảnh, chức danh và bấm để xem popup chi tiết tiểu sử từng thí sinh.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#0042A3]">
                24 Thí sinh • 8 Khu vực
              </div>
            </div>
          </button>

          {/* Menu item 2: Vòng 1 */}
          <button
            type="button"
            id="home-menu-round1"
            onClick={() => onNavigate('round1')}
            className="group relative text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#0042A3] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-start gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0042A3] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Target className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0042A3] transition-colors">
                  Vòng 1
                </h3>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0042A3] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Phân chia theo các nút khu vực, mỗi khu vực gồm đúng 3 thí sinh. Chấm điểm 1 - 10 và lưu điểm tự động.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#0042A3]">
                8 Khu vực • 3 Thí sinh/Khu vực
              </div>
            </div>
          </button>

          {/* Menu item 3: Vòng 3 */}
          <button
            type="button"
            id="home-menu-round3"
            onClick={() => onNavigate('round3')}
            className="group relative text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#0042A3] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-start gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0042A3] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Award className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0042A3] transition-colors">
                  Vòng 3
                </h3>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0042A3] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Hiển thị hình ảnh và thông tin thí sinh đi tiếp vào Vòng 3. Thí sinh bị ẩn ở các vòng trước sẽ tự động loại trừ.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#0042A3]">
                {activeContestants} Thí sinh đủ điều kiện
              </div>
            </div>
          </button>

          {/* Menu item 4: Vòng 4 */}
          <button
            type="button"
            id="home-menu-round4"
            onClick={() => onNavigate('round4')}
            className="group relative text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#0042A3] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-start gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Crown className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0042A3] transition-colors">
                  Vòng 4
                </h3>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0042A3] group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Chấm điểm vòng quyết định ngôi vị quán quân. Chỉ các thí sinh lọt vào Vòng 4 mới được hiển thị.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700">
                Chung Kết • Điểm 1 - 10
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Quick Action Cards: Leaderboard & Backend Admin (QUẢN TRỊ VIÊN ONLY) */}
      {userRole === 'admin' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Bảng Điểm & Xếp Hạng</h4>
                <p className="text-xs text-slate-600">Xem tổng điểm cả 4 vòng thi & Top dẫn đầu</p>
              </div>
            </div>
            <button
              type="button"
              id="home-view-leaderboard-btn"
              onClick={() => onNavigate('leaderboard')}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Xem bảng điểm
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-100 to-blue-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Quản Trị Backend</h4>
                <p className="text-xs text-slate-600">Quản lý giám khảo, ẩn thí sinh & sửa điểm</p>
              </div>
            </div>
            <button
              type="button"
              id="home-view-admin-btn"
              onClick={() => onNavigate('admin')}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Quản trị
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#0042A3] shrink-0" />
            <span>
              Giao diện Giám Khảo: Điểm số của bạn được bảo mật và tự động đồng bộ về máy chủ ban tổ chức.
            </span>
          </div>
          {onOpenAdminLogin && (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="text-[#0042A3] hover:text-[#003585] font-bold underline cursor-pointer shrink-0"
            >
              Đăng nhập Ban Tổ Chức (Admin)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
