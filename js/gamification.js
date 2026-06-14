// ── GAMIFICATION ENGINE — Phase 2: XP + Level System ────────────────────────

const XP_REWARDS = {
  correct_mcq:   10,
  difficult_mcq: 20,
  chapter_test:  100,
  daily_goal:    200,
  streak_7:      500,
  mock_test:     300,
};

const LEVELS = [
  { id:1,  title:'Beginner',      minXP:0,     icon:'🌱' },
  { id:2,  title:'Learner',       minXP:500,   icon:'📖' },
  { id:3,  title:'Explorer',      minXP:1500,  icon:'🔍' },
  { id:4,  title:'Scholar',       minXP:3000,  icon:'🎓' },
  { id:5,  title:'Achiever',      minXP:6000,  icon:'⭐' },
  { id:6,  title:'NEET Warrior',  minXP:10000, icon:'⚔️' },
  { id:7,  title:'Rank Booster',  minXP:15000, icon:'🚀' },
  { id:8,  title:'Top Performer', minXP:25000, icon:'🏆' },
  { id:9,  title:'Future Doctor', minXP:40000, icon:'🩺' },
  { id:10, title:'NEET Master',   minXP:60000, icon:'👑' },
];

// Runtime cache — updated after every XP event
let gamState = {
  totalXP: 0, todayXP: 0,
  id: 1, title: 'Beginner', icon: '🌱', nextXP: 500, progress: 0,
};

// ── Level computation (client-side mirror of DB function) ────────────────────
function getLevelFromXP(xp) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.minXP) lvl = l; else break; }
  const next = LEVELS.find(l => l.minXP > xp);
  const nextXP = next ? next.minXP : 999999;
  const progress = next
    ? Math.min(100, Math.round((xp - lvl.minXP) / (nextXP - lvl.minXP) * 100))
    : 100;
  return { ...lvl, nextXP, progress };
}

// ── Load state from Supabase ─────────────────────────────────────────────────
async function loadGamificationState() {
  if (!authUser) return;
  try {
    const { data } = await db.from('user_xp')
      .select('total_xp,today_xp,xp_date')
      .eq('user_id', authUser.id)
      .single();
    if (data) {
      const today = new Date().toISOString().split('T')[0];
      const todayXP = data.xp_date === today ? data.today_xp : 0;
      Object.assign(gamState, { totalXP: data.total_xp, todayXP }, getLevelFromXP(data.total_xp));
    }
  } catch (_) {}
  renderLevelWidget();
  renderHomeXPCard();
}

// ── Award XP (fire-and-forget from quiz events) ──────────────────────────────
async function awardXP(reason, refId = null) {
  if (!authUser) return;
  const amount = XP_REWARDS[reason] || 10;
  const oldLevel = getLevelFromXP(gamState.totalXP);
  try {
    const { data: newTotal, error } = await db.rpc('award_xp', {
      p_user_id: authUser.id,
      p_amount:  amount,
      p_reason:  reason,
      p_ref_id:  refId ? String(refId) : null,
    });
    if (error || newTotal == null) return;
    const newLevel = getLevelFromXP(newTotal);
    gamState.totalXP = newTotal;
    gamState.todayXP += amount;
    Object.assign(gamState, newLevel);

    showXPToast(amount, reason);
    if (newLevel.id > oldLevel.id) showLevelUpModal(newLevel);
    renderLevelWidget();
    renderHomeXPCard();
  } catch (_) {}
}

// ── XP floating toast ────────────────────────────────────────────────────────
const XP_LABELS = {
  correct_mcq:   'Correct!',
  difficult_mcq: 'Hard Q Correct!',
  chapter_test:  'Chapter Done!',
  daily_goal:    'Daily Goal!',
  streak_7:      '7-Day Streak!',
  mock_test:     'Test Complete!',
};

function showXPToast(amount, reason) {
  const t = document.createElement('div');
  t.className = 'xp-toast';
  t.innerHTML = `<span class="xpt-amt">+${amount} XP</span><span class="xpt-lbl">${XP_LABELS[reason] || ''}</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 1800);
}

// ── Level-up modal ───────────────────────────────────────────────────────────
function showLevelUpModal(level) {
  const m = document.getElementById('levelup-modal');
  if (!m) return;
  document.getElementById('lu-icon').textContent  = level.icon;
  document.getElementById('lu-title').textContent = level.title;
  document.getElementById('lu-level').textContent = `Level ${level.id} Unlocked!`;
  document.getElementById('lu-xp').textContent    = `${gamState.totalXP.toLocaleString()} XP`;
  m.classList.add('show');
}

function closeLevelUpModal() {
  const m = document.getElementById('levelup-modal');
  if (m) m.classList.remove('show');
}

// ── Nav level widget (replaces plain Free/Premium chip) ──────────────────────
function renderLevelWidget() {
  const el = document.getElementById('nav-level-widget');
  if (!el) return;
  if (!authUser) { el.style.display = 'none'; return; }
  const { id, title, icon, totalXP, todayXP, progress } = gamState;
  el.style.display = 'flex';
  el.innerHTML = `
    <span class="nlw-icon">${icon}</span>
    <div class="nlw-info">
      <div class="nlw-name">Lv.${id} ${title}</div>
      <div class="nlw-bar"><div class="nlw-fill" style="width:${progress}%"></div></div>
    </div>
    <span class="nlw-today">+${todayXP}</span>`;
}

// ── Home XP card ─────────────────────────────────────────────────────────────
function renderHomeXPCard() {
  const el = document.getElementById('home-xp-card');
  if (!el) return;
  if (!authUser) { el.style.display = 'none'; return; }
  const { id, title, icon, totalXP, todayXP, nextXP, progress } = gamState;
  const xpToNext = nextXP === 999999 ? null : (nextXP - totalXP).toLocaleString();
  el.style.display = 'block';
  el.innerHTML = `
    <div class="xpc-top">
      <div class="xpc-badge">${icon}</div>
      <div class="xpc-meta">
        <div class="xpc-level-title">Level ${id} &middot; ${title}</div>
        <div class="xpc-xp-row">
          <span class="xpc-total">${totalXP.toLocaleString()} XP</span>
          ${todayXP > 0 ? `<span class="xpc-today">+${todayXP} today</span>` : ''}
        </div>
      </div>
    </div>
    <div class="xpc-bar-wrap">
      <div class="xpc-bar"><div class="xpc-fill" style="width:${progress}%"></div></div>
      <div class="xpc-hint">${xpToNext ? `${xpToNext} XP to Level ${id + 1}` : '👑 Max Level Reached!'}</div>
    </div>`;
}

// ── Chapter mastery update (called after chapter session ends) ───────────────
async function recordChapterSession(chapterId, subject, correct, total) {
  if (!authUser || !chapterId || total === 0) return;
  try {
    await db.rpc('update_chapter_mastery', {
      p_user_id:    authUser.id,
      p_chapter_id: String(chapterId),
      p_subject:    subject || 'General',
      p_correct:    correct,
      p_total:      total,
    });
  } catch (_) {}
}

// ── Achievement check (fire after significant events) ───────────────────────
async function checkAndShowAchievements() {
  if (!authUser) return;
  try {
    const { data } = await db.rpc('check_achievements', { p_user_id: authUser.id });
    if (data?.length) {
      data.forEach((ach, i) => {
        setTimeout(() => showAchievementToast(ach), i * 2200);
      });
    }
  } catch (_) {}
}

function showAchievementToast(ach) {
  const t = document.createElement('div');
  t.className = 'ach-toast';
  t.innerHTML = `
    <div class="acht-icon">${ach.icon}</div>
    <div class="acht-body">
      <div class="acht-title">Achievement Unlocked!</div>
      <div class="acht-name">${ach.title}</div>
      ${ach.xp_reward ? `<div class="acht-xp">+${ach.xp_reward} XP</div>` : ''}
    </div>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
}
