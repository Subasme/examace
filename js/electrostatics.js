// ── ELECTROSTATICS PRACTICE MODE ─────────────────────────────────────────────
// Physics 12th · Electric Charges & Electrostatic Potential chapters
// Daily limit: 20 questions (capped at pool size if smaller), resets at LOCAL midnight
// No-repeat: tracks seen question IDs across days; starts a new cycle when pool exhausted

const ES_STORE_KEY  = 'electrostatics_practice';
const ES_SESSION_KEY = 'karnan_electrostatics_active_session';
function _esDailyMax() {
  return adminConfig.electrostatics_daily_limit || 20;
}
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
function _esLoadSession() {
  try { return JSON.parse(localStorage.getItem(ES_SESSION_KEY) || 'null'); } catch(e) { return null; }
}
function _esSaveSession(sessionState) {
  try { localStorage.setItem(ES_SESSION_KEY, JSON.stringify(sessionState)); } catch(e) {}
}
function _esClearSession() {
  try { localStorage.removeItem(ES_SESSION_KEY); } catch(e) {}
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
  const limit   = Math.min(_esDailyMax(), poolSize);
  const served  = state.servedToday || 0;
  
  // Check active session status
  const activeSession = _esLoadSession();
  const hasActive = activeSession && activeSession.questions && activeSession.questions.length > 0 &&
                    Object.keys(activeSession.answers || {}).length < activeSession.questions.length;
                    
  const isDone  = served >= limit && !hasActive;

  const loadEl    = document.getElementById('es-load-msg');
  const contentEl = document.getElementById('es-content');
  const doneEl    = document.getElementById('es-daily-done');
  if (loadEl) loadEl.style.display = 'none';

  // Progress bar & label
  const displayServed = hasActive ? served - (activeSession.questions.length - Object.keys(activeSession.answers || {}).length) : served;
  const progText = document.getElementById('es-progress-text');
  if (progText) progText.textContent =
    _ta(`${displayServed} / ${limit} questions today`, `இன்று ${displayServed} / ${limit} கேள்விகள்`);
  const progFill = document.getElementById('es-progress-fill');
  if (progFill) progFill.style.width = Math.min(100, limit ? Math.round(displayServed / limit * 100) : 0) + '%';

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
    if (poolSize > 0 && poolSize < _esDailyMax()) {
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
      if (hasActive) {
        const remaining = activeSession.questions.length - Object.keys(activeSession.answers || {}).length;
        startBtn.textContent = _ta(`Continue — ${remaining} left →`, `தொடர் — ${remaining} மீதம் →`);
      } else {
        const remaining   = limit - served;
        startBtn.textContent = served > 0
          ? _ta(`Continue — ${remaining} left →`, `தொடர் — ${remaining} மீதம் →`)
          : _ta('Start Practice →', 'பயிற்சி தொடங்கு →');
      }
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

async function _esFetchDailyQuiz(dateStr) {
  const { data: quiz, error } = await db
    .from('daily_quizzes')
    .select('id, version, daily_quiz_questions(question_id, sequence_num)')
    .eq('publish_date', dateStr)
    .eq('subject', 'Physics')
    .eq('standard', '12th')
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return quiz;
}

async function _esFetchQuestionsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  
  // 1. Fetch tags for the input IDs
  const { data: tagData, error: tagErr } = await db
    .from('questions')
    .select('question_tag')
    .in('id', ids);
    
  if (tagErr || !tagData) return [];
  const tags = tagData.map(t => t.question_tag);
  
  // 2. Map tags to current language equivalents
  const targetTags = tags.map(tag => {
    if (window.currentLang === 'ta') {
      return tag.replace('ENPHY12EN', 'TAPHY12TA');
    } else {
      return tag.replace('TAPHY12TA', 'ENPHY12EN');
    }
  });
  
  const allTags = [...new Set([...targetTags, ...tags])];
  const isT = window.currentLang === 'ta';
  const lang_id = isT ? 2 : 1;

  // 3. Query questions and translations
  const { data, error } = await db
    .from('questions')
    .select(`id, chapter_label, topic, correct_option, question_tag, status,
             question_translations!inner(question_text, explanation),
             options(option_key, option_text)`)
    .in('question_tag', allTags)
    .eq('status', 'active')
    .eq('question_translations.lang_id', lang_id)
    .eq('options.lang_id', lang_id);
    
  if (error) throw error;
  if (!data || !data.length) return [];
  
  const mapped = data.map(r => {
    const trans = Array.isArray(r.question_translations) ? r.question_translations[0] : r.question_translations;
    const optMap = {};
    (r.options || []).forEach(o => { optMap[o.option_key] = o.option_text; });
    return buildQuestion({ id: r.id, question_text: trans?.question_text || '',
      optMap, correct_option: r.correct_option || 'A',
      explanation: trans?.explanation, topic: r.topic || r.chapter_label,
      chapter: r.chapter_label || '', tag: r.question_tag || '', subject: 'Physics' });
  });
  
  // 4. Sort and fallback
  return targetTags.map((targetTag, idx) => {
    let q = mapped.find(item => item.tag === targetTag);
    if (!q) {
      const origTag = tags[idx];
      q = mapped.find(item => item.tag === origTag);
    }
    return q;
  }).filter(Boolean);
}

async function startElectrostaticsSession() {
  const btn = document.getElementById('es-start-btn');
  if (btn) { btn.disabled = true; btn.textContent = _ta('Loading…', 'ஏற்றுகிறது…'); }

  try {
    const savedSession = _esLoadSession();
    let questions = null;
    let idx = 0;
    let answers = {};
    let sessionStart = Date.now();
    let quizId = null;
    
    // Check if we can hydrate/restore the active session
    if (savedSession && savedSession.questions && savedSession.questions.length > 0 &&
        Object.keys(savedSession.answers || {}).length < savedSession.questions.length) {
      questions = savedSession.questions;
      idx = savedSession.idx || 0;
      answers = savedSession.answers || {};
      sessionStart = savedSession.start || Date.now();
      quizId = savedSession.quizId || null;
    } else {
      // Check for daily locked quiz first
      let dailyQuiz = null;
      try {
        const todayStr = _esLocalDate();
        dailyQuiz = await _esFetchDailyQuiz(todayStr);
      } catch(e) {
        console.error('Failed to check daily quiz:', e);
      }
      
      if (dailyQuiz && dailyQuiz.daily_quiz_questions && dailyQuiz.daily_quiz_questions.length > 0) {
        quizId = dailyQuiz.id;
        const qIds = dailyQuiz.daily_quiz_questions
          .sort((a, b) => a.sequence_num - b.sequence_num)
          .map(q => q.question_id);
        questions = await _esFetchQuestionsByIds(qIds);
        
        // Mark these questions as seen
        let state = _esLoad();
        state = _esCheckRollover(state);
        const pickedIds = questions.map(q => q.id || qFingerprint(q));
        state.seenAllTimeIds     = [...(state.seenAllTimeIds || []),     ...pickedIds];
        state.todaysQuestionIds  = [...(state.todaysQuestionIds || []),  ...pickedIds];
        state.servedToday        = (state.servedToday || 0) + questions.length;
        _esSave(state);
        
        // Save initial session state
        _esSaveSession({
          questions,
          idx,
          answers,
          start: sessionStart,
          quizId
        });
      } else {
        // Start a fresh random practice session
        const pool  = await _esBuildPool();
        let   state = _esLoad();
        state = _esCheckRollover(state); // re-check in case midnight passed since page opened
        const limit   = Math.min(_esDailyMax(), pool.length);
        const remaining = limit - (state.servedToday || 0);

        if (remaining <= 0) { _esRenderScreen(state, pool.length); return; }

        questions = _esPickQuestions(pool, state, remaining);
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

        // Save initial session state
        _esSaveSession({
          questions,
          idx,
          answers,
          start: sessionStart,
          quizId: null
        });
      }
    }

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
      idx,
      answers,
      skipDaily:   true,   // bypass per-chapter daily counters
      chapter:     selection.chapter,
      start:       sessionStart,
      progressKey: ES_SESSION_KEY,
      quizId:      quizId
    };

    renderPracticeQ();
    showScreen('practice-quiz');
  } catch(e) {
    showToast(_ta('Failed to load questions. Please try again.', 'கேள்விகளை ஏற்ற முடியவில்லை.'));
    if (btn) { btn.disabled = false; btn.textContent = _ta('Start Practice →', 'பயிற்சி தொடங்கு →'); }
  }
}
