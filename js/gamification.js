// ── GAMIFICATION ENGINE — Phase 2: XP + Level System ────────────────────────

// _isTa() and _ta() are defined globally in index.html

const XP_REWARDS = {
  correct_mcq:   10,
  difficult_mcq: 20,
  chapter_test:  100,
  daily_goal:    200,
  streak_7:      500,
  mock_test:     300,
  electrostatics_streak: 150,
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
  electrostatics_streak: 'Electrostatics Streak!',
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
        <div class="xpc-level-title">${_ta('Level','நிலை')} ${id} &middot; ${title}</div>
        <div class="xpc-xp-row">
          <span class="xpc-total">${totalXP.toLocaleString()} XP</span>
          ${todayXP > 0 ? `<span class="xpc-today">+${todayXP} ${_ta('today','இன்று')}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="xpc-bar-wrap">
      <div class="xpc-bar"><div class="xpc-fill" style="width:${progress}%"></div></div>
      <div class="xpc-hint">${xpToNext ? `${xpToNext} XP ${_ta(`to Level ${id+1}`,`நிலை ${id+1}-க்கு`)}` : _ta('👑 Max Level Reached!','👑 உச்ச நிலை அடைந்தீர்கள்!')}</div>
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
      // Refresh cached list so home widget and screen stay current
      loadUserAchievements().catch(() => {});
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
    el.innerHTML = `<div class="dm-loading"><div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0"></div><span>${_ta('Loading mission…','பணி ஏற்றுகிறது…')}</span></div>`;
    el.style.display = 'block';
    return;
  }

  const { targetMCQs, completedMCQs, physicsTarget, physicsCompleted,
          chemistryTarget, chemistryCompleted, biologyTarget, biologyCompleted,
          isCompleted } = dailyTarget;
  const remaining  = Math.max(0, targetMCQs - completedMCQs);
  const totalPct   = Math.min(100, Math.round(completedMCQs / Math.max(targetMCQs, 1) * 100));
  const tier       = targetMCQs >= 150 ? _ta('🔥 Advanced','🔥 மேம்பட்ட') : targetMCQs >= 100 ? _ta('⚡ Intermediate','⚡ இடைநிலை') : _ta('📚 Beginner','📚 தொடக்கநிலை');

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
        <div class="dm-title">${isCompleted ? _ta('✅ Mission Complete!','✅ பணி முடிந்தது!') : _ta("🎯 Today's Mission","🎯 இன்றைய பணி")}</div>
        <div class="dm-sub">${tier} · ${targetMCQs} MCQs${streakData.currentStreak > 0 ? ` · 🔥 ${streakData.currentStreak}${_ta('d streak','நாள் தொடர்')}` : ''}</div>
      </div>
      ${!isCompleted ? `<div class="dm-reward-badge">+200 XP</div>` : ''}
    </div>
    <div class="dm-subjects">
      ${subjBar(_ta('⚛️ Physics','⚛️ இயற்பியல்'),   physicsCompleted,   physicsTarget,   '#3b82f6')}
      ${subjBar(_ta('🧪 Chemistry','🧪 வேதியியல்'), chemistryCompleted, chemistryTarget, '#10b981')}
      ${subjBar(_ta('🧬 Biology','🧬 உயிரியல்'),   biologyCompleted,   biologyTarget,   '#ec4899')}
    </div>
    <div class="dm-total-bar"><div class="dm-total-fill" style="width:${totalPct}%"></div></div>
    <div class="dm-footer">
      <span class="dm-done-txt">${completedMCQs} / ${targetMCQs} ${_ta('done','முடிந்தது')}</span>
      <span class="dm-remain-txt">${isCompleted ? _ta('🏆 Goal achieved!','🏆 இலக்கு அடைந்தது!') : `${remaining} ${_ta('more to go','மேலும் தேவை')}`}</span>
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
    ? `<div class="sc-empty">${_ta('🔥 Answer 20 MCQs today to start your streak!','🔥 இன்று 20 MCQகள் பதிலளித்து தொடர்ச்சியை தொடங்குங்கள்!')}</div>`
    : `
      <div class="sc-item">
        <div class="sc-icon">🔥</div>
        <div class="sc-val">${currentStreak}</div>
        <div class="sc-lbl">${_ta('Day Streak','நாள் தொடர்')}</div>
      </div>
      <div class="sc-divider"></div>
      <div class="sc-item">
        <div class="sc-icon">🏆</div>
        <div class="sc-val">${longestStreak}</div>
        <div class="sc-lbl">${_ta('Best Ever','சிறந்த சாதனை')}</div>
      </div>
      <div class="sc-divider"></div>
      <div class="sc-item">
        <div class="sc-icon">⚡</div>
        <div class="sc-val">${toMilestone}</div>
        <div class="sc-lbl">${_ta('Days to +500 XP','+500 XP-க்கு நாட்கள்')}</div>
      </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — Achievement System
// ═══════════════════════════════════════════════════════════════════════════════

let userAchievements  = [];   // { achievement_id, unlocked_at, title, icon, xp_reward, category }
let allAchievementDefs = [];  // all definitions from DB
let achievementTab    = 'all';

// ── Load all definitions + user's unlocked achievements ──────────────────────
async function loadUserAchievements() {
  if (!authUser) return;
  try {
    const [{ data: defs }, { data: unlocked }] = await Promise.all([
      db.from('achievement_definitions').select('*').order('category').order('criteria_value'),
      db.from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', authUser.id),
    ]);
    allAchievementDefs = defs || [];
    const unlockedMap  = {};
    (unlocked || []).forEach(u => { unlockedMap[u.achievement_id] = u.unlocked_at; });
    userAchievements = allAchievementDefs.map(d => ({
      ...d,
      unlockedAt: unlockedMap[d.id] || null,
    }));
  } catch (_) {}
  renderHomeAchievementsWidget();
}

// ── Compute progress toward a locked achievement ─────────────────────────────
function _achievementProgress(def) {
  const total   = progress.total   || 0;
  const correct = progress.correct || 0;
  const acc     = total > 0 ? Math.round(correct / total * 100) : 0;

  const subjectStat = (subj) => {
    // Check both exact match and substrings (Botany/Zoology → Biology)
    let s = progress.subjects?.[subj] || {};
    if (!s.total) {
      // Try alternate names
      const alt = Object.entries(progress.subjects || {}).find(([k]) =>
        k.toLowerCase().includes(subj.toLowerCase())
      );
      if (alt) s = alt[1];
    }
    const att  = s.total   || 0;
    const cor  = s.correct || 0;
    const sacc = att > 0 ? Math.round(cor / att * 100) : 0;
    return { current: sacc, att };
  };

  switch (def.criteria_type) {
    case 'mcqs_solved':       return { current: total,  target: def.criteria_value, unit: 'MCQs' };
    case 'accuracy':          return { current: acc,    target: def.criteria_value, unit: '%', note: `${total} MCQs attempted` };
    case 'streak':            return { current: streakData.currentStreak, target: def.criteria_value, unit: 'days' };
    case 'subject_biology':   { const { current, att } = subjectStat('Biology');   return { current, target: def.criteria_value, unit: '%', note: `${att} Bio MCQs done (need 100)` }; }
    case 'subject_physics':   { const { current, att } = subjectStat('Physics');   return { current, target: def.criteria_value, unit: '%', note: `${att} Phy MCQs done (need 100)` }; }
    case 'subject_chemistry': { const { current, att } = subjectStat('Chemistry'); return { current, target: def.criteria_value, unit: '%', note: `${att} Chem MCQs done (need 100)` }; }
    default:                  return { current: 0, target: def.criteria_value, unit: '' };
  }
}

// ── Render the full achievements screen ──────────────────────────────────────
function renderAchievementsScreen() {
  const el = document.getElementById('ach-content');
  if (!el) return;

  const unlocked = userAchievements.filter(a => a.unlockedAt);
  const locked   = userAchievements.filter(a => !a.unlockedAt);
  const totalXPEarned = unlocked.reduce((s, a) => s + (a.xp_reward || 0), 0);

  // Summary header
  const summary = document.getElementById('ach-summary');
  if (summary) {
    summary.innerHTML = `
      <div class="ach-sum-stat"><div class="ach-sum-val">${unlocked.length}<span style="opacity:.5;font-size:.8em">/${userAchievements.length}</span></div><div class="ach-sum-lbl">${_ta('Unlocked','திறக்கப்பட்டது')}</div></div>
      <div class="ach-sum-divider"></div>
      <div class="ach-sum-stat"><div class="ach-sum-val">${totalXPEarned.toLocaleString()}</div><div class="ach-sum-lbl">${_ta('XP Earned','XP சம்பாதித்தது')}</div></div>
      <div class="ach-sum-divider"></div>
      <div class="ach-sum-stat"><div class="ach-sum-val">${locked.length}</div><div class="ach-sum-lbl">${_ta('Remaining','மீதமுள்ளது')}</div></div>`;
  }

  _renderAchievementCards();

  // Smart tips for near-unlock achievements
  const tips = locked.map(a => {
    const p = _achievementProgress(a);
    const pct = Math.min(100, Math.round(p.current / Math.max(p.target, 1) * 100));
    return { ...a, pct, prog: p };
  }).filter(a => a.pct >= 50 && a.pct < 100).sort((x, y) => y.pct - x.pct).slice(0, 2);

  const tipsEl = document.getElementById('ach-tips');
  if (tipsEl) {
    tipsEl.innerHTML = tips.length
      ? tips.map(a => `
          <div class="ach-tip-card">
            <span class="ach-tip-icon">${a.icon}</span>
            <div class="ach-tip-body">
              <div class="ach-tip-title">${_ta('Almost there!','கிட்டத்தட்ட வந்துவிட்டீர்கள்!')}</div>
              <div class="ach-tip-text">${_achievementTip(a)}</div>
            </div>
          </div>`).join('')
      : '';
  }
}

function _achievementTip(ach) {
  const p    = ach.prog;
  const left = p.target - Math.min(p.current, p.target);
  switch (ach.criteria_type) {
    case 'mcqs_solved':       return _ta(`Solve ${left.toLocaleString()} more MCQs to unlock <b>${ach.title}</b>.`,`<b>${ach.title}</b> திறக்க ${left.toLocaleString()} MCQ கேள்விகளுக்கு மேலும் பதிலளியுங்கள்.`);
    case 'accuracy':          return _ta(`Raise your accuracy to ${p.target}% to unlock <b>${ach.title}</b>.`,`<b>${ach.title}</b> திறக்க உங்கள் துல்லியத்தை ${p.target}% ஆக உயர்த்துங்கள்.`);
    case 'streak':            return _ta(`Practice for ${left} more day${left !== 1 ? 's' : ''} in a row to unlock <b>${ach.title}</b>.`,`<b>${ach.title}</b> திறக்க தொடர்ந்து ${left} நாள் மேலும் பயிற்சி செய்யுங்கள்.`);
    case 'subject_biology':   return _ta(`Score ${p.target}%+ in Biology (${p.note}) to unlock <b>${ach.title}</b>.`,`<b>${ach.title}</b> திறக்க உயிரியலில் ${p.target}%+ மதிப்பெண் (${p.note}) பெறுங்கள்.`);
    case 'subject_physics':   return _ta(`Score ${p.target}%+ in Physics (${p.note}) to unlock <b>${ach.title}</b>.`,`<b>${ach.title}</b> திறக்க இயற்பியலில் ${p.target}%+ மதிப்பெண் (${p.note}) பெறுங்கள்.`);
    case 'subject_chemistry': return _ta(`Score ${p.target}%+ in Chemistry (${p.note}) to unlock <b>${ach.title}</b>.`,`<b>${ach.title}</b> திறக்க வேதியியலில் ${p.target}%+ மதிப்பெண் (${p.note}) பெறுங்கள்.`);
    default:                  return _ta(`Keep going to unlock <b>${ach.title}</b>!`,`<b>${ach.title}</b> திறக்க தொடர்ந்து முயற்சி செய்யுங்கள்!`);
  }
}

function _renderAchievementCards() {
  const el = document.getElementById('ach-content');
  if (!el) return;

  const list = achievementTab === 'all'
    ? userAchievements
    : userAchievements.filter(a => a.category === achievementTab);

  // Unlocked first, then locked sorted by progress desc
  const sorted = [
    ...list.filter(a => a.unlockedAt).sort((x, y) => new Date(y.unlockedAt) - new Date(x.unlockedAt)),
    ...list.filter(a => !a.unlockedAt).map(a => {
      const p = _achievementProgress(a);
      return { ...a, _pct: Math.min(100, Math.round(p.current / Math.max(p.target, 1) * 100)), _prog: p };
    }).sort((x, y) => y._pct - x._pct),
  ];

  if (!sorted.length) {
    el.innerHTML = `<div class="ach-empty">${_ta('No achievements in this category yet.','இந்த பிரிவில் இன்னும் சாதனைகள் இல்லை.')}</div>`;
    return;
  }

  el.innerHTML = sorted.map(a => {
    if (a.unlockedAt) {
      const date = new Date(a.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `
        <div class="ach-card unlocked">
          <div class="ach-card-icon">${a.icon}</div>
          <div class="ach-card-body">
            <div class="ach-card-title">${a.title}</div>
            <div class="ach-card-desc">${a.description || ''}</div>
            <div class="ach-card-meta">✅ ${date}${a.xp_reward ? ` &middot; +${a.xp_reward} XP` : ''}</div>
          </div>
        </div>`;
    } else {
      const p   = a._prog   || _achievementProgress(a);
      const pct = a._pct    ?? Math.min(100, Math.round(p.current / Math.max(p.target, 1) * 100));
      const progLabel = p.unit === '%'
        ? `${p.current}% / ${p.target}%${p.note ? ` · ${p.note}` : ''}`
        : `${Math.min(p.current, p.target).toLocaleString()} / ${p.target.toLocaleString()} ${p.unit}`;
      return `
        <div class="ach-card locked">
          <div class="ach-card-icon">🔒</div>
          <div class="ach-card-body">
            <div class="ach-card-title">${a.title}</div>
            <div class="ach-card-desc">${a.description || ''}</div>
            <div class="ach-prog-wrap">
              <div class="ach-prog-bar"><div class="ach-prog-fill" style="width:${pct}%"></div></div>
              <div class="ach-prog-txt">${progLabel}</div>
            </div>
          </div>
          ${a.xp_reward ? `<div class="ach-reward-badge">+${a.xp_reward}</div>` : ''}
        </div>`;
    }
  }).join('');
}

function filterAchievementTab(tab) {
  achievementTab = tab;
  document.querySelectorAll('.ach-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab)
  );
  _renderAchievementCards();
}

// ── Home achievements widget ──────────────────────────────────────────────────
function renderHomeAchievementsWidget() {
  const el = document.getElementById('home-achievements-widget');
  if (!el || !authUser) return;

  const unlocked = userAchievements.filter(a => a.unlockedAt);
  const total    = userAchievements.length;
  el.style.display = 'block';

  if (!unlocked.length) {
    el.innerHTML = `
      <div class="haw-header">
        <span class="haw-title">🏅 ${_ta('Achievements','சாதனைகள்')}</span>
        <button class="haw-see-all" onclick="showScreen('achievements')">${_ta('See All →','அனைத்தும் காண →')}</button>
      </div>
      <div class="haw-empty">${_ta('Answer MCQs to unlock your first achievement!','உங்கள் முதல் சாதனையை திறக்க MCQகளுக்கு பதிலளியுங்கள்!')}</div>`;
    return;
  }

  const recent = unlocked.slice(0, 4);
  el.innerHTML = `
    <div class="haw-header">
      <span class="haw-title">🏅 ${_ta('Achievements','சாதனைகள்')}</span>
      <span class="haw-count">${unlocked.length}/${total}</span>
      <button class="haw-see-all" onclick="showScreen('achievements')">${_ta('See All →','அனைத்தும் காண →')}</button>
    </div>
    <div class="haw-badges">
      ${recent.map(a => `
        <div class="haw-badge" title="${a.title}">
          <div class="haw-badge-icon">${a.icon}</div>
          <div class="haw-badge-name">${a.title.split(' ').slice(0, 2).join(' ')}</div>
        </div>`).join('')}
      ${unlocked.length > 4 ? `<div class="haw-badge haw-more" onclick="showScreen('achievements')">+${unlocked.length - 4}<div class="haw-badge-name">more</div></div>` : ''}
    </div>`;
}

async function checkAndUpdateElectrostaticsStreak() {
  let state = {};
  try { state = JSON.parse(localStorage.getItem('electrostatics_practice') || '{}') || {}; } catch(e) {}
  
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  
  if (state.lastStreakDate === today) {
    return;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  
  let currentStreak = state.electrostaticsStreak || 0;
  if (state.lastStreakDate === yestStr) {
    currentStreak += 1;
  } else {
    currentStreak = 1;
  }
  
  state.electrostaticsStreak = currentStreak;
  state.lastStreakDate = today;
  try { localStorage.setItem('electrostatics_practice', JSON.stringify(state)); } catch(e) {}
  
  await awardXP('electrostatics_streak');
  showToast(`⚡ Electrostatics Day ${currentStreak} Completed! +150 XP`);
}
