import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CONTESTANTS, INITIAL_JUDGES, INITIAL_SCORES } from './src/data/initialData.ts';
import type { Contestant, Judge, ScoreRecord } from './src/types.ts';

const __filenameResolved = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const __dirnameResolved = typeof __dirname !== 'undefined' ? __dirname : path.dirname(__filenameResolved);

const app = express();
const PORT = 3000;

// Enable CORS for all incoming requests (safe for embedded previews)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Disable caching for all API responses so browser F5 / reload always retrieves fresh data
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Enable JSON parser with support for base64 avatars
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Persistent storage setup
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'contest_data.json');

interface DatabaseStore {
  contestants: Contestant[];
  judges: Judge[];
  scores: ScoreRecord[];
  activeJudgeId: string;
  updatedAt: string;
}

let store: DatabaseStore = {
  contestants: JSON.parse(JSON.stringify(INITIAL_CONTESTANTS)),
  judges: JSON.parse(JSON.stringify(INITIAL_JUDGES)),
  scores: JSON.parse(JSON.stringify(INITIAL_SCORES)),
  activeJudgeId: 'GK01',
  updatedAt: new Date().toISOString(),
};

// Load existing data from file if present
function loadStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.contestants && parsed.judges && parsed.scores) {
        store = parsed;
        // Migrate region names to new requested format without prefixes
        const REGION_MAP: Record<number, string> = {
          1: 'Khu vực Miền Bắc',
          2: 'Khu vực Miền Trung',
          3: 'Khu vực Đông TP.HCM',
          4: 'Khu vực Tây TP.HCM',
          5: 'Khu vực Miền Tây',
          6: 'Trung tâm kinh doanh & AMC',
          7: 'Liên quân Kinh doanh & Giám sát',
          8: 'Liên quân Hỗ trợ & Đơn vị không thuộc Khối',
        };
        store.contestants.forEach((c) => {
          if (c.regionId && REGION_MAP[c.regionId]) {
            c.region = REGION_MAP[c.regionId];
          }
        });
        saveStore();
        console.log(`[Store] Loaded and verified data: ${store.contestants.length} contestants, ${store.scores.length} scores.`);
        return;
      }
    }
    // If not found, save initial store
    saveStore();
  } catch (err) {
    console.error('[Store] Error loading data from file, using in-memory default:', err);
  }
}

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store] Error saving data to file:', err);
  }
}

loadStore();

// ======================== API ROUTES ========================

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Get full contest data
app.get('/api/contest', (req, res) => {
  res.json({
    contestants: store.contestants,
    judges: store.judges,
    scores: store.scores,
    activeJudgeId: store.activeJudgeId,
    updatedAt: store.updatedAt,
  });
});

// 3. Set active judge (on device)
app.post('/api/active-judge', (req, res) => {
  const { judgeId } = req.body;
  if (judgeId) {
    store.activeJudgeId = judgeId;
    saveStore();
  }
  res.json({ success: true, activeJudgeId: store.activeJudgeId });
});

// 4. Update / Save score for a round by a judge
app.post('/api/scores', (req, res) => {
  const { contestantId, round, judgeId, score, notes } = req.body;

  if (!contestantId || round === undefined || score === undefined) {
    return res.status(400).json({ error: 'Thiếu thông tin chấm điểm (cần có thí sinh, vòng thi và điểm).' });
  }

  const effectiveJudgeId = judgeId ? String(judgeId).trim() : (store.activeJudgeId || 'GK01');
  const numRound = Number(round);
  const numScore = Math.max(0, Math.min(10, Math.round(Number(score) * 100) / 100));

  const existingIndex = store.scores.findIndex(
    (s) =>
      String(s.contestantId).trim() === String(contestantId).trim() &&
      Number(s.round) === numRound &&
      String(s.judgeId).trim() === effectiveJudgeId
  );

  const scoreEntry: ScoreRecord = {
    id: existingIndex >= 0 ? store.scores[existingIndex].id : `SC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    contestantId: String(contestantId).trim(),
    round: numRound,
    judgeId: effectiveJudgeId,
    score: numScore,
    notes: notes !== undefined ? String(notes).trim() : (existingIndex >= 0 ? store.scores[existingIndex].notes : ''),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    store.scores[existingIndex] = scoreEntry;
  } else {
    store.scores.push(scoreEntry);
  }

  saveStore();
  console.log(`[Score Saved] Contestant: ${contestantId}, Round: ${numRound}, Judge: ${effectiveJudgeId}, Score: ${numScore}`);
  res.json({ success: true, score: scoreEntry, allScores: store.scores });
});

// 4b. Batch save scores (Lưu nhiều điểm cùng một lúc cho một khu vực hoặc nhóm)
app.post('/api/scores/batch', (req, res) => {
  const { scores: batchScores } = req.body;
  if (!Array.isArray(batchScores)) {
    return res.status(400).json({ error: 'Dữ liệu scores phải là một danh sách.' });
  }

  const savedRecords: ScoreRecord[] = [];
  for (const item of batchScores) {
    const { contestantId, round, judgeId, score, notes } = item;
    if (!contestantId || round === undefined || score === undefined) continue;

    const effectiveJudgeId = judgeId ? String(judgeId).trim() : (store.activeJudgeId || 'GK01');
    const numRound = Number(round);
    const numScore = Math.max(0, Math.min(10, Math.round(Number(score) * 100) / 100));

    const existingIndex = store.scores.findIndex(
      (s) =>
        String(s.contestantId).trim() === String(contestantId).trim() &&
        Number(s.round) === numRound &&
        String(s.judgeId).trim() === effectiveJudgeId
    );

    const record: ScoreRecord = {
      id: existingIndex >= 0 ? store.scores[existingIndex].id : `SC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      contestantId: String(contestantId).trim(),
      round: numRound,
      judgeId: effectiveJudgeId,
      score: numScore,
      notes: notes !== undefined ? String(notes).trim() : (existingIndex >= 0 ? store.scores[existingIndex].notes : ''),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      store.scores[existingIndex] = record;
    } else {
      store.scores.push(record);
    }
    savedRecords.push(record);
  }

  saveStore();
  console.log(`[Batch Scores Saved] Saved ${savedRecords.length} score entries.`);
  res.json({ success: true, count: savedRecords.length, savedScores: savedRecords, allScores: store.scores });
});

// 5. Input / Bulk update Round 2 scores (Ban tổ chức nhập điểm vòng 2)
app.post('/api/scores/round2', (req, res) => {
  const { scores } = req.body; // array of { contestantId, score, notes }
  if (!Array.isArray(scores)) {
    return res.status(400).json({ error: 'scores phải là danh sách mảng.' });
  }

  for (const item of scores) {
    if (!item.contestantId || item.score === undefined) continue;
    const cid = String(item.contestantId).trim();
    const numScore = Math.max(0, Math.min(10, Math.round(Number(item.score) * 100) / 100));
    const existingIndex = store.scores.findIndex(
      (s) => String(s.contestantId).trim() === cid && Number(s.round) === 2 && s.judgeId === 'ADMIN'
    );

    const record: ScoreRecord = {
      id: existingIndex >= 0 ? store.scores[existingIndex].id : `SC-R2-${cid}-${Date.now()}`,
      contestantId: cid,
      round: 2,
      judgeId: 'ADMIN',
      score: numScore,
      notes: item.notes !== undefined ? String(item.notes).trim() : (existingIndex >= 0 ? store.scores[existingIndex].notes : 'Điểm vòng 2 do Ban Tổ Chức nhập'),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      store.scores[existingIndex] = record;
    } else {
      store.scores.push(record);
    }
  }

  saveStore();
  res.json({ success: true, scores: store.scores.filter((s) => Number(s.round) === 2), allScores: store.scores });
});

// 6. Admin override / edit a judge's score
app.put('/api/scores/override', (req, res) => {
  const { contestantId, round, judgeId, newScore, notes } = req.body;

  if (!contestantId || round === undefined || !judgeId || newScore === undefined) {
    return res.status(400).json({ error: 'Thiếu thông tin cần chỉnh sửa.' });
  }

  const cid = String(contestantId).trim();
  const jid = String(judgeId).trim();
  const numRound = Number(round);
  const numScore = Math.max(0, Math.min(10, Math.round(Number(newScore) * 100) / 100));

  const existingIndex = store.scores.findIndex(
    (s) => String(s.contestantId).trim() === cid && Number(s.round) === numRound && String(s.judgeId).trim() === jid
  );

  if (existingIndex >= 0) {
    store.scores[existingIndex].score = numScore;
    if (notes !== undefined) store.scores[existingIndex].notes = String(notes).trim();
    store.scores[existingIndex].updatedAt = new Date().toISOString();
  } else {
    store.scores.push({
      id: `SC-OVR-${Date.now()}`,
      contestantId: cid,
      round: numRound,
      judgeId: jid,
      score: numScore,
      notes: notes !== undefined ? String(notes).trim() : 'Điểm do Quản trị viên cập nhật',
      updatedAt: new Date().toISOString(),
    });
  }

  saveStore();
  res.json({ success: true, message: 'Đã cập nhật điểm thành công', allScores: store.scores });
});

// 7. Toggle contestant hidden state (Ẩn thí sinh khỏi vòng 3 và 4)
app.patch('/api/contestants/:id/toggle-hidden', (req, res) => {
  const { id } = req.params;
  const { hidden } = req.body;

  const contestant = store.contestants.find((c) => c.id === id);
  if (!contestant) {
    return res.status(404).json({ error: 'Không tìm thấy thí sinh.' });
  }

  contestant.hidden = hidden !== undefined ? Boolean(hidden) : !contestant.hidden;
  saveStore();

  res.json({
    success: true,
    contestant,
    message: contestant.hidden ? `Đã ẩn thí sinh ${contestant.name} khỏi Vòng 3 & 4` : `Đã mở lại thí sinh ${contestant.name} cho các vòng thi`,
  });
});

// 8. Update contestant details (hình ảnh, thông tin cá nhân)
app.put('/api/contestants/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const idNorm = (id || '').trim().toLowerCase();
  const index = store.contestants.findIndex(
    (c) => c.id.trim().toLowerCase() === idNorm || c.sbd.trim().toLowerCase() === idNorm
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thí sinh.' });
  }

  const existing = store.contestants[index];
  store.contestants[index] = {
    ...existing,
    ...updateData,
    id: existing.id, // preserve original ID
    sbd: updateData.sbd || existing.sbd,
  };

  saveStore();
  res.json({ success: true, contestant: store.contestants[index] });
});

// 9. Add new contestant (nếu ban tổ chức bổ sung)
app.post('/api/contestants', (req, res) => {
  const { name, title, department, region, regionId, avatar, bio, motto, strengths } = req.body;

  if (!name || !title) {
    return res.status(400).json({ error: 'Vui lòng nhập tên và chức danh thí sinh.' });
  }

  const nextNum = store.contestants.length + 1;
  const sbd = `SBD-${String(nextNum).padStart(3, '0')}`;
  const id = `TS${String(nextNum).padStart(2, '0')}`;

  const newContestant: Contestant = {
    id,
    sbd,
    name,
    title,
    department: department || 'Khối Chuyên Môn',
    region: region || 'Khu vực 1: Miền Bắc (Hà Nội)',
    regionId: Number(regionId) || 1,
    avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    bio: bio || 'Thí sinh tham gia vòng chung kết cuộc thi nội bộ.',
    strengths: Array.isArray(strengths) ? strengths : ['Nhiệt huyết', 'Sáng tạo'],
    motto: motto || 'Tự tin khẳng định bản thân.',
    hidden: false,
  };

  store.contestants.push(newContestant);
  saveStore();

  res.status(201).json({ success: true, contestant: newContestant });
});

// 9b. Toggle judge hidden state (Ẩn bớt giám khảo nếu chưa confirm đủ 10 người)
app.patch('/api/judges/:id/toggle-hidden', (req, res) => {
  const { id } = req.params;
  const { hidden } = req.body;

  const idNorm = (id || '').trim().toLowerCase();
  const judge = store.judges.find(
    (j) => j.id.trim().toLowerCase() === idNorm || j.code.trim().toLowerCase() === idNorm
  );
  if (!judge) {
    return res.status(404).json({ error: 'Không tìm thấy giám khảo.' });
  }

  judge.hidden = hidden !== undefined ? Boolean(hidden) : !judge.hidden;

  // If active judge was hidden, switch active judge to the first non-hidden judge
  if (store.activeJudgeId === id && judge.hidden) {
    const firstActive = store.judges.find((j) => !j.hidden);
    if (firstActive) {
      store.activeJudgeId = firstActive.id;
    }
  }

  saveStore();
  res.json({
    success: true,
    judge,
    activeJudgeId: store.activeJudgeId,
    message: judge.hidden ? `Đã ẩn giám khảo ${judge.name}` : `Đã kích hoạt lại giám khảo ${judge.name}`,
  });
});

// 9c. Update judge details (sửa tên giám khảo, chức danh, ảnh đại diện)
app.put('/api/judges/:id', (req, res) => {
  const { id } = req.params;
  const { name, title, avatar } = req.body;

  const idNorm = (id || '').trim().toLowerCase();
  const index = store.judges.findIndex(
    (j) => j.id.trim().toLowerCase() === idNorm || j.code.trim().toLowerCase() === idNorm
  );
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy giám khảo.' });
  }

  if (name !== undefined) store.judges[index].name = name;
  if (title !== undefined) store.judges[index].title = title;
  if (avatar !== undefined) store.judges[index].avatar = avatar;

  saveStore();
  res.json({ success: true, judge: store.judges[index] });
});

// 9d. Add new judge if needed
app.post('/api/judges', (req, res) => {
  const { name, title, avatar } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Vui lòng nhập tên giám khảo.' });
  }

  const nextNum = store.judges.length + 1;
  const code = `GK${String(nextNum).padStart(2, '0')}`;
  const newJudge: Judge = {
    id: code,
    code,
    name,
    title: title || `Giám Khảo ${nextNum}`,
    avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    hidden: false,
  };

  store.judges.push(newJudge);
  saveStore();
  res.status(201).json({ success: true, judge: newJudge });
});

// 9e. Client-Server Synchronization endpoint (Dual persistence sync)
app.post('/api/sync', (req, res) => {
  const { contestants, judges, scores } = req.body || {};
  let modified = false;

  if (Array.isArray(contestants) && contestants.length > 0) {
    contestants.forEach((cItem) => {
      const idx = store.contestants.findIndex(
        (c) => c.id.toLowerCase() === cItem.id.toLowerCase()
      );
      if (idx !== -1) {
        store.contestants[idx] = { ...store.contestants[idx], ...cItem };
        modified = true;
      }
    });
  }

  if (Array.isArray(judges) && judges.length > 0) {
    judges.forEach((jItem) => {
      const idx = store.judges.findIndex(
        (j) => j.id.toLowerCase() === jItem.id.toLowerCase()
      );
      if (idx !== -1) {
        store.judges[idx] = { ...store.judges[idx], ...jItem };
        modified = true;
      }
    });
  }

  if (Array.isArray(scores)) {
    if (scores.length > 0 && store.scores.length === 0) {
      // Restore scores into empty server
      store.scores = scores;
      modified = true;
    } else if (scores.length > 0) {
      scores.forEach((sc) => {
        const existingIdx = store.scores.findIndex(
          (s) => s.id === sc.id || (s.contestantId === sc.contestantId && s.round === sc.round && s.judgeId === sc.judgeId)
        );
        if (existingIdx !== -1) {
          store.scores[existingIdx] = { ...store.scores[existingIdx], ...sc };
        } else {
          store.scores.push(sc);
        }
      });
      modified = true;
    }
  }

  if (modified) {
    saveStore();
  }

  res.json({
    success: true,
    contestants: store.contestants,
    judges: store.judges,
    scores: store.scores,
    updatedAt: store.updatedAt,
  });
});

// 10. Reset data to original seed
app.post('/api/reset', (req, res) => {
  store = {
    contestants: JSON.parse(JSON.stringify(INITIAL_CONTESTANTS)),
    judges: JSON.parse(JSON.stringify(INITIAL_JUDGES)),
    scores: JSON.parse(JSON.stringify(INITIAL_SCORES)),
    activeJudgeId: 'GK01',
    updatedAt: new Date().toISOString(),
  };
  saveStore();
  res.json({ success: true, message: 'Đã thiết lập lại dữ liệu gốc ban đầu thành công.' });
});

// 10b. Reset all scores (Xóa hết điểm thí sinh sau khi chạy thử để chuẩn bị thi thật)
app.post('/api/scores/reset-all', (req, res) => {
  const { unhideAllContestants } = req.body || {};
  store.scores = [];
  if (unhideAllContestants) {
    store.contestants.forEach((c) => {
      c.hidden = false;
    });
  }
  store.updatedAt = new Date().toISOString();
  saveStore();
  res.json({
    success: true,
    scores: [],
    contestants: store.contestants,
    message: 'Đã xóa toàn bộ điểm của tất cả thí sinh thành công. Hệ thống đã sẵn sàng cho cuộc thi chính thức!',
  });
});

// ======================== SERVER INITIALIZATION ========================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Contest App running on http://localhost:${PORT}`);
  });
}

startServer();
