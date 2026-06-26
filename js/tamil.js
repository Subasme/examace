/* Tamil (ta) UI translation layer.
   Runs only when localStorage.lang === 'ta'.
   Patches DOM text and injects Tamil font. */

(function () {
  if (localStorage.getItem('lang') !== 'ta') return;

  /* ── Inject Noto Sans Tamil font if not already present ── */
  if (!document.querySelector('link[data-tamil-font]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.setAttribute('data-tamil-font', '1');
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  /* ── Add Tamil font to body ── */
  document.documentElement.lang = 'ta';
  var style = document.createElement('style');
  style.textContent = [
    "body, .auth-card, .auth-title, .auth-sub, .field label,",
    ".btn, .btn-primary, .btn-outline, .btn-block, .btn-gold,",
    ".nav-logo, .bottom-nav, .bnav-btn, .home-footer-links,",
    ".home-greeting, .greeting-sub, .greeting-title,",
    ".pmenu-label, .profile-plan-chip, .app-version,",
    ".section-title, .contact-label, .cgroup-name, .cgroup-desc,",
    "#screen-exam-tips *, .eti-text, .exam-tips-section h3,",
    "#screen-community *, #screen-contact *",
    "{ font-family: 'Noto Sans Tamil', 'DM Sans', sans-serif !important; }",
    "h1,h2,h3,h4,.auth-title,.plan-hero-title",
    "{ font-family: 'Noto Sans Tamil', 'Sora', sans-serif !important; }"
  ].join('\n');
  document.head.appendChild(style);

  /* ── Translation map: selector → new innerHTML/text ── */
  var T = {
    /* Page title */
    'title': 'KARNAN — NEET UG பயிற்சி தளம்',

    /* Nav */
    '.nav-logo': '<img src="assets/logo.png" alt="KARNAN" style="height:32px;width:32px;object-fit:contain;border-radius:50%"/> KARNAN',

    /* Bottom nav */
    '#bnav-home span:last-child':   'முகப்பு',
    '#bnav-practice span:last-child': 'பயிற்சி',
    '#bnav-community span:last-child': 'சமூகம்',
    '#bnav-profile span:last-child':  'சுயவிவரம்',

    /* Home greeting */
    '.greeting-sub': 'இன்று பயிற்சி செய்ய தயாரா?',

    /* Home guest landing */
    /* handled by patchGuestLanding() below */

    /* Auth — Login */
    '#screen-auth-login .auth-title': 'KARNAN-க்கு வரவேற்கிறோம்',
    '#screen-auth-login .auth-sub':   'உங்கள் NEET UG தயாரிப்பை கண்காணிக்க உள்நுழையுங்கள்',
    '#screen-auth-login .field:nth-child(4) label': 'மின்னஞ்சல்',
    '#screen-auth-login .field:nth-child(5) label': 'கடவுச்சொல்',
    '#login-btn': 'உள்நுழை',
    '#screen-auth-login .auth-switch:nth-of-type(1)': 'கணக்கு இல்லையா? <a onclick="showAuthScreen(\'register\')">இலவசமாக உருவாக்கு</a>',
    '#screen-auth-login .auth-switch:nth-of-type(2)': '<a onclick="showForgotPassword()">கடவுச்சொல் மறந்தீர்களா?</a> · <a onclick="showScreenPublic(\'contact\')">தொடர்பு கொள்ளுங்கள்</a>',

    /* Auth — Register */
    '#screen-auth-register .auth-title': 'கணக்கை உருவாக்குங்கள்',
    '#screen-auth-register .auth-sub':   'இன்றே உங்கள் NEET UG பயணத்தை தொடங்குங்கள் — இலவசம்',
    '#screen-auth-register .field:nth-child(4) label': 'முழு பெயர்',
    '#screen-auth-register .field:nth-child(5) label': 'மின்னஞ்சல்',
    '#screen-auth-register .field:nth-child(6) label': 'கடவுச்சொல்',
    '#reg-btn': 'கணக்கை உருவாக்கு',
    '#screen-auth-register .auth-switch:nth-of-type(1)': 'ஏற்கனவே கணக்கு உள்ளதா? <a onclick="showAuthScreen(\'login\')">உள்நுழை</a>',
    '#screen-auth-register .auth-switch:nth-of-type(2)': 'உதவி வேண்டுமா? <a onclick="showScreenPublic(\'contact\')">தொடர்பு கொள்ளுங்கள்</a>',

    /* Profile */
    '#profile-plan-chip': 'இலவச திட்டம்',
    '.app-version': 'KARNAN · NEET UG வெற்றிக்கு உந்துகிறோம்',
    '.logout-btn': '⏻  வெளியேறு',

    /* Profile menu */
    '#screen-profile .pmenu-item:nth-child(1) .pmenu-label': 'என் செயல்திறன்',
    '#screen-profile .pmenu-item:nth-child(2) .pmenu-label': 'குறிப்புகள் &amp; தவறுகள்',
    '#screen-profile .pmenu-item:nth-child(3) .pmenu-label': 'தரவரிசை பட்டியல்',
    '#screen-profile .pmenu-item:nth-child(4) .pmenu-label': 'சாதனைகள்',
    '#screen-profile .pmenu-item:nth-child(5) .pmenu-label': 'பிரீமியம் திட்டம்',
    '#screen-profile .pmenu-item:nth-child(6) .pmenu-label': 'தொடர்பு கொள்ளுங்கள்',

    /* Home footer links */
    '#screen-home .hfl-btn:nth-child(1)': '🌐 படிப்பு சமூகம்',
    '#screen-home .hfl-btn:nth-child(2)': '📋 தேர்வு குறிப்புகள்',
    '#screen-home .hfl-btn:nth-child(3)': '📞 தொடர்பு கொள்ளுங்கள்',
    '#screen-home .hfl-btn:nth-child(4)': '📤 பகிர்',

    /* Stats */
    '#home-stats-row .stat-box:nth-child(1) .stat-lbl': 'முயற்சிகள்',
    '#home-stats-row .stat-box:nth-child(3) .stat-lbl': 'தொடர்ச்சி',

    /* Leaderboard */
    '#screen-leaderboard h2': '🏆 வாராந்திர தரவரிசை',
    '#lb-tab-global': '🌍 உலகளாவிய',
    '#lb-tab-local':  '📱 என் சாதனம்',
    '#lb-tab-history':'📅 வரலாறு',

    /* Dashboard */
    '#screen-dashboard h2': '📊 என் டாஷ்போர்டு',

    /* Mistakes */
    '#screen-mistakes h2': '📌 என் தவறுகள்',

    /* Exam Tips */
    '#screen-exam-tips h2': '📋 NEET தேர்வு வழிகாட்டி',
    '#screen-exam-tips > p': 'உங்கள் NEET மதிப்பெண்ணை அதிகரிக்க சாதுர்யமான உத்திகள்',

    /* Community */
    '#screen-community .contact-hero > div:nth-child(2)': 'படிப்பு சமூகம்',
    '#screen-community .contact-hero > div:nth-child(3)': 'ஒன்றாக கற்போம் · விவாதிப்போம் · வளர்வோம்',
    '#screen-community .section-title:nth-of-type(1)': '📚 பாட விவாத குழுக்கள்',
    '.cgroup-card:nth-child(1) .cgroup-name': 'இயற்பியல் குழு',
    '.cgroup-card:nth-child(1) .cgroup-desc': 'விதிகள், கணக்குகள், கருத்துகள் &amp; சந்தேகங்கள்',
    '.cgroup-card:nth-child(2) .cgroup-name': 'வேதியியல் குழு',
    '.cgroup-card:nth-child(2) .cgroup-desc': 'வினைகள், கரிமம், அகரிமம் &amp; மேலும்',
    '.cgroup-card:nth-child(3) .cgroup-name': 'உயிரியல் குழு',
    '.cgroup-card:nth-child(3) .cgroup-desc': 'உயிரியல், வரைபடங்கள் &amp; குறிப்புகள்',
    '.cgroup-card:nth-child(4) .cgroup-name': 'NEET பொது',
    '.cgroup-card:nth-child(4) .cgroup-desc': 'உத்தி, உந்துதல் &amp; தேர்வு செய்திகள்',

    /* Contact */
    '#screen-contact .contact-hero > div:nth-child(2)': 'தொடர்பு கொள்ளுங்கள்',
    '#screen-contact .contact-hero > div:nth-child(3)': 'NEET UG-யில் உங்கள் வெற்றிக்கு உதவ நாங்கள் இங்கே இருக்கிறோம்',
    '#screen-contact .contact-row:nth-child(1) .contact-label': 'மின்னஞ்சல்',
    '#screen-contact .contact-row:nth-child(2) .contact-label': 'தொலைபேசி',
    '#screen-contact .contact-row:nth-child(3) .contact-label': 'வாட்ஸ்அப்',

    /* Plan screen */
    '.plan-hero-title': 'உங்கள் வெற்றி திட்டத்தை தேர்ந்தெடுங்கள்',
    '.plan-hero-sub':   'அனைத்து திட்டங்களும் வாழ்நாள் முழுவதும் செல்லுபடியாகும்',
    '#plan-free-card .plan-name':    'இலவசம்',
    '#plan-premium-card .plan-name': 'பிரீமியம்',

    /* Upgrade modal */
    '#upgrade-modal .auth-title': 'பிரீமியம் அம்சம்',
  };

  function applyTranslations() {
    /* title */
    document.title = T['title'];

    Object.keys(T).forEach(function (sel) {
      if (sel === 'title') return;
      try {
        var els = document.querySelectorAll(sel);
        els.forEach(function (el) {
          el.innerHTML = T[sel];
        });
      } catch (e) { /* ignore invalid selectors */ }
    });

    /* Input placeholders */
    var placeholders = {
      '#login-email':    'நீங்கள்@example.com',
      '#login-password': '••••••••',
      '#reg-name':       'உங்கள் பெயர்',
      '#reg-email':      'நீங்கள்@example.com',
      '#reg-password':   'குறைந்தது 6 எழுத்துகள்',
      '#timed-name':     'தரவரிசைக்கு உங்கள் பெயர் உள்ளிடுங்கள்…',
      '#grand-name':     'தரவரிசைக்கு உங்கள் பெயர் உள்ளிடுங்கள்…',
    };
    Object.keys(placeholders).forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.placeholder = placeholders[sel];
    });

    patchGuestLanding();
    patchExamTips();
    patchPlanScreen();
  }

  function patchGuestLanding() {
    var el = document.getElementById('home-guest-content');
    if (!el) return;
    var h1 = el.querySelector('h1');
    if (h1) h1.innerHTML = 'NEET UG-யை<br/><span style="color:var(--purple)">சாதுர்யமான பயிற்சியுடன்</span> வெல்லுங்கள்';
    var p = el.querySelector('p');
    if (p) p.textContent = 'அத்தியாயம்-வாரியான MCQ, நேர சோதனைகள் மற்றும் தவறு கண்காணிப்பு — அனைத்தும் இலவசம்.';

    var featureItems = el.querySelectorAll('[style*="flex;align-items:center"]');
    var ta = [
      ['7,800+ பயிற்சி கேள்விகள்', 'இயற்பியல், வேதியியல் &amp; உயிரியல் — வகுப்பு 11 &amp; 12'],
      ['சாதுர்யமான தவறு கண்காணிப்பாளர்', 'தவறான விடைகளை தானாக கண்காணிக்கும்'],
      ['NEET-பாணி நேர சோதனைகள்', '+4 / −1 மதிப்பெண், அனைத்து பாடங்கள், 180 நிமிடம் வரை'],
      ['தினசரி தொடர்ச்சி &amp; பகுப்பாய்வு', 'துல்லியம், தொடர்ச்சி மற்றும் மதிப்பெண் போக்குகளை கண்காணிக்கவும்'],
    ];
    featureItems.forEach(function (row, i) {
      if (!ta[i]) return;
      var divs = row.querySelectorAll('div > div');
      if (divs[0]) divs[0].innerHTML = ta[i][0];
      if (divs[1]) divs[1].innerHTML = ta[i][1];
    });

    var btns = el.querySelectorAll('button');
    if (btns[0]) btns[0].textContent = 'இலவசமாக தொடங்குங்கள் →';
    if (btns[1]) btns[1].textContent = 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழை';
  }

  function patchExamTips() {
    var screen = document.getElementById('screen-exam-tips');
    if (!screen) return;

    var doItems = [
      'ஒவ்வொரு கேள்வியையும் அனைத்து 4 விருப்பங்களையும் முழுமையாக படிக்கவும் — "எப்போதும்", "ஒருபோதும்" போன்ற சொற்கள் விடையை மாற்றும்',
      'உயிரியலை முதலில் தீர்க்கவும் — மிக அதிக மதிப்பெண் பிரிவு (360 மதிப்பெண்), சிக்கலான கணக்குகள் இல்லை',
      'இயற்பியல் கணக்குகளுக்கு கரடு தாள் பயன்படுத்தவும் — தெரிந்த மதிப்புகளும் சூத்திரமும் எழுதிவிட்டு தீர்க்கவும்',
      'சந்தேகமான கேள்விகளை குறிக்கவும், திரும்பி வாருங்கள் — சிக்கிக்கொள்ளாதீர்கள்',
      'நேர மேலாண்மை: உயிரியல் ~1 நிமிடம், வேதியியல் ~1.5 நிமிடம், இயற்பியல் ~2 நிமிடம்',
      'NCERT-ஐ நம்புங்கள் — NEET கேள்விகளில் 85%+ நேரடியாக NCERT நூலிலிருந்தே வருகின்றன',
    ];
    var dontItems = [
      'முழுவதும் தெரியாத இயற்பியல் அல்லது வேதியியல் கேள்விகளை முயற்சிக்காதீர்கள் — எதிர்மறை மதிப்பெண் (−1) மொத்தத்தை குறைக்கும்',
      'எந்த ஒரு கேள்வியிலும் 2 நிமிடத்திற்கு மேல் செலவழிக்காதீர்கள்',
      'நம்பிக்கையுடன் தேர்ந்தெடுத்த விடையை மாற்றாதீர்கள் — முதல் உள்ளுணர்வு பொதுவாக சரியானது',
      'NCERT வரைபடங்களை புறக்கணிக்காதீர்கள் — நேரடியாக கேட்கப்படுகின்றன',
      'எந்த உயிரியல் கேள்வியையும் காலி விடாதீர்கள் — புத்திசாலித்தனமான யூகத்திற்கு எதிர்மறை மதிப்பெண் இல்லை',
      'புதிய கேள்விகளில் பதட்டப்படாதீர்கள் — சாத்தியமற்ற விருப்பங்களை நீக்கி, சரியான விடையை தேர்ந்தெடுங்கள்',
    ];
    var studyItems = [
      'NCERT உயிரியலை வரி-வரியாக படிக்கவும் — வகைப்படுத்தல் அட்டவணைகள், மரபியல் மற்றும் மனித உடலியல் கவனிக்கவும்',
      'இயற்பியலில் வருவித்தல்களை கருத்துரீதியாக புரிந்துகொள்ளுங்கள் — மனப்பாடம் மட்டும் போதாது; தினமும் கணக்குகள் பயிற்சி செய்யுங்கள்',
      'வேதியியலில் பெயர் வினைகள், வினைப்பொருட்கள் மற்றும் விதிவிலக்கு சேர்மங்களை அத்தியாயம்-வாரியாக மனப்பாடம் செய்யுங்கள்',
      'இடைவெளி திரும்பிப் பார்த்தல் பயன்படுத்துங்கள்: 1 நாள், 1 வாரம், 1 மாதம் கழித்து திருப்பி படிக்கவும்',
      'குறைந்தது 5 முந்தைய NEET தாள்களை நேர நிர்ணயத்துடன் தீர்க்கவும் — தேர்வு சகிப்புத்திறன் வளரும்',
      'பலவீனமான அத்தியாயங்களில் திரும்பிப் படிப்பதில் கவனம் செலுத்துங்கள் — 20% அத்தியாயங்கள் ~80% மதிப்பெண்களை தருகின்றன',
    ];

    var sections = screen.querySelectorAll('.exam-tips-section');
    // Do's section
    if (sections[0]) {
      var h3do = sections[0].querySelector('h3');
      if (h3do) h3do.innerHTML = '<span style="background:var(--success);color:#fff;padding:3px 10px;border-radius:20px;font-size:.8rem">✅ செய்ய வேண்டியவை</span>';
      var etis = sections[0].querySelectorAll('.eti-text');
      etis.forEach(function(el, i){ if (doItems[i]) el.textContent = doItems[i]; });
    }
    // Don'ts section
    if (sections[1]) {
      var h3dont = sections[1].querySelector('h3');
      if (h3dont) h3dont.innerHTML = '<span style="background:var(--danger);color:#fff;padding:3px 10px;border-radius:20px;font-size:.8rem">❌ செய்யக்கூடாதவை</span>';
      var etis2 = sections[1].querySelectorAll('.eti-text');
      etis2.forEach(function(el, i){ if (dontItems[i]) el.textContent = dontItems[i]; });
    }
    // Study Tips section
    if (sections[2]) {
      var h3tip = sections[2].querySelector('h3');
      if (h3tip) h3tip.innerHTML = '<span style="background:var(--purple);color:#fff;padding:3px 10px;border-radius:20px;font-size:.8rem">💡 படிப்பு குறிப்புகள்</span>';
      var etis3 = sections[2].querySelectorAll('.eti-text');
      etis3.forEach(function(el, i){ if (studyItems[i]) el.textContent = studyItems[i]; });
    }

    var backBtn = screen.querySelector('.btn-outline');
    if (backBtn) backBtn.textContent = '← முகப்பிற்கு திரும்பு';
  }

  function patchPlanScreen() {
    var free = document.getElementById('plan-free-qlimit');
    if (free) free.textContent = '10 கேள்விகள் / பாடம் / நாள்';
    var planBtn = document.getElementById('plan-btn');
    if (planBtn) planBtn.textContent = 'இலவசத்துடன் தொடர்';
  }

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations);
  } else {
    applyTranslations();
  }

  /* Patch dynamically-rendered home sections */
  function patchHomeFeatures() {
    var el = document.getElementById('home-features');
    if (!el || el._taPatch) return;
    el._taPatch = true;

    /* Section titles */
    el.querySelectorAll('.section-title').forEach(function(t) {
      if (t.textContent.trim() === "Today's Practice") t.textContent = 'இன்றைய பயிற்சி';
      if (t.textContent.trim() === 'Upgrade to Unlock') t.textContent = 'திறக்க மேம்படுத்துங்கள்';
      if (t.textContent.trim() === 'Practice') t.textContent = 'பயிற்சி';
      if (t.textContent.trim() === 'More Features') t.textContent = 'மேலும் அம்சங்கள்';
    });

    /* Activity cards */
    el.querySelectorAll('.dac-title').forEach(function(t) {
      if (t.textContent === 'Flashcards') t.textContent = 'நினைவட்டைகள்';
      if (t.textContent === 'True / False Quiz') t.textContent = 'சரி / தவறு வினாடி வினா';
    });
    el.querySelectorAll('.dac-sub').forEach(function(t) {
      if (t.textContent === 'Flip cards to learn key facts') t.textContent = 'முக்கிய தகவல்களை அட்டைகளில் படிக்கவும்';
      if (t.textContent === 'Test what you know') t.textContent = 'உங்களுக்கு தெரிந்ததை சோதிக்கவும்';
    });

    /* Act cards (premium) */
    el.querySelectorAll('.act-title').forEach(function(t) {
      if (t.textContent === 'Practice Mode') t.textContent = 'பயிற்சி முறை';
      if (t.textContent === 'Timed Test') t.textContent = 'நேர சோதனை';
      if (t.textContent === 'Grand Test') t.textContent = 'கிராண்ட் சோதனை';
    });
    el.querySelectorAll('.act-sub').forEach(function(t) {
      if (t.textContent === 'Chapter-wise MCQs · Instant feedback') t.textContent = 'அத்தியாயம்-வாரியான MCQ · உடனடி கருத்து';
      if (t.textContent === 'Race the clock · All subjects') t.textContent = 'நேரத்துடன் போட்டி · அனைத்து பாடங்கள்';
      if (t.textContent === 'Full NEET simulation · 180 questions') t.textContent = 'முழு NEET உருவகம் · 180 கேள்விகள்';
    });
    el.querySelectorAll('.act-badge').forEach(function(t) {
      if (t.textContent === 'Unlimited →') t.textContent = 'வரம்பற்றது →';
      if (t.textContent === 'Up to 180 min →') t.textContent = '180 நிமிடம் வரை →';
      if (t.textContent === '3 h 15 m →') t.textContent = '3 மணி 15 நிமிடம் →';
    });

    /* Mini feature cards */
    el.querySelectorAll('.pf-card').forEach(function(c) {
      var t = c.textContent.trim();
      if (t.includes('Flashcards')) c.innerHTML = c.innerHTML.replace('Flashcards', 'நினைவட்டைகள்');
      if (t.includes('True/False')) c.innerHTML = c.innerHTML.replace('True/False', 'சரி/தவறு');
      if (t.includes('Leaderboard')) c.innerHTML = c.innerHTML.replace('Leaderboard', 'தரவரிசை');
      if (t.includes('Dashboard')) c.innerHTML = c.innerHTML.replace('Dashboard', 'டாஷ்போர்டு');
      if (t.includes('Practice')) c.innerHTML = c.innerHTML.replace('Practice', 'பயிற்சி');
      if (t.includes('Grand Test')) c.innerHTML = c.innerHTML.replace('Grand Test', 'கிராண்ட் சோதனை');
      if (t.includes('Timed Test')) c.innerHTML = c.innerHTML.replace('Timed Test', 'நேர சோதனை');
      if (t.includes('Community')) c.innerHTML = c.innerHTML.replace('Community', 'சமூகம்');
    });
  }

  function patchSessionHeading() {
    var h = document.querySelector('.sessions-heading');
    if (h) h.textContent = 'உங்கள் NEET தயாரிப்பு';

    /* session card rec lines */
    document.querySelectorAll('.sc-rec').forEach(function(el) {
      if (el.textContent.startsWith('▶ Start from Chapter')) el.textContent = '▶ அத்தியாயம் 1 முதல் தொடங்கு';
      if (el.textContent.startsWith('▶ Start Practicing')) el.textContent = '▶ பயிற்சி தொடங்குங்கள்';
      if (el.textContent.startsWith('▶ Continue:')) {/* keep chapter name as is */}
    });
  }

  function patchAccuracyLabel() {
    var lbl = document.getElementById('stat-accuracy-lbl');
    if (lbl && lbl.textContent === 'Accuracy') lbl.textContent = 'துல்லியம்';
  }

  /* Re-apply when screens change (MutationObserver for dynamic content) */
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'childList' && m.addedNodes.length) {
        applyTranslations();
        patchHomeFeatures();
        patchSessionHeading();
        patchAccuracyLabel();
      }
    });
  });
  document.addEventListener('DOMContentLoaded', function() {
    observer.observe(document.body, { childList: true, subtree: true });
    // Also re-patch periodically for delayed renders
    setTimeout(function() {
      patchHomeFeatures();
      patchSessionHeading();
      patchAccuracyLabel();
    }, 1500);
  });

})();
