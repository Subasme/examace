// ── STORAGE ──
function loadStorageSync() {
  try { const s = localStorage.getItem('examace_lb'); if (s) localLeaderboard = JSON.parse(s); } catch (e) {}
  try { const s = localStorage.getItem('examace_mistakes'); if (s) mistakes = JSON.parse(s); } catch (e) {}
  try { const s = localStorage.getItem('examace_progress'); if (s) progress = JSON.parse(s); } catch (e) {}
}

async function syncProgressFromSupabase() {
  if (!authUser) return;
  try {
    const { data } = await db.from('user_progress').select('total,correct,wrong,time_spent,subjects,chapters,history').eq('user_id', authUser.id).single();
    if (data) {
      progress = { total: data.total, correct: data.correct, wrong: data.wrong, time: data.time_spent, subjects: data.subjects || {}, chapters: data.chapters || {}, history: data.history || [] };
      try { localStorage.setItem('examace_progress', JSON.stringify(progress)); } catch (e) {}
    }
    const mistakeLimit = (userPlan === 'premium' || userPlan === 'unlimited') ? 200 : 20;
    const { data: md } = await db.from('mistakes').select('question,options,correct,explanation,subject,chapter,your_answer,answered_at').eq('user_id', authUser.id).order('answered_at', { ascending: false }).limit(mistakeLimit);
    if (md) {
      mistakes = md.map(m => ({ question: m.question, options: m.options, correct: m.correct, explanation: m.explanation, subject: m.subject, chapter: m.chapter, date: new Date(m.answered_at).toLocaleDateString('en-GB'), yourAnswer: m.your_answer }));
      try { localStorage.setItem('examace_mistakes', JSON.stringify(mistakes)); } catch (e) {}
    }
  } catch (e) {}
}

function saveStorage() {
  try { localStorage.setItem('examace_lb', JSON.stringify(localLeaderboard)); } catch (e) {}
  try { localStorage.setItem('examace_mistakes', JSON.stringify(mistakes)); } catch (e) {}
  try { localStorage.setItem('examace_progress', JSON.stringify(progress)); } catch (e) {}
  if (!authUser) return;
  db.from('user_progress').upsert({
    user_id: authUser.id, total: progress.total, correct: progress.correct, wrong: progress.wrong,
    time_spent: progress.time, subjects: progress.subjects, chapters: progress.chapters,
    history: progress.history, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' }).then();
}

async function loadManifest() {
  if (manifest) return manifest;
  const { data, error } = await db.from('chapters')
    .select('language,standard,subject,chapter_id,chapter_label,question_count')
    .order('language').order('standard').order('subject').order('chapter_id');
  if (error || !data?.length) throw new Error(error ? error.message : 'chapters table empty');
  manifest = { languages: [] };
  const li = {}, si = {}, oi = {};
  for (const r of data) {
    if (!li[r.language]) { li[r.language] = { id: r.language.toLowerCase(), label: r.language, standards: [] }; manifest.languages.push(li[r.language]); }
    const sk = `${r.language}/${r.standard}`;
    if (!si[sk]) { si[sk] = { id: r.standard, label: `${r.standard} Standard`, subjects: [] }; li[r.language].standards.push(si[sk]); }
    const ok = `${sk}/${r.subject}`;
    if (!oi[ok]) { oi[ok] = { id: r.subject.toLowerCase(), label: r.subject, chapters: [], totalQuestions: 0 }; si[sk].subjects.push(oi[ok]); }
    oi[ok].chapters.push({ id: r.chapter_id, label: r.chapter_label, count: r.question_count || 0 });
    oi[ok].totalQuestions += r.question_count || 0;
  }
  return manifest;
}

// Build a question object with shuffled options (A/B/C/D → display 1/2/3/4)
// correct_option stays as A/B/C/D internally; correct (int) = shuffled display index
function buildQuestion({ id, question_text, optMap, correct_option, explanation, topic, chapter, tag, subject }) {
  const keys = shuffle(['A','B','C','D']);          // e.g. ['C','A','D','B']
  const options = keys.map(k => optMap[k] || '');  // display 1/2/3/4 texts
  const correct = keys.indexOf(correct_option);     // which display position is correct
  return { id, question: question_text, options, correct, correct_option, shuffleMap: keys, explanation: explanation || '', topic, chapter, tag, subject };
}

async function fetchQuestions({ language, standard, subject, chapterId }) {
  const lang_id = language === 'Tamil' ? 2 : 1;

  // ── Layer 1: Storage JSON (CDN-cached, free of DB quota) ─────────────────
  if (chapterId) {
    try {
      const url = `${SUPABASE_URL}/storage/v1/object/public/questions/${language.toLowerCase()}/${standard.toLowerCase().replace(/\s+/g,'')}/${subject.toLowerCase()}/${chapterId}.json`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data
          .filter(r => !r.status || r.status === 'active')
          .map(r => {
            const optMap = { A: r.options?.[0], B: r.options?.[1], C: r.options?.[2], D: r.options?.[3] };
            const correct_option = r.correct_option || 'ABCD'[r.correct] || 'A';
            return buildQuestion({ id: r.id || null, question_text: r.question, optMap, correct_option,
              explanation: r.explanation, topic: r.topic || subject,
              chapter: r.chapter_label || chapterId, tag: r.question_tag || r.tag || '', subject });
          });
      }
    } catch(e) { /* fall through */ }
  }

  // ── Layer 2: Normalized DB — questions + question_translations + options ──
  try {
    let qb = db.from('questions')
      .select(`id, chapter_label, topic, correct_option, question_tag, status,
               question_translations!inner(question_text, explanation),
               options(option_key, option_text)`)
      .eq('language', language).eq('standard', standard).eq('subject', subject)
      .eq('status', 'active')
      .eq('question_translations.lang_id', lang_id)
      .eq('options.lang_id', lang_id);
    if (chapterId) qb = qb.eq('chapter_id', chapterId);
    const { data, error } = await qb;
    if (!error && data?.length) {
      return data.map(r => {
        const trans = Array.isArray(r.question_translations) ? r.question_translations[0] : r.question_translations;
        const optMap = {};
        (r.options || []).forEach(o => { optMap[o.option_key] = o.option_text; });
        return buildQuestion({ id: r.id, question_text: trans?.question_text || '',
          optMap, correct_option: r.correct_option || 'A',
          explanation: trans?.explanation, topic: r.topic || r.chapter_label,
          chapter: r.chapter_label || chapterId, tag: r.question_tag || '', subject });
      });
    }
  } catch(e) { /* fall through to legacy */ }

  // ── Layer 3: Legacy fallback (old flat schema) ────────────────────────────
  let qb = db.from('questions')
    .select('id,topic,question,options,correct,correct_option,explanation,chapter_label,question_tag')
    .eq('language', language).eq('standard', standard).eq('subject', subject);
  if (chapterId) qb = qb.eq('chapter_id', chapterId);
  const { data, error } = await qb;
  if (error) throw new Error('Could not load questions');
  return (data || []).map(r => {
    const correct_option = r.correct_option || 'ABCD'[r.correct] || 'A';
    const optMap = { A: r.options?.[0], B: r.options?.[1], C: r.options?.[2], D: r.options?.[3] };
    return buildQuestion({ id: r.id, question_text: r.question, optMap, correct_option,
      explanation: r.explanation, topic: r.topic || r.chapter_label,
      chapter: r.chapter_label || r.topic || chapterId || subject,
      tag: r.question_tag || '', subject });
  });
}

