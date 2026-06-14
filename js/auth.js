document.addEventListener('DOMContentLoaded', async () => {
  const ni = document.getElementById('timed-name');
  if (ni) ni.addEventListener('focus', () => ni.style.borderColor = 'var(--gold)');

  // Wire Enter key on login/register forms
  document.querySelectorAll('#screen-auth-login input, #screen-auth-register input').forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const s = inp.closest('[id^=screen-auth-]')?.id; if (s === 'screen-auth-login') handleLogin(); else if (s === 'screen-auth-register') handleRegister(); } });
  });

  // Check for an existing session
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    authUser = session.user;
    await loadUserPlan();
    await initApp();
  } else {
    showGuestLanding();
  }

  // React to auth state changes across tabs / email confirmation
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      authUser = null; userPlan = 'free'; DAILY_LIMIT = FREE_DAILY_LIMIT;
      showGuestLanding();
    } else if (event === 'SIGNED_IN' && session?.user && !authUser) {
      authUser = session.user;
      await loadUserPlan();
      await initApp();
    }
  });
});

// ── AUTH ─────────────────────────────────────────────────────────────────────
function showGuestLanding() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-home').classList.add('active');
  document.getElementById('screen-auth-login').style.display = 'none';
  document.getElementById('screen-auth-register').style.display = 'none';
  document.getElementById('screen-plan').style.display = 'none';
  document.getElementById('home-guest-content').style.display = 'block';
  const hxp = document.getElementById('home-xp-card'); if (hxp) hxp.style.display = 'none';
  const hsc = document.getElementById('home-streak-card'); if (hsc) hsc.style.display = 'none';
  const haw = document.getElementById('home-achievements-widget'); if (haw) haw.style.display = 'none';
  document.getElementById('home-daily-goal').style.display = 'none';
  document.getElementById('home-stats-row').style.display = 'none';
  document.getElementById('home-sessions-section').style.display = 'none';
  document.getElementById('home-features').style.display = 'none';
  document.getElementById('upgrade-banner').style.display = 'none';
  document.getElementById('greeting-name').textContent = 'there';
  const navUser = document.getElementById('nav-user');
  if (navUser) navUser.style.display = 'none';
  const bnav = document.getElementById('bottom-nav');
  if (bnav) bnav.style.display = 'none';
}

function showAuthScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-auth-login').style.display = screen === 'login' ? 'flex' : 'none';
  document.getElementById('screen-auth-register').style.display = screen === 'register' ? 'flex' : 'none';
  document.getElementById('screen-plan').style.display = 'none';
}

function showPlanScreen() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-auth-login').style.display = 'none';
  document.getElementById('screen-auth-register').style.display = 'none';
  document.getElementById('screen-plan').style.display = 'flex';
  selectPlan('free');
}

function selectPlan(plan) {
  selectedPlan = plan;
  document.getElementById('plan-free-card').classList.toggle('selected', plan === 'free');
  document.getElementById('plan-premium-card').classList.toggle('selected', plan === 'premium');
  const unlimitedCard = document.getElementById('plan-unlimited-card');
  if (unlimitedCard) unlimitedCard.classList.toggle('selected', plan === 'unlimited');
  document.getElementById('plan-btn').textContent = plan === 'premium' ? 'Get Premium →' : (plan === 'unlimited' ? 'Get Unlimited Pro →' : 'Continue with Free');
}

async function confirmPlan() {
  const btn = document.getElementById('plan-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  await Promise.allSettled([
    db.from('user_profiles').upsert({ id: authUser.id, plan: selectedPlan }, { onConflict: 'id' }),
    db.from('profiles').update({ plan: selectedPlan }).eq('id', authUser.id)
  ]);
  userPlan = selectedPlan;
  DAILY_LIMIT = (userPlan === 'premium' || userPlan === 'unlimited') ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  btn.disabled = false;
  await initApp();
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-err');
  const btn = document.getElementById('login-btn');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Sign In';
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  authUser = data.user;
  await loadUserPlan();
  await initApp();
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('reg-err');
  const btn = document.getElementById('reg-btn');
  errEl.style.display = 'none';
  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; errEl.style.display = 'block'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Creating account…';
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { display_name: name } } });
  btn.disabled = false; btn.textContent = 'Create Account';
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  authUser = data.user;
  if (authUser) {
    const profileRow = { id: authUser.id, display_name: name, plan: 'free', lang_id: 1, standard: '12th' };
    // Insert into both tables (007 user_profiles + legacy profiles)
    await Promise.allSettled([
      db.from('user_profiles').upsert(profileRow, { onConflict: 'id' }),
      db.from('profiles').upsert({ id: authUser.id, display_name: name, plan: 'free' }, { onConflict: 'id' })
    ]);
  }
  showPlanScreen();
}

async function showForgotPassword() {
  const email = document.getElementById('login-email').value.trim();
  const errEl = document.getElementById('login-err');
  errEl.style.display = 'none'; errEl.style.color = ''; errEl.style.background = '';
  if (!email) { errEl.textContent = 'Enter your email above, then click Forgot password.'; errEl.style.display = 'block'; return; }
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://karnan.guru/'
  });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  errEl.style.color = '#059669'; errEl.style.background = '#f0fdf4';
  errEl.textContent = 'Password reset link sent to ' + email + '. Check your inbox.';
  errEl.style.display = 'block';
  setTimeout(() => { errEl.style.display = 'none'; errEl.style.color = ''; errEl.style.background = ''; errEl.textContent = ''; }, 6000);
}

async function handleLogout() {
  if (!confirm('Sign out?')) return;
  await db.auth.signOut();
  mistakes = []; progress = { total: 0, correct: 0, wrong: 0, time: 0, subjects: {}, chapters: {}, history: [] };
  localLeaderboard = []; manifest = null; dailyCache = {};
  try { localStorage.clear(); } catch (e) {}
  authUser = null; userPlan = 'free'; DAILY_LIMIT = FREE_DAILY_LIMIT;
  showGuestLanding();
}

async function loadUserPlan() {
  try {
    // Try new user_profiles first, fall back to legacy profiles
    let plan = 'free', displayName = '';
    const { data: up } = await db.from('user_profiles').select('plan,display_name,lang_id,standard').eq('id', authUser.id).single();
    if (up) {
      plan = up.plan || 'free'; displayName = up.display_name || '';
      window.currentLang  = up.lang_id === 2 ? 'ta' : 'en';
      window.currentClass = up.standard || '12th';
    } else {
      const { data: p } = await db.from('profiles').select('plan,display_name').eq('id', authUser.id).single();
      if (p) { plan = p.plan || 'free'; displayName = p.display_name || ''; }
    }
    userPlan = plan;
    DAILY_LIMIT = (userPlan === 'premium' || userPlan === 'unlimited') ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  } catch (e) { userPlan = 'free'; DAILY_LIMIT = FREE_DAILY_LIMIT; }
}

