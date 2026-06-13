async function openFlow(mode) {
  if (mode === 'grand' && userPlan === 'free') { showUpgradePrompt('Weekly Grand Test'); return; }
  if (mode === 'practice' && userPlan === 'free') { showUpgradePrompt('MCQ Practice — Upgrade to Premium'); return; }
  if (mode === 'challenge' && userPlan === 'free') { showUpgradePrompt('Challenge Mode'); return; }
  appMode = mode;
  if (appMode === 'practice' && (userPlan === 'premium' || userPlan === 'unlimited')) appMode = 'weakareas';
  selection = { language: null, standard: null, subject: null, chapter: null };
  renderStepper(0);
  // Show loading on lang screen while manifest loads
  showScreen('practice-lang');
  document.getElementById('lang-options').innerHTML = '<div class="info-box">Loading…</div>';
  try { await loadManifest(); } catch(e) {
    document.getElementById('lang-options').innerHTML = `<div class="info-box">Could not load question catalog: ${e.message}</div>`;
    return;
  }

  // Auto-apply saved preferences: skip straight to subject if both lang + class are known
  const prefLangId = window.currentLang === 'ta' ? 'tamil' : 'english';
  const prefLang   = manifest.languages.find(l => l.id === prefLangId);
  if (prefLang) {
    selection.language = prefLang;
    const prefStd = prefLang.standards.find(s => s.id === window.currentClass);
    if (prefStd) {
      selection.standard = prefStd;
      if (appMode === 'grand') {
        const subjs = selection.standard?.subjects?.map(s => s.label).join(', ') || 'All Subjects';
        document.getElementById('grand-selection-label').textContent =
          `${selection.language.label} · ${selection.standard.label} · ${subjs} · 180 Q · 3h 15m`;
        renderStepper(2);
        showScreen('grand-setup');
      } else {
        renderSubjectOptions();
        renderStepper(2);
        showScreen('practice-subject');
      }
      return;
    }
    // Only language is known — skip to class screen
    renderClassOptions();
    renderStepper(1);
    showScreen('practice-class');
    return;
  }

  renderLangOptions();
}

function renderLangOptions() {
  const langs = manifest?.languages || [];
  const icons = { English: '🌐', Tamil: '🇮🇳' };
  const el = document.getElementById('lang-options');
  if (!langs.length) {
    el.innerHTML = '<div class="info-box">Could not load question catalog. Check Supabase connection.</div>';
    return;
  }
  const activeLangId = window.currentLang === 'ta' ? 'tamil' : 'english';
  el.innerHTML = langs.map(l => `
    <button class="sel-btn${l.id === activeLangId ? ' active' : ''}" onclick="selectLang('${l.id}')">
      <span>${icons[l.label] || '📖'}</span>${l.label}
      <span style="margin-left:auto;font-size:.75rem;color:var(--muted)">${l.standards.length} class(es)</span>
    </button>`).join('');
}

function selectLang(langId) {
  selection.language = manifest.languages.find(l => l.id === langId);
  window.currentLang = langId === 'tamil' ? 'ta' : 'en';
  if (authUser) {
    db.from('user_profiles')
      .upsert({ id: authUser.id, lang_id: window.currentLang === 'ta' ? 2 : 1 }, { onConflict: 'id' })
      .then();
  }
  renderClassOptions();
  renderStepper(1);
  showScreen('practice-class');
}

function renderClassOptions() {
  const standards = selection.language?.standards || [];
  const all = [{ id: '11th', label: 'Class 11', icon: '📗' }, { id: '12th', label: 'Class 12', icon: '📘' }];
  document.getElementById('class-options').innerHTML = all.map(c => {
    const found = standards.find(s => s.id === c.id);
    const disabled = !found;
    const isActive = !disabled && c.id === window.currentClass;
    return `<button class="sel-btn${disabled ? ' disabled' : ''}${isActive ? ' active' : ''}" ${disabled ? 'disabled' : `onclick="selectClass('${c.id}')"`}>
      <span>${c.icon}</span>${c.label}
      ${disabled ? '<span style="margin-left:auto;font-size:.72rem;color:var(--muted)">Coming soon</span>' : `<span style="margin-left:auto;font-size:.72rem;color:var(--muted)">${found.subjects.length} subject(s)</span>`}
    </button>`;
  }).join('');
}

function selectClass(stdId) {
  selection.standard = selection.language.standards.find(s => s.id === stdId);
  window.currentClass = stdId;
  if (authUser) {
    db.from('user_profiles')
      .upsert({ id: authUser.id, standard: stdId }, { onConflict: 'id' })
      .then();
  }
  if (appMode === 'grand') {
    const subjs = selection.standard?.subjects?.map(s => s.label).join(', ') || 'All Subjects';
    document.getElementById('grand-selection-label').textContent = `${selection.language.label} · ${selection.standard.label} · ${subjs} · 180 Q · 3h 15m`;
    renderStepper(2);
    showScreen('grand-setup');
    return;
  }
  renderSubjectOptions();
  renderStepper(2);
  showScreen('practice-subject');
}

const ALL_NEET_SUBJECTS = [
  { id:'physics',   dbId:'physics',   label:'Physics',   icon:'⚛️', grad:'linear-gradient(135deg,#dbeafe,#bfdbfe)', border:'#3b82f6', color:'#1e3a8a' },
  { id:'chemistry', dbId:'chemistry', label:'Chemistry', icon:'🧪', grad:'linear-gradient(135deg,#d1fae5,#a7f3d0)', border:'#10b981', color:'#064e3b', comingSoon:true },
  { id:'botany',    dbId:'biology',   label:'Botany',    icon:'🌿', grad:'linear-gradient(135deg,#dcfce7,#bbf7d0)', border:'#16a34a', color:'#14532d' },
  { id:'zoology',   dbId:'biology',   label:'Zoology',   icon:'🦁', grad:'linear-gradient(135deg,#fce7f3,#fbcfe8)', border:'#db2777', color:'#831843' },
];

function renderSubjectOptions() {
  const subs = selection.standard?.subjects || [];
  const modeLabel = (appMode === 'truefalse') ? 'True / False' : (appMode === 'flashcard') ? 'Flashcards' : 'Practice';
  const titleEl = document.getElementById('subject-screen-title');
  if (titleEl) titleEl.textContent = `${modeLabel} — Choose a Subject`;
  document.getElementById('subject-options').innerHTML = ALL_NEET_SUBJECTS.map(s => {
    const found = subs.find(x => x.id === s.dbId);
    const locked = s.comingSoon || !found;
    const chapCount = found ? found.chapters.length : 0;
    const meta = locked ? 'Coming Soon' : `${chapCount} chapters`;
    return `<div class="subj-card-v2${locked ? ' locked' : ''}"
        style="background:${s.grad};border-color:${s.border};color:${s.color}"
        ${locked ? '' : `onclick="selectSubject('${s.id}')"`}>
      <span class="s2-icon">${s.icon}</span>
      <div class="s2-name">${s.label}</div>
      <div class="s2-meta">${locked ? `<span class="s2-soon">Coming Soon</span>` : meta}</div>
      ${locked ? '<span class="s2-lock">🔒</span>' : ''}
    </div>`;
  }).join('');
}

function selectSubject(subjId) {
  const def = ALL_NEET_SUBJECTS.find(s => s.id === subjId);
  const dbId = def?.dbId || subjId;
  const found = selection.standard.subjects.find(s => s.id === dbId);
  // Store display label (e.g. "Botany") and DB label (e.g. "Biology") separately
  selection.subject = found ? { ...found, label: def ? def.label : found.label, dbLabel: found.label, uiId: subjId } : null;
  if (!selection.subject) return;
  if (appMode === 'timed') {
    document.getElementById('timed-selection-label').textContent = selectionLabel() + ` · ${selection.subject.totalQuestions || 0} questions available`;
    renderTimedDurationOptions();
    renderStepper(3);
    showScreen('timed-setup');
    return;
  }
  renderChapters();
  renderStepper(3);
  showScreen('practice-chapter');
}

async function renderChapters() {
  const chaps = selection.subject?.chapters || [];
  const subj = selection.subject.label;
  const isPremium = userPlan === 'premium' || userPlan === 'unlimited';
  const isWeakAreas = appMode === 'weakareas';
  document.getElementById('chapter-title').textContent = isWeakAreas
    ? `${subj} — Weak Areas`
    : appMode === 'challenge' ? `${subj} — Challenge`
    : `${subj} — Select Chapter`;
  document.getElementById('chapter-list').innerHTML = '<div class="spinner-wrap"><div class="spinner"></div><p>Loading chapters…</p></div>';
  await preloadDailyData();
  const totalDoneQs = chaps.reduce((sum, c) => sum + getDailyDone(c).count, 0);
  const bannerEl = document.getElementById('daily-progress-banner');
  if (isWeakAreas && bannerEl) {
    bannerEl.innerHTML = `<div style="background:linear-gradient(90deg,#fff0f0,#ffe4e4);border-left:4px solid #dc2626;border-radius:8px;padding:.6rem .9rem;margin-bottom:.75rem;font-size:.82rem;font-weight:700;color:#9b1c1c">🎯 Weak Areas Mode — Chapters sorted by lowest accuracy first</div>`;
  } else if (appMode === 'challenge' && bannerEl) {
    bannerEl.innerHTML = `<div style="background:linear-gradient(90deg,#1e1b4b,#312e81);border-radius:8px;padding:.6rem .9rem;margin-bottom:.75rem;font-size:.82rem;font-weight:700;color:#c7d2fe">🏆 Challenge Mode — Answers revealed only at the end. No hints!</div>`;
  } else if (isPremium) {
    const DAILY_GOAL = 20;
    const pct = Math.min(100, Math.round(totalDoneQs / DAILY_GOAL * 100));
    if (bannerEl) bannerEl.innerHTML = `<div class="daily-banner">
      <div style="font-size:1.4rem">🌟</div>
      <div class="db-text"><b>Unlimited Practice</b><br/>
      ${totalDoneQs} questions answered today · Keep pushing!
      <div class="daily-limit-bar"><div class="daily-limit-fill" style="width:${pct}%"></div></div></div></div>`;
  } else {
    const subjectTotal = getSubjectDailyTotal();
    const subjectLimit = FREE_DAILY_LIMIT;
    const pct = Math.min(100, Math.round(subjectTotal / subjectLimit * 100));
    if (bannerEl) bannerEl.innerHTML = `<div class="daily-banner">
      <div style="font-size:1.4rem">📅</div>
      <div class="db-text"><b>Daily Practice — ${subjectLimit} Questions Per Subject</b><br/>
      ${subjectTotal} of ${subjectLimit} questions done today
      <div class="daily-limit-bar"><div class="daily-limit-fill" style="width:${pct}%"></div></div></div></div>`;
  }
  const CHAP_COLORS = [
    {bg:'#dbeafe',border:'#3b82f6',badge:'#2563eb'},
    {bg:'#d1fae5',border:'#10b981',badge:'#059669'},
    {bg:'#ede9fe',border:'#8b5cf6',badge:'#7c3aed'},
    {bg:'#fef3c7',border:'#f59e0b',badge:'#d97706'},
    {bg:'#fee2e2',border:'#ef4444',badge:'#dc2626'},
    {bg:'#cffafe',border:'#06b6d4',badge:'#0891b2'},
    {bg:'#ffedd5',border:'#f97316',badge:'#ea580c'},
    {bg:'#e0e7ff',border:'#6366f1',badge:'#4f46e5'},
  ];
  // in weak areas mode sort by accuracy ascending
  let sortedChaps = [...chaps];
  const chapAccMap = {};
  if (isWeakAreas) {
    chaps.forEach(c => {
      const stat = progress.chapters?.[c.label] || progress.chapters?.[c.id];
      chapAccMap[c.id] = stat?.total > 0 ? Math.round(stat.correct / stat.total * 100) : null;
    });
    sortedChaps.sort((a, b) => {
      const accA = chapAccMap[a.id] ?? 999; // unattempted goes to end
      const accB = chapAccMap[b.id] ?? 999;
      return accA - accB;
    });
  }
  document.getElementById('chapter-list').innerHTML = sortedChaps.map((c, i) => {
    const originalIdx = chaps.findIndex(ch => ch.id === c.id);
    const col = CHAP_COLORS[originalIdx % CHAP_COLORS.length];
    const dayData = getDailyDone(c);
    let status;
    if (userPlan === 'unlimited') {
      const chapStats = progress.chapters?.[c.label] || progress.chapters?.[c.id] || null;
      const passed = chapStats?.correct || 0;
      const failed = chapStats ? (chapStats.total - chapStats.correct) : 0;
      status = chapStats
        ? `<span class="ch-card-status"><span style="color:#059669">✓ ${passed} passed</span> · <span style="color:#e84545">✗ ${failed} failed</span></span>`
        : `<span class="ch-card-status" style="color:#6b7280">▶ Practice Now</span>`;
    } else if (isPremium) {
      status = dayData.count > 0
        ? `<span class="ch-card-status" style="color:#059669">✅ ${dayData.count} answered today</span>`
        : `<span class="ch-card-status" style="color:#6b7280">▶ Practice Now</span>`;
    } else {
      const subjectDone = getSubjectDailyTotal() >= FREE_DAILY_LIMIT;
      const subjectRemaining = Math.max(0, FREE_DAILY_LIMIT - getSubjectDailyTotal());
      status = subjectDone
        ? `<span class="ch-card-status" style="color:#059669">✅ Daily limit reached</span>`
        : `<span class="ch-card-status" style="color:#6b7280">📝 ${subjectRemaining} left today</span>`;
    }
    let accBadge = '';
    if (isWeakAreas) {
      const acc = chapAccMap[c.id];
      if (acc !== null && acc !== undefined) {
        const accColor = acc < 50 ? '#dc2626' : acc < 70 ? '#d97706' : '#059669';
        accBadge = `<span style="font-size:.65rem;font-weight:700;color:${accColor};margin-top:.2rem;display:block">${acc}% accuracy</span>`;
      } else {
        accBadge = `<span style="font-size:.65rem;color:var(--muted);margin-top:.2rem;display:block">Not attempted</span>`;
      }
    }
    const chapDone = userPlan === 'free' && getSubjectDailyTotal() >= FREE_DAILY_LIMIT;
    const chapNum = parseInt((c.id.match(/\d+$/) || [i+1])[0]);
    const visLimit = getChapterLimitForSubject(selection.subject?.uiId || selection.subject?.id);
    const adminLocked = chapNum > visLimit;
    return `<button class="ch-card${adminLocked ? ' ch-locked' : ''}" style="background:${col.bg};border:2px solid ${col.border};position:relative"
      ${(chapDone || adminLocked) ? 'disabled' : `onclick="selectChapter('${c.id}')"`}>
      <div class="ch-card-body">
        <div class="ch-card-name">${c.label}</div>
        ${adminLocked ? `<span class="ch-card-status" style="color:#9ca3af">🔒 Not available yet</span>` : status}
        ${accBadge}
      </div>
      <div class="ch-card-num" style="background:${adminLocked ? '#9ca3af' : col.badge}">
        <span>CH</span><span style="font-size:.95rem;font-weight:900">${chapNum}</span>
      </div>
    </button>`;
  }).join('') || '<div class="info-box">No chapters available.</div>';
  document.getElementById('reset-note').textContent = isPremium ? '' : `⏰ Resets at midnight · Next reset in ${getTimeUntilMidnight()}`;
}

async function selectChapter(chapterId) {
  const chapter = selection.subject.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  selection.chapter = chapter;
  // save recommended chapter for session cards
  const _lid = selection.language?.id, _sid = selection.standard?.id;
  if (_lid && _sid) {
    try { localStorage.setItem('examace_rec_'+_lid+'_'+_sid, JSON.stringify({subjId:selection.subject?.id, subjLabel:selection.subject?.label, chapId:chapter.id, chapLabel:chapter.label})); } catch(e) {}
  }
  if (appMode === 'flashcard' || appMode === 'truefalse') { startFlashcards(chapter); return; }
  if (isDailyComplete(chapter)) {
    document.getElementById('done-chapter').textContent = chapter.label;
    const limitEl = document.getElementById('done-limit');
    if (limitEl) limitEl.textContent = `${FREE_DAILY_LIMIT} questions`;
    const subLimitEl = document.getElementById('done-subject-limit');
    if (subLimitEl) subLimitEl.textContent = `${FREE_DAILY_LIMIT} questions`;
    updateResetTimer();
    showScreen('daily-done');
    return;
  }
  document.getElementById('chapter-list').innerHTML = '<div class="spinner-wrap"><div class="spinner"></div><p>Loading questions…</p></div>';
  try {
    const allQs = await fetchQuestions({ language: selection.language.label, standard: selection.standard.id, subject: selection.subject.dbLabel || selection.subject.label, chapterId: chapter.id});
    const dayData = getDailyDone(chapter);
    const seen = new Set(dayData.seen || []);
    const fresh = allQs.filter(q => !seen.has(qFingerprint(q)));
    const isPremiumOrUnlimited = userPlan === 'premium' || userPlan === 'unlimited';
    const remaining = isPremiumOrUnlimited ? allQs.length : Math.max(0, FREE_DAILY_LIMIT - getSubjectDailyTotal());
    const pool = isPremiumOrUnlimited ? allQs : (fresh.length >= remaining ? fresh : allQs);
    const qs = shuffle(pool).slice(0, remaining);
    if (!qs.length) { renderChapters(); showScreen('chapters'); return; }
    practiceState = { questions: qs, idx: 0, answers: {}, skipDaily: false, chapter, start: Date.now() };
    renderPracticeQ();
    showScreen('practice-quiz');
  } catch (e) {
    renderChapters(); showScreen('chapters');
  }
}

async function startGrandTestNow() {
  const name = document.getElementById('grand-name').value.trim();
  if (!name) { document.getElementById('grand-err').style.display = 'block'; return; }
  document.getElementById('grand-err').style.display = 'none';
  const btn = document.querySelector('#screen-grand-setup .btn-danger');
  btn.textContent = 'Loading…'; btn.disabled = true;
  try {
    const subjects = selection.standard?.subjects || [];
    const results = await Promise.all(subjects.map(s =>
      fetchQuestions({ language: selection.language.label, standard: selection.standard.id, subject: s.label })
    ));
    const perSubj = Math.floor(180 / Math.max(subjects.length, 1));
    let qs = [];
    results.forEach((subQs, i) => {
      qs = qs.concat(shuffle(subQs.map(q => ({ ...q, subject: subjects[i]?.label || q.subject }))).slice(0, perSubj));
    });
    qs = shuffle(qs).slice(0, 180);
    timedState = { questions: qs, idx: 0, answers: {}, marked: {}, secs: 11700, totalSecs: 11700, timer: null, start: Date.now(), name };
    document.getElementById('tq-total').textContent = qs.length;
    updateTimerDisplay();
    renderTimedQ();
    renderQNav();
    showScreen('timed-quiz');
    timedState.timer = setInterval(timerTick, 1000);
  } catch(e) {
    alert('Failed to load questions: ' + e.message);
  } finally {
    btn.textContent = '🏆 Start Grand Test'; btn.disabled = false;
  }
}

