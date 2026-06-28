let flashcardState = { questions: [], idx: 0, flipped: false };

async function startFlashcards(chapter) {
  selection.chapter = chapter;
  document.getElementById('chapter-list').innerHTML = '<div class="spinner-wrap"><div class="spinner"></div><p>Loading flashcards…</p></div>';
  try {
    let qs = await fetchQuestions({ language: selection.language.label, standard: selection.standard.id, subject: selection.subject.dbLabel || selection.subject.label, chapterId: chapter.id});
    if (userPlan === 'free') {
      const isFC = appMode !== 'truefalse';
      const done = isFC ? getFCDoneToday() : getTFDoneToday();
      const limit = isFC ? FREE_FC_DAILY : FREE_TF_DAILY;
      const remaining = limit - done;
      if (remaining <= 0) {
        showScreen('home');
        showToast(isFC ? `You have used all ${FREE_FC_DAILY} flashcards for today. Come back tomorrow!` : `You have used all ${FREE_TF_DAILY} True/False questions for today. Come back tomorrow!`);
        return;
      }
      qs = shuffle(qs).slice(0, remaining);
    } else {
      qs = shuffle(qs);
    }
    flashcardState = { questions: qs, idx: 0, flipped: false };
    renderFlashcard();
    showScreen('flashcard');
    if (appMode === 'truefalse') {
      switchFlashcardTab('truefalse');
    } else {
      switchFlashcardTab('flashcard');
    }
  } catch(e) {
    alert('Failed to load flashcards.');
    renderChapters();
  }
}

function renderFlashcard() {
  const { questions, idx } = flashcardState;
  const q = questions[idx], total = questions.length;
  document.getElementById('fc-num').textContent = idx + 1;
  document.getElementById('fc-total').textContent = total;
  document.getElementById('fc-progress').style.width = ((idx + 1) / total * 100) + '%';
  // "Subject · Chapter" breadcrumb
  const subjectName = q.subject || selection.subject?.label || '';
  const chapterName = _chapLabel(selection.chapter?.label || '');
  const breadcrumb = [subjectName, chapterName].filter(Boolean).join(' · ');
  const bc = document.getElementById('fc-breadcrumb');
  const bcBack = document.getElementById('fc-breadcrumb-back');
  if (bc) bc.textContent = breadcrumb;
  if (bcBack) bcBack.textContent = breadcrumb;
  // subject chip
  const sc = document.getElementById('fc-subj-chip');
  sc.textContent = subjectName;
  sc.className = 'subject-chip ' + subjClass(subjectName);
  // tag badge
  const tagEl = document.getElementById('fc-tag');
  if (tagEl) tagEl.textContent = q.tag || '';
  // question & answer
  document.getElementById('fc-question').textContent = q.question;
  document.getElementById('fc-answer').textContent = q.options[q.correct];
  // example box (correct option text without letter prefix)
  const exampleEl = document.getElementById('fc-example-text');
  if (exampleEl) exampleEl.textContent = q.options[q.correct];
  // exam tip from explanation
  const expEl = document.getElementById('fc-exp');
  const tipWrap = document.getElementById('fc-tip-wrap');
  if (q.explanation) {
    expEl.textContent = q.explanation;
    if (tipWrap) tipWrap.style.display = '';
  } else {
    if (tipWrap) tipWrap.style.display = 'none';
  }
  // reset to front face
  flashcardState.counted = flashcardState.counted || new Set();
  flashcardState.flipped = false;
  document.getElementById('fc-front').classList.remove('hidden');
  document.getElementById('fc-back').classList.add('hidden');
  document.getElementById('fc-prev').disabled = idx === 0;
  document.getElementById('fc-next').disabled = idx === total - 1;
}

function flipCard() {
  flashcardState.flipped = !flashcardState.flipped;
  document.getElementById('fc-front').classList.toggle('hidden', flashcardState.flipped);
  document.getElementById('fc-back').classList.toggle('hidden', !flashcardState.flipped);
  if (flashcardState.flipped && !flashcardState.counted?.has(flashcardState.idx)) {
    flashcardState.counted = flashcardState.counted || new Set();
    flashcardState.counted.add(flashcardState.idx);
    incFCDone(1);
  }
}

function flashcardNav(dir) {
  flashcardState.idx = Math.max(0, Math.min(flashcardState.questions.length - 1, flashcardState.idx + dir));
  renderFlashcard();
}

// ── TRUE/FALSE QUIZ ──
let tfState = { statements: [], idx: 0, score: 0, answered: false };

function generateTFStatements(questions) {
  return questions.map(q => {
    const isTrue = Math.random() > 0.5;
    const wrongIdxs = [0,1,2,3].filter(i => i !== q.correct);
    const wrongIdx = wrongIdxs[Math.floor(Math.random() * wrongIdxs.length)];
    const statementText = isTrue ? q.options[q.correct] : q.options[wrongIdx];
    return { question: q.question, statement: statementText, isTrue, explanation: q.explanation || '', correctText: q.options[q.correct], subject: q.subject };
  });
}

function switchFlashcardTab(tab) {
  document.getElementById('fc-tab-flashcard').classList.toggle('active', tab === 'flashcard');
  document.getElementById('fc-tab-truefalse').classList.toggle('active', tab === 'truefalse');
  const fcSection = document.getElementById('fc-flashcard-section');
  const tfSection = document.getElementById('fc-truefalse-section');
  if (fcSection) fcSection.style.display = tab === 'flashcard' ? '' : 'none';
  if (tfSection) tfSection.style.display = tab === 'truefalse' ? '' : 'none';
  if (tab === 'truefalse') initTrueFalse();
}

function initTrueFalse() {
  tfState = { statements: generateTFStatements(flashcardState.questions), idx: 0, score: 0, answered: false };
  renderTF();
}

function renderTF() {
  const { statements, idx, score } = tfState;
  const total = statements.length;
  const s = statements[idx];
  document.getElementById('tf-score').textContent = score;
  document.getElementById('tf-qnum').textContent = `QUESTION ${idx + 1} OF ${total}`;
  document.getElementById('tf-topic').textContent = s.subject || '';
  document.getElementById('tf-stmt-q').textContent = 'Is this the correct answer?\n' + s.question;
  document.getElementById('tf-stmt-opt').textContent = s.statement;
  // reset feedback
  const fb = document.getElementById('tf-feedback');
  fb.style.display = 'none';
  fb.className = 'tf-feedback';
  document.getElementById('tf-next-btn').style.display = 'none';
  // re-enable buttons
  const btnT = document.getElementById('tf-btn-true');
  const btnF = document.getElementById('tf-btn-false');
  if (btnT) btnT.disabled = false;
  if (btnF) btnF.disabled = false;
  tfState.answered = false;
}

function answerTF(userSaysTrue) {
  if (tfState.answered) return;
  tfState.answered = true;
  incTFDone(1);
  const s = tfState.statements[tfState.idx];
  const correct = (userSaysTrue === s.isTrue);
  if (correct) tfState.score++;
  document.getElementById('tf-score').textContent = tfState.score;
  // disable buttons
  document.getElementById('tf-btn-true').disabled = true;
  document.getElementById('tf-btn-false').disabled = true;
  // show feedback
  const fb = document.getElementById('tf-feedback');
  fb.style.display = 'block';
  fb.className = 'tf-feedback ' + (correct ? 'ok' : 'bad');
  document.getElementById('tf-feedback-lbl').textContent = correct ? '✅ Correct!' : '❌ Incorrect.';
  document.getElementById('tf-feedback-body').innerHTML = `<b>Correct answer:</b> ${s.correctText}${s.explanation ? `<br/><b>Explanation:</b> ${s.explanation}` : ''}`;
  // show next button unless last question
  if (tfState.idx < tfState.statements.length - 1) {
    document.getElementById('tf-next-btn').style.display = 'block';
  }
}

function nextTF() {
  tfState.idx++;
  renderTF();
}

function showCommunity() {
  showScreenPublic('community');
}

function updateResetTimer() {
  const el = document.getElementById('time-until-reset');
  if (el) el.textContent = getTimeUntilMidnight();
}

function renderPracticeQ() {
  const { questions, idx, answers } = practiceState;
  const q = questions[idx], total = questions.length;
  document.getElementById('pq-num').textContent = idx + 1;
  document.getElementById('pq-total').textContent = total;
  document.getElementById('pq-progress').style.width = ((idx + 1) / total * 100) + '%';
  const chapEl = document.getElementById('pq-chapter-name');
  if (chapEl) chapEl.textContent = _chapLabel(selection.chapter?.label || q.chapter || '');
  const sc = document.getElementById('pq-subj-chip');
  sc.textContent = q.subject || selection.subject?.label || '';
  sc.className = 'subject-chip ' + subjClass(q.subject || selection.subject?.label);
  document.getElementById('pq-question').textContent = q.question;
  const pqTag = document.getElementById('pq-tag');
  if (pqTag) pqTag.textContent = q.tag || '';
  const answered = answers[idx];
  document.getElementById('pq-options').innerHTML = q.options.map((o, i) => {
    let cls = 'opt';
    if (answered !== undefined) {
      cls += ' locked';
      if (i === q.correct) cls += ' correct';
      else if (i === answered) cls += ' wrong';
    }
    return `<div class="${cls}" onclick="answerPractice(${i})"><div class="opt-key">${LETTERS[i]}</div>${o}</div>`;
  }).join('');
  const expEl = document.getElementById('pq-explanation');
  document.getElementById('pq-exp-text').textContent = q.explanation || '';
  if (answered !== undefined && appMode !== 'challenge') { expEl.classList.add('show'); expEl.classList.toggle('wrong-bg', answered !== q.correct); }
  else expEl.classList.remove('show');
  document.getElementById('pq-prev').style.visibility = idx === 0 ? 'hidden' : 'visible';
  const nextBtn = document.getElementById('pq-next');
  if (appMode === 'challenge' && idx === total - 1) {
    nextBtn.textContent = 'See Results →';
  } else {
    nextBtn.textContent = idx === total - 1 ? 'Finish ✓' : 'Next →';
  }
  const banner = document.querySelector('#screen-practice-quiz .practice-mode-banner');
  if (banner && appMode === 'challenge') {
    banner.style.cssText = 'background:linear-gradient(90deg,#1e1b4b,#312e81);border-left-color:#6366f1;color:#c7d2fe';
    banner.querySelector('span').textContent = '🏆 Challenge Mode';
  } else if (banner) {
    banner.style.cssText = '';
    banner.querySelector('span').textContent = '📚 Practice Mode';
  }
  const correct = Object.entries(answers).filter(([i, a]) => a === questions[i]?.correct).length;
  const wrong = Object.keys(answers).length - correct;
  const ch = practiceState.chapter || selection.chapter;
  let statusText = `✅ ${correct}  ❌ ${wrong}`;
  if (!practiceState.skipDaily && userPlan === 'free') {
    const dailyLeft = Math.max(0, FREE_DAILY_LIMIT - getSubjectDailyTotal());
    statusText += `  📅 ${dailyLeft} left today`;
  }
  document.getElementById('pq-status').textContent = statusText;
}

function answerPractice(i) {
  if (practiceState.answers[practiceState.idx] !== undefined) return;
  const q = practiceState.questions[practiceState.idx];
  practiceState.answers[practiceState.idx] = i;
  const subj = q.subject || selection.subject?.label || 'General';
  const chap = q.chapter || selection.chapter?.label || q.topic || 'General';
  const chapId = selection.chapter?.id || '';
  const isCorrect = i === q.correct;
  const isSkip = i === -1;
  const neetScore = isSkip ? 0 : isCorrect ? 4 : -1;
  if (!progress.subjects[subj]) progress.subjects[subj] = { total: 0, correct: 0 };
  if (!progress.chapters[chap]) progress.chapters[chap] = { total: 0, correct: 0 };
  progress.total++;
  progress.subjects[subj].total++;
  progress.chapters[chap].total++;
  if (isCorrect) {
    progress.correct++;
    progress.subjects[subj].correct++;
    progress.chapters[chap].correct++;
    awardXP('correct_mcq', q.id || null).catch(() => {});
  } else if (!isSkip) {    progress.wrong++;
    mistakes.push({ question: q.question, options: q.options, correct: q.correct, explanation: q.explanation || '', subject: subj, chapter: chap, date: new Date().toLocaleDateString('en-GB'), yourAnswer: i });
    if (mistakes.length > 200) mistakes.splice(0, mistakes.length - 200);
    if (authUser) {
      if (q.id) db.rpc('increment_wrong_count', { p_user_id: authUser.id, p_question_id: q.id }).then();
      db.from('mistakes').insert({ user_id: authUser.id, question: q.question, options: q.options, correct: q.correct, explanation: q.explanation || '', subject: subj, chapter: chap, your_answer: i }).then();
    }
  }
  // Write to topic_performance (new schema)
  if (authUser && chapId) {
    db.from('topic_performance').upsert({
      user_id: authUser.id, subject: subj,
      chapter_id: chapId, standard: selection.standard?.id || '12th',
      total: (progress.chapters[chap]?.total || 1),
      correct: (progress.chapters[chap]?.correct || 0),
      neet_score: (progress.chapters[chap]?.neet_score || 0) + neetScore,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,subject,chapter_id,standard' }).then();
  }
  // Daily target + streak tracking (every answered MCQ counts)
  if (!isSkip) incrementDailyTarget(subj).catch(() => {});
  if (!practiceState.skipDaily && selection.chapter) {
    const dayData = getDailyDone(selection.chapter);
    dayData.count = (dayData.count || 0) + 1;
    dayData.seen = dayData.seen || [];
    dayData.seen.push(qFingerprint(q));
    setDailyDone(selection.chapter, dayData);
  }
  saveStorage();
  // Save resume progress
  if (practiceState.progressKey) {
    const nextIdx = practiceState.idx + 1;
    if (nextIdx < practiceState.questions.length) {
      try { localStorage.setItem(practiceState.progressKey, String(nextIdx)); } catch(e) {}
    }
  }
  renderPracticeQ();
}

function practiceNav(dir) {
  const total = practiceState.questions.length;
  if (dir === 1 && practiceState.idx === total - 1) {
    // Chapter complete — clear resume progress
    if (practiceState.progressKey) { try { localStorage.removeItem(practiceState.progressKey); } catch(e) {} }
    const timeTakenSecs = Math.round((Date.now() - (practiceState.start || Date.now())) / 1000);
    saveSessionToSupabase({ questions: practiceState.questions, answers: practiceState.answers, timeTakenSecs, mode: appMode || 'practice', chapterId: selection.chapter?.id });
    // XP + mastery on chapter completion
    if (authUser && total >= 5) {
      const chapCorrect = Object.entries(practiceState.answers).filter(([i, a]) => a === practiceState.questions[i]?.correct).length;
      awardXP('chapter_test', selection.chapter?.id || null).catch(() => {});
      recordChapterSession(selection.chapter?.id, selection.subject?.dbLabel || selection.subject?.label, chapCorrect, total).catch(() => {});
      checkAndShowAchievements().catch(() => {});
      // Progression unlock — requires ≥20 questions to count as an attempt
      if (total >= 20 && selection.chapter?.id && appMode === 'practice') {
        const scorePct = Math.round(chapCorrect / total * 100);
        const subj = selection.subject?.dbLabel || selection.subject?.label;
        recordChapterAttempt(selection.chapter.id, subj, scorePct, total).catch(() => {});
      }
    }
    if (!practiceState.skipDaily && userPlan !== 'premium' && userPlan !== 'unlimited' && selection.chapter && isDailyComplete(selection.chapter)) {
      document.getElementById('done-chapter').textContent = _chapLabel(selection.chapter.label);
      const limitEl = document.getElementById('done-limit');
      if (limitEl) limitEl.textContent = `${FREE_DAILY_LIMIT} questions`;
      const subLimitEl = document.getElementById('done-subject-limit');
      if (subLimitEl) subLimitEl.textContent = `${FREE_DAILY_LIMIT} questions`;
      updateResetTimer();
      showScreen('daily-done');
    } else showScreen('practice-chapter');
    return;
  }
  practiceState.idx = Math.max(0, Math.min(total - 1, practiceState.idx + dir));
  renderPracticeQ();
}

function renderTimedDurationOptions() {
  const maxFree = adminConfig.free_max_test_duration;
  const options = [
    { mins: 15, label: '15 Minutes', sub: '15 Questions' },
    { mins: 30, label: '30 Minutes', sub: '30 Questions' },
    { mins: 45, label: '45 Minutes', sub: '45 Questions' },
    { mins: 60, label: '1 Hour', sub: '60 Questions' },
    { mins: 90, label: '1.5 Hours', sub: '90 Questions' },
    { mins: 120, label: '2 Hours', sub: '120 Questions' },
    { mins: 150, label: '2.5 Hours', sub: '150 Questions' },
    { mins: 180, label: '3 Hours', sub: '180 Questions' },
  ];
  const isFree = userPlan === 'free';
  // default select first allowed option
  const firstAllowed = options.find(o => !isFree || o.mins <= maxFree);
  if (firstAllowed) { timedQCount = firstAllowed.mins; timedDuration = firstAllowed.mins * 60; }
  document.getElementById('timed-duration-options').innerHTML = options.map(o => {
    const locked = isFree && o.mins > maxFree;
    const isSelected = o.mins === timedQCount;
    return `<button class="sel-btn${isSelected ? ' active' : ''}${locked ? ' disabled' : ''}"
      style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem"
      ${locked ? `onclick="showUpgradePrompt('Timed Tests > ${o.label}')"` : `onclick="pickTimedDuration(${o.mins},this)"`}>
      <span>⏱ ${o.label}</span>
      <span style="font-size:.8rem;opacity:.7">${locked ? '🔒 Premium' : o.sub}</span>
    </button>`;
  }).join('');
}
function pickTimedDuration(mins, btn) {
  timedQCount = mins;
  timedDuration = mins * 60;
  document.querySelectorAll('#timed-duration-options .sel-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function startTimedTest() {
  const name = document.getElementById('timed-name').value.trim();
  if (!name) { document.getElementById('timed-err').style.display = 'block'; return; }
  document.getElementById('timed-err').style.display = 'none';
  const btn = document.querySelector('#screen-timed-setup .btn-gold');
  btn.textContent = 'Loading questions…'; btn.disabled = true;
  try {
    const subjects = selection.standard?.subjects || [];
    let allQs = [];
    if (subjects.length > 1) {
      const results = await Promise.all(subjects.map(s =>
        fetchQuestions({ language: selection.language.label, standard: selection.standard.id, subject: s.label })
      ));
      const perSubj = Math.floor(timedQCount / subjects.length);
      results.forEach((subQs, i) => {
        allQs = allQs.concat(shuffle(subQs.map(q => ({ ...q, subject: subjects[i]?.label || q.subject }))).slice(0, perSubj));
      });
    } else {
      allQs = await fetchQuestions({ language: selection.language.label, standard: selection.standard.id, subject: selection.subject.dbLabel || selection.subject.label });
    }
    const qs = shuffle(allQs).slice(0, timedQCount);
    timedState = { questions: qs, idx: 0, answers: {}, marked: {}, secs: timedDuration, totalSecs: timedDuration, timer: null, start: Date.now(), name };
    document.getElementById('tq-total').textContent = qs.length;
    updateTimerDisplay();
    renderTimedQ();
    renderQNav();
    showScreen('timed-quiz');
    timedState.timer = setInterval(timerTick, 1000);
  } catch (e) {
    alert('Failed to load questions for timed test.');
  }
  btn.textContent = '🚀 Start Timed Test'; btn.disabled = false;
}

function updateTimerDisplay() {
  const h = Math.floor(timedState.secs / 3600), m = Math.floor((timedState.secs % 3600) / 60), s = timedState.secs % 60;
  const el = document.getElementById('tq-timer');
  el.textContent = `⏱ ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('urgent', timedState.secs <= 300);
}

function renderTimedQ() {
  const { questions, idx, answers, marked } = timedState;
  const q = questions[idx];
  document.getElementById('tq-num').textContent = idx + 1;
  document.getElementById('tq-progress').style.width = ((idx + 1) / questions.length * 100) + '%';
  const sc = document.getElementById('tq-subj-chip');
  sc.textContent = q.subject || selection.subject?.label || '';
  sc.className = 'subject-chip ' + subjClass(q.subject || selection.subject?.label);
  document.getElementById('tq-question').textContent = q.question;
  document.getElementById('tq-options').innerHTML = q.options.map((o, i) =>
    `<div class="opt${answers[idx] === i ? ' selected' : ''}" onclick="answerTimed(${i})"><div class="opt-key">${LETTERS[i]}</div>${o}</div>`
  ).join('');
  document.getElementById('tq-prev').style.visibility = idx === 0 ? 'hidden' : 'visible';
  document.getElementById('tq-next').textContent = idx === questions.length - 1 ? 'Finish →' : 'Next →';
  const markBtn = document.getElementById('tq-mark');
  markBtn.classList.toggle('marked', !!marked[idx]);
  markBtn.textContent = marked[idx] ? '🟡 Marked' : '🟡 Mark for Review';
}

function answerTimed(i) { timedState.answers[timedState.idx] = i; renderTimedQ(); renderQNav(); }
function toggleMark() { timedState.marked[timedState.idx] = !timedState.marked[timedState.idx]; renderTimedQ(); renderQNav(); }
function timedNav(dir) {
  if (dir === 1 && timedState.idx === timedState.questions.length - 1) { confirmSubmit(); return; }
  timedState.idx = Math.max(0, Math.min(timedState.questions.length - 1, timedState.idx + dir));
  renderTimedQ(); renderQNav();
}
function jumpToQ(i) { timedState.idx = i; renderTimedQ(); renderQNav(); }

function renderQNav() {
  const { questions, idx, answers, marked } = timedState;
  const groups = {};
  questions.forEach((q, i) => {
    const s = q.chapter || q.topic || 'Questions';
    if (!groups[s]) groups[s] = [];
    groups[s].push(i);
  });
  let html = '';
  for (const [label, indices] of Object.entries(groups)) {
    html += `<div class="qnav-section">${label}</div><div class="qnav-grid">`;
    html += indices.map(i => {
      let cls = 'qnav-btn';
      if (i === idx) cls += ' current';
      else if (marked[i]) cls += ' marked';
      else if (answers[i] !== undefined) cls += ' answered';
      else cls += ' notanswered';
      return `<button class="${cls}" onclick="jumpToQ(${i})">${i + 1}</button>`;
    }).join('');
    html += '</div>';
  }
  document.getElementById('qnav-grid').innerHTML = html;
}

function timerTick() {
  timedState.secs--;
  updateTimerDisplay();
  if (timedState.secs <= 0) { clearInterval(timedState.timer); finishTimedTest(); }
}

// ── Save session results to Supabase ─────────────────────────────────────────
async function saveSessionToSupabase({ questions, answers, timeTakenSecs, mode, chapterId }) {
  if (!authUser) return;
  const lang_id = selection.language?.label === 'Tamil' ? 2 : 1;
  let correct = 0, wrong = 0, skipped = 0;
  questions.forEach((q, i) => {
    if (answers[i] === undefined) skipped++;
    else if (answers[i] === q.correct) correct++;
    else wrong++;
  });
  const neet_score = correct * 4 - wrong;

  try {
    // 1. Insert exam_session
    const { data: sess, error: sessErr } = await db.from('exam_sessions').insert({
      user_id:      authUser.id,
      mode:         mode || appMode || 'practice',
      language:     selection.language?.label || 'English',
      standard:     selection.standard?.id    || '12th',
      subject:      selection.subject?.label  || null,
      chapter_id:   chapterId || selection.chapter?.id || null,
      total_q:      questions.length,
      correct_q:    correct,
      wrong_q:      wrong,
      skipped_q:    skipped,
      neet_score,
      time_taken:   timeTakenSecs,
      completed_at: new Date().toISOString()
    }).select('id').single();
    if (sessErr || !sess) return;

    const sessionId = sess.id;

    // 2. Insert question_responses
    const responses = questions.map((q, i) => {
      const answered    = answers[i] !== undefined;
      const isCorrect   = answered && answers[i] === q.correct;
      // map display index back to A/B/C/D using shuffleMap
      const selOpt      = answered ? (q.shuffleMap?.[answers[i]] || null) : null;
      return {
        session_id:      sessionId,
        question_id:     q.id || null,
        selected_option: selOpt,
        is_correct:      answered ? isCorrect : null,
        neet_score:      answered ? (isCorrect ? 4 : -1) : 0,
        time_taken:      0
      };
    }).filter(r => r.question_id); // only rows where we have a UUID
    if (responses.length) await db.from('question_responses').insert(responses);

    // 3. Increment wrong_answer_tracker (single bulk RPC instead of N parallel calls)
    const wrongIds = questions
      .filter((q, i) => q.id && answers[i] !== undefined && answers[i] !== q.correct)
      .map(q => q.id);
    if (wrongIds.length) {
      await db.rpc('bulk_increment_wrong_count', {
        p_user_id: authUser.id,
        p_question_ids: wrongIds
      });
    }
  } catch(e) { /* silent — results screen still shows */ }
}

async function finishTimedTest() {
  clearInterval(timedState.timer);
  const { questions, answers, name, start } = timedState;
  const total = questions.length;
  let correct = 0, wrong = 0, skipped = 0;
  questions.forEach((q, i) => {
    if (answers[i] === undefined) skipped++;
    else if (answers[i] === q.correct) correct++;
    else wrong++;
  });
  const pct = Math.round(correct / total * 100);
  const timeTaken = Math.round((Date.now() - start) / 1000);
  const accuracy = total - skipped > 0 ? Math.round(correct / (total - skipped) * 100) : 0;

  document.getElementById('tr-pct').textContent = pct + '%';
  document.getElementById('tr-correct').textContent = correct;
  document.getElementById('tr-wrong').textContent = wrong;
  document.getElementById('tr-skipped').textContent = skipped;
  document.getElementById('tr-accuracy').textContent = accuracy + '%';
  document.getElementById('tr-time').textContent = `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`;
  document.getElementById('tr-avg').textContent = Math.round(timeTaken / total) + 's';
  document.getElementById('tr-grade').textContent = [[90, '🥇 Excellent!'], [75, '🥈 Great Job!'], [60, '🥉 Good Effort'], [0, '📚 Keep Practicing']].find(([m]) => pct >= m)[1];
  document.getElementById('tr-name').textContent = `Student: ${name} · ${selectionLabel()}`;

  const chapData = {};
  questions.forEach((q, i) => {
    const c = q.chapter || q.topic || 'General';
    if (!chapData[c]) chapData[c] = { total: 0, correct: 0 };
    chapData[c].total++;
    if (answers[i] === q.correct) chapData[c].correct++;
  });
  const chapArr = Object.entries(chapData).map(([c, d]) => ({ c, p: Math.round(d.correct / d.total * 100) })).sort((a, b) => b.p - a.p);
  const subj = selection.subject?.label || 'Physics';
  document.getElementById('tr-subject-analysis').innerHTML = `<div class="subj-row">
    <div class="subj-label">${subj}</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    <div style="font-weight:700;color:var(--purple)">${pct}%</div></div>`;
  document.getElementById('tr-chapter-analysis').innerHTML = chapArr.map(({ c, p }) => `
    <div class="topic-row"><div class="topic-header"><div class="topic-name">${c}</div><div style="font-weight:700;color:${p >= 75 ? 'var(--success)' : p >= 50 ? 'var(--warning)' : 'var(--danger)'}">${p}%</div></div>
    <div class="progress-bar"><div class="progress-fill ${p >= 75 ? 'success' : p >= 50 ? 'gold' : 'danger'}" style="width:${p}%"></div></div></div>`).join('');

  const strong = chapArr.filter(c => c.p >= 75).map(c => c.c);
  const weak = chapArr.filter(c => c.p < 50).map(c => c.c);
  const tip = pct >= 90 ? 'Outstanding! You are NEET-ready.' : pct >= 75 ? 'Great performance! Focus on weak chapters.' : pct >= 60 ? 'Good effort. Daily focused study will help.' : 'Keep practising — consistency brings improvement.';
  document.getElementById('tr-insights').innerHTML = [
    `<div class="insight-card strength"><h4>💪 Strengths</h4><p>${strong.length ? `Strong in <b>${strong.slice(0, 3).join(', ')}</b>.` : 'Keep practising to build strengths.'}</p></div>`,
    `<div class="insight-card improve"><h4>🎯 Needs Improvement</h4><p>${weak.length ? `<b>${weak.slice(0, 3).join(', ')}</b> need more revision.` : 'No major weak areas detected.'}</p></div>`,
    weak.length ? `<div class="insight-card action"><h4>📚 Recommended Action</h4><p>Practice more <b>${weak[0]}</b> questions this week.</p></div>` : '',
    `<div class="insight-card tip"><h4>💡 Overall Tip</h4><p>${tip}</p></div>`
  ].join('');

  const newMistakes = [];
  questions.forEach((q, i) => {
    if (answers[i] !== undefined && answers[i] !== q.correct) {
      const entry = { question: q.question, options: q.options, correct: q.correct, explanation: q.explanation || '', subject: q.subject, chapter: q.chapter || q.topic, date: new Date().toLocaleDateString('en-GB'), yourAnswer: answers[i] };
      mistakes.push(entry);
      newMistakes.push({ user_id: authUser?.id, question: q.question, options: q.options, correct: q.correct, explanation: q.explanation || '', subject: q.subject, chapter: q.chapter || q.topic, your_answer: answers[i] });
    }
  });
  if (mistakes.length > 200) mistakes.splice(0, mistakes.length - 200);
  if (authUser && newMistakes.length) {
    db.from('mistakes').insert(newMistakes.filter(m => m.user_id)).then();
  }
  progress.total += total; progress.correct += correct; progress.wrong += wrong; progress.time += timeTaken;
  progress.history = progress.history || [];
  progress.history.push({ week: getWeekKey(), score: pct, correct, total, timeTaken, date: new Date().toLocaleDateString('en-GB') });
  if (progress.history.length > 100) progress.history = progress.history.slice(-100);
  if (progress.history.length > 20) progress.history.shift();

  const entry = { name, score: pct, correct, total, time: timeTaken, date: new Date().toLocaleDateString('en-GB'), week: getWeekKey(), selection: selectionLabel() };
  localLeaderboard.push(entry);
  localLeaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
  const rank = localLeaderboard.findIndex(e => e === entry) + 1;
  document.getElementById('tr-name').textContent += `  |  Rank #${rank}`;
  saveStorage();

  const savingEl = document.getElementById('tr-saving');
  savingEl.innerHTML = '<span class="saving-badge">🌍 Saving to global leaderboard…</span>';
  const saved = await saveToLeaderboard(entry);
  savingEl.innerHTML = saved
    ? '<span class="saving-badge" style="color:var(--success)">✅ Saved to global leaderboard!</span>'
    : '<span class="saving-badge">📱 Saved locally</span>';
  saveSessionToSupabase({ questions, answers, timeTakenSecs: timeTaken, mode: appMode || 'timed' });
  if (authUser) {
    awardXP('mock_test').catch(() => {});
    checkAndShowAchievements().catch(() => {});
    refresh_leaderboard_score_remote().catch(() => {});
  }
  showScreen('timed-result');
}

async function refresh_leaderboard_score_remote() {
  if (!authUser) return;
  await db.rpc('refresh_leaderboard_score', { p_user_id: authUser.id });
}

