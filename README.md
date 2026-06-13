# KARNAN — NEET UG Practice Platform
## File Structure

```
karnan/
├── index.html          ← Main HTML (screens/templates only, no CSS/JS inline)
├── css/
│   └── styles.css      ← All CSS (design tokens, components, layouts)
└── js/
    ├── config.js       ← Supabase credentials, plan constants, global state vars
    ├── db.js           ← Database queries: storage sync, loadManifest, fetchQuestions
    ├── utils.js        ← Helpers: shuffle, date keys, daily tracking, subjClass
    ├── navigation.js   ← showScreen, goHome, confirmExit, renderStepper
    ├── flow.js         ← openFlow, renderLangOptions, renderSubjectOptions,
    │                     renderChapters, selectChapter, startGrandTest, timedSetup
    ├── quiz.js         ← Flashcard, True/False, Practice quiz, Timed quiz
    ├── leaderboard.js  ← saveToLeaderboard, fetchGlobalLeaderboard, renderLbContent
    ├── dashboard.js    ← renderDashboard, loadWrongAnswers, renderMistakes,
    │                     clearMistakes, practiceWrong
    ├── home.js         ← renderHomeSessions, renderHomeFeatures, renderHomeStats
    ├── auth.js         ← DOMContentLoaded, handleLogin, handleRegister,
    │                     handleLogout, showAuthScreen, selectPlan, confirmPlan
    ├── admin.js        ← loadAdminConfig, saveAdminConfig, saveChapterLimits,
    │                     showAdminPanel, loadSupabaseHomeStats
    └── app.js          ← initApp, updateNavUser, updateUpgradeBanner,
                          showToast, DAILY_TIPS, showDailyTipPopup

```

## Editing Guide

| What you want to change | Edit this file |
|---|---|
| Colors, fonts, spacing | `css/styles.css` |
| Supabase URL / API key | `js/config.js` (top of file) |
| Free tier limits (fallback) | `js/config.js` |
| Database reads/writes | `js/db.js` |
| Quiz question logic | `js/quiz.js` |
| Practice flow / chapter selection | `js/flow.js` |
| Leaderboard display | `js/leaderboard.js` |
| Dashboard & mistake tracker | `js/dashboard.js` |
| Home screen cards | `js/home.js` |
| Login / register / logout | `js/auth.js` |
| Admin panel | `js/admin.js` |
| App startup | `js/app.js` |
| Page layout / HTML screens | `index.html` |

## Script Load Order (index.html)
Scripts must load in this order since each depends on the previous:
1. `config.js` — must be first (defines `db`, state vars)
2. `db.js` — uses `db`, `authUser`
3. `utils.js` — pure helpers
4. `navigation.js` — uses `showScreen`
5. `flow.js` — uses manifest, renderChapters
6. `quiz.js` — uses practiceState, timedState
7. `leaderboard.js` — uses progress, globalLeaderboard
8. `dashboard.js` — uses authUser, db
9. `home.js` — uses manifest, userPlan
10. `auth.js` — entry point (DOMContentLoaded)
11. `admin.js` — uses adminConfig
12. `app.js` — initApp, UI helpers, tips

## Serving
This project must be served from a web server (not opened directly as a file) because it uses ES modules and Supabase. Use any of:
- `npx serve .`
- `python3 -m http.server 8080`
- Deploy to any static host (Netlify, Vercel, GitHub Pages, etc.)
