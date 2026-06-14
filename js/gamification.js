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

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — Daily Targets + Streak System
// ═══════════════════════════════════════════════════════════════════════════════

let dailyTarget = {
  targetMCQs: 75, completedMCQs: 0,
  physicsTarget: 25, physicsCompleted: 0,
  chemistryTarget: 25, chemistryCompleted: 0,
  biologyTarget: 25, biologyCompleted: 0,
  isCompleted: false, xpAwarded: false,
  loaded: false,
};

let streakData = { currentStreak: 0, longestStreak: 0, streakUpdatedToday: false };

let _dailySyncTimer = null;

// ── Load today's target from Supabase ────────────────────────────────────────
async function loadDailyTarget() {
  if (!authUser) return;
  try {
    const { data, error } = await db.rpc('get_or_create_daily_target', { p_user_id: authUser.id });
    if (!error && data) {
      dailyTarget = {
        targetMCQs:         data.target_mcqs,
        completedMCQs:      data.completed_mcqs,
        physicsTarget:      data.physics_target,
        physicsCompleted:   data.physics_completed,
        chemistryTarget:    data.chemistry_target,
        chemistryCompleted: data.chemistry_completed,
        biologyTarget:      data.biology_target,
        biologyCompleted:   data.biology_completed,
        isCompleted:        data.is_completed,
        xpAwarded:          data.xp_awarded,
        loaded: true,
      };
    }
  } catch (_) {}
  renderDailyMissionCard();
}

// ── Load streak from Supabase ────────────────────────────────────────────────
async function loadStreak() {
  if (!authUser) return;
  try {
    const { data } = await db.from('user_streaks')
      .select('current_streak,longest_streak,last_practice_date')
      .eq('user_id', authUser.id).single();
    if (data) {
      const today = new Date().toISOString().split('T')[0];
      streakData.currentStreak      = data.current_streak;
      streakData.longestStreak      = data.longest_streak;
      streakData.streakUpdatedToday = data.last_practice_date === today;
    }
  } catch (_) {}
  renderStreakWidget();
  renderDailyMissionCard();
}

// ── Called after every MCQ answer ────────────────────────────────────────────
async function incrementDailyTarget(subject) {
  if (!authUser || !dailyTarget.loaded) return;

  dailyTarget.completedMCQs++;
  const s = (subject || '').toLowerCase();
  if (s.includes('physics'))                                        dailyTarget.physicsCompleted++;
  else if (s.includes('chem'))                                      dailyTarget.chemistryCompleted++;
  else if (s.includes('bio') || s.includes('botan') || s.includes('zoo')) dailyTarget.biologyCompleted++;

  renderDailyMissionCard();

  // Trigger streak after 20 MCQs for the day
  if (dailyTarget.completedMCQs === 20 && !streakData.streakUpdatedToday) {
    checkAndUpdateStreak().catch(() => {});
  }

  // Daily goal completed → award 200 XP
  if (!dailyTarget.isCompleted && dailyTarget.completedMCQs >= dailyTarget.targetMCQs) {
    dailyTarget.isCompleted = true;
    if (!dailyTarget.xpAwarded) {
      dailyTarget.xpAwarded = true;
      awardXP('daily_goal').catch(() => {});
    }
    renderDailyMissionCard();
    showToast('🎯 Daily Mission Complete! +200 XP');
  }

  // Debounced sync to Supabase (batch writes)
  clearTimeout(_dailySyncTimer);
  _dailySyncTimer = setTimeout(_syncDailyTarget, 4000);
}

async function _syncDailyTarget() {
  if (!authUser) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    await db.from('daily_targets').upsert({
      user_id:             authUser.id,
      target_date:         today,
      target_mcqs:         dailyTarget.targetMCQs,
      completed_mcqs:      dailyTarget.completedMCQs,
      physics_target:      dailyTarget.physicsTarget,
      physics_completed:   dailyTarget.physicsCompleted,
      chemistry_target:    dailyTarget.chemistryTarget,
      chemistry_completed: dailyTarget.chemistryCompleted,
      biology_target:      dailyTarget.biologyTarget,
      biology_completed:   dailyTarget.biologyCompleted,
      is_completed:        dailyTarget.isCompleted,
      xp_awarded:          dailyTarget.xpAwarded,
      updated_at:          new Date().toISOString(),
    }, { onConflict: 'user_id,target_date' });
  } catch (_) {}
}

// ── Update streak (once ≥20 MCQs answered today) ─────────────────────────────
async function checkAndUpdateStreak() {
  if (!authUser || streakData.streakUpdatedToday) return;
  try {
    const { data: newStreak } = await db.rpc('update_streak', { p_user_id: authUser.id });
    if (newStreak != null) {
      streakData.currentStreak      = newStreak;
      streakData.longestStreak      = Math.max(streakData.longestStreak, newStreak);
      streakData.streakUpdatedToday = true;

      renderStreakWidget();
      renderDailyMissionCard();

      // 7-day milestone bonus (7, 14, 21, …)
      if (newStreak > 0 && newStreak % 7 === 0) {
        await awardXP('streak_7');
        showToast(`🔥 ${newStreak}-Day Streak! +500 XP Bonus!`);
      }

      checkAndShowAchievements().catch(() => {});

      // Update stat-streak on home screen
      const ss = document.getElementById('stat-streak');
      if (ss) ss.textContent = newStreak;
    }
  } catch (_) {}
}

// ── Daily Mission Card UI ─────────────────────────────────────────────────────
function renderDailyMissionCard() {
  const el = document.getElementById('home-daily-goal');
  if (!el || !authUser) return;

  if (!dailyTarget.loaded) {
    el.innerHTML = `<div class="dm-loading"><div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0"></div><span>Loading mission…</span></div>`;
    el.style.display = 'block';
    return;
  }

  const { targetMCQs, completedMCQs, physicsTarget, physicsCompleted,
          chemistryTarget, chemistryCompleted, biologyTarget, biologyCompleted,
          isCompleted } = dailyTarget;
  const remaining  = Math.max(0, targetMCQs - completedMCQs);
  const totalPct   = Math.min(100, Math.round(completedMCQs / Math.max(targetMCQs, 1) * 100));
  const tier       = targetMCQs >= 150 ? '🔥 Advanced' : targetMCQs >= 100 ? '⚡ Intermediate' : '📚 Beginner';

  const subjBar = (label, done, target, color) => {
    const pct = Math.min(100, target > 0 ? Math.round(Math.min(done, target) / target * 100) : 0);
    return `
      <div class="dm-subj">
        <div class="dm-subj-row">
          <span class="dm-subj-name">${label}</span>
          <span class="dm-subj-val" style="color:${pct >= 100 ? 'var(--success)' : 'inherit'}">${Math.min(done, target)}/${target}${pct >= 100 ? ' ✓' : ''}</span>
        </div>
        <div class="dm-bar"><div class="dm-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
  };

  el.style.display = 'block';
  el.innerHTML = `
    <div class="dm-header">
      <div class="dm-header-left">
        <div class="dm-title">${isCompleted ? '✅ Mission Complete!' : '🎯 Today\'s Mission'}</div>
        <div class="dm-sub">${tier} · ${targetMCQs} MCQs${streakData.currentStreak > 0 ? ` · 🔥 ${streakData.currentStreak}d streak` : ''}</div>
      </div>
      ${!isCompleted ? `<div class="dm-reward-badge">+200 XP</div>` : ''}
    </div>
    <div class="dm-subjects">
      ${subjBar('⚛️ Physics',   physicsCompleted,   physicsTarget,   '#3b82f6')}
      ${subjBar('🧪 Chemistry', chemistryCompleted, chemistryTarget, '#10b981')}
      ${subjBar('🧬 Biology',   biologyCompleted,   biologyTarget,   '#ec4899')}
    </div>
    <div class="dm-total-bar"><div class="dm-total-fill" style="width:${totalPct}%"></div></div>
    <div class="dm-footer">
      <span class="dm-done-txt">${completedMCQs} / ${targetMCQs} done</span>
      <span class="dm-remain-txt">${isCompleted ? '🏆 Goal achieved!' : `${remaining} more to go`}</span>
    </div>`;
}

// ── Streak Widget UI ──────────────────────────────────────────────────────────
function renderStreakWidget() {
  const el = document.getElementById('home-streak-card');
  if (!el || !authUser) return;

  const { currentStreak, longestStreak } = streakData;
  const nextMilestone = currentStreak < 7 ? 7 : Math.ceil((currentStreak + 1) / 7) * 7;
  const toMilestone   = nextMilestone - currentStreak;

  el.style.display = 'flex';
  el.innerHTML = currentStreak === 0
    ? `<div class="sc-empty">🔥 Answer 20 MCQs today to start your streak!</div>`
    : `
      <div class="sc-item">
        <div class="sc-icon">🔥</div>
        <div class="sc-val">${currentStreak}</div>
        <div class="sc-lbl">Day Streak</div>
      </div>
      <div class="sc-divider"></div>
      <div class="sc-item">
        <div class="sc-icon">🏆</div>
        <div class="sc-val">${longestStreak}</div>
        <div class="sc-lbl">Best Ever</div>
      </div>
      <div class="sc-divider"></div>
      <div class="sc-item">
        <div class="sc-icon">⚡</div>
        <div class="sc-val">${toMilestone}</div>
        <div class="sc-lbl">Days to +500 XP</div>
      </div>`;
}
