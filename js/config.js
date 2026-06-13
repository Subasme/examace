
// ── CONFIG ──
// Paste your Supabase project URL and anon key here (Dashboard → Project Settings → API)
const SUPABASE_URL = 'https://vtswgisxeylubvazcefe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lTpVWMDF42ocz84PXirWww_iVcNyeZ-';
let FREE_DAILY_LIMIT = 5;
let FREE_FC_DAILY = 5;
let FREE_TF_DAILY = 5;
const PREMIUM_DAILY_LIMIT = 9999;
const ADMIN_EMAIL = 'karnanphysics2026@gmail.com';
let adminConfig = { free_daily_limit: 5, free_max_test_duration: 30 };
const LETTERS = ['1','2','3','4']; // display labels for options (never A/B/C/D to students)

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── AUTH + PLAN STATE ──
let authUser = null;
let userPlan = 'free';
let DAILY_LIMIT = FREE_DAILY_LIMIT;
let selectedPlan = 'free';

// ── APP STATE ──
let manifest = null;
let appMode = 'practice';
let selection = { language: null, standard: null, subject: null, chapter: null };
window.currentLang  = 'en';   // 'en' = English, 'ta' = Tamil
window.currentClass = '12th'; // '11th' or '12th'
let practiceState = { questions: [], idx: 0, answers: {}, skipDaily: false };
let timedState = { questions: [], idx: 0, answers: {}, marked: {}, secs: 0, totalSecs: 11700, timer: null, start: 0, name: '' };
let timedQCount = 180, timedDuration = 11700;
let localLeaderboard = [], globalLeaderboard = [], currentLbTab = 'global';
let mistakes = [], progress = { total: 0, correct: 0, wrong: 0, time: 0, subjects: {}, chapters: {}, history: [] };
let wrongAnswers = [];
let dailyCache = {};

