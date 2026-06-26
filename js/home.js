const _isTa = () => localStorage.getItem('lang') === 'ta';
const _taH  = (en, ta) => _isTa() ? ta : en;

async function renderHomeSessions() {
  const el = document.getElementById('home-sessions');
  if (!el) return;
  try {
    await loadManifest();
    const sessions = [];
    let idx = 0;
    const uiLang = localStorage.getItem('lang') || 'en';
    (manifest.languages || []).forEach(lang => {
      // Filter: Tamil UI → show only Tamil Medium; English UI → show only English Medium
      const isTamilLang = lang.label === 'Tamil' || (lang.id || '').toLowerCase().includes('tamil');
      if (uiLang === 'ta' && !isTamilLang) return;
      if (uiLang === 'en' && isTamilLang) return;
      (lang.standards || []).forEach(std => {
        sessions.push({ lang, std, gradient: SESSION_GRADIENTS[idx++ % SESSION_GRADIENTS.length] });
      });
    });
    if (!sessions.length) { el.innerHTML = '<div style="color:var(--muted);font-size:.82rem;padding:.5rem;grid-column:1/-1">No sessions found.</div>'; return; }
    el.innerHTML = sessions.map(({ lang, std, gradient }) => {
      const totalQ = std.subjects.reduce((s, x) => s + (x.totalQuestions || 0), 0);
      const subjNames = std.subjects.map(s => s.label).join(' · ');
      const langLabel = lang.label === 'Tamil' ? _taH('Tamil Medium','தமிழ் வழி') : _taH('English Medium','ஆங்கில வழி');
      const recKey = 'examace_rec_'+lang.id+'_'+std.id;
      let recLine = '';
      try {
        const rec = JSON.parse(localStorage.getItem(recKey) || 'null');
        if (rec?.chapLabel) recLine = `<div class="sc-rec">▶ ${_taH('Continue','தொடர்')}: ${rec.chapLabel}</div>`;
        else recLine = `<div class="sc-rec">▶ ${_taH('Start from Chapter 1','அத்தியாயம் 1 முதல் தொடங்கு')}</div>`;
      } catch(e) { recLine = `<div class="sc-rec">▶ ${_taH('Start Practicing','பயிற்சி தொடங்குங்கள்')}</div>`; }
      return `<div class="session-card" style="background:${gradient}" onclick="quickStartSession('${lang.id}','${std.id}')">
        <div>
          <div class="sc-header">
            <div class="sc-lang">${langLabel}</div>
            <div class="sc-class-badge">${std.label}</div>
          </div>
          <div class="sc-title">NEET UG<br/>Preparation</div>
          <div class="sc-subjects">${subjNames}${totalQ ? `<br/>${totalQ.toLocaleString()} questions` : ''}</div>
        </div>
        ${recLine}
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '';
  }
}

async function quickStartSession(langId, stdId) {
  appMode = 'practice';
  selection = { language: null, standard: null, subject: null, chapter: null };
  try {
    await loadManifest();
    const lang = manifest.languages.find(l => l.id === langId);
    if (!lang) { openFlow('practice'); return; }
    selection.language = lang;
    const std = lang.standards.find(s => s.id === stdId);
    if (!std) { openFlow('practice'); return; }
    selection.standard = std;
    // try to jump to recommended chapter
    let jumped = false;
    try {
      const rec = JSON.parse(localStorage.getItem('examace_rec_'+langId+'_'+stdId) || 'null');
      if (rec) {
        const subj = std.subjects.find(s => s.id === rec.subjId);
        const chap = subj?.chapters?.find(c => c.id === rec.chapId);
        if (subj && chap) {
          selection.subject = subj;
          // find next chapter after rec (for "continue" feel)
          const chapIdx = subj.chapters.indexOf(chap);
          const nextChap = subj.chapters[chapIdx + 1] || chap; // use next or same if last
          selection.chapter = nextChap;
          selectChapter(nextChap.id);
          jumped = true;
        }
      }
    } catch(e) {}
    if (!jumped) {
      // first time: go to first chapter of first subject that has questions
      const firstSubj = std.subjects.find(s => s.totalQuestions > 0) || std.subjects[0];
      const firstChap = firstSubj?.chapters?.find(c => c.count > 0) || firstSubj?.chapters?.[0];
      if (firstSubj && firstChap) {
        selection.subject = firstSubj;
        selection.chapter = firstChap;
        selectChapter(firstChap.id);
      } else {
        renderSubjectOptions();
        renderStepper(2);
        showScreen('practice-subject');
      }
    }
  } catch(e) { openFlow('practice'); }
}

function renderHomeFeatures() {
  const el = document.getElementById('home-features');
  if (!el) return;
  const isFree = userPlan === 'free';
  const isPrem = userPlan === 'premium' || userPlan === 'unlimited';
  if (isFree) {
    const fcDone = getFCDoneToday();
    const tfDone = getTFDoneToday();
    const fcPct = Math.min(100, Math.round(fcDone / FREE_FC_DAILY * 100));
    const tfPct = Math.min(100, Math.round(tfDone / FREE_TF_DAILY * 100));
    const fcDone5 = fcDone >= FREE_FC_DAILY;
    const tfDone5 = tfDone >= FREE_TF_DAILY;
    el.innerHTML = `
    <div class="section-title">${_taH("Today's Practice",'இன்றைய பயிற்சி')}</div>
    <div class="daily-activity-card ${fcDone5 ? 'dac-done' : ''}" onclick="${fcDone5 ? '' : "openFlow('flashcard')"}">
      <div class="dac-icon" style="background:#ede9fb">🃏</div>
      <div class="dac-body">
        <div class="dac-title">${_taH('Flashcards','நினைவட்டைகள்')}</div>
        <div class="dac-sub">${fcDone5 ? _taH('Completed for today!','இன்றைக்கு முடிந்தது!') : _taH('Flip cards to learn key facts','முக்கிய தகவல்களை அட்டைகளில் படிக்கவும்')}</div>
        <div class="dac-bar"><div class="dac-fill" style="background:var(--purple);width:${fcPct}%"></div></div>
      </div>
      <div class="dac-count" style="color:${fcDone5 ? 'var(--success)' : 'var(--purple)'}">${fcDone5 ? '✓' : fcDone + '/' + FREE_FC_DAILY}</div>
    </div>
    <div class="daily-activity-card ${tfDone5 ? 'dac-done' : ''}" onclick="${tfDone5 ? '' : "openFlow('truefalse')"}">
      <div class="dac-icon" style="background:#edfaf4">✅</div>
      <div class="dac-body">
        <div class="dac-title">${_taH('True / False Quiz','சரி / தவறு வினாடி வினா')}</div>
        <div class="dac-sub">${tfDone5 ? _taH('Completed for today!','இன்றைக்கு முடிந்தது!') : _taH('Test what you know','உங்களுக்கு தெரிந்ததை சோதிக்கவும்')}</div>
        <div class="dac-bar"><div class="dac-fill" style="background:var(--success);width:${tfPct}%"></div></div>
      </div>
      <div class="dac-count" style="color:${tfDone5 ? 'var(--success)' : '#00897b'}">${tfDone5 ? '✓' : tfDone + '/' + FREE_TF_DAILY}</div>
    </div>
    <div class="section-title" style="margin-top:.75rem;color:var(--muted)">${_taH('Upgrade to Unlock','திறக்க மேம்படுத்துங்கள்')}</div>
    <div class="premium-row">
      <div class="pf-card" onclick="showUpgradePrompt('MCQ Practice')">📚<br/>${_taH('Practice','பயிற்சி')}<span class="pf-badge">PRO</span></div>
      <div class="pf-card" onclick="showUpgradePrompt('Weekly Grand Test')">🏆<br/>${_taH('Grand Test','கிராண்ட் சோதனை')}<span class="pf-badge">PRO</span></div>
      <div class="pf-card" onclick="showUpgradePrompt('Timed Test')">⚡<br/>${_taH('Timed Test','நேர சோதனை')}<span class="pf-badge">PRO</span></div>
      <div class="pf-card" onclick="showUpgradePrompt('Study Community')">💬<br/>${_taH('Community','சமூகம்')}<span class="pf-badge">PRO</span></div>
    </div>`;
  } else {
    el.innerHTML = `
      <div class="section-title">${_taH('Practice','பயிற்சி')}</div>
      <button class="act-card act-practice" onclick="openFlow('practice')">
        <div class="act-icon">📚</div>
        <div class="act-body">
          <div class="act-title">${_taH('Practice Mode','பயிற்சி முறை')}</div>
          <div class="act-sub">${_taH('Chapter-wise MCQs · Instant feedback','அத்தியாயம்-வாரியான MCQ · உடனடி கருத்து')}</div>
        </div>
        <div class="act-badge">${_taH('Unlimited →','வரம்பற்றது →')}</div>
      </button>
      <button class="act-card act-timed" onclick="openFlow('timed')">
        <div class="act-icon">⚡</div>
        <div class="act-body">
          <div class="act-title">${_taH('Timed Test','நேர சோதனை')}</div>
          <div class="act-sub">${_taH('Race the clock · All subjects','நேரத்துடன் போட்டி · அனைத்து பாடங்கள்')}</div>
        </div>
        <div class="act-badge">${_taH('Up to 180 min →','180 நிமிடம் வரை →')}</div>
      </button>
      <button class="act-card act-grand" onclick="openFlow('grand')">
        <div class="act-icon">🏆</div>
        <div class="act-body">
          <div class="act-title">${_taH('Grand Test','கிராண்ட் சோதனை')}</div>
          <div class="act-sub">${_taH('Full NEET simulation · 180 questions','முழு NEET உருவகம் · 180 கேள்விகள்')}</div>
        </div>
        <div class="act-badge">${_taH('3 h 15 m →','3 மணி 15 நிமிடம் →')}</div>
      </button>
      <div class="section-title" style="margin-top:.65rem">${_taH('More Features','மேலும் அம்சங்கள்')}</div>
      <div class="premium-row">
        <div class="pf-card" onclick="openFlow('flashcard')">🃏<br/>${_taH('Flashcards','நினைவட்டைகள்')}</div>
        <div class="pf-card" onclick="openFlow('truefalse')">✅<br/>${_taH('True/False','சரி/தவறு')}</div>
        <div class="pf-card" onclick="showScreen('leaderboard')">🏅<br/>${_taH('Leaderboard','தரவரிசை')}</div>
        <div class="pf-card" onclick="showScreen('dashboard')">📊<br/>${_taH('Dashboard','டாஷ்போர்டு')}</div>
      </div>`;
  }
}

function renderHomeStats() {
  const { total, correct } = progress;
  const acc = total > 0 ? Math.round(correct / total * 100) : 0;
  let todayTotal = 0;
  const today = getTodayKey();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('examace_daily_') && key.endsWith(today)) {
        todayTotal += (JSON.parse(localStorage.getItem(key) || '{}').count || 0);
      }
    }
  } catch (e) {}
  // streak: count consecutive days with activity from history
  let streak = 0;
  try {
    const hist = (progress.history || []).map(h => h.date).filter(Boolean);
    const daySet = new Set(hist);
    const d = new Date(); d.setHours(0,0,0,0);
    while (daySet.has(d.toISOString().split('T')[0])) { streak++; d.setDate(d.getDate()-1); }
  } catch(e) {}
  const isFreeUser = userPlan === 'free';
  const DAILY_GOAL = isFreeUser ? FREE_DAILY_LIMIT : 20;
  const pct = Math.min(100, Math.round(todayTotal / Math.max(DAILY_GOAL, 1) * 100));
  // daily goal card
  const dgCount = document.getElementById('dgc-count');
  const dgFill = document.getElementById('dgc-fill');
  const dgPct = document.getElementById('dgc-pct');
  const dgCircle = document.getElementById('dgc-circle');
  if (isFreeUser) {
    const fcDone = getFCDoneToday();
    const tfDone = getTFDoneToday();
    const totalDone = fcDone + tfDone;
    const totalGoal = FREE_FC_DAILY + FREE_TF_DAILY;
    const pct2 = Math.min(100, Math.round(totalDone / totalGoal * 100));
    if (dgCount) dgCount.textContent = `${totalDone}/${totalGoal} Activities Today`;
    if (dgPct) dgPct.textContent = pct2 >= 100 ? '🎉 All done for today!' : `${fcDone}/5 Flashcards · ${tfDone}/5 True/False`;
    if (dgFill) dgFill.style.width = pct2 + '%';
    if (dgCircle) dgCircle.textContent = pct2 >= 100 ? '✓' : pct2 + '%';
  } else {
    if (dgCount) dgCount.textContent = `${todayTotal} Questions Today`;
    if (dgPct) dgPct.textContent = todayTotal === 0 ? 'Start practicing!' : todayTotal >= 20 ? '🔥 Great session!' : `Keep going — ${20 - todayTotal} more to reach 20!`;
    if (dgFill) dgFill.style.width = Math.min(100, Math.round(todayTotal / 20 * 100)) + '%';
    if (dgCircle) dgCircle.textContent = todayTotal >= 20 ? '✓' : todayTotal;
  }
  const sa = document.getElementById('stat-attempted');
  const sac = document.getElementById('stat-accuracy');
  const ss = document.getElementById('stat-streak');
  if (sa) sa.textContent = total;
  if (sac) {
    if (total === 0) {
      sac.textContent = '–';
      sac.style.color = 'var(--muted)';
    } else {
      sac.textContent = acc + '%';
      sac.style.color = acc >= 75 ? 'var(--success)' : acc >= 50 ? 'var(--blue)' : 'var(--danger)';
    }
    const sacLbl = document.getElementById('stat-accuracy-lbl');
    if (sacLbl) sacLbl.textContent = _taH('Accuracy','துல்லியம்');
  }
  if (ss) ss.textContent = streak > 0 ? streak : (total > 0 ? '1' : '0');
}

function shareApp() {
  const text = 'I am preparing for NEET UG using KARNAN. Try it here:\n' + location.href;
  if (navigator.share) navigator.share({ title: 'KARNAN — Empowering NEET UG Success', text, url: location.href }).catch(() => {});
  else navigator.clipboard?.writeText(text).then(() => alert('Link copied!')).catch(() => prompt('Copy this link:', location.href));
}

