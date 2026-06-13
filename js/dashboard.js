async function renderDashboard() {
  const { total, correct, wrong, subjects, chapters, time } = progress;
  const acc = total > 0 ? Math.round(correct / total * 100) : 0;
  const bestSubj  = Object.entries(subjects).sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total)[0];
  const worstSubj = Object.entries(subjects).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0];
  const bestChap  = Object.entries(chapters).sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total)[0];
  document.getElementById('dash-stats').innerHTML = `
    <div class="dash-stat"><div class="dv">${total}</div><div class="dl">Questions</div></div>
    <div class="dash-stat"><div class="dv" style="color:var(--success)">${correct}</div><div class="dl">✅ Correct</div></div>
    <div class="dash-stat"><div class="dv" style="color:var(--danger)">${wrong}</div><div class="dl">❌ Wrong</div></div>
    <div class="dash-stat"><div class="dv">${acc}%</div><div class="dl">🎯 Accuracy</div></div>
    <div class="dash-stat"><div class="dv" style="font-size:1rem">${bestSubj ? bestSubj[0] : '—'}</div><div class="dl">💪 Strongest</div></div>
    <div class="dash-stat"><div class="dv" style="font-size:1rem">${worstSubj && worstSubj[0] !== bestSubj?.[0] ? worstSubj[0] : '—'}</div><div class="dl">📖 Needs Work</div></div>
    <div class="dash-stat"><div class="dv" style="font-size:1rem">${bestChap ? bestChap[0].substring(0, 14) : '—'}</div><div class="dl">⭐ Best Chapter</div></div>
    <div class="dash-stat"><div class="dv">${Math.floor(time / 3600)}h ${Math.floor((time % 3600) / 60)}m</div><div class="dl">⏱ Study Time</div></div>`;

  const loading = '<div style="color:var(--muted);font-size:.85rem;padding:.25rem 0">Loading…</div>';
  document.getElementById('dash-trend').innerHTML   = loading;
  document.getElementById('dash-subject').innerHTML = loading;
  document.getElementById('dash-chapters').innerHTML = loading;
  if (!authUser) return;

  try {
    const [perfRes, sessRes, chapRes] = await Promise.all([
      db.from('topic_performance').select('subject, chapter_id, total, correct').eq('user_id', authUser.id),
      db.from('exam_sessions').select('neet_score, total_q, completed_at, mode')
        .eq('user_id', authUser.id).order('completed_at', { ascending: false }).limit(10),
      db.from('chapters').select('id, label')
    ]);

    const perf     = perfRes.data || [];
    const sessions = sessRes.data || [];
    const chapLabelMap = {};
    (chapRes.data || []).forEach(c => { chapLabelMap[c.id] = c.label; });

    // ── Subject-wise accuracy ─────────────────────────────────────────────────
    const subjMap = {};
    perf.forEach(r => {
      if (!subjMap[r.subject]) subjMap[r.subject] = { total: 0, correct: 0 };
      subjMap[r.subject].total   += (r.total   || 0);
      subjMap[r.subject].correct += (r.correct || 0);
    });
    const subjLevel = p => p >= 75 ? { lbl: '🏆 Excellent', c: 'var(--success)' }
      : p >= 55 ? { lbl: '⭐ Good',      c: '#d97706' }
      : p >= 35 ? { lbl: '📈 Improving', c: 'var(--purple)' }
      :           { lbl: '💪 Keep Going', c: 'var(--muted)' };
    document.getElementById('dash-subject').innerHTML = Object.keys(subjMap).length
      ? Object.entries(subjMap).map(([s, d]) => {
          const p = d.total > 0 ? Math.round(d.correct / d.total * 100) : 0;
          const lv = subjLevel(p);
          return `<div style="display:grid;grid-template-columns:80px 1fr auto;align-items:center;gap:.6rem;margin-bottom:.75rem">
            <div style="font-size:.82rem;font-weight:600">${s}</div>
            <div class="progress-bar"><div class="progress-fill ${p>=75?'success':p>=55?'gold':p>=35?'':'danger'}" style="width:${Math.max(p,4)}%"></div></div>
            <div style="font-size:.76rem;font-weight:700;color:${lv.c};white-space:nowrap">${p}% · ${lv.lbl}</div>
          </div>`;
        }).join('')
      : '<p style="color:var(--muted);font-size:.85rem">No practice data yet.</p>';

    // ── Best chapters ─────────────────────────────────────────────────────────
    const chapArr = perf
      .filter(r => r.total > 0)
      .map(r => ({ name: chapLabelMap[r.chapter_id] || r.chapter_id, subj: r.subject, p: Math.round(r.correct / r.total * 100) }))
      .sort((a, b) => b.p - a.p)
      .slice(0, 5);
    document.getElementById('dash-chapters').innerHTML = chapArr.length
      ? chapArr.map(({ name, subj, p }) => `
          <div class="topic-row">
            <div class="topic-header">
              <div class="topic-name">${name} <span style="font-size:.7rem;color:var(--muted)">${subj}</span></div>
              <div style="font-weight:700;color:${p>=75?'var(--success)':p>=50?'var(--gold)':'var(--danger)'}">${p}%</div>
            </div>
            <div class="progress-bar"><div class="progress-fill ${p>=75?'success':p>=50?'gold':'danger'}" style="width:${p}%"></div></div>
          </div>`).join('')
      : '<p style="color:var(--muted);font-size:.85rem">No data yet.</p>';

    // ── Score trend (vertical bar chart, CSS-only) ────────────────────────────
    if (!sessions.length) {
      document.getElementById('dash-trend').innerHTML = '<p style="color:var(--muted);font-size:.85rem">Complete a test to see your trend.</p>';
    } else {
      const maxBarH = 68;
      const bars = [...sessions].reverse().map(s => {
        const maxPoss = (s.total_q || 1) * 4;
        const pct = Math.max(0, Math.min(100, Math.round((s.neet_score || 0) / maxPoss * 100)));
        const color = pct >= 60 ? 'var(--success)' : pct >= 30 ? '#f59e0b' : 'var(--danger)';
        const lbl = new Date(s.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return { pct, color, lbl };
      });
      document.getElementById('dash-trend').innerHTML = `
        <div style="display:flex;align-items:flex-end;gap:5px;height:${maxBarH + 18}px;border-bottom:1.5px solid var(--border);padding-bottom:0">
          ${bars.map(({ pct, color }) => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
              <div style="font-size:.58rem;font-weight:700;color:${color};margin-bottom:2px">${pct}%</div>
              <div style="width:100%;background:${color};border-radius:3px 3px 0 0;height:${Math.max(Math.round(pct/100*maxBarH), 3)}px"></div>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:5px;margin-top:4px">
          ${bars.map(({ lbl }) => `<div style="flex:1;font-size:.55rem;color:var(--muted);text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${lbl}</div>`).join('')}
        </div>
        <div style="font-size:.72rem;color:var(--muted);text-align:center;margin-top:.5rem">Last ${sessions.length} session${sessions.length > 1 ? 's' : ''} · NEET score %</div>`;
    }
  } catch(e) {
    ['dash-trend','dash-subject','dash-chapters'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.textContent.trim() === 'Loading…') el.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Could not load data.</p>';
    });
  }
}

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
      const q = row.questions;
      const trans = (q.question_translations || []).find(t => t.lang_id === lang_id)
                 || (q.question_translations || [])[0] || {};
      const filteredOpts = (q.options || []).filter(o => o.lang_id === lang_id);
      const allOpts = filteredOpts.length ? filteredOpts : (q.options || []);
      const optMap = {};
      allOpts.forEach(o => { optMap[o.option_key] = o.option_text; });
      return {
        question_id: row.question_id,
        times_wrong: row.times_wrong,
        subject: q.subject || '',
        chapter: q.chapter_label || '',
        question_text: trans.question_text || '',
        explanation: trans.explanation || '',
        correct_option: q.correct_option,
        correct_text: optMap[q.correct_option] || '',
        optMap
      };
    });
  } catch(e) { wrongAnswers = []; }
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
    await db.from('wrong_answer_tracker')
      .update({ is_mastered: true })
      .eq('user_id', authUser.id);
  }
  wrongAnswers = [];
  renderMistakes();
}

async function practiceWrong() {
  if (!wrongAnswers.length) await loadWrongAnswers();
  if (!wrongAnswers.length) { alert('No mistakes to practice!'); return; }
  const questions = wrongAnswers.slice(0, 20).map(m => buildQuestion({
    id: m.question_id,
    question_text: m.question_text,
    optMap: m.optMap,
    correct_option: m.correct_option,
    explanation: m.explanation,
    topic: m.chapter,
    chapter: m.chapter,
    subject: m.subject
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

