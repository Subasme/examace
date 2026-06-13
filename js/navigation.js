function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'leaderboard') loadLeaderboard();
  if (name === 'dashboard') renderDashboard();
  if (name === 'mistakes') renderMistakes();
  if (name === 'home') { renderHomeStats(); renderHomeFeatures(); updateUpgradeBanner(); }
  if (name === 'profile') renderProfileScreen();
  // bottom nav active state
  ['home','practice','community','profile'].forEach(n => {
    const btn = document.getElementById('bnav-' + n);
    if (btn) btn.classList.toggle('active', n === name);
  });
}
function goHome() { showScreen('home'); }
// Show a screen without requiring auth (for contact, community)
function showScreenPublic(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) { el.classList.add('active'); window.scrollTo(0,0); }
}
function confirmExit() { if (confirm('Exit quiz? Your progress will be lost.')) goHome(); }
function confirmSubmit() { if (confirm('Submit the test now?')) finishTimedTest(); }

function renderStepper(step) {
  let steps;
  if (appMode === 'grand') steps = ['Language', 'Class', 'Test'];
  else if (appMode === 'timed') steps = ['Language', 'Class', 'Subject', 'Test'];
  else steps = ['Language', 'Class', 'Subject', 'Chapter'];
  const html = steps.map((s, i) => `
    <div class="step">
      <div class="step-dot ${i < step ? 'done' : i === step ? 'active' : ''}">${i < step ? '✓' : i + 1}</div>
      <div class="step-line ${i < step ? 'done' : ''}"></div>
    </div>`).join('');
  ['stepper-practice', 'stepper-class', 'stepper-subject', 'stepper-chapter', 'stepper-grand'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

function selectionLabel() {
  return [selection.language?.label, selection.standard?.label, selection.subject?.label, selection.chapter?.label].filter(Boolean).join(' · ');
}

