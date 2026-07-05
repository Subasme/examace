// ── ELECTRIC CHARGES AND FIELDS — DAILY PRACTICE MODE ────────────────────────
// Class 12 Physics · 200-question local pool · 20 questions/day
// localStorage key: karnan_ecf_progress
// Completely separate from the Electrostatics mode (electrostatics_practice key)

const ECF_STORE_KEY  = 'karnan_ecf_progress';
const ECF_DAILY_LIMIT = 20;

// ── State helpers ─────────────────────────────────────────────────────────────

// Local date YYYY-MM-DD using browser local time (not UTC)
function _ecfLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _ecfLoad() {
  try { return JSON.parse(localStorage.getItem(ECF_STORE_KEY) || 'null') || {}; }
  catch(e) { return {}; }
}
function _ecfSave(state) {
  try { localStorage.setItem(ECF_STORE_KEY, JSON.stringify(state)); } catch(e) {}
}

// Rotate through the pool 20 at a time using a cursor; resets when exhausted
function _ecfPickTodaysSet(state) {
  const total = ECF_QUESTIONS.length;
  let cursor = state.poolCursor || 0;
  // Rotate cursor; restart from 0 when exhausted
  if (cursor >= total) cursor = 0;
  // Build a stable shuffled order for this cycle (deterministic per cycleCount)
  if (!state.shuffleOrder || state.shuffleOrder.length !== total) {
    state.shuffleOrder = _ecfShuffle([...Array(total).keys()]);
    state.cycleCount   = (state.cycleCount || 0) + 1;
    cursor             = 0;
  }
  const indices   = state.shuffleOrder.slice(cursor, cursor + ECF_DAILY_LIMIT);
  state.poolCursor = cursor + indices.length;
  // If we wrapped the pool mid-day, carry the remainder from the next cycle
  if (indices.length < ECF_DAILY_LIMIT) {
    state.shuffleOrder = _ecfShuffle([...Array(total).keys()]);
    state.cycleCount   = (state.cycleCount || 0) + 1;
    const extra = state.shuffleOrder.slice(0, ECF_DAILY_LIMIT - indices.length);
    indices.push(...extra);
    state.poolCursor = extra.length;
  }
  return indices.map(i => ECF_QUESTIONS[i]);
}

function _ecfShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Check date rollover; reset daily session while preserving pool rotation state
function _ecfCheckRollover(state) {
  const today = _ecfLocalDate();
  if (state.lastDate !== today) {
    state.lastDate       = today;
    state.todaysQuestions = null;  // force re-pick
    state.answers         = {};
    state.currentIdx      = 0;
    state.completed       = false;
    state.repeatMode      = false;
  }
  if (!state.cycleCount)   state.cycleCount   = 0;
  if (!state.poolCursor)   state.poolCursor   = 0;
  if (!state.answers)      state.answers      = {};
  return state;
}

// Shuffle options for a question and return display object
// Keeps original A/B/C/D answer internally; resolves to display-index correct answer
function _ecfBuildDisplayQ(q) {
  const keys   = _ecfShuffle(['A','B','C','D']);
  const options = keys.map(k => q.options['ABCD'.indexOf(k)]);
  const correct = keys.indexOf(q.correct_option);
  return { ...q, displayOptions: options, displayCorrect: correct, shuffleKeys: keys };
}

// ── Screen entry point ────────────────────────────────────────────────────────

let _ecfState   = null;  // in-memory cache for current session
let _ecfDispQs  = [];    // current session's display-ready questions

async function openECFMode() {
  showScreen('ecf');
  _ecfState = _ecfLoad();
  _ecfState = _ecfCheckRollover(_ecfState);

  // Pick today's set if not already chosen
  if (!_ecfState.todaysQuestions || !_ecfState.todaysQuestions.length) {
    _ecfState.todaysQuestions = _ecfPickTodaysSet(_ecfState);
  }
  _ecfDispQs = _ecfState.todaysQuestions.map(_ecfBuildDisplayQ);
  _ecfSave(_ecfState);

  if (_ecfState.completed && !_ecfState.repeatMode) {
    _ecfShowCompletionScreen();
  } else {
    _ecfShowQuestion(_ecfState.currentIdx || 0);
  }
}

// ── Quiz rendering ────────────────────────────────────────────────────────────

function _ecfShowQuestion(idx) {
  _ecfState.currentIdx = idx;
  const q     = _ecfDispQs[idx];
  const total = _ecfDispQs.length;
  const lang  = _isTa();

  // Header
  _ecfEl('ecf-header-sub').textContent =
    _ta(`Question ${idx+1} of ${total} today`, `இன்று ${idx+1} / ${total} கேள்வி`);

  // Progress bar
  _ecfEl('ecf-prog-fill').style.width = Math.round((idx+1)/total*100) + '%';

  // Question
  _ecfEl('ecf-question').textContent = q.question;

  // Tag
  const tagEl = _ecfEl('ecf-tag');
  if (tagEl) tagEl.textContent = q.tag || '';

  // Options
  const answered = _ecfState.answers[idx];
  _ecfEl('ecf-options').innerHTML = q.displayOptions.map((opt, i) =>
    `<div class="opt${answered !== undefined ? ' locked' + (i === q.displayCorrect ? ' correct' : answered === i ? ' wrong' : '') : ''}"
       onclick="ecfAnswer(${i})">
       <div class="opt-key">${LETTERS[i]}</div>${opt}
     </div>`
  ).join('');

  // Explanation (shown after answering)
  const expEl = _ecfEl('ecf-explanation');
  if (answered !== undefined) {
    const expText = lang && q.explanation_ta ? q.explanation_ta : (q.explanation || '');
    _ecfEl('ecf-exp-text').textContent = expText;
    expEl.classList.add('show');
    expEl.classList.toggle('wrong-bg', answered !== q.displayCorrect);
  } else {
    expEl.classList.remove('show');
  }

  // Nav buttons
  const prevBtn = _ecfEl('ecf-prev');
  const nextBtn = _ecfEl('ecf-next');
  if (prevBtn) prevBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
  if (nextBtn) {
    nextBtn.textContent = idx === total - 1
      ? _ta('Finish ✓', 'முடி ✓')
      : _ta('Next →', 'அடுத்து →');
  }

  // Score counter
  const correct = Object.entries(_ecfState.answers).filter(([i,a]) => a === _ecfDispQs[i]?.displayCorrect).length;
  const wrong   = Object.keys(_ecfState.answers).length - correct;
  _ecfEl('ecf-score-status').textContent = `✅ ${correct}  ❌ ${wrong}`;

  // Cycle badge
  const cycleBadge = _ecfEl('ecf-cycle-badge');
  if (cycleBadge) {
    cycleBadge.style.display = (_ecfState.cycleCount || 0) > 1 ? '' : 'none';
    cycleBadge.textContent   = _ta(`Pool cycle ${_ecfState.cycleCount}`, `சுழற்சி ${_ecfState.cycleCount}`);
  }

  _ecfSave(_ecfState);
}

function ecfAnswer(optIdx) {
  if (_ecfState.answers[_ecfState.currentIdx] !== undefined) return; // already answered
  _ecfState.answers[_ecfState.currentIdx] = optIdx;

  // Track in global progress for dashboard/stats
  const q     = _ecfDispQs[_ecfState.currentIdx];
  const isOk  = optIdx === q.displayCorrect;
  const subj  = 'Physics';
  const chap  = 'Electric Charges and Fields';
  if (!progress.subjects[subj]) progress.subjects[subj] = { total:0, correct:0 };
  if (!progress.chapters[chap]) progress.chapters[chap] = { total:0, correct:0 };
  progress.total++;
  progress.subjects[subj].total++;
  progress.chapters[chap].total++;
  if (isOk) {
    progress.correct++;
    progress.subjects[subj].correct++;
    progress.chapters[chap].correct++;
    awardXP('correct_mcq', q.id || null).catch(()=>{});
  } else {
    progress.wrong++;
    mistakes.push({ question: q.question, options: q.displayOptions, correct: q.displayCorrect,
      explanation: q.explanation || '', subject: subj, chapter: chap,
      date: new Date().toLocaleDateString('en-GB'), yourAnswer: optIdx });
    if (mistakes.length > 200) mistakes.splice(0, mistakes.length - 200);
    if (authUser && q.id) {
      db.rpc('increment_wrong_count', { p_user_id: authUser.id, p_question_id: q.id }).catch(()=>{});
    }
  }
  saveStorage();
  incrementDailyTarget(subj).catch(()=>{});

  _ecfShowQuestion(_ecfState.currentIdx);
}

function ecfNav(dir) {
  const total = _ecfDispQs.length;
  if (dir === 1 && _ecfState.currentIdx === total - 1) {
    _ecfState.completed = true;
    _ecfSave(_ecfState);
    _ecfShowCompletionScreen();
    return;
  }
  _ecfShowQuestion(Math.max(0, Math.min(total - 1, _ecfState.currentIdx + dir)));
}

// ── Completion screen ─────────────────────────────────────────────────────────

function _ecfShowCompletionScreen() {
  const total   = _ecfDispQs.length;
  const correct = Object.entries(_ecfState.answers)
    .filter(([i,a]) => a === _ecfDispQs[+i]?.displayCorrect).length;
  const pct  = total ? Math.round(correct/total*100) : 0;
  const isTA = _isTa();

  _ecfEl('ecf-quiz-panel').style.display  = 'none';
  const doneEl = _ecfEl('ecf-done-panel');
  doneEl.style.display = '';

  _ecfEl('ecf-done-score').textContent =
    _ta(`${correct} / ${total} correct  (${pct}%)`, `${total} இல் ${correct} சரி  (${pct}%)`);

  const pctColor = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--blue)' : 'var(--danger)';
  _ecfEl('ecf-done-score').style.color = pctColor;

  _ecfEl('ecf-done-tomorrow').textContent =
    _ta(`A new set of ${ECF_DAILY_LIMIT} questions unlocks tomorrow!`,
        `நாளை புதிய ${ECF_DAILY_LIMIT} கேள்விகள் திறக்கப்படும்!`);

  _ecfEl('ecf-done-reset').textContent =
    _ta(`Resets in ${getTimeUntilMidnight()}`, `${getTimeUntilMidnight()} இல் புதுப்பிக்கப்படும்`);
}

function ecfRepeatToday() {
  // Reset answers and index only — keep same 20 questions, don't affect pool rotation
  _ecfState.answers    = {};
  _ecfState.currentIdx = 0;
  _ecfState.completed  = false;
  _ecfState.repeatMode = true;
  _ecfSave(_ecfState);
  _ecfEl('ecf-done-panel').style.display  = 'none';
  _ecfEl('ecf-quiz-panel').style.display  = '';
  _ecfShowQuestion(0);
}

// ── Utility ───────────────────────────────────────────────────────────────────

function _ecfEl(id) { return document.getElementById(id); }
