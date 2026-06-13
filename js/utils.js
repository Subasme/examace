function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function subjClass(s) { return s === 'Physics' ? 'subj-phy' : s === 'Chemistry' ? 'subj-che' : 'subj-bio'; }
function getTodayKey() { return new Date().toISOString().split('T')[0]; }
function getWeekKey() { const n = new Date(), s = new Date(n); s.setDate(n.getDate() - n.getDay()); return s.toISOString().split('T')[0]; }
function qFingerprint(q) { return (q.question || '').slice(0, 100); }

function dailyStorageKey(chapter) {
  const ch = chapter || selection.chapter;
  return `examace_daily_${selection.language?.id}_${selection.standard?.id}_${selection.subject?.id}_${ch?.id}_${getTodayKey()}`;
}
function getDailyDone(chapter) {
  const ch = chapter || selection.chapter;
  const key = `${selection.language?.id}_${selection.standard?.id}_${selection.subject?.id}_${ch?.id}_${getTodayKey()}`;
  if (dailyCache[key]) return dailyCache[key];
  try { const raw = localStorage.getItem(dailyStorageKey(ch)); return raw ? JSON.parse(raw) : { count: 0, seen: [] }; } catch (e) { return { count: 0, seen: [] }; }
}
function setDailyDone(chapter, data) {
  const ch = chapter || selection.chapter;
  const key = `${selection.language?.id}_${selection.standard?.id}_${selection.subject?.id}_${ch?.id}_${getTodayKey()}`;
  dailyCache[key] = data;
  try { localStorage.setItem(dailyStorageKey(ch), JSON.stringify(data)); } catch (e) {}
  if (authUser) {
    db.from('daily_practice').upsert({
      user_id: authUser.id,
      language: selection.language?.label || '', standard: selection.standard?.id || '',
      subject: selection.subject?.label || '', chapter_id: ch?.id || '',
      practice_date: getTodayKey(), count: data.count, seen_fingerprints: data.seen
    }, { onConflict: 'user_id,language,standard,subject,chapter_id,practice_date' }).then();
  }
}

function getFCDoneToday() {
  const uid = authUser?.id || 'guest';
  try { return Math.min(FREE_FC_DAILY, parseInt(localStorage.getItem('examace_fc_' + uid + '_' + getTodayKey()) || '0', 10)); } catch(e) { return 0; }
}
function getTFDoneToday() {
  const uid = authUser?.id || 'guest';
  try { return Math.min(FREE_TF_DAILY, parseInt(localStorage.getItem('examace_tf_' + uid + '_' + getTodayKey()) || '0', 10)); } catch(e) { return 0; }
}
function incFCDone(n) {
  if (userPlan !== 'free') return;
  const uid = authUser?.id || 'guest';
  try { localStorage.setItem('examace_fc_' + uid + '_' + getTodayKey(), getFCDoneToday() + (n||1)); } catch(e) {}
}
function incTFDone(n) {
  if (userPlan !== 'free') return;
  const uid = authUser?.id || 'guest';
  try { localStorage.setItem('examace_tf_' + uid + '_' + getTodayKey(), getTFDoneToday() + (n||1)); } catch(e) {}
}

async function preloadDailyData() {
  if (!authUser || !selection.subject) return;
  try {
    const today = getTodayKey();
    const { data } = await db.from('daily_practice')
      .select('chapter_id,count,seen_fingerprints')
      .eq('user_id', authUser.id)
      .eq('language', selection.language?.label || '')
      .eq('standard', selection.standard?.id || '')
      .eq('subject', selection.subject?.label || '')
      .eq('practice_date', today);
    if (data) {
      data.forEach(row => {
        const key = `${selection.language?.id}_${selection.standard?.id}_${selection.subject?.id}_${row.chapter_id}_${today}`;
        dailyCache[key] = { count: row.count, seen: row.seen_fingerprints || [] };
        try { localStorage.setItem(dailyStorageKey({ id: row.chapter_id }), JSON.stringify(dailyCache[key])); } catch (e) {}
      });
    }
  } catch (e) {}
}
function isDailyComplete(chapter) {
  if (userPlan === 'premium' || userPlan === 'unlimited') return false;
  return getSubjectDailyTotal() >= FREE_DAILY_LIMIT;
}
function getSubjectDailyTotal() {
  const chaps = selection.subject?.chapters || [];
  return chaps.reduce((sum, c) => sum + (getDailyDone(c).count || 0), 0);
}
function getTimeUntilMidnight() {
  const now = new Date(), midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight - now;
  return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
}

