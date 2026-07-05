// ── ELECTROSTATICS PRACTICE MODE ─────────────────────────────────────────────
// Physics 12th · Electric Charges & Electrostatic Potential chapters
// Daily limit: 20 questions (capped at pool size if smaller), resets at LOCAL midnight
// No-repeat: tracks seen question IDs across days; starts a new cycle when pool exhausted

const ES_STORE_KEY  = 'electrostatics_practice';
const ES_DAILY_MAX  = 20;
// Chapter IDs for the two electrostatics chapters in Physics Class 12
const ES_CHAPTER_IDS = ['chapter1', 'chapter2'];

// Local date string YYYY-MM-DD using browser local time (not UTC)
function _esLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function _esLoad() {
  try { return JSON.parse(localStorage.getItem(ES_STORE_KEY) || 'null') || {}; }
  catch(e) { return {}; }
}
function _esSave(state) {
  try { localStorage.setItem(ES_STORE_KEY, JSON.stringify(state)); } catch(e) {}
}

// Reset daily counters if the local date has changed (handles midnight rollover)
function _esCheckRollover(state) {
  const today = _esLocalDate();
  if (state.lastDate !== today) {
    state.lastDate        = today;
    state.servedToday     = 0;
    state.todaysQuestionIds = [];
  }
  if (!state.cycleCount)     state.cycleCount     = 1;
  if (!state.seenAllTimeIds) state.seenAllTimeIds  = [];
  return state;
}

// Fetch all questions from both electrostatics chapters for the active language
async function _esBuildPool() {
  await loadManifest();
  const isT     = _isTa();
  const langObj  = manifest.languages.find(l => l.id === (isT ? 'tamil' : 'english'));
  const language = langObj?.label || (isT ? 'Tamil' : 'English');
  const standard = '12th';
  const subject  = 'Physics';

  const results = await Promise.allSettled(
    ES_CHAPTER_IDS.map(cid => fetchQuestions({ language, standard, subject, chapterId: cid }))
  );
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

// Select up to `quota` questions: unseen first, then top-up from seen.
// Mutates `state.seenAllTimeIds` and `state.cycleCount` when pool exhausted.
function _esPickQuestions(pool, state, quota) {
  const todaySet = new Set(state.todaysQuestionIds || []);
  // Questions not yet served today
  const eligible = pool.filter(q => !todaySet.has(q.id || qFingerprint(q)));

  const seenSet  = new Set(state.seenAllTimeIds || []);
  let   unseen   = eligible.filter(q => !seenSet.has(q.id || qFingerprint(q)));

  // Pool fully exhausted → start a fresh cycle
  if (unseen.length === 0 && eligible.length > 0) {
    state.seenAllTimeIds = [];
    state.cycleCount     = (state.cycleCount || 1) + 1;
    seenSet.clear();
    unseen = [...eligible];
  }

  // Prefer unseen, top up with already-seen if needed
  const picked = shuffle(unseen).slice(0, quota);
  if (picked.length < quota) {
    const alreadySeen = shuffle(
      eligible.filter(q => !picked.some(p => (p.id || qFingerprint(p)) === (q.id || qFingerprint(q))))
    );
    picked.push(...alreadySeen.slice(0, quota - picked.length));
  }
  return picked;
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

async function openElectrostaticsMode() {
  showScreen('electrostatics');
  const loadEl    = document.getElementById('es-load-msg');
  const contentEl = document.getElementById('es-content');
  const doneEl    = document.getElementById('es-daily-done');
  if (loadEl)    loadEl.style.display    = '';
  if (contentEl) contentEl.style.display = 'none';
  if (doneEl)    doneEl.style.display    = 'none';

  try {
    const pool  = await _esBuildPool();
    let   state = _esLoad();
    state = _esCheckRollover(state);
    _esSave(state);
    _esRenderScreen(state, pool.length);
  } catch(e) {
    if (loadEl) loadEl.innerHTML =
      `<div class="info-box" style="color:var(--danger)">${
        _ta('Failed to load questions. Please try again.',
            'கேள்விகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.')
      }</div>`;
  }
}

function _esRenderScreen(state, poolSize) {
  const limit   = Math.min(ES_DAILY_MAX, poolSize);
  const served  = state.servedToday || 0;
  const isDone  = served >= limit;

  const loadEl    = document.getElementById('es-load-msg');
  const contentEl = document.getElementById('es-content');
  const doneEl    = document.getElementById('es-daily-done');
  if (loadEl) loadEl.style.display = 'none';

  // Progress bar & label
  const progText = document.getElementById('es-progress-text');
  if (progText) progText.textContent =
    _ta(`${served} / ${limit} questions today`, `இன்று ${served} / ${limit} கேள்விகள்`);
  const progFill = document.getElementById('es-progress-fill');
  if (progFill) progFill.style.width = Math.min(100, limit ? Math.round(served / limit * 100) : 0) + '%';

  // Cycle badge (only after round 1)
  const cycleBadge = document.getElementById('es-cycle-badge');
  if (cycleBadge) {
    if ((state.cycleCount || 1) > 1) {
      cycleBadge.textContent = _ta(`Round ${state.cycleCount}`, `சுழற்சி ${state.cycleCount}`);
      cycleBadge.style.display = 'inline-block';
    } else {
      cycleBadge.style.display = 'none';
    }
  }

  // Pool-size caveat (only when pool < 20)
  const poolInfo = document.getElementById('es-pool-info');
  if (poolInfo) {
    if (poolSize > 0 && poolSize < ES_DAILY_MAX) {
      poolInfo.textContent =
        _ta(`${poolSize} questions in pool — daily limit set to ${poolSize}`,
            `குளத்தில் ${poolSize} கேள்விகள் — தினசரி வரம்பு ${poolSize}`);
      poolInfo.style.display = '';
    } else {
      poolInfo.style.display = 'none';
    }
  }

  // Start button
  const startBtn = document.getElementById('es-start-btn');
  if (startBtn) {
    if (isDone) {
      startBtn.disabled    = true;
      startBtn.textContent = _ta('✓ Done for today', '✓ இன்றைக்கு முடிந்தது');
    } else {
      startBtn.disabled = false;
      const remaining   = limit - served;
      startBtn.textContent = served > 0
        ? _ta(`Continue — ${remaining} left →`, `தொடர் — ${remaining} மீதம் →`)
        : _ta('Start Practice →', 'பயிற்சி தொடங்கு →');
    }
  }

  if (contentEl) contentEl.style.display = '';

  // Daily-done message
  if (doneEl) {
    doneEl.style.display = isDone ? '' : 'none';
    if (isDone) {
      const msg = document.getElementById('es-done-msg');
      if (msg) msg.innerHTML = _ta(
        `You've completed today's ${limit} Electrostatics questions.<br/>Come back tomorrow for more!`,
        `இன்றைய ${limit} மின்னியல் கேள்விகளை முடித்தீர்கள்.<br/>மேலும் கேள்விகளுக்கு நாளை வாருங்கள்!`
      );
      const resetMsg = document.getElementById('es-reset-msg');
      if (resetMsg) resetMsg.textContent =
        _ta(`Resets in ${getTimeUntilMidnight()}`, `${getTimeUntilMidnight()} இல் மீட்டமைக்கப்படும்`);
    }
  }
}

async function startElectrostaticsSession() {
  const btn = document.getElementById('es-start-btn');
  if (btn) { btn.disabled = true; btn.textContent = _ta('Loading…', 'ஏற்றுகிறது…'); }

  try {
    const pool  = await _esBuildPool();
    let   state = _esLoad();
    state = _esCheckRollover(state); // re-check in case midnight passed since page opened
    const limit   = Math.min(ES_DAILY_MAX, pool.length);
    const remaining = limit - (state.servedToday || 0);

    if (remaining <= 0) { _esRenderScreen(state, pool.length); return; }

    const questions = _esPickQuestions(pool, state, remaining);
    if (!questions.length) {
      showToast(_ta('No questions available.', 'கேள்விகள் எதுவும் இல்லை.'));
      if (btn) { btn.disabled = false; btn.textContent = _ta('Start Practice →', 'பயிற்சி தொடங்கு →'); }
      return;
    }

    // Persist served IDs BEFORE quiz so midnight rollover on open-tab is handled
    const pickedIds = questions.map(q => q.id || qFingerprint(q));
    state.seenAllTimeIds     = [...(state.seenAllTimeIds || []),     ...pickedIds];
    state.todaysQuestionIds  = [...(state.todaysQuestionIds || []),  ...pickedIds];
    state.servedToday        = (state.servedToday || 0) + questions.length;
    _esSave(state);

    // Wire up selection so progress-tracking helpers have context
    appMode = 'electrostatics';
    await loadManifest();
    const isT    = _isTa();
    const langObj = manifest.languages.find(l => l.id === (isT ? 'tamil' : 'english')) || manifest.languages[0];
    selection = {
      language: langObj,
      standard: langObj?.standards?.find(s => s.id === '12th') || langObj?.standards?.[0] || null,
      subject:  null,
      chapter:  { id: 'electrostatics', label: 'Electrostatics' },
    };
    selection.subject = selection.standard?.subjects?.find(s => s.id === 'physics') || null;

    practiceState = {
      questions,
      idx:         0,
      answers:     {},
      skipDaily:   true,   // bypass per-chapter daily counters
      chapter:     selection.chapter,
      start:       Date.now(),
      progressKey: null,   // no resume checkpoint for this mode
    };

    renderPracticeQ();
    showScreen('practice-quiz');
  } catch(e) {
    showToast(_ta('Failed to load questions. Please try again.', 'கேள்விகளை ஏற்ற முடியவில்லை.'));
    if (btn) { btn.disabled = false; btn.textContent = _ta('Start Practice →', 'பயிற்சி தொடங்கு →'); }
  }
}
