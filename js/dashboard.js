// ── Dashboard — Phase 6: Gamification Dashboard UI ──────────────────────────

async function renderDashboard() {
  // Ensure gamification state is loaded
  const loads = [];
  if (!gamState.totalXP && authUser) loads.push(loadGamificationState().catch(() => {}));
  if (!streakData.currentStreak && authUser) loads.push(loadStreak().catch(() => {}));
  if (!dailyTarget.loaded && authUser) loads.push(loadDailyTarget().catch(() => {}));
  if (!userAchievements.length && authUser) loads.push(loadUserAchievements().catch(() => {}));
  if (!myLbRow && authUser) loads.push(_fetchMyLbRow().catch(() => {}));
  if (loads.length) await Promise.all(loads);

  // Compute national rank if needed but not yet cached
  if (authUser && myLbRow && !myRanks.national) {
    try {
      const { count } = await db.from('leaderboard_scores')
        .select('*', { count: 'exact', head: true })
        .gt('rank_score', myLbRow.rank_score);
      myRanks.national = (count || 0) + 1;
    } catch (_) {}
  }

  _renderDashHero();
  _renderDashQuickStats();
  _renderDashMissionStreak();
  _renderDashRanks();
  _renderDashAchMini();
  await _renderDashAnalytics();
}

// ── Hero: Level + XP progress bar ────────────────────────────────────────────

function _renderDashHero() {
  const el = document.getElementById('dash-hero');
  if (!el) return;
  if (!authUser) { el.innerHTML = ''; return; }

  const xp      = gamState.totalXP || 0;
  const todayXP = gamState.todayXP || 0;
  const lvlId   = gamState.id    || 1;
  const title   = gamState.title || 'Beginner';
  const icon    = gamState.icon  || '🌱';
  const nextXP  = gamState.nextXP || 500;
  const prog    = Math.min(Math.round(gamState.progress || 0), 100);
  const curLvl  = LEVELS.find(l => l.id === lvlId) || LEVELS[0];
  const xpInLvl = Math.max(0, xp - curLvl.minXP);
  const xpSpan  = nextXP - curLvl.minXP;
  const nextLvl = LEVELS.find(l => l.id === lvlId + 1);

  el.innerHTML = `
    <div class="dash-hero-card">
      <div class="dhc-top">
        <div class="dhc-icon">${icon}</div>
        <div class="dhc-info">
          <div class="dhc-level">Level ${lvlId} · ${title}</div>
          <div class="dhc-xp">${xp.toLocaleString()} XP${todayXP > 0 ? ` <span class="dhc-today-badge">+${todayXP} today</span>` : ''}</div>
        </div>
      </div>
      <div class="dhc-bar"><div class="dhc-fill" style="width:${prog}%"></div></div>
      <div class="dhc-bar-labels">
        <span>${xpInLvl.toLocaleString()} / ${xpSpan.toLocaleString()} XP to next level</span>
        <span>${prog}%</span>
      </div>
      <div class="dhc-next">${nextLvl ? `Next: <b>${nextLvl.icon} ${nextLvl.title}</b> at ${nextXP.toLocaleString()} XP` : '🏆 Maximum Level Reached!'}</div>
    </div>`;
}

// ── Quick Stats: 4-up grid ────────────────────────────────────────────────────

function _renderDashQuickStats() {
  const el = document.getElementById('dash-quick-stats');
  if (!el) return;

  const { total, correct, time } = progress;
  const acc     = total > 0 ? Math.round(correct / total * 100) : 0;
  const streak  = streakData.currentStreak || 0;
  const totalXP = gamState.totalXP || 0;
  const hrs     = Math.floor(time / 3600);
  const mins    = Math.floor((time % 3600) / 60);
  const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : mins > 0 ? `${mins}m` : '—';

  el.innerHTML = `
    <div class="dqs-grid">
      <div class="dqs-item"><div class="dqs-icon">⭐</div><div class="dqs-val">${totalXP.toLocaleString()}</div><div class="dqs-lbl">Total XP</div></div>
      <div class="dqs-item"><div class="dqs-icon">🔥</div><div class="dqs-val">${streak}</div><div class="dqs-lbl">Day Streak</div></div>
      <div class="dqs-item"><div class="dqs-icon">🎯</div><div class="dqs-val">${acc}%</div><div class="dqs-lbl">Accuracy</div></div>
      <div class="dqs-item"><div class="dqs-icon">⏱️</div><div class="dqs-val">${timeStr}</div><div class="dqs-lbl">Study Time</div></div>
    </div>`;
}

// ── Daily Mission + Streak (two-column) ──────────────────────────────────────

function _renderDashMissionStreak() {
  const el = document.getElementById('dash-mission-row');
  if (!el) return;

  const done   = dailyTarget.completedMCQs    || 0;
  const target = dailyTarget.targetMCQs       || 75;
  const pct    = Math.min(Math.round(done / target * 100), 100);
  const isDone = dailyTarget.isCompleted;

  const phy  = dailyTarget.physicsCompleted   || 0;
  const chem = dailyTarget.chemistryCompleted || 0;
  const bio  = dailyTarget.biologyCompleted   || 0;
  const phyT = dailyTarget.physicsTarget      || 25;
  const chT  = dailyTarget.chemistryTarget    || 25;
  const biT  = dailyTarget.biologyTarget      || 25;

  const sBar = (name, d, t, color) => {
    const p = t > 0 ? Math.min(Math.round(d / t * 100), 100) : 0;
    return `<div class="dmm-subj">
      <div class="dmm-subj-row"><span class="dmm-subj-name">${name}</span><span class="dmm-subj-val">${d}/${t}</span></div>
      <div class="dmm-bar"><div class="dmm-fill" style="width:${p}%;background:${color}"></div></div>
    </div>`;
  };

  const cur   = streakData.currentStreak || 0;
  const best  = streakData.longestStreak || 0;
  const bonus = cur > 0 ? (7 - (cur % 7 || 7)) : 7;

  el.innerHTML = `
    <div class="dash-two-col">
      <div class="section-card" style="margin-bottom:0">
        <div class="dash-sec-title">🎯 Today's Mission</div>
        ${isDone
          ? `<div class="dmm-done">✅ Complete! +200 XP earned</div>`
          : `<div class="dmm-subjects">
               ${sBar('⚛️ Physics',   phy,  phyT, '#3b82f6')}
               ${sBar('🧪 Chemistry', chem, chT,  '#10b981')}
               ${sBar('🌿 Biology',   bio,  biT,  '#f59e0b')}
             </div>
             <div class="dmm-total-bar"><div class="dmm-fill dmm-total-fill" style="width:${pct}%"></div></div>
             <div class="dmm-total-labels"><span>${done} / ${target} MCQs</span><span>${pct}%</span></div>`}
      </div>
      <div class="section-card" style="margin-bottom:0">
        <div class="dash-sec-title">🔥 Streak</div>
        <div class="dsm-grid">
          <div class="dsm-item"><div class="dsm-val">${cur}</div><div class="dsm-lbl">Current</div></div>
          <div class="dsm-item"><div class="dsm-val">${best}</div><div class="dsm-lbl">Best</div></div>
          <div class="dsm-item"><div class="dsm-val ${bonus <= 2 ? 'dsm-close' : ''}">${bonus}</div><div class="dsm-lbl">To 🎁</div></div>
        </div>
        <div class="dsm-hint">${cur >= 7 ? `🔥 On a ${cur}-day streak!` : cur > 0 ? `${bonus} more day${bonus!==1?'s':''} for 500 XP bonus` : 'Answer 20 MCQs today to start!'}</div>
      </div>
    </div>`;
}

// ── Leaderboard ranks ─────────────────────────────────────────────────────────

function _renderDashRanks() {
  const el = document.getElementById('dash-ranks');
  if (!el) return;

  if (!myLbRow || (!myRanks.national && !myRanks.weekly && !myRanks.level)) {
    el.innerHTML = '';
    return;
  }

  const badge = (rank, label, icon) => rank
    ? `<div class="drb-item">
         <div class="drb-icon">${icon}</div>
         <div class="drb-rank">#${rank.toLocaleString()}</div>
         <div class="drb-lbl">${label}</div>
       </div>`
    : '';

  el.innerHTML = `
    <div class="section-card">
      <div class="dash-sec-title-row">
        <div class="dash-sec-title" style="margin-bottom:0">🏅 My Rankings</div>
        <button class="dsec-link-btn" onclick="showScreen('leaderboard')">View all →</button>
      </div>
      <div class="drb-row">
        ${badge(myRanks.national, 'National', '🌍')}
        ${badge(myRanks.weekly,   'Weekly',   '📅')}
        ${badge(myRanks.level,    'My Level', '🎓')}
      </div>
    </div>`;
}

// ── Achievements mini widget ──────────────────────────────────────────────────

function _renderDashAchMini() {
  const el = document.getElementById('dash-ach-mini');
  if (!el) return;

  const unlocked = userAchievements.filter(a => a.unlocked_at);
  if (!unlocked.length) { el.innerHTML = ''; return; }

  const recent = [...unlocked]
    .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
    .slice(0, 5);

  el.innerHTML = `
    <div class="section-card">
      <div class="dash-sec-title-row">
        <div class="dash-sec-title" style="margin-bottom:0">🏅 Achievements <span class="dash-ach-count">${unlocked.length}</span></div>
        <button class="dsec-link-btn" onclick="showScreen('achievements')">See all →</button>
      </div>
      <div class="dab-row">
        ${recent.map(a => `
          <div class="dab-item" title="${a.name}">
            <div class="dab-icon">${a.icon || '🏅'}</div>
            <div class="dab-name">${a.name || ''}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── Analytics: Score Trend + Subject Accuracy + Best Chapters ────────────────

async function _renderDashAnalytics() {
  const trendEl = document.getElementById('dash-trend');
  const subjEl  = document.getElementById('dash-subject');
  const chapEl  = document.getElementById('dash-chapters');
  const loading = '<p style="color:var(--muted);font-size:.85rem;padding:.25rem 0">Loading…</p>';
  if (trendEl) trendEl.innerHTML = loading;
  if (subjEl)  subjEl.innerHTML  = loading;
  if (chapEl)  chapEl.innerHTML  = loading;

  if (!authUser) {
    [trendEl, subjEl, chapEl].forEach(el => {
      if (el) el.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Sign in to see analytics.</p>';
    });
    return;
  }

  try {
    const [perfRes, sessRes, chapRes] = await Promise.all([
      db.from('topic_performance').select('subject,chapter_id,total,correct').eq('user_id', authUser.id),
      db.from('exam_sessions').select('neet_score,total_q,completed_at').eq('user_id', authUser.id).order('completed_at', { ascending: false }).limit(10),
      db.from('chapters').select('id,label'),
    ]);

    const perf     = perfRes.data || [];
    const sessions = sessRes.data || [];
    const chapMap  = {};
    (chapRes.data || []).forEach(c => { chapMap[c.id] = c.label; });

    // Subject accuracy bars
    const subjMap = {};
    perf.forEach(r => {
      if (!subjMap[r.subject]) subjMap[r.subject] = { total: 0, correct: 0 };
      subjMap[r.subject].total   += r.total   || 0;
      subjMap[r.subject].correct += r.correct || 0;
    });
    const lvlLabel = p => p >= 75 ? { txt: 'Excellent', c: 'var(--success)' }
      : p >= 55 ? { txt: 'Good',       c: '#d97706'      }
      : p >= 35 ? { txt: 'Improving',  c: 'var(--purple)' }
      :           { txt: 'Keep Going', c: 'var(--muted)'  };

    if (subjEl) {
      subjEl.innerHTML = Object.keys(subjMap).length
        ? Object.entries(subjMap).map(([s, d]) => {
            const p   = d.total > 0 ? Math.round(d.correct / d.total * 100) : 0;
            const lv  = lvlLabel(p);
            const cls = p >= 75 ? 'success' : p >= 55 ? 'gold' : 'danger';
            return `<div class="dash-subj-row">
              <div class="dash-subj-name">${s}</div>
              <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${Math.max(p,4)}%"></div></div>
              <div class="dash-subj-pct" style="color:${lv.c}">${p}%</div>
            </div>`;
          }).join('')
        : '<p style="color:var(--muted);font-size:.85rem">No practice data yet.</p>';
    }

    // Best chapters
    const chapArr = perf
      .filter(r => r.total > 0)
      .map(r => ({ name: chapMap[r.chapter_id] || r.chapter_id, subj: r.subject, p: Math.round(r.correct / r.total * 100) }))
      .sort((a, b) => b.p - a.p)
      .slice(0, 5);
    if (chapEl) {
      chapEl.innerHTML = chapArr.length
        ? chapArr.map(({ name, subj, p }) => {
            const cls = p >= 75 ? 'success' : p >= 50 ? 'gold' : 'danger';
            return `<div class="topic-row">
              <div class="topic-header">
                <div class="topic-name">${name} <span style="font-size:.7rem;color:var(--muted)">${subj}</span></div>
                <div style="font-weight:700;color:${p>=75?'var(--success)':p>=50?'var(--gold)':'var(--danger)'}">${p}%</div>
              </div>
              <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${p}%"></div></div>
            </div>`;
          }).join('')
        : '<p style="color:var(--muted);font-size:.85rem">No data yet.</p>';
    }

    // Score trend bar chart
    if (trendEl) {
      if (!sessions.length) {
        trendEl.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Complete a timed test to see your trend.</p>';
      } else {
        const maxH = 68;
        const bars = [...sessions].reverse().map(s => {
          const maxP  = (s.total_q || 1) * 4;
          const pct   = Math.max(0, Math.min(100, Math.round((s.neet_score || 0) / maxP * 100)));
          const color = pct >= 60 ? 'var(--success)' : pct >= 30 ? '#f59e0b' : 'var(--danger)';
          const lbl   = new Date(s.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return { pct, color, lbl };
        });
        trendEl.innerHTML = `
          <div style="display:flex;align-items:flex-end;gap:5px;height:${maxH+20}px;border-bottom:1.5px solid var(--border)">
            ${bars.map(({ pct, color }) => `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
                <div style="font-size:.58rem;font-weight:700;color:${color};margin-bottom:2px">${pct}%</div>
                <div style="width:100%;background:${color};border-radius:3px 3px 0 0;height:${Math.max(Math.round(pct/100*maxH),3)}px"></div>
              </div>`).join('')}
          </div>
          <div style="display:flex;gap:5px;margin-top:4px">
            ${bars.map(({ lbl }) => `<div style="flex:1;font-size:.55rem;color:var(--muted);text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${lbl}</div>`).join('')}
          </div>
          <div style="font-size:.72rem;color:var(--muted);text-align:center;margin-top:.5rem">Last ${sessions.length} session${sessions.length>1?'s':''} · NEET score %</div>`;
      }
    }
  } catch (_) {
    [trendEl, subjEl, chapEl].forEach(el => {
      if (el) el.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Could not load data.</p>';
    });
  }
}

// ── Mistakes tracker ──────────────────────────────────────────────────────────

async function loadWrongAnswers() {
  if (!authUser) { wrongAnswers = []; return; }
  const lang_id = selection.language?.label === 'Tamil' ? 2 : 1;
  try {
    const { data, error } = await db.from('wrong_answer_tracker')
      .select(`
        times_wrong, last_wrong_at, question_id,
        questions!inner(
          id, subject, chapter_label, correct_option,
          question_translations(question_text, explanation, lang_id),
          options(option_key, option_text, lang_id)
        )
      `)
      .eq('user_id', authUser.id)
      .eq('is_mastered', false)
      .order('times_wrong', { ascending: false })
      .limit(50);
    if (error || !data) { wrongAnswers = []; return; }
    wrongAnswers = data.map(row => {
      const q     = row.questions;
      const trans = (q.question_translations || []).find(t => t.lang_id === lang_id)
                 || (q.question_translations || [])[0] || {};
      const filteredOpts = (q.options || []).filter(o => o.lang_id === lang_id);
      const allOpts = filteredOpts.length ? filteredOpts : (q.options || []);
      const optMap  = {};
      allOpts.forEach(o => { optMap[o.option_key] = o.option_text; });
      return {
        question_id: row.question_id, times_wrong: row.times_wrong,
        subject: q.subject || '', chapter: q.chapter_label || '',
        question_text: trans.question_text || '', explanation: trans.explanation || '',
        correct_option: q.correct_option, correct_text: optMap[q.correct_option] || '', optMap,
      };
    });
  } catch (_) { wrongAnswers = []; }
}

async function renderMistakes() {
  const el = document.getElementById('mistakes-list');
  el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">Loading…</div>';
  await loadWrongAnswers();
  if (!wrongAnswers.length) {
    el.innerHTML = '<div class="empty-state"><div class="ei">🎉</div><p>No mistakes yet!</p></div>';
    return;
  }
  el.innerHTML = wrongAnswers.map((m, i) => `
    <div class="mistakes-item">
      <div style="margin-bottom:.4rem;display:flex;align-items:center;justify-content:space-between">
        <div><span class="chip chip-purple">${m.subject}</span> <span class="chip chip-blue">${m.chapter}</span></div>
        <span style="font-size:.72rem;font-weight:700;color:var(--danger);background:#fee2e2;padding:.2rem .5rem;border-radius:99px">✗ ${m.times_wrong}×</span>
      </div>
      <div class="mq">${i + 1}. ${m.question_text}</div>
      <div style="font-size:.78rem;color:var(--muted)">Correct: <span style="color:var(--success);font-weight:600">${m.correct_text}</span></div>
      ${m.explanation ? `<div style="font-size:.78rem;color:var(--muted);font-style:italic;margin-top:.3rem">💡 ${m.explanation}</div>` : ''}
    </div>`).join('');
}

async function clearMistakes() {
  if (!confirm('Mark all as mastered? They will no longer appear here.')) return;
  if (authUser) {
    await db.from('wrong_answer_tracker').update({ is_mastered: true }).eq('user_id', authUser.id);
  }
  wrongAnswers = [];
  renderMistakes();
}

async function practiceWrong() {
  if (!wrongAnswers.length) await loadWrongAnswers();
  if (!wrongAnswers.length) { alert('No mistakes to practice!'); return; }
  const questions = wrongAnswers.slice(0, 20).map(m => buildQuestion({
    id: m.question_id, question_text: m.question_text, optMap: m.optMap,
    correct_option: m.correct_option, explanation: m.explanation,
    topic: m.chapter, chapter: m.chapter, subject: m.subject,
  }));
  practiceState = { questions, idx: 0, answers: {}, skipDaily: true, start: Date.now() };
  renderPracticeQ();
  showScreen('practice-quiz');
}

const SESSION_GRADIENTS = [
  'linear-gradient(135deg,#0f766e 0%,#0d9488 100%)',
  'linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)',
  'linear-gradient(135deg,#6d28d9 0%,#a78bfa 100%)',
  'linear-gradient(135deg,#b45309 0%,#f59e0b 100%)',
  'linear-gradient(135deg,#be123c 0%,#fb7185 100%)',
  'linear-gradient(135deg,#065f46 0%,#34d399 100%)',
];
