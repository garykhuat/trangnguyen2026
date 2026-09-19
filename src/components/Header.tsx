import React from 'react';
import {
  Trophy,
  Users,
  Target,
  Award,
  Crown,
  Settings,
  BarChart3,
  UserCheck,
  ChevronDown,
  Menu,
  X,
  Home,
  Shield,
  LogOut,
  Lock,
  QrCode,
} from 'lucide-react';
import { Judge } from '../types.ts';

export type ActivePage = 'home' | 'contestants' | 'round1' | 'round3' | 'round4' | 'admin' | 'leaderboard';
export type UserRole = 'judge' | 'admin';

interface HeaderProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  judges: Judge[];
  currentJudgeId: string;
  onOpenJudgeSelector: () => void;
  contestantCount: number;
  activeRoundCount: number;
  userRole: UserRole;
  onOpenAdminLogin: () => void;
  onSwitchToJudge: () => void;
  onOpenShareModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onNavigate,
  judges,
  currentJudgeId,
  onOpenJudgeSelector,
  contestantCount,
  userRole,
  onOpenAdminLogin,
  onSwitchToJudge,
  onOpenShareModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const activeJudges = judges.filter((j) => !j.hidden);
  const currentJudge = activeJudges.find((j) => j.id === currentJudgeId) || activeJudges[0] || judges[0];

  // Role-based navigation items
  // Giám Khảo CHỈ THẤY: Trang chủ, Danh sách thí sinh, Vòng 1, Vòng 3, Vòng 4.
  // Tuyệt đối KHÔNG có Quản trị backend và Bảng điểm xếp hạng!
  const allNavItems = [
    { id: 'home' as ActivePage, label: 'Trang Chủ', icon: Home, roles: ['judge', 'admin'] },
    { id: 'contestants' as ActivePage, label: 'Danh Sách Thí Sinh', icon: Users, badge: `${contestantCount}`, roles: ['judge', 'admin'] },
    { id: 'round1' as ActivePage, label: 'Vòng 1', icon: Target, roles: ['judge', 'admin'] },
    { id: 'round3' as ActivePage, label: 'Vòng 3', icon: Award, roles: ['judge', 'admin'] },
    { id: 'round4' as ActivePage, label: 'Vòng 4', icon: Crown, roles: ['judge', 'admin'] },
    { id: 'leaderboard' as ActivePage, label: 'Bảng Điểm & Xếp Hạng', icon: BarChart3, roles: ['admin'] },
    { id: 'admin' as ActivePage, label: 'Quản Trị Backend', icon: Settings, roles: ['admin'] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Logo Brand */}
          <div
            id="brand-logo-btn"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#0042A3] to-[#0060E6] flex items-center justify-center text-white shadow-md shadow-blue-300/40">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  JUDGE-PRO
                </span>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                  userRole === 'admin' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-50 text-[#0042A3] border border-blue-200'
                }`}>
                  {userRole === 'admin' ? 'Chế Độ Quản Trị' : 'Giao Diện Giám Khảo'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                {userRole === 'admin'
                  ? 'Quản trị viên Backend & Ban Tổ Chức'
                  : `Chấm điểm trực tiếp • ${activeJudges.length} Giám Khảo`}
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`nav-btn-${item.id}`}
                  onClick={() => onNavigate(item.id)}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Area: Identity Switcher & Admin Status */}
          <div className="flex items-center gap-2">
            {/* Multi-device connect button */}
            {onOpenShareModal && (
              <button
                type="button"
                id="header-connect-devices-btn"
                onClick={onOpenShareModal}
                title="Kết nối đa thiết bị / Quét mã QR để mở trên điện thoại, iPad"
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Kết Nối Máy</span>
              </button>
            )}

            {userRole === 'admin' ? (
              // Admin Profile Card
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-900 flex items-center gap-2 shadow-xs">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-[10px] uppercase font-black text-amber-800">
                      QUẢN TRỊ VIÊN
                    </div>
                    <div className="text-xs font-extrabold text-amber-950">
                      Ban Tổ Chức
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  id="header-switch-to-judge-btn"
                  onClick={onSwitchToJudge}
                  title="Chuyển sang giao diện chấm điểm của Giám khảo"
                  className="px-2.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden md:inline">Về Giám Khảo</span>
                </button>
              </div>
            ) : (
              // Judge Profile Card
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="judge-profile-btn"
                  onClick={onOpenJudgeSelector}
                  title="Nhấn để đổi giám khảo chấm trên thiết bị này"
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 transition-all flex items-center gap-2 cursor-pointer text-left shadow-xs"
                >
                  <img
                    src={currentJudge?.avatar}
                    alt={currentJudge?.name}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border border-white shadow-xs shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="hidden sm:block">
                    <div className="text-[10px] uppercase font-extrabold text-[#0042A3] flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {currentJudge?.code}
                    </div>
                    <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                      {currentJudge?.name}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#0042A3] ml-0.5" />
                </button>

                {/* Admin Access Button for BTC */}
                <button
                  type="button"
                  id="header-admin-login-btn"
                  onClick={onOpenAdminLogin}
                  title="Đăng nhập Quản trị viên (Ban Tổ Chức)"
                  className="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <div className="py-2 px-3 mb-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              {userRole === 'admin' ? 'Chế độ hiện tại:' : 'Đang chấm bằng:'}
            </span>
            <span className="text-xs font-bold text-[#0042A3]">
              {userRole === 'admin'
                ? 'Quản Trị Viên BTC'
                : `${currentJudge?.name} (${currentJudge?.code})`}
            </span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`mobile-nav-btn-${item.id}`}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0042A3] to-[#005FE6] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
