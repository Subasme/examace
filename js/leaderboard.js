// ── Leaderboard JS ──────────────────────────────────────────────────────────
// saveToLeaderboard / fetchGlobalLeaderboard kept for timed-test result screen.

async function saveToLeaderboard(entry) {
  if (!authUser) return false;
  try {
    const { error } = await db.from('leaderboard').insert({
      user_id: authUser.id, name: entry.name, score: entry.score,
      correct: entry.correct, total: entry.total, time_taken: entry.time,
      subject: selection.subject?.label || '', language: selection.language?.label || '',
      standard: selection.standard?.id || '', week_key: entry.week,
      selection_label: entry.selection,
    });
    return !error;
  } catch (_) { return false; }
}

async function fetchGlobalLeaderboard() {
  try {
    const { data } = await db.from('leaderboard')
      .select('name,score,correct,total,time_taken,week_key,created_at')
      .eq('week_key', getWeekKey())
      .order('score', { ascending: false })
      .order('time_taken', { ascending: true })
      .limit(50);
    return (data || []).map(e => ({
      name: e.name, score: e.score, correct: e.correct, total: e.total,
      time: e.time_taken, date: new Date(e.created_at).toLocaleDateString('en-GB'), week: e.week_key,
    }));
  } catch (_) { return []; }
}

// ── Gamification leaderboard ─────────────────────────────────────────────────

let lbActiveTab = 'national';
let lbCache     = {};          // { national: [], weekly: [], level: [] }
let myLbRow     = null;        // user's leaderboard_scores row
let myRanks     = {};          // { national: N, weekly: N, level: N }

function _getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

function _levelIcon(levelId) {
  return ['🌱','📖','🔍','🎓','⭐','⚔️','🚀','🏆','🩺','👑'][Math.min((levelId || 1) - 1, 9)];
}

// Fetch/refresh user's own leaderboard_scores row
async function _fetchMyLbRow() {
  if (!authUser) return;
  try {
    // Refresh rank score in DB first (fast upsert)
    await db.rpc('refresh_leaderboard_score', { p_user_id: authUser.id });
    const { data } = await db.from('leaderboard_scores')
      .select('*').eq('user_id', authUser.id).single();
    myLbRow = data || null;
  } catch (_) {}
}

async function loadLeaderboard() {
  setWeekLabel();
  document.getElementById('lb-content').innerHTML =
    '<div class="spinner-wrap"><div class="spinner"></div><p>Loading…</p></div>';

  await _fetchMyLbRow();
  _renderMyRankCard();
  await _loadLbTab(lbActiveTab);
}

async function switchLbTab(tab) {
  lbActiveTab = tab;
  document.querySelectorAll('.lb-tab-new').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab)
  );
  await _loadLbTab(tab);
}

async function _loadLbTab(tab) {
  const el = document.getElementById('lb-content');
  if (!el) return;

  if (tab === 'history') { _renderHistory(); return; }

  if (lbCache[tab]) { _renderLbRows(lbCache[tab], tab); return; }

  el.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div><p>Loading…</p></div>';

  try {
    if (tab === 'national') {
      const { data } = await db.from('leaderboard_scores')
        .select('user_id,display_name,total_xp,overall_accuracy,current_streak,level_id,level_title,rank_score')
        .order('rank_score', { ascending: false }).limit(50);
      lbCache.national = data || [];

      if (myLbRow) {
        const { count } = await db.from('leaderboard_scores')
          .select('*', { count: 'exact', head: true })
          .gt('rank_score', myLbRow.rank_score);
        myRanks.national = (count || 0) + 1;
      }

    } else if (tab === 'weekly') {
      const { data } = await db.from('leaderboard_scores')
        .select('user_id,display_name,weekly_xp,overall_accuracy,current_streak,level_id,level_title')
        .order('weekly_xp', { ascending: false }).limit(50);
      lbCache.weekly = data || [];

      if (myLbRow) {
        const { count } = await db.from('leaderboard_scores')
          .select('*', { count: 'exact', head: true })
          .gt('weekly_xp', myLbRow.weekly_xp || 0);
        myRanks.weekly = (count || 0) + 1;
      }

    } else if (tab === 'level') {
      const lvl = myLbRow?.level_id || gamState.id || 1;
      const { data } = await db.from('leaderboard_scores')
        .select('user_id,display_name,total_xp,overall_accuracy,current_streak,level_id,level_title,rank_score')
        .eq('level_id', lvl)
        .order('rank_score', { ascending: false }).limit(50);
      lbCache.level = data || [];

      if (myLbRow) {
        const { count } = await db.from('leaderboard_scores')
          .select('*', { count: 'exact', head: true })
          .eq('level_id', lvl)
          .gt('rank_score', myLbRow.rank_score);
        myRanks.level = (count || 0) + 1;
      }
    }
  } catch (_) {
    el.innerHTML = '<div class="empty-state"><div class="ei">⚠️</div><p>Could not load leaderboard. Check your connection.</p></div>';
    return;
  }

  _renderMyRankCard();
  _renderLbRows(lbCache[tab] || [], tab);
}

function _renderMyRankCard() {
  const el = document.getElementById('lb-myrank-card');
  if (!el || !authUser) return;

  if (!myLbRow && !gamState.totalXP) { el.innerHTML = ''; return; }

  const xp      = myLbRow?.total_xp      || gamState.totalXP || 0;
  const wxp     = myLbRow?.weekly_xp     || 0;
  const lvlId   = myLbRow?.level_id      || gamState.id    || 1;
  const lvlTxt  = myLbRow?.level_title   || gamState.title || 'Beginner';
  const acc     = myLbRow?.overall_accuracy || 0;
  const streak  = myLbRow?.current_streak  || streakData.currentStreak || 0;
  const icon    = _levelIcon(lvlId);

  const rankBadge = (rank, label) => rank
    ? `<div class="mrc-rank-item"><span class="mrc-rank-num">#${rank.toLocaleString()}</span><span class="mrc-rank-lbl">${label}</span></div>`
    : '';

  el.innerHTML = `
    <div class="mrc-top">
      <div class="mrc-avatar">${icon}</div>
      <div class="mrc-info">
        <div class="mrc-name">${myLbRow?.display_name || authUser?.user_metadata?.display_name || 'You'}</div>
        <div class="mrc-sub">Lv.${lvlId} ${lvlTxt} · ${xp.toLocaleString()} XP · ${acc}% acc${streak > 0 ? ` · 🔥${streak}d` : ''}</div>
      </div>
    </div>
    <div class="mrc-ranks">
      ${rankBadge(myRanks.national, '🌍 National')}
      ${rankBadge(myRanks.weekly,   '📅 Weekly')}
      ${rankBadge(myRanks.level,    '🎓 My Level')}
      ${!myRanks.national && !myRanks.weekly ? '<span style="font-size:.75rem;color:var(--muted)">Complete a timed test to appear on national rankings!</span>' : ''}
    </div>`;
}

function _renderLbRows(rows, tab) {
  const el = document.getElementById('lb-content');
  if (!el) return;

  if (!rows.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">🏆</div><p>No rankings yet. Complete a practice session to appear here!</p></div>`;
    return;
  }

  const myId  = authUser?.id;
  const medal = ['🥇','🥈','🥉'];

  el.innerHTML = rows.map((row, i) => {
    const rank    = i + 1;
    const isMe    = row.user_id === myId;
    const icon    = _levelIcon(row.level_id);
    const name    = row.display_name || 'Anonymous';
    const xpVal   = tab === 'weekly' ? (row.weekly_xp || 0) : (row.total_xp || 0);
    const xpLabel = tab === 'weekly' ? 'this week' : 'XP';
    const acc     = row.overall_accuracy ? `${row.overall_accuracy}% acc` : '';
    const str     = row.current_streak   ? `🔥${row.current_streak}d`     : '';
    const lvl     = `Lv.${row.level_id} ${row.level_title || ''}`;

    return `
      <div class="lb-row ${isMe ? 'lb-row-me' : ''}">
        <div class="lb-rank">${rank <= 3 ? medal[rank - 1] : `<span class="lb-rank-num">${rank}</span>`}</div>
        <div class="lb-avatar">${icon}</div>
        <div class="lb-row-info">
          <div class="lb-row-name">${name}${isMe ? ' <span class="lb-you-tag">You</span>' : ''}</div>
          <div class="lb-row-sub">${lvl}${acc ? ' · ' + acc : ''}${str ? ' · ' + str : ''}</div>
        </div>
        <div class="lb-row-xp">${xpVal.toLocaleString()}<span class="lb-xp-label"> ${xpLabel}</span></div>
      </div>`;
  }).join('');

  // If user not in top 50, append a separator + their position
  const userInList = rows.some(r => r.user_id === myId);
  if (!userInList && myLbRow) {
    const myRank = myRanks[tab];
    if (myRank) {
      const xpVal = tab === 'weekly' ? myLbRow.weekly_xp : myLbRow.total_xp;
      el.innerHTML += `
        <div class="lb-gap-separator">· · ·</div>
        <div class="lb-row lb-row-me">
          <div class="lb-rank"><span class="lb-rank-num">${myRank.toLocaleString()}</span></div>
          <div class="lb-avatar">${_levelIcon(myLbRow.level_id)}</div>
          <div class="lb-row-info">
            <div class="lb-row-name">${myLbRow.display_name || 'You'} <span class="lb-you-tag">You</span></div>
            <div class="lb-row-sub">Lv.${myLbRow.level_id} ${myLbRow.level_title}</div>
          </div>
          <div class="lb-row-xp">${(xpVal || 0).toLocaleString()}<span class="lb-xp-label"> ${tab === 'weekly' ? 'this week' : 'XP'}</span></div>
        </div>`;
    }
  }
}

function _renderHistory() {
  const el = document.getElementById('lb-content');
  const h  = progress.history || [];
  if (!h.length) {
    el.innerHTML = '<div class="empty-state"><div class="ei">📅</div><p>No test history yet. Complete a timed test to see your history.</p></div>';
    return;
  }
  const max = Math.max(...h.map(e => e.score), 1);
  el.innerHTML = h.map((e, i) => {
    const prev  = i > 0 ? h[i - 1].score : null;
    const trend = prev === null ? '→' : e.score > prev ? '↑' : e.score < prev ? '↓' : '→';
    const tc    = trend === '↑' ? 'var(--success)' : trend === '↓' ? 'var(--danger)' : 'var(--muted)';
    return `<div class="history-row">
      <div><b>Test ${i + 1}</b><br/><span style="font-size:.72rem;color:var(--muted)">${e.date}</span></div>
      <div><div class="history-bar-bg"><div class="history-bar-fill" style="width:${e.score / max * 100}%"></div></div></div>
      <div style="font-weight:700;color:var(--purple);text-align:right">${e.score}%</div>
      <div style="text-align:right;color:${tc};font-weight:700">${trend}</div>
    </div>`;
  }).join('');
}

function setWeekLabel() {
  const el = document.getElementById('lb-week-label');
  if (!el) return;
  const now   = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay());
  const end   = new Date(start); end.setDate(start.getDate() + 6);
  const fmt   = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  el.textContent = `Week of ${fmt(start)} – ${fmt(end)}`;
}
