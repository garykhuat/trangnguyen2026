import React, { useState, useEffect, useCallback } from 'react';
import { Header, ActivePage } from './components/Header.tsx';
import { JudgeSelectorModal } from './components/JudgeSelectorModal.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { HomeView } from './views/HomeView.tsx';
import { ContestantsView } from './views/ContestantsView.tsx';
import { Round1View } from './views/Round1View.tsx';
import { Round3View } from './views/Round3View.tsx';
import { Round4View } from './views/Round4View.tsx';
import { AdminBackendView } from './views/AdminBackendView.tsx';
import { LeaderboardView } from './views/LeaderboardView.tsx';
import { Contestant, Judge, ScoreRecord, UserRole } from './types.ts';
import { INITIAL_CONTESTANTS, INITIAL_JUDGES, INITIAL_SCORES } from './data/initialData.ts';
import {
  fetchContestData,
  saveScoreApi,
  saveBatchScoresApi,
  saveRound2ScoresApi,
  overrideScoreApi,
  toggleContestantHiddenApi,
  updateContestantApi,
  addContestantApi,
  resetDataApi,
  resetAllScoresApi,
  setActiveJudgeApi,
  toggleJudgeHiddenApi,
  updateJudgeApi,
  addJudgeApi,
  syncDataApi,
} from './api.ts';
import {
  loadStoredContestants,
  saveStoredContestants,
  loadStoredJudges,
  saveStoredJudges,
  loadStoredScores,
  saveStoredScores,
  clearAllStoredContestData,
} from './utils/storage.ts';
import { AlertCircle, RefreshCw, Lock, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [contestants, setContestants] = useState<Contestant[]>(() => {
    return loadStoredContestants() || INITIAL_CONTESTANTS;
  });
  const [judges, setJudges] = useState<Judge[]>(() => {
    return loadStoredJudges() || INITIAL_JUDGES;
  });
  const [scores, setScores] = useState<ScoreRecord[]>(() => {
    return loadStoredScores() || INITIAL_SCORES;
  });
  const [activeJudgeId, setActiveJudgeId] = useState<string>(() => {
    return localStorage.getItem('active_judge_id') || 'GK01';
  });
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load contest data from backend on mount & reconcile with local storage
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchContestData();

      if (data) {
        const localScores = loadStoredScores();
        const localContestants = loadStoredContestants();
        const localJudges = loadStoredJudges();

        const serverScoresCount = Array.isArray(data.scores) ? data.scores.length : 0;
        const localScoresCount = Array.isArray(localScores) ? localScores.length : 0;

        // If local browser has scores while server has 0 (e.g. server restarted in Cloud container)
        if (localScoresCount > 0 && serverScoresCount === 0) {
          try {
            console.log('[App] Restoring local session to server...');
            const synced = await syncDataApi({
              contestants: localContestants || undefined,
              judges: localJudges || undefined,
              scores: localScores || undefined,
            });
            if (synced.contestants) {
              setContestants(synced.contestants);
              saveStoredContestants(synced.contestants);
            }
            if (synced.judges) {
              setJudges(synced.judges);
              saveStoredJudges(synced.judges);
            }
            if (synced.scores) {
              setScores(synced.scores);
              saveStoredScores(synced.scores);
            }
          } catch (syncErr) {
            console.warn('[App] Could not sync local data to server:', syncErr);
          }
        } else {
          // Normal synchronization from server
          if (Array.isArray(data.contestants) && data.contestants.length > 0) {
            setContestants(data.contestants);
            saveStoredContestants(data.contestants);
          }
          if (Array.isArray(data.judges) && data.judges.length > 0) {
            setJudges(data.judges);
            saveStoredJudges(data.judges);
          }
          if (Array.isArray(data.scores)) {
            setScores(data.scores);
            saveStoredScores(data.scores);
          }
        }

        if (data.activeJudgeId && !localStorage.getItem('active_judge_id')) {
          setActiveJudgeId(data.activeJudgeId);
        }
      }
    } catch (err: any) {
      console.warn('[App] Could not fetch from server, using local fallback state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reactive automatic local storage saving so data is NEVER lost on F5
  useEffect(() => {
    if (!loading && contestants.length > 0) {
      saveStoredContestants(contestants);
    }
  }, [contestants, loading]);

  useEffect(() => {
    if (!loading && judges.length > 0) {
      saveStoredJudges(judges);
    }
  }, [judges, loading]);

  useEffect(() => {
    if (!loading) {
      saveStoredScores(scores);
    }
  }, [scores, loading]);

  // Set active judge
  const handleSelectJudge = async (judgeId: string) => {
    setActiveJudgeId(judgeId);
    localStorage.setItem('active_judge_id', judgeId);
    try {
      await setActiveJudgeApi(judgeId);
    } catch (err) {
      console.warn('[App] Failed to sync active judge with server:', err);
    }
  };

  // Save score for a round (Robust: Optimistic state update + server sync + no crash)
  const handleSaveScore = async (
    contestantId: string,
    round: number,
    score: number,
    notes?: string,
    customJudgeId?: string
  ) => {
    const effectiveJudgeId = (customJudgeId && customJudgeId !== 'undefined' ? customJudgeId : activeJudgeId) || 'GK01';
    const numScore = Math.max(0, Math.min(10, Math.round(Number(score) * 100) / 100));

    // Optimistically update local scores state first so user progress is never lost
    const optimisticEntry: ScoreRecord = {
      id: `SC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      contestantId,
      round,
      judgeId: effectiveJudgeId,
      score: numScore,
      notes: notes || '',
      updatedAt: new Date().toISOString(),
    };

    setScores((prev) => {
      const existingIdx = prev.findIndex(
        (s) => s.contestantId === contestantId && Number(s.round) === Number(round) && s.judgeId === effectiveJudgeId
      );
      if (existingIdx >= 0) {
        const clone = [...prev];
        clone[existingIdx] = { ...clone[existingIdx], score: numScore, notes: notes || '', updatedAt: optimisticEntry.updatedAt };
        return clone;
      }
      return [...prev, optimisticEntry];
    });

    try {
      const res = await saveScoreApi(contestantId, round, effectiveJudgeId, numScore, notes);
      if (res && res.allScores) {
        setScores(res.allScores);
      } else if (res && res.score) {
        setScores((prev) => {
          const existingIdx = prev.findIndex(
            (s) => s.contestantId === contestantId && Number(s.round) === Number(round) && s.judgeId === effectiveJudgeId
          );
          if (existingIdx >= 0) {
            const clone = [...prev];
            clone[existingIdx] = res.score;
            return clone;
          }
          return [...prev, res.score];
        });
      }
    } catch (err: any) {
      console.warn('[App] Server save failed, saved in browser session:', err);
      showToast('Đã lưu điểm vào bộ nhớ trình duyệt (máy chủ phản hồi chậm)', 'info');
    }
  };

  // Batch save multiple scores at once
  const handleSaveBatchScores = async (
    batchScores: { contestantId: string; round: number; judgeId?: string; score: number; notes?: string }[]
  ) => {
    const preparedScores = batchScores.map((item) => ({
      contestantId: item.contestantId,
      round: item.round,
      judgeId: item.judgeId || activeJudgeId || 'GK01',
      score: Math.max(0, Math.min(10, Math.round(Number(item.score) * 100) / 100)),
      notes: item.notes || '',
    }));

    // Optimistically update local scores
    setScores((prev) => {
      const clone = [...prev];
      for (const item of preparedScores) {
        const existingIdx = clone.findIndex(
          (s) => s.contestantId === item.contestantId && Number(s.round) === Number(item.round) && s.judgeId === item.judgeId
        );
        const record: ScoreRecord = {
          id: existingIdx >= 0 ? clone[existingIdx].id : `SC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          contestantId: item.contestantId,
          round: item.round,
          judgeId: item.judgeId,
          score: item.score,
          notes: item.notes,
          updatedAt: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          clone[existingIdx] = record;
        } else {
          clone.push(record);
        }
      }
      return clone;
    });

    try {
      const res = await saveBatchScoresApi(preparedScores);
      if (res && res.allScores) {
        setScores(res.allScores);
      }
      showToast(`Đã lưu thành công ${preparedScores.length} điểm số!`, 'success');
    } catch (err: any) {
      console.warn('[App] Batch score server save failed, updated locally:', err);
      showToast(`Đã lưu ${preparedScores.length} điểm số vào bộ nhớ cục bộ`, 'info');
    }
  };

  // Toggle hidden state (eliminate contestant from round 3 & 4)
  const handleToggleHidden = async (id: string, currentHidden: boolean) => {
    try {
      const updated = await toggleContestantHiddenApi(id, !currentHidden);
      setContestants((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setContestants((prev) =>
        prev.map((c) => (c.id === id ? { ...c, hidden: !currentHidden } : c))
      );
    }
  };

  // Update contestant info & photo
  const handleUpdateContestant = async (id: string, data: Partial<Contestant>) => {
    try {
      const updated = await updateContestantApi(id, data);
      setContestants((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast('Đã cập nhật thông tin thí sinh!', 'success');
    } catch (err) {
      setContestants((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      showToast('Đã lưu thông tin thí sinh tạm thời', 'info');
    }
  };

  // Add new contestant
  const handleAddContestant = async (data: Partial<Contestant>) => {
    try {
      const created = await addContestantApi(data);
      setContestants((prev) => [...prev, created]);
      showToast('Đã thêm thí sinh mới thành công!', 'success');
    } catch (err) {
      const fallbackId = `TS${contestants.length + 1}`;
      const newC: Contestant = {
        id: fallbackId,
        sbd: `SBD-0${contestants.length + 1}`,
        name: data.name || '',
        title: data.title || '',
        department: data.department || '',
        region: data.region || 'Khu vực 1',
        regionId: data.regionId || 1,
        avatar: data.avatar || '',
        bio: data.bio || '',
        motto: data.motto || '',
        strengths: data.strengths || [],
        hidden: false,
      };
      setContestants((prev) => [...prev, newC]);
      showToast('Đã thêm thí sinh tạm thời', 'info');
    }
  };

  // Save Round 2 scores
  const handleSaveRound2Scores = async (
    r2Scores: { contestantId: string; score: number; notes?: string }[]
  ) => {
    // Optimistic local update
    setScores((prev) => {
      const clone = [...prev];
      for (const item of r2Scores) {
        const existingIdx = clone.findIndex(
          (s) => s.contestantId === item.contestantId && Number(s.round) === 2 && s.judgeId === 'ADMIN'
        );
        const record: ScoreRecord = {
          id: existingIdx >= 0 ? clone[existingIdx].id : `SC-R2-${item.contestantId}`,
          contestantId: item.contestantId,
          round: 2,
          judgeId: 'ADMIN',
          score: Math.max(0, Math.min(10, Math.round(Number(item.score) * 100) / 100)),
          notes: item.notes || 'Điểm vòng 2 do Ban Tổ Chức nhập',
          updatedAt: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          clone[existingIdx] = record;
        } else {
          clone.push(record);
        }
      }
      return clone;
    });

    try {
      const res = await saveRound2ScoresApi(r2Scores);
      if (res && res.allScores) {
        setScores(res.allScores);
      }
      showToast('Đã lưu điểm Vòng 2 thành công!', 'success');
    } catch (err) {
      console.warn('[App] Save round 2 server error, preserved locally:', err);
      showToast('Đã lưu điểm Vòng 2 vào bộ nhớ trình duyệt', 'info');
    }
  };

  // Admin override score
  const handleOverrideScore = async (
    contestantId: string,
    round: number,
    judgeId: string,
    newScore: number,
    notes?: string
  ) => {
    const numScore = Math.max(0, Math.min(10, Math.round(Number(newScore) * 100) / 100));

    // Optimistic local update
    setScores((prev) => {
      const existingIdx = prev.findIndex(
        (s) => s.contestantId === contestantId && Number(s.round) === Number(round) && s.judgeId === judgeId
      );
      const record: ScoreRecord = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `SC-OVR-${Date.now()}`,
        contestantId,
        round: Number(round),
        judgeId,
        score: numScore,
        notes: notes || 'Điểm do Quản trị viên cập nhật',
        updatedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        const clone = [...prev];
        clone[existingIdx] = record;
        return clone;
      }
      return [...prev, record];
    });

    try {
      const res = await overrideScoreApi(contestantId, round, judgeId, numScore, notes);
      if (res && res.allScores) {
        setScores(res.allScores);
      }
      showToast('Đã cập nhật điểm thành công!', 'success');
    } catch (err) {
      console.warn('[App] Override server error, preserved locally:', err);
      showToast('Đã cập nhật điểm trong bộ nhớ trình duyệt', 'info');
    }
  };

  // Reset database to original sample data
  const handleResetData = async () => {
    clearAllStoredContestData();
    await resetDataApi();
    await loadData();
    showToast('Đã đặt lại dữ liệu mẫu ban đầu thành công!', 'success');
  };

  // Reset all contestant scores to 0 (for testing before official contest)
  const handleResetAllScores = async (unhideAllContestants = false) => {
    try {
      const res = await resetAllScoresApi(unhideAllContestants);
      setScores([]);
      saveStoredScores([]);
      if (res.contestants) {
        setContestants(res.contestants);
        saveStoredContestants(res.contestants);
      }
      showToast('Đã xóa toàn bộ điểm số. Sẵn sàng cho cuộc thi!', 'success');
    } catch (err: any) {
      console.warn('Backend score reset failed, resetting local state:', err);
      setScores([]);
      saveStoredScores([]);
      if (unhideAllContestants) {
        setContestants((prev) => {
          const updated = prev.map((c) => ({ ...c, hidden: false }));
          saveStoredContestants(updated);
          return updated;
        });
      }
      showToast('Đã xóa toàn bộ điểm số trong phiên làm việc', 'info');
    }
  };

  // Role switching
  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    localStorage.setItem('contest_user_role', role);
    if (role === 'judge') {
      if (activePage === 'admin' || activePage === 'leaderboard') {
        setActivePage('home');
      }
    }
  };

  const handleAdminLoginSuccess = () => {
    handleRoleChange('admin');
    setIsAdminLoginOpen(false);
    setActivePage('admin');
  };

  // Judge management handlers
  const handleToggleJudgeHidden = async (id: string, currentHidden: boolean) => {
    try {
      const updated = await toggleJudgeHiddenApi(id, !currentHidden);
      setJudges((prev) => prev.map((j) => (j.id === id ? updated : j)));
    } catch (err) {
      setJudges((prev) =>
        prev.map((j) => (j.id === id ? { ...j, hidden: !currentHidden } : j))
      );
    }
  };

  const handleUpdateJudge = async (id: string, data: Partial<Judge>) => {
    try {
      const updated = await updateJudgeApi(id, data);
      setJudges((prev) => prev.map((j) => (j.id === id ? updated : j)));
    } catch (err) {
      setJudges((prev) => prev.map((j) => (j.id === id ? { ...j, ...data } : j)));
    }
  };

  const handleAddJudge = async (data: Partial<Judge>) => {
    try {
      const created = await addJudgeApi(data);
      setJudges((prev) => [...prev, created]);
    } catch (err) {
      const newCode = `GK${String(judges.length + 1).padStart(2, '0')}`;
      const newJ: Judge = {
        id: newCode,
        code: newCode,
        name: data.name || '',
        title: data.title || 'Ban Giám Khảo',
        avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        hidden: false,
      };
      setJudges((prev) => [...prev, newJ]);
    }
  };

  const activeJudges = judges.filter((j) => !j.hidden);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activePage={activePage}
        onNavigate={(page) => setActivePage(page)}
        judges={judges}
        currentJudgeId={activeJudgeId}
        onOpenJudgeSelector={() => setIsJudgeModalOpen(true)}
        contestantCount={contestants.length}
        activeRoundCount={contestants.filter((c) => !c.hidden).length}
        userRole={userRole}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onSwitchToJudge={() => handleRoleChange('judge')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && contestants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0042A3] mb-3" />
            <p className="text-sm font-semibold">Đang tải dữ liệu cuộc thi...</p>
          </div>
        ) : (activePage === 'admin' || activePage === 'leaderboard') && userRole !== 'admin' ? (
          /* RBAC Guard: Giám khảo không được truy cập Admin backend hoặc Bảng điểm */
          <div className="max-w-lg mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-lg space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Khu Vực Giới Hạn Quản Trị Viên
            </h2>
            <p className="text-sm text-slate-600">
              Theo quy chế cuộc thi, giao diện trên máy tính bảng của Ban Giám Khảo không bao gồm hệ thống Quản trị backend và Bảng điểm xếp hạng. Vui lòng đăng nhập với tư cách Quản trị viên để truy cập.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActivePage('home')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Về Trang Chủ
              </button>
              <button
                type="button"
                onClick={() => setIsAdminLoginOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0042A3] to-[#005FE6] hover:from-[#00388A] hover:to-[#004EC4] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Đăng Nhập Quản Trị Viên
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Trang 1: Trang chủ */}
            {activePage === 'home' && (
              <HomeView
                onNavigate={(p) => setActivePage(p)}
                contestants={contestants}
                judges={judges}
                scores={scores}
                activeJudgeId={activeJudgeId}
                onOpenJudgeSelector={() => setIsJudgeModalOpen(true)}
                userRole={userRole}
                onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
              />
            )}

            {/* Trang 2: Danh sách 24 thí sinh & popup chi tiết */}
            {activePage === 'contestants' && (
              <ContestantsView
                contestants={contestants}
                scores={scores}
                onToggleHidden={handleToggleHidden}
                onUpdateContestant={handleUpdateContestant}
              />
            )}

            {/* Trang 3: Chấm điểm Vòng 1 (8 nút khu vực, 3 thí sinh/khu vực) */}
            {activePage === 'round1' && (
              <Round1View
                contestants={contestants}
                judges={judges}
                scores={scores}
                activeJudgeId={activeJudgeId}
                onSaveScore={handleSaveScore}
                onSaveBatchScores={handleSaveBatchScores}
                onOpenJudgeSelector={() => setIsJudgeModalOpen(true)}
                onUpdateContestant={handleUpdateContestant}
              />
            )}

            {/* Trang 4: Chấm điểm Vòng 3 (chỉ thí sinh không bị ẩn) */}
            {activePage === 'round3' && (
              <Round3View
                contestants={contestants}
                judges={judges}
                scores={scores}
                activeJudgeId={activeJudgeId}
                onSaveScore={handleSaveScore}
                onSaveBatchScores={handleSaveBatchScores}
                onOpenJudgeSelector={() => setIsJudgeModalOpen(true)}
                onNavigateToAdmin={() => {
                  if (userRole === 'admin') setActivePage('admin');
                  else setIsAdminLoginOpen(true);
                }}
                onUpdateContestant={handleUpdateContestant}
              />
            )}

            {/* Trang 5: Chấm điểm Vòng 4 (Chung kết, chỉ thí sinh không bị ẩn) */}
            {activePage === 'round4' && (
              <Round4View
                contestants={contestants}
                judges={judges}
                scores={scores}
                activeJudgeId={activeJudgeId}
                onSaveScore={handleSaveScore}
                onSaveBatchScores={handleSaveBatchScores}
                onOpenJudgeSelector={() => setIsJudgeModalOpen(true)}
                onNavigateToAdmin={() => {
                  if (userRole === 'admin') setActivePage('admin');
                  else setIsAdminLoginOpen(true);
                }}
                onNavigateToLeaderboard={() => {
                  if (userRole === 'admin') setActivePage('leaderboard');
                  else setIsAdminLoginOpen(true);
                }}
                onUpdateContestant={handleUpdateContestant}
              />
            )}

            {/* Trang 6: Quản trị Backend (Ẩn thí sinh, ẩn/sửa tên GK, input điểm vòng 2, sửa điểm GK) */}
            {activePage === 'admin' && (
              <AdminBackendView
                contestants={contestants}
                judges={judges}
                scores={scores}
                onToggleHidden={handleToggleHidden}
                onUpdateContestant={handleUpdateContestant}
                onAddContestant={handleAddContestant}
                onSaveRound2Scores={handleSaveRound2Scores}
                onOverrideScore={handleOverrideScore}
                onResetData={handleResetData}
                onResetAllScores={handleResetAllScores}
                onToggleJudgeHidden={handleToggleJudgeHidden}
                onUpdateJudge={handleUpdateJudge}
                onAddJudge={handleAddJudge}
              />
            )}

            {/* Trang 7: Bảng Tổng Sắp & Xếp Hạng */}
            {activePage === 'leaderboard' && (
              <LeaderboardView
                contestants={contestants}
                scores={scores}
                judges={judges}
                onToggleHidden={handleToggleHidden}
                onUpdateContestant={handleUpdateContestant}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Hệ Thống Chấm Điểm Cuộc Thi Nội Bộ © 2026 • 24 Thí Sinh & {activeJudges.length} Giám Khảo Đang Chấm
          </span>
          <div className="flex items-center gap-4">
            {userRole === 'admin' ? (
              <button
                type="button"
                onClick={() => setActivePage('admin')}
                className="text-[#0042A3] hover:text-[#00388A] font-bold cursor-pointer"
              >
                Quản trị viên (Admin)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdminLoginOpen(true)}
                className="text-slate-500 hover:text-[#0042A3] font-medium cursor-pointer"
              >
                Đăng nhập Quản trị viên
              </button>
            )}
            <span>•</span>
            {userRole === 'admin' ? (
              <button
                type="button"
                onClick={() => setActivePage('leaderboard')}
                className="text-slate-600 hover:text-[#0042A3] font-semibold cursor-pointer"
              >
                Bảng xếp hạng
              </button>
            ) : (
              <span className="text-slate-400">Bảng điểm (Dành cho Admin)</span>
            )}
          </div>
        </div>
      </footer>

      {/* Judge Selector Modal */}
      {isJudgeModalOpen && (
        <JudgeSelectorModal
          judges={judges}
          currentJudgeId={activeJudgeId}
          onSelectJudge={handleSelectJudge}
          onClose={() => setIsJudgeModalOpen(false)}
          onOpenAdminLogin={() => {
            setIsJudgeModalOpen(false);
            setIsAdminLoginOpen(true);
          }}
          onUpdateJudge={handleUpdateJudge}
        />
      )}

      {/* Admin Login Modal */}
      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onSuccess={handleAdminLoginSuccess}
        />
      )}

      {/* Global Notification Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
