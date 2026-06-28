async function loadAdminConfig() {
  try {
    const { data } = await db.from('admin_config').select('key,value');
    if (data) {
      data.forEach(r => {
        if (r.key === 'free_daily_limit') adminConfig.free_daily_limit = parseInt(r.value) || 5;
        if (r.key === 'free_max_test_duration') adminConfig.free_max_test_duration = parseInt(r.value) || 30;
      });
      FREE_DAILY_LIMIT = adminConfig.free_daily_limit;
      FREE_FC_DAILY = adminConfig.free_daily_limit;
      FREE_TF_DAILY = adminConfig.free_daily_limit;
      if (userPlan === 'free') DAILY_LIMIT = FREE_DAILY_LIMIT;
      const qlEl = document.getElementById('plan-free-qlimit');
      if (qlEl) qlEl.textContent = `${FREE_DAILY_LIMIT} questions / subject / day`;
    }
  } catch(e) {}
}

async function saveAdminConfig() {
  const limit = parseInt(document.getElementById('admin-daily-limit').value) || 5;
  const maxDur = parseInt(document.getElementById('admin-max-duration').value) || 30;
  try {
    const { error } = await db.from('admin_config').upsert([
      { key: 'free_daily_limit', value: String(limit) },
      { key: 'free_max_test_duration', value: String(maxDur) }
    ]);
    if (error) throw new Error(error.message);
    adminConfig.free_daily_limit = limit;
    adminConfig.free_max_test_duration = maxDur;
    FREE_DAILY_LIMIT = limit;
    FREE_FC_DAILY = limit;
    FREE_TF_DAILY = limit;
    if (userPlan === 'free') DAILY_LIMIT = FREE_DAILY_LIMIT;
    const qlEl = document.getElementById('plan-free-qlimit');
    if (qlEl) qlEl.textContent = `${FREE_DAILY_LIMIT} questions / subject / day`;
    const msg = document.getElementById('admin-save-msg');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
  } catch(e) { alert('Save failed — ' + e.message + '\n\nMake sure you have run migration 005_fix_admin_write_policy.sql in Supabase.'); }
}

// ── CHAPTER VISIBILITY LIMITS (localStorage) ────────────────────────────────
function getChapterLimits() {
  try { return JSON.parse(localStorage.getItem('adminChapterLimits') || '{}'); } catch(e) { return {}; }
}

function getChapterLimitForSubject(uiSubjectId) {
  if (!uiSubjectId) return 99;
  const limits = getChapterLimits();
  const key = uiSubjectId.toLowerCase();
  return limits[key]?.visibleUpTo ?? 99;
}

function saveChapterLimits() {
  const label = document.getElementById('admin-vis-label').value.trim();
  const limits = {
    physics:   { visibleUpTo: parseInt(document.getElementById('admin-vis-physics').value)   || 99, label },
    chemistry: { visibleUpTo: parseInt(document.getElementById('admin-vis-chemistry').value) || 99, label },
    biology:   { visibleUpTo: parseInt(document.getElementById('admin-vis-biology').value)   || 99, label },
  };
  localStorage.setItem('adminChapterLimits', JSON.stringify(limits));
  const msg = document.getElementById('admin-vis-msg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 3000);
}

function showAdminPanel() {
  document.getElementById('admin-daily-limit').value = adminConfig.free_daily_limit;
  document.getElementById('admin-max-duration').value = adminConfig.free_max_test_duration;
  // Load chapter limits into selects
  const limits = getChapterLimits();
  ['physics','chemistry','biology'].forEach(k => {
    const el = document.getElementById('admin-vis-' + k);
    if (el) el.value = String(limits[k]?.visibleUpTo ?? 99);
  });
  const labelEl = document.getElementById('admin-vis-label');
  if (labelEl) {
    const anyLabel = Object.values(limits).find(v => v.label)?.label || '';
    labelEl.value = anyLabel;
  }
  showScreen('admin');
  loadAdminUsers();
}

async function loadAdminUsers() {
  const el = document.getElementById('admin-users-list');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:.83rem">Loading…</div>';
  try {
    const { data, error } = await db.rpc('get_all_user_profiles');
    if (error) throw new Error(error.message);
    if (!data || !data.length) { el.innerHTML = '<div style="color:var(--muted);font-size:.83rem">No users found.</div>'; return; }
    el.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead>
            <tr style="border-bottom:1.5px solid var(--border);color:var(--muted)">
              <th style="text-align:left;padding:.4rem .5rem">${_ta('Name','பெயர்')}</th>
              <th style="text-align:left;padding:.4rem .5rem">${_ta('Email','மின்னஞ்சல்')}</th>
              <th style="text-align:left;padding:.4rem .5rem">${_ta('Joined','சேர்ந்த தேதி')}</th>
              <th style="text-align:left;padding:.4rem .5rem">${_ta('Plan','திட்டம்')}</th>
              <th style="text-align:left;padding:.4rem .5rem">${_ta('Status','நிலை')}</th>
              <th style="padding:.4rem .5rem"></th>
            </tr>
          </thead>
          <tbody>
            ${data.map(u => {
              const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
              const statusLabel = u.disabled ? _ta('Disabled','முடக்கப்பட்டது') : _ta('Enabled','இயக்கத்தில்');
              const statusColor = u.disabled ? 'var(--danger)' : 'var(--success)';
              const btnLabel = u.disabled ? _ta('Enable','இயக்கு') : _ta('Disable','முடக்கு');
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:.45rem .5rem">${u.display_name || '—'}</td>
                <td style="padding:.45rem .5rem;color:var(--muted)">${u.email}</td>
                <td style="padding:.45rem .5rem;white-space:nowrap">${joined}</td>
                <td style="padding:.45rem .5rem">${u.plan}</td>
                <td style="padding:.45rem .5rem;color:${statusColor};font-weight:700">${statusLabel}</td>
                <td style="padding:.45rem .5rem"><button class="btn btn-sm ${u.disabled ? 'btn-primary' : 'btn-outline'}" style="font-size:.75rem;padding:3px 10px" onclick="toggleUserDisabled('${u.id}',${u.disabled})">${btnLabel}</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--danger);font-size:.83rem">Failed to load users: ${e.message}</div>`;
  }
}

async function toggleUserDisabled(userId, currentlyDisabled) {
  try {
    const { error } = await db.from('user_profiles').update({ disabled: !currentlyDisabled }).eq('id', userId);
    if (error) throw new Error(error.message);
    await loadAdminUsers();
  } catch(e) {
    alert('Failed to update user: ' + e.message);
  }
}

async function loadSupabaseHomeStats() {
  if (!authUser) return;
  try {
    const todayLocal = new Date(); todayLocal.setHours(0,0,0,0);
    const since60 = new Date(todayLocal); since60.setDate(since60.getDate() - 60);

    const [sessRes, perfRes] = await Promise.all([
      db.from('exam_sessions')
        .select('total_q, completed_at')
        .eq('user_id', authUser.id)
        .gte('completed_at', since60.toISOString()),
      db.from('topic_performance')
        .select('total, correct')
        .eq('user_id', authUser.id)
    ]);

    const sessions = sessRes.data || [];
    const perf = perfRes.data || [];

    const todayStr = todayLocal.toLocaleDateString('en-CA');
    const todayCount = sessions
      .filter(s => s.completed_at && new Date(s.completed_at).toLocaleDateString('en-CA') === todayStr)
      .reduce((sum, s) => sum + (s.total_q || 0), 0);

    const totalAttempted = perf.reduce((s, r) => s + (r.total || 0), 0);
    const totalCorrect   = perf.reduce((s, r) => s + (r.correct || 0), 0);

    const daySet = new Set(sessions
      .map(s => s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-CA') : null)
      .filter(Boolean));
    let streak = 0;
    const d = new Date(); d.setHours(0,0,0,0);
    while (daySet.has(d.toLocaleDateString('en-CA'))) { streak++; d.setDate(d.getDate() - 1); }

    // daily goal card — only for premium/unlimited (free card uses localStorage flashcard/TF counts)
    if (userPlan !== 'free') {
      const DAILY_GOAL = 20;
      const pct = Math.min(100, Math.round(todayCount / DAILY_GOAL * 100));
      const dgCount  = document.getElementById('dgc-count');
      const dgFill   = document.getElementById('dgc-fill');
      const dgPct    = document.getElementById('dgc-pct');
      const dgCircle = document.getElementById('dgc-circle');
      if (dgCount)  dgCount.textContent  = `${todayCount}/${DAILY_GOAL} Questions Today`;
      if (dgPct)    dgPct.textContent    = todayCount === 0 ? 'Start practicing!' : todayCount >= DAILY_GOAL ? '🔥 Great session!' : `Keep going — ${DAILY_GOAL - todayCount} more to reach ${DAILY_GOAL}!`;
      if (dgFill)   dgFill.style.width   = pct + '%';
      if (dgCircle) dgCircle.textContent = todayCount >= DAILY_GOAL ? '✓' : todayCount;
    }

    const sa  = document.getElementById('stat-attempted');
    const sac = document.getElementById('stat-accuracy');
    const ss  = document.getElementById('stat-streak');
    if (sa && totalAttempted > 0) sa.textContent = totalAttempted;
    if (sac && totalAttempted > 0) {
      const acc = Math.round(totalCorrect / totalAttempted * 100);
      sac.textContent  = acc + '%';
      sac.style.color  = acc >= 75 ? 'var(--success)' : acc >= 50 ? 'var(--blue)' : 'var(--danger)';
    }
    if (ss) ss.textContent = streak;
  } catch(e) { /* silent — localStorage values remain */ }
}

