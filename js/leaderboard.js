async function saveToLeaderboard(entry) {
  if (!authUser) return false;
  try {
    const { error } = await db.from('leaderboard').insert({
      user_id: authUser.id, name: entry.name, score: entry.score,
      correct: entry.correct, total: entry.total, time_taken: entry.time,
      subject: selection.subject?.label || '', language: selection.language?.label || '',
      standard: selection.standard?.id || '', week_key: entry.week,
      selection_label: entry.selection
    });
    return !error;
  } catch (e) { return false; }
}
async function fetchGlobalLeaderboard() {
  try {
    const { data, error } = await db.from('leaderboard')
      .select('name,score,correct,total,time_taken,week_key,created_at')
      .eq('week_key', getWeekKey())
      .order('score', { ascending: false })
      .order('time_taken', { ascending: true })
      .limit(50);
    if (error) return [];
    return (data || []).map(e => ({ name: e.name, score: e.score, correct: e.correct, total: e.total, time: e.time_taken, date: new Date(e.created_at).toLocaleDateString('en-GB'), week: e.week_key }));
  } catch (e) { return []; }
}

function switchLbTab(tab) {
  currentLbTab = tab;
  ['global', 'local', 'history'].forEach(t => document.getElementById('lb-tab-' + t).classList.toggle('active', t === tab));
  renderLbContent();
}
async function loadLeaderboard() {
  setWeekLabel();
  document.getElementById('lb-content').innerHTML = '<div class="spinner-wrap"><div class="spinner"></div><p>Loading…</p></div>';
  globalLeaderboard = await fetchGlobalLeaderboard();
  renderLbContent();
}
function renderLbContent() {
  const el = document.getElementById('lb-content');
  if (currentLbTab === 'history') {
    const h = progress.history || [];
    if (!h.length) { el.innerHTML = '<div class="empty-state"><div class="ei">📅</div><p>No test history yet.</p></div>'; return; }
    const max = Math.max(...h.map(e => e.score), 1);
    el.innerHTML = h.map((e, i) => {
      const prev = i > 0 ? h[i - 1].score : null;
      const trend = prev === null ? 'same' : e.score > prev ? 'up' : e.score < prev ? 'down' : 'same';
      return `<div class="history-row"><div><b>Test ${i + 1}</b><br/><span style="font-size:.72rem;color:var(--muted)">${e.date}</span></div>
        <div><div class="history-bar-bg"><div class="history-bar-fill" style="width:${e.score / max * 100}%"></div></div></div>
        <div style="font-weight:700;color:var(--purple);text-align:right">${e.score}%</div>
        <div style="text-align:right;color:${trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--muted)'}">${trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</div></div>`;
    }).join('');
    return;
  }
  const scores = currentLbTab === 'global' ? globalLeaderboard : localLeaderboard;
  if (!scores.length) { el.innerHTML = '<div class="empty-state"><div class="ei">🏆</div><p>No scores yet. Complete the Weekly Timed Test!</p></div>'; return; }
  el.innerHTML = `<div style="overflow-x:auto"><table class="lb-table"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Correct</th><th>Time</th><th>Date</th></tr></thead><tbody>
    ${scores.slice(0, 10).map((e, i) => `<tr><td><span class="rank-badge ${i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : 'rn'}">${i + 1}</span></td>
    <td style="font-weight:500">${e.name}</td><td style="font-weight:700;color:var(--purple)">${e.score}%</td><td>${e.correct}/${e.total}</td>
    <td style="color:var(--muted);font-size:.8rem">${Math.floor(e.time / 60)}m ${e.time % 60}s</td><td style="color:var(--muted);font-size:.8rem">${e.date}</td></tr>`).join('')}
  </tbody></table></div><p style="font-size:.73rem;color:var(--muted);margin-top:.75rem;text-align:center">${currentLbTab === 'global' ? '🌍 Global leaderboard' : '📱 This device only'}</p>`;
}
function setWeekLabel() {
  const now = new Date(), start = new Date(now); start.setDate(now.getDate() - now.getDay());
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  document.getElementById('lb-week').textContent = `Week of ${fmt(start)} – ${fmt(end)}`;
}

