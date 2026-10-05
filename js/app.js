const QUIZ_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const WRITING_QUIZ_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const QUIZ_FORMAT_OPTIONS = ["주관식", "객관식"];
const DEFAULT_QUIZ_SIZE = 30;
const DEFAULT_WRITING_QUIZ_SIZE = 5;
const DEFAULT_QUIZ_MINUTES = 10;
const DEFAULT_QUIZ_FORMAT = "주관식";
const MEANING_DISPLAY_OPTIONS = ["표시하기", "표시하지 않기"];
const DEFAULT_MEANING_DISPLAY = "표시하기";
const MIN_QUIZ_MINUTES = 1;
const MAX_QUIZ_MINUTES = 100;
const MAX_QUIZ_HINT_LETTERS = 3;

const DEFAULT_PARTS_OF_SPEECH = ["명사", "동사", "형용사", "부사", "전치사", "관용구", "관계대명사", "접속사", "대명사"];

const SORT_OPTIONS = [
  { id: "alpha", label: "알파벳순" },
  { id: "rate", label: "정답율순" },
  { id: "date", label: "등록일순" },
  { id: "pos", label: "품사순" },
];

const DEFAULT_PAGE_SIZE = 20;

const WORD_GROUPS = ["Intensive Reading Book 단어", "교과서 영어 단어", "VOCA 영어 단어"];
const DEFAULT_WORD_GROUP = WORD_GROUPS[0];
const WRONG_WORD_QUIZ = "오답 단어";
const SENTENCE_GROUPS = ["Intensive Reading Book 영어 문장", "교과서 영어 문장", "VOCA 영어 문장"];
const DEFAULT_SENTENCE_GROUP = SENTENCE_GROUPS[0];
const SENTENCE_GROUP_ALIASES = {
  "Intensive Reading Book 문장": "Intensive Reading Book 영어 문장",
  "Internsive Reading Book 영어 문장": "Intensive Reading Book 영어 문장",
  "교과서 문장": "교과서 영어 문장",
  "VOCA 문장": "VOCA 영어 문장",
};
const SENTENCE_SORT_OPTIONS = [
  { id: "alpha", label: "알파벳순" },
  { id: "rate", label: "정답율순" },
  { id: "date", label: "등록일순" },
];
const WRITING_GROUPS = ["Intensive Reading Book 영어 작문", "교과서 영어 작문", "VOCA 영어 작문"];
const DEFAULT_WRITING_GROUP = WRITING_GROUPS[0];
const WRITING_GROUP_ALIASES = {
  "Intensive Reading Book 문장": "Intensive Reading Book 영어 작문",
  "Internsive Reading Book 영어 작문": "Intensive Reading Book 영어 작문",
  "Internsive Reading Book 문장": "Intensive Reading Book 영어 작문",
  "교과서 문장": "교과서 영어 작문",
  "VOCA 문장": "VOCA 영어 작문",
};
const WRITING_SORT_OPTIONS = [
  { id: "alpha", label: "알파벳순" },
  { id: "rate", label: "정답율순" },
  { id: "date", label: "등록일순" },
];

const HOME_TABS = [
  { id: "word", label: "영어 단어 시험" },
  { id: "sentence", label: "영어 문장 시험" },
  { id: "writing", label: "영어 작문 시험" },
  { id: "settings", label: "환경 설정" },
];
const DEFAULT_HOME_TAB = "word";

const firebaseConfig = {
  apiKey: "AIzaSyAsWSpkljhwHSURAcgWna_H3gSCDyGF01Y",
  authDomain: "myengwordtest.firebaseapp.com",
  databaseURL: "https://myengwordtest-default-rtdb.firebaseio.com",
  projectId: "myengwordtest",
  storageBucket: "myengwordtest.firebasestorage.app",
  messagingSenderId: "333381661944",
  appId: "1:333381661944:web:7cd334e5c8d41d97a5770d",
  measurementId: "G-B0FJRBP8S7",
};

const DB_PATHS = {
  words: "word_list",
  exams: "exam_list",
  settings: "conf-env",
  sentences: "sentence_list",
  sentenceExams: "sentence_exam_list",
  writings: "writing_list",
  writingExams: "writing_exam_list",
};

const app = document.getElementById("app");
const headerMeta = document.getElementById("headerMeta");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

let firebaseDb = null;
let firebaseAuth = null;
let firebaseReady = false;
let currentUser = null;
let words = [];
let records = [];
let sentences = [];
let sentenceRecords = [];
let writings = [];
let writingRecords = [];
let partsOfSpeech = loadPartsOfSpeech();
let quiz = null;
let quizTimerId = null;
let wordSort = "date";
let wordPage = 1;
let wordPageSize = loadPageSize();
let wordGroup = DEFAULT_WORD_GROUP;
let settings = loadSettings();
let selectedWordIds = new Set();
let homeTab = DEFAULT_HOME_TAB;
let sentenceGroup = DEFAULT_SENTENCE_GROUP;
let sentencePage = 1;
let sentencePageSize = loadPageSize();
let sentenceSort = "date";
let selectedSentenceIds = new Set();
let writingGroup = DEFAULT_WRITING_GROUP;
let writingPage = 1;
let writingPageSize = loadPageSize();
let writingSort = "date";
let selectedWritingIds = new Set();

document.getElementById("homeBtn").addEventListener("click", () => {
  if (!currentUser) {
    renderLogin();
    return;
  }
  if (quiz && !confirm("진행 중인 시험을 종료하고 메인 화면으로 돌아갈까요?")) return;
  stopQuizTimer();
  quiz = null;
  renderHome();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOutUser();
});

modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});

document.addEventListener("click", (event) => {
  const panel = document.getElementById("sortPanel");
  if (panel && !event.target.closest(".sort-wrap")) {
    panel.classList.add("hidden");
  }
});

initApp();

function initFirebase() {
  if (!window.firebase) throw new Error("Firebase SDK를 불러오지 못했습니다.");
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  firebaseAuth = firebase.auth();
  firebaseDb = firebase.database();
}

function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item != null);
  return Object.keys(value)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => value[key])
    .filter((item) => item != null);
}

function splitMeanings(meaning) {
  const parts = String(meaning || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    kor_mean1: parts[0] || "",
    kor_mean2: parts.slice(1).join(", "),
  };
}

function joinMeanings(mean1, mean2) {
  return [mean1, mean2]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");
}

function wordRate(word) {
  const count = Number(word.count) || 0;
  const ansCount = Number(word.ansCount) || 0;
  return count === 0 ? 0 : Math.round((ansCount / count) * 100);
}

function toFirebaseWord(word) {
  const { kor_mean1, kor_mean2 } = splitMeanings(word.meaning);
  return {
    Group: word.group,
    eng_word: word.english,
    word_class: word.pos || "명사",
    kor_mean1,
    kor_mean2,
    date: word.createdAt || Date.now(),
    rate: wordRate(word),
    count: Number(word.count) || 0,
    ans_count: Number(word.ansCount) || 0,
  };
}

function fromFirebaseWord(item) {
  return {
    id: crypto.randomUUID(),
    english: String(item.eng_word || "").trim(),
    meaning: joinMeanings(item.kor_mean1, item.kor_mean2),
    pos: item.word_class || "명사",
    group: WORD_GROUPS.includes(item.Group) ? item.Group : DEFAULT_WORD_GROUP,
    createdAt: Number(item.date) || Date.now(),
    rate: Number(item.rate) || 0,
    count: Number(item.count) || 0,
    ansCount: Number(item.ans_count) || 0,
  };
}

function isStoredCorrect(value) {
  return value === true || value === "정답" || value === "correct";
}

function toFirebaseExam(record) {
  return {
    test_date: record.date,
    test_duration: Number(record.duration) || 0,
    word_group: record.group || DEFAULT_WORD_GROUP,
    test_items: (record.answers || []).map((item) => ({
      eng_word: item.english,
      word_class: item.pos || "",
      korean_mean: item.meaning,
      correct: item.correct ? "정답" : "오답",
      answer: item.userAnswer || "",
      word_group: WORD_GROUPS.includes(item.group) ? item.group : record.group || DEFAULT_WORD_GROUP,
    })),
  };
}

function fromFirebaseExam(item) {
  const answers = toList(item.test_items).map((entry) => ({
    english: entry.eng_word || "",
    pos: entry.word_class || "",
    meaning: entry.korean_mean || "",
    userAnswer: entry.answer || "",
    correct: isStoredCorrect(entry.correct),
    group: WORD_GROUPS.includes(entry.word_group)
      ? entry.word_group
      : WORD_GROUPS.includes(entry.Group)
        ? entry.Group
        : "",
  }));
  return {
    id: crypto.randomUUID(),
    date: Number(item.test_date) || Date.now(),
    duration: Number(item.test_duration) || 0,
    total: answers.length,
    correct: answers.filter((answer) => answer.correct).length,
    group: isQuizCategory(item.word_group) ? item.word_group : DEFAULT_WORD_GROUP,
    answers,
  };
}

function defaultQuizEnv() {
  return {
    quizSize: DEFAULT_QUIZ_SIZE,
    quizMinutes: DEFAULT_QUIZ_MINUTES,
    quizFormat: DEFAULT_QUIZ_FORMAT,
  };
}

function defaultSentenceQuizEnv() {
  return {
    ...defaultQuizEnv(),
    meaningDisplay: DEFAULT_MEANING_DISPLAY,
  };
}

function defaultWritingQuizEnv() {
  return {
    quizSize: DEFAULT_WRITING_QUIZ_SIZE,
    quizMinutes: DEFAULT_QUIZ_MINUTES,
  };
}

function parseMeaningDisplay(value) {
  return MEANING_DISPLAY_OPTIONS.includes(value) ? value : DEFAULT_MEANING_DISPLAY;
}

function parseQuizEnv(raw, keys) {
  const defaults = defaultQuizEnv();
  if (!raw) return defaults;
  const quizSize = QUIZ_SIZE_OPTIONS.includes(Number(raw[keys.count]))
    ? Number(raw[keys.count])
    : defaults.quizSize;
  const minutes = Number(raw[keys.minutes]);
  const quizMinutes =
    Number.isInteger(minutes) && minutes >= MIN_QUIZ_MINUTES && minutes <= MAX_QUIZ_MINUTES
      ? minutes
      : defaults.quizMinutes;
  const quizFormat = QUIZ_FORMAT_OPTIONS.includes(raw[keys.format]) ? raw[keys.format] : defaults.quizFormat;
  return { quizSize, quizMinutes, quizFormat };
}

function parseMinutes(raw, fallback) {
  const minutes = Number(raw);
  return Number.isInteger(minutes) && minutes >= MIN_QUIZ_MINUTES && minutes <= MAX_QUIZ_MINUTES
    ? minutes
    : fallback;
}

function parseWritingQuizEnv(raw) {
  const defaults = defaultWritingQuizEnv();
  if (!raw) return defaults;
  const quizSize = WRITING_QUIZ_SIZE_OPTIONS.includes(Number(raw.writing_test_item_count))
    ? Number(raw.writing_test_item_count)
    : defaults.quizSize;
  return {
    quizSize,
    quizMinutes: parseMinutes(raw.writing_test_time_duration, defaults.quizMinutes),
  };
}

function toFirebaseSentence(item) {
  return {
    Group: item.group,
    eng_sentence: item.english,
    kor_mean: item.meaning,
    answer: item.answer,
    date: item.createdAt || Date.now(),
    rate: wordRate(item),
    count: Number(item.count) || 0,
    ans_count: Number(item.ansCount) || 0,
  };
}

function resolveSentenceGroup(group) {
  const raw = String(group || "").trim();
  if (SENTENCE_GROUPS.includes(raw)) return raw;
  return SENTENCE_GROUP_ALIASES[raw] || DEFAULT_SENTENCE_GROUP;
}

function resolveWritingGroup(group) {
  const raw = String(group || "").trim();
  if (WRITING_GROUPS.includes(raw)) return raw;
  return WRITING_GROUP_ALIASES[raw] || DEFAULT_WRITING_GROUP;
}

function toFirebaseWriting(item) {
  return {
    id: item.id,
    Group: item.group,
    kor_sentence: item.korean,
    eng_writing: item.english,
    ai_writing: item.aiResult || "",
    date: item.createdAt || Date.now(),
    rate: wordRate(item),
    count: Number(item.count) || 0,
    ans_count: Number(item.ansCount) || 0,
  };
}

function fromFirebaseWriting(item) {
  return {
    id: String(item.id || "").trim() || crypto.randomUUID(),
    korean: String(item.kor_sentence || item.korean || "").trim(),
    english: String(item.eng_writing || item.english || "").trim(),
    aiResult: String(item.ai_writing || item.aiResult || "").trim(),
    group: resolveWritingGroup(item.Group || item.group),
    createdAt: Number(item.date) || Date.now(),
    rate: Number(item.rate) || 0,
    count: Number(item.count) || 0,
    ansCount: Number(item.ans_count) || 0,
  };
}

function fromFirebaseSentence(item) {
  return {
    id: crypto.randomUUID(),
    english: String(item.eng_sentence || item.english || "").trim(),
    meaning: String(item.kor_mean || item.meaning || "").trim(),
    answer: String(item.answer || "").trim(),
    group: resolveSentenceGroup(item.Group || item.group),
    createdAt: Number(item.date) || Date.now(),
    rate: Number(item.rate) || 0,
    count: Number(item.count) || 0,
    ansCount: Number(item.ans_count) || 0,
  };
}

function toFirebaseSettings(current) {
  const word = current.word || defaultQuizEnv();
  const sentence = current.sentence || defaultSentenceQuizEnv();
  const writing = current.writing || defaultWritingQuizEnv();
  return {
    test_item_count: word.quizSize,
    test_time_duration: word.quizMinutes,
    test_type: word.quizFormat,
    sentence_test_item_count: sentence.quizSize,
    sentence_test_time_duration: sentence.quizMinutes,
    sentence_test_type: sentence.quizFormat,
    sentence_test_meaning_display: parseMeaningDisplay(sentence.meaningDisplay),
    writing_test_item_count: writing.quizSize,
    writing_test_time_duration: writing.quizMinutes,
  };
}

function fromFirebaseSettings(raw) {
  return {
    word: parseQuizEnv(raw, {
      count: "test_item_count",
      minutes: "test_time_duration",
      format: "test_type",
    }),
    sentence: {
      ...parseQuizEnv(raw, {
        count: "sentence_test_item_count",
        minutes: "sentence_test_time_duration",
        format: "sentence_test_type",
      }),
      meaningDisplay: parseMeaningDisplay(raw?.sentence_test_meaning_display),
    },
    writing: parseWritingQuizEnv(raw),
  };
}

function wordQuizSettings() {
  return settings.word || defaultQuizEnv();
}

function sentenceQuizSettings() {
  const env = settings.sentence || defaultSentenceQuizEnv();
  return {
    ...defaultSentenceQuizEnv(),
    ...env,
    meaningDisplay: parseMeaningDisplay(env.meaningDisplay),
  };
}

function writingQuizSettings() {
  const env = settings.writing || defaultWritingQuizEnv();
  const defaults = defaultWritingQuizEnv();
  return {
    quizSize: WRITING_QUIZ_SIZE_OPTIONS.includes(Number(env.quizSize)) ? Number(env.quizSize) : defaults.quizSize,
    quizMinutes: parseMinutes(env.quizMinutes, defaults.quizMinutes),
  };
}

function toFirebaseSentenceExam(record) {
  return {
    test_date: record.date,
    test_duration: Number(record.duration) || 0,
    sentence_group: record.group || DEFAULT_SENTENCE_GROUP,
    test_items: (record.answers || []).map((item) => ({
      eng_sentence: item.english,
      kor_mean: item.meaning,
      answer: item.answer || "",
      correct: item.correct ? "정답" : "오답",
      user_answer: item.userAnswer || "",
      sentence_group: resolveSentenceGroup(item.group || record.group),
    })),
  };
}

function fromFirebaseSentenceExam(item) {
  const answers = toList(item.test_items).map((entry) => ({
    english: entry.eng_sentence || "",
    meaning: entry.kor_mean || "",
    answer: entry.answer || "",
    userAnswer: entry.user_answer || entry.answer_input || "",
    correct: isStoredCorrect(entry.correct),
    group: resolveSentenceGroup(entry.sentence_group || item.sentence_group),
  }));
  return {
    id: crypto.randomUUID(),
    date: Number(item.test_date) || Date.now(),
    duration: Number(item.test_duration) || 0,
    total: answers.length,
    correct: answers.filter((answer) => answer.correct).length,
    group: resolveSentenceGroup(item.sentence_group),
    answers,
    kind: "sentence",
  };
}

function toFirebaseWritingExam(record) {
  return {
    test_date: record.date,
    test_duration: Number(record.duration) || 0,
    writing_group: record.group || DEFAULT_WRITING_GROUP,
    test_items: (record.answers || []).map((item) => {
      const grade = normalizeWritingGrade(item.grade) || writingGradeFromAnswer(item);
      return {
        writing_id: item.writingId || "",
        kor_sentence: item.korean || "",
        eng_writing: item.english || "",
        ai_writing: item.aiResult || "",
        user_answer: item.userAnswer || "",
        correct: item.correct ? "정답" : "오답",
        verdict: item.verdict || "",
        total_score: Number(item.totalScore) || 0,
        writing_group: resolveWritingGroup(item.group || record.group),
        grade_detail: grade,
      };
    }),
  };
}

function fromFirebaseWritingExam(item) {
  const answers = toList(item.test_items).map((entry) => {
    const grade = normalizeWritingGrade(entry.grade_detail);
    return {
      writingId: entry.writing_id || "",
      korean: entry.kor_sentence || "",
      english: entry.eng_writing || "",
      aiResult: entry.ai_writing || "",
      userAnswer: entry.user_answer || "",
      correct: isStoredCorrect(entry.correct),
      verdict: entry.verdict || grade?.verdict || "",
      totalScore: Number(entry.total_score ?? grade?.total_score) || 0,
      meaningScore: Number(grade?.meaning_score) || 0,
      grammarScore: Number(grade?.grammar_score) || 0,
      naturalnessScore: Number(grade?.naturalness_score) || 0,
      feedback: grade?.feedback_ko || "",
      errors: grade?.errors || [],
      correctedAnswer: grade?.corrected_answer || "",
      referenceTranslation: grade?.reference_translation || "",
      grade,
      group: resolveWritingGroup(entry.writing_group || item.writing_group),
    };
  });
  return {
    id: crypto.randomUUID(),
    date: Number(item.test_date) || Date.now(),
    duration: Number(item.test_duration) || 0,
    total: answers.length,
    correct: answers.filter((answer) => answer.correct).length,
    group: resolveWritingGroup(item.writing_group),
    answers,
    kind: "writing",
  };
}

async function dbGet(path) {
  const snap = await firebaseDb.ref(path).get();
  return snap.exists() ? snap.val() : null;
}

async function dbSet(path, value) {
  await firebaseDb.ref(path).set(value);
}

function isAuthenticated() {
  return Boolean(firebaseReady && currentUser && firebaseAuth?.currentUser);
}

async function saveWordList() {
  if (!isAuthenticated()) return;
  await dbSet(DB_PATHS.words, words.map(toFirebaseWord));
}

async function saveExamList() {
  if (!isAuthenticated()) return;
  await dbSet(DB_PATHS.exams, records.map(toFirebaseExam));
}

async function saveSettingsToFirebase() {
  if (!isAuthenticated()) return;
  await dbSet(DB_PATHS.settings, toFirebaseSettings(settings));
}

async function persistWords() {
  try {
    await saveWordList();
  } catch (error) {
    console.error(error);
    alert("단어 목록을 Firebase에 저장하지 못했습니다.");
  }
}

async function saveSentenceList() {
  if (!isAuthenticated()) return;
  await dbSet(DB_PATHS.sentences, sentences.map(toFirebaseSentence));
}

async function persistSentences() {
  try {
    await saveSentenceList();
  } catch (error) {
    console.error(error);
    alert("문장 목록을 Firebase에 저장하지 못했습니다.");
  }
}

async function saveWritingList() {
  if (!isAuthenticated()) return;
  await dbSet(DB_PATHS.writings, writings.map(toFirebaseWriting));
}

async function persistWritings() {
  try {
    await saveWritingList();
  } catch (error) {
    console.error(error);
    alert("작문 문장 목록을 Firebase에 저장하지 못했습니다.");
  }
}

async function saveWritingExamList() {
  if (!isAuthenticated()) return;
  await dbSet(DB_PATHS.writingExams, writingRecords.map(toFirebaseWritingExam));
}

async function persistWritingsAndExams() {
  try {
    await Promise.all([saveWritingList(), saveWritingExamList()]);
  } catch (error) {
    console.error(error);
    alert("작문 시험 기록을 Firebase에 저장하지 못했습니다.");
  }
}

async function saveSentenceExamList() {
  if (!isAuthenticated()) return;
  await dbSet(DB_PATHS.sentenceExams, sentenceRecords.map(toFirebaseSentenceExam));
}

async function persistSentencesAndExams() {
  try {
    await Promise.all([saveSentenceList(), saveSentenceExamList()]);
  } catch (error) {
    console.error(error);
    alert("문장 시험 기록을 Firebase에 저장하지 못했습니다.");
  }
}

async function persistExamsAndWords() {
  try {
    await Promise.all([saveWordList(), saveExamList()]);
  } catch (error) {
    console.error(error);
    alert("시험 기록을 Firebase에 저장하지 못했습니다.");
  }
}

function collectPartsOfSpeech() {
  for (const word of words) {
    if (word.pos) resolvePos(word.pos);
  }
}

function renderLoading(message) {
  updateHeader(message);
  app.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

async function loadFromFirebase() {
  const [rawWords, rawExams, rawSettings, rawSentences, rawSentenceExams, rawWritings, rawWritingExams] = await Promise.all([
    dbGet(DB_PATHS.words),
    dbGet(DB_PATHS.exams),
    dbGet(DB_PATHS.settings),
    dbGet(DB_PATHS.sentences),
    dbGet(DB_PATHS.sentenceExams),
    dbGet(DB_PATHS.writings),
    dbGet(DB_PATHS.writingExams),
  ]);
  words = toList(rawWords)
    .map(fromFirebaseWord)
    .filter((word) => word.english);
  records = toList(rawExams).map(fromFirebaseExam);
  settings = fromFirebaseSettings(rawSettings);
  sentences = toList(rawSentences)
    .map(fromFirebaseSentence)
    .filter((item) => item.english && item.meaning && item.answer);
  sentenceRecords = toList(rawSentenceExams).map(fromFirebaseSentenceExam);
  const writingsNeedIds = toList(rawWritings).some((item) => !String(item?.id || "").trim());
  writings = toList(rawWritings)
    .map(fromFirebaseWriting)
    .filter((item) => item.korean && item.english);
  writingRecords = toList(rawWritingExams).map(fromFirebaseWritingExam);
  collectPartsOfSpeech();
  if (writingsNeedIds && writings.length) await persistWritings();
  if (!rawSettings) await saveSettingsToFirebase();
}

function resetSessionData() {
  firebaseReady = false;
  words = [];
  records = [];
  sentences = [];
  sentenceRecords = [];
  writings = [];
  writingRecords = [];
  settings = loadSettings();
  selectedWordIds = new Set();
  selectedSentenceIds = new Set();
  selectedWritingIds = new Set();
  partsOfSpeech = loadPartsOfSpeech();
  stopQuizTimer();
  quiz = null;
  homeTab = DEFAULT_HOME_TAB;
}

function updateAuthBar() {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.classList.toggle("hidden", !currentUser);
}

function authErrorMessage(error) {
  const code = error?.code || "";
  if (code === "auth/invalid-email") return "이메일 형식이 올바르지 않습니다.";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (code === "auth/email-already-in-use") return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (code === "auth/weak-password") return "비밀번호는 6자 이상이어야 합니다.";
  if (code === "auth/popup-closed-by-user") return "Google 로그인이 취소되었습니다.";
  if (code === "auth/popup-blocked") return "팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해 주세요.";
  if (code === "auth/network-request-failed") return "네트워크 연결을 확인해 주세요.";
  if (code === "auth/too-many-requests") return "시도 횟수가 많습니다. 잠시 후 다시 시도해 주세요.";
  return error?.message || "로그인에 실패했습니다.";
}

function showLoginError(message) {
  const box = document.getElementById("loginError");
  if (!box) return;
  box.textContent = message;
  box.classList.toggle("hidden", !message);
}

function setLoginBusy(busy) {
  document.querySelectorAll("#loginForm button, #googleLoginBtn").forEach((button) => {
    button.disabled = busy;
  });
}

async function signInWithEmail(email, password) {
  await firebaseAuth.signInWithEmailAndPassword(email, password);
}

async function registerWithEmail(email, password) {
  await firebaseAuth.createUserWithEmailAndPassword(email, password);
}

async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await firebaseAuth.signInWithPopup(provider);
  } catch (error) {
    if (error.code === "auth/popup-blocked") {
      await firebaseAuth.signInWithRedirect(provider);
      return;
    }
    throw error;
  }
}

async function signOutUser() {
  if (quiz && !confirm("진행 중인 시험을 종료하고 로그아웃할까요?")) return;
  try {
    await firebaseAuth.signOut();
  } catch (error) {
    console.error(error);
    alert("로그아웃하지 못했습니다.");
  }
}

function renderLogin() {
  updateHeader("로그인이 필요합니다");
  app.innerHTML = `
    <section class="hero">
      <h1>로그인 후<br />단어를 관리하세요</h1>
      <p>이메일과 비밀번호 또는 Google 계정으로 Firebase에 인증한 뒤 데이터를 불러옵니다.</p>
    </section>
    <form class="settings-form login-form" id="loginForm">
      <div>
        <label for="loginEmail">이메일</label>
        <input id="loginEmail" name="email" type="email" autocomplete="email" required />
      </div>
      <div>
        <label for="loginPassword">비밀번호</label>
        <input id="loginPassword" name="password" type="password" autocomplete="current-password" minlength="6" required />
      </div>
      <p class="login-error hidden" id="loginError"></p>
      <div class="login-actions">
        <button type="submit" class="btn" data-auth="signin">로그인</button>
        <button type="submit" class="btn secondary" data-auth="signup">회원가입</button>
      </div>
      <div class="import-divider">또는</div>
      <button type="button" class="btn secondary google-login" id="googleLoginBtn">Google로 로그인</button>
    </form>
  `;

  const form = document.getElementById("loginForm");
  let authMode = "signin";
  form.querySelectorAll("[data-auth]").forEach((button) => {
    button.addEventListener("click", () => {
      authMode = button.dataset.auth;
    });
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    showLoginError("");
    setLoginBusy(true);
    try {
      if (authMode === "signup") await registerWithEmail(email, password);
      else await signInWithEmail(email, password);
    } catch (error) {
      console.error(error);
      showLoginError(authErrorMessage(error));
      setLoginBusy(false);
    }
  });
  document.getElementById("googleLoginBtn").addEventListener("click", async () => {
    showLoginError("");
    setLoginBusy(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      showLoginError(authErrorMessage(error));
      setLoginBusy(false);
    }
  });
}

async function initApp() {
  renderLoading("인증 상태를 확인하는 중입니다.");
  try {
    initFirebase();
    await firebaseAuth.getRedirectResult();
  } catch (error) {
    console.error(error);
    if (error.code && error.code !== "auth/no-auth-event") {
      alert(authErrorMessage(error));
    }
  }

  firebaseAuth.onAuthStateChanged(async (user) => {
    currentUser = user;
    updateAuthBar();
    if (!user) {
      resetSessionData();
      renderLogin();
      return;
    }

    renderLoading("Firebase에서 데이터를 불러오는 중입니다.");
    try {
      firebaseReady = true;
      await loadFromFirebase();
      renderHome();
    } catch (error) {
      console.error(error);
      firebaseReady = false;
      words = [];
      records = [];
      sentences = [];
      sentenceRecords = [];
      writings = [];
      writingRecords = [];
      settings = loadSettings();
      alert("Firebase 데이터를 불러오지 못했습니다. 로그인 상태이지만 데이터를 읽지 못했습니다.");
      renderHome();
    }
  });
}

function isQuizCategory(group) {
  return WORD_GROUPS.includes(group) || group === WRONG_WORD_QUIZ;
}

function wordsInGroup(group) {
  return words.filter((word) => word.group === group);
}

function answerGroup(answer, record) {
  if (WORD_GROUPS.includes(answer?.group)) return answer.group;
  if (WORD_GROUPS.includes(record?.group)) return record.group;
  const english = String(answer?.english || "").toLowerCase();
  const match = words.find((word) => word.english.toLowerCase() === english);
  return match?.group || DEFAULT_WORD_GROUP;
}

function wordsEverWrong() {
  return collectWrongWords().map((item) => {
    const match = words.find(
      (word) =>
        word.english.toLowerCase() === item.english.toLowerCase() && word.group === item.group,
    );
    if (match) return match;
    return createWord(item.english, item.meaning, item.pos, item.group);
  });
}

function groupOptions(selected) {
  return WORD_GROUPS.map(
    (group) => `<option value="${escapeHtml(group)}" ${group === selected ? "selected" : ""}>${escapeHtml(group)}</option>`,
  ).join("");
}

function sentenceGroupOptions(selected) {
  return SENTENCE_GROUPS.map(
    (group) => `<option value="${escapeHtml(group)}" ${group === selected ? "selected" : ""}>${escapeHtml(group)}</option>`,
  ).join("");
}

function writingGroupOptions(selected) {
  return WRITING_GROUPS.map(
    (group) => `<option value="${escapeHtml(group)}" ${group === selected ? "selected" : ""}>${escapeHtml(group)}</option>`,
  ).join("");
}

function writingsInGroup(group) {
  return writings.filter((item) => item.group === group);
}

function createWriting(korean, english, group) {
  return {
    id: crypto.randomUUID(),
    korean: korean.trim(),
    english: english.trim(),
    aiResult: "",
    group: resolveWritingGroup(group),
    createdAt: Date.now(),
    rate: 0,
    count: 0,
    ansCount: 0,
  };
}

function currentWritingSortLabel() {
  return WRITING_SORT_OPTIONS.find((option) => option.id === writingSort)?.label || "등록일순";
}

function sortWritings(list) {
  return [...list].sort((a, b) => {
    if (writingSort === "alpha") {
      return a.korean.localeCompare(b.korean, "ko", { sensitivity: "base" });
    }
    if (writingSort === "rate") {
      const aAcc = getWordAccuracy(a);
      const bAcc = getWordAccuracy(b);
      const aRate = aAcc.asked === 0 ? -1 : aAcc.correct / aAcc.asked;
      const bRate = bAcc.asked === 0 ? -1 : bAcc.correct / bAcc.asked;
      if (bRate !== aRate) return bRate - aRate;
      return bAcc.asked - aAcc.asked;
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function sentencesInGroup(group) {
  return sentences.filter((item) => item.group === group);
}

function createSentence(english, meaning, answer, group) {
  return {
    id: crypto.randomUUID(),
    english: english.trim(),
    meaning: meaning.trim(),
    answer: answer.trim(),
    group: resolveSentenceGroup(group),
    createdAt: Date.now(),
    rate: 0,
    count: 0,
    ansCount: 0,
  };
}

function sentenceBracketAnswers(english) {
  return [...String(english || "").matchAll(/\[([^\]]+)\]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function currentSentenceSortLabel() {
  return SENTENCE_SORT_OPTIONS.find((option) => option.id === sentenceSort)?.label || "등록일순";
}

function sortSentences(list) {
  return [...list].sort((a, b) => {
    if (sentenceSort === "alpha") {
      return a.english.localeCompare(b.english, "en", { sensitivity: "base" });
    }
    if (sentenceSort === "rate") {
      const aAcc = getWordAccuracy(a);
      const bAcc = getWordAccuracy(b);
      const aRate = aAcc.asked === 0 ? -1 : aAcc.correct / aAcc.asked;
      const bRate = bAcc.asked === 0 ? -1 : bAcc.correct / bAcc.asked;
      if (bRate !== aRate) return bRate - aRate;
      return bAcc.asked - aAcc.asked;
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function loadSettings() {
  return {
    word: defaultQuizEnv(),
    sentence: defaultSentenceQuizEnv(),
    writing: defaultWritingQuizEnv(),
  };
}

function loadPageSize() {
  return DEFAULT_PAGE_SIZE;
}

function createWord(english, meaning, pos, group) {
  return {
    id: crypto.randomUUID(),
    english: english.trim(),
    meaning: meaning.trim(),
    pos: pos || "명사",
    group: WORD_GROUPS.includes(group) ? group : DEFAULT_WORD_GROUP,
    createdAt: Date.now(),
    rate: 0,
    count: 0,
    ansCount: 0,
  };
}

function loadPartsOfSpeech() {
  return [...DEFAULT_PARTS_OF_SPEECH];
}

function resolvePos(raw) {
  const pos = String(raw || "")
    .replaceAll("(", "")
    .replaceAll(")", "")
    .trim();
  if (!pos) return "";

  const matched = partsOfSpeech.find((item) => item === pos || item.toLowerCase() === pos.toLowerCase());
  if (matched) return matched;

  partsOfSpeech.push(pos);
  return pos;
}

function posOptions(selected) {
  return partsOfSpeech.map(
    (pos) => `<option value="${escapeHtml(pos)}" ${pos === selected ? "selected" : ""}>${escapeHtml(pos)}</option>`,
  ).join("");
}

function getWordAccuracy(word) {
  return {
    asked: Number(word.count) || 0,
    correct: Number(word.ansCount) || 0,
  };
}

function currentSortLabel() {
  return SORT_OPTIONS.find((option) => option.id === wordSort)?.label || "등록일순";
}

function sortWords(list) {
  return [...list].sort((a, b) => {
    if (wordSort === "alpha") {
      return a.english.localeCompare(b.english, "en", { sensitivity: "base" });
    }

    if (wordSort === "rate") {
      const aAcc = getWordAccuracy(a);
      const bAcc = getWordAccuracy(b);
      const aRate = aAcc.asked === 0 ? -1 : aAcc.correct / aAcc.asked;
      const bRate = bAcc.asked === 0 ? -1 : bAcc.correct / bAcc.asked;
      if (bRate !== aRate) return bRate - aRate;
      return bAcc.asked - aAcc.asked;
    }

    if (wordSort === "pos") {
      const posCmp = (a.pos || "").localeCompare(b.pos || "", "ko");
      if (posCmp !== 0) return posCmp;
      return a.english.localeCompare(b.english, "en", { sensitivity: "base" });
    }

    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function formatAccuracy(word) {
  const { asked, correct } = getWordAccuracy(word);
  if (asked === 0) return `<span class="rate-empty">미출제</span>`;
  const percent = Math.round((correct / asked) * 100);
  return `<span class="rate">${percent}% <span class="rate-frac">(${correct}/${asked})</span></span>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function normalizeAnswer(value) {
  return value
    .toLowerCase()
    .replaceAll(" ", "")
    .replaceAll(",", "")
    .replaceAll(".", "")
    .replaceAll("/", "");
}

function isCorrectAnswer(userAnswer, meaning) {
  const answers = meaning
    .split(/[,/]/)
    .map((item) => normalizeAnswer(item))
    .filter(Boolean);
  const input = normalizeAnswer(userAnswer);
  return answers.includes(input);
}

function isCorrectEnglish(userAnswer, english) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(english);
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function updateHeader(text) {
  headerMeta.textContent = text;
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modalTitle.textContent = "";
  modalBody.innerHTML = "";
}

function openModal(title, bodyHtml) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalBackdrop.classList.remove("hidden");
}

function homeTabsHtml() {
  return `
    <nav class="home-tabs" aria-label="메인 메뉴">
      ${HOME_TABS.map(
        (tab) => `
          <button
            type="button"
            class="home-tab${homeTab === tab.id ? " is-active" : ""}"
            data-home-tab="${tab.id}"
            ${homeTab === tab.id ? 'aria-current="page"' : ""}
          >
            ${tab.label}
          </button>
        `,
      ).join("")}
    </nav>
  `;
}

function bindHomeTabs() {
  app.querySelectorAll("[data-home-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.homeTab === homeTab) return;
      homeTab = button.dataset.homeTab;
      renderHome();
    });
  });
}

function renderHome() {
  if (homeTab === "sentence") {
    renderSentenceHome();
    return;
  }
  if (homeTab === "writing") {
    renderWritingHome();
    return;
  }
  if (homeTab === "settings") {
    renderSettings();
    return;
  }
  renderWordHome();
}

function renderWordHome() {
  homeTab = "word";
  const latest = records[0];
  updateHeader(`단어 ${words.length}개 · 기록 ${records.length}건`);
  app.innerHTML = `
    ${homeTabsHtml()}
    <section class="hero">
      <h1>오늘 외울 단어를<br />시험으로 점검하세요</h1>
      <p>단어의 뜻을 보고 영어 단어를 입력한 뒤, 결과표와 기록을 바로 확인할 수 있습니다.</p>
    </section>
    <div class="menu-grid">
      <button class="menu-card" data-view="quiz">
        <span class="menu-index">01</span>
        <h2>단어 시험 시작</h2>
        <p>단어 그룹을 고른 뒤 ${wordQuizSettings().quizSize}문항 · ${wordQuizSettings().quizFormat} 시험을 시작합니다.</p>
      </button>
      <button class="menu-card" data-view="words">
        <span class="menu-index">02</span>
        <h2>단어 관리</h2>
        <p>단어 목록을 추가, 수정, 삭제합니다.</p>
      </button>
      <button class="menu-card" data-view="records">
        <span class="menu-index">03</span>
        <h2>단어 시험 기록 조회</h2>
        <p>이전 시험 점수와 오답을 다시 봅니다.</p>
      </button>
    </div>
    <div class="stats">
      <div class="stat-card">
        <strong>${words.length}</strong>
        <span>등록된 단어</span>
      </div>
      <div class="stat-card">
        <strong>${records.length}</strong>
        <span>시험 기록</span>
      </div>
      <div class="stat-card">
        <strong>${latest ? `${latest.correct}/${latest.total}` : "-"}</strong>
        <span>최근 시험 점수</span>
      </div>
    </div>
  `;

  bindHomeTabs();
  app.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      if (view === "quiz") renderQuizGroupPicker();
      if (view === "words") renderWords();
      if (view === "records") renderRecords();
    });
  });
}

function renderSentenceHome() {
  homeTab = "sentence";
  const sentenceEnv = sentenceQuizSettings();
  const latest = sentenceRecords[0];
  updateHeader(`문장 ${sentences.length}개 · 기록 ${sentenceRecords.length}건`);
  app.innerHTML = `
    ${homeTabsHtml()}
    <section class="hero">
      <h1>오늘 외울 문장을<br />시험으로 점검하세요</h1>
      <p>영어 문장을 등록한 뒤 시험으로 확인하고, 결과표와 기록을 바로 볼 수 있습니다.</p>
    </section>
    <div class="menu-grid">
      <button class="menu-card" data-view="sentence-quiz">
        <span class="menu-index">01</span>
        <h2>문장 시험 시작</h2>
        <p>${sentenceEnv.quizSize}문항 · ${sentenceEnv.quizFormat} 문장 시험을 시작합니다.</p>
      </button>
      <button class="menu-card" data-view="sentence-manage">
        <span class="menu-index">02</span>
        <h2>문장 관리</h2>
        <p>문장 목록을 추가, 수정, 삭제합니다.</p>
      </button>
      <button class="menu-card" data-view="sentence-records">
        <span class="menu-index">03</span>
        <h2>문장 시험 기록 조회</h2>
        <p>이전 문장 시험 점수와 오답을 다시 봅니다.</p>
      </button>
    </div>
    <div class="stats">
      <div class="stat-card">
        <strong>${sentences.length}</strong>
        <span>등록된 문장</span>
      </div>
      <div class="stat-card">
        <strong>${sentenceRecords.length}</strong>
        <span>시험 기록</span>
      </div>
      <div class="stat-card">
        <strong>${latest ? `${latest.correct}/${latest.total}` : "-"}</strong>
        <span>최근 시험 점수</span>
      </div>
    </div>
  `;

  bindHomeTabs();
  app.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => renderSentenceView(button.dataset.view));
  });
}

function renderWritingHome() {
  homeTab = "writing";
  const writingEnv = writingQuizSettings();
  const latest = writingRecords[0];
  updateHeader(`작문 ${writings.length}개 · 기록 ${writingRecords.length}건`);
  app.innerHTML = `
    ${homeTabsHtml()}
    <section class="hero">
      <h1>오늘 외울 작문 문장을<br />시험으로 점검하세요</h1>
      <p>작문 문장을 등록한 뒤 시험으로 확인하고, 결과표와 기록을 바로 볼 수 있습니다.</p>
    </section>
    <div class="menu-grid">
      <button class="menu-card" data-view="writing-quiz">
        <span class="menu-index">01</span>
        <h2>영어 작문 시험 시작</h2>
        <p>작문 그룹을 고른 뒤 ${writingEnv.quizSize}문항 · ${writingEnv.quizMinutes}분 작문 시험을 시작합니다.</p>
      </button>
      <button class="menu-card" data-view="writing-manage">
        <span class="menu-index">02</span>
        <h2>영어 작문 문장 관리</h2>
        <p>작문 문장 목록을 추가, 수정, 삭제합니다.</p>
      </button>
      <button class="menu-card" data-view="writing-records">
        <span class="menu-index">03</span>
        <h2>작문 시험 기록 조회</h2>
        <p>이전 작문 시험 점수와 오답을 다시 봅니다.</p>
      </button>
    </div>
    <div class="stats">
      <div class="stat-card">
        <strong>${writings.length}</strong>
        <span>등록된 문장</span>
      </div>
      <div class="stat-card">
        <strong>${writingRecords.length}</strong>
        <span>시험 기록</span>
      </div>
      <div class="stat-card">
        <strong>${latest ? `${latest.correct}/${latest.total}` : "-"}</strong>
        <span>최근 시험 점수</span>
      </div>
    </div>
  `;

  bindHomeTabs();
  app.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => renderWritingView(button.dataset.view));
  });
}

function renderWritingView(view) {
  homeTab = "writing";
  if (view === "writing-manage") {
    renderWritings();
    return;
  }
  if (view === "writing-quiz") {
    renderWritingQuizGroupPicker();
    return;
  }
  renderWritingRecords();
}

function renderWritingPlaceholder(title, message) {
  homeTab = "writing";
  updateHeader(title);
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">${escapeHtml(title)}</h1>
      <button class="btn secondary" id="backHome">홈으로</button>
    </div>
    <div class="empty-state">${escapeHtml(message)}</div>
  `;
  document.getElementById("backHome").addEventListener("click", renderHome);
}

function renderWritingQuizGroupPicker() {
  homeTab = "writing";
  updateHeader("영어 작문 시험 시작 · 그룹 선택");
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">영어 작문 시험 시작</h1>
      <button class="btn secondary" id="backHome">홈으로</button>
    </div>
    <p class="lede">시험을 볼 작문 그룹을 선택하세요.</p>
    <div class="group-picker">
      ${WRITING_GROUPS.map((group) => {
        const count = writingsInGroup(group).length;
        return `
          <button type="button" class="menu-card" data-group="${escapeHtml(group)}" ${count === 0 ? "disabled" : ""}>
            <span class="menu-index">${count}개</span>
            <h2>${escapeHtml(group)}</h2>
            <p>${count === 0 ? "등록된 작문 문장이 없습니다." : "이 그룹의 문장으로 작문 시험을 시작합니다."}</p>
          </button>
        `;
      }).join("")}
    </div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  app.querySelectorAll("[data-group]").forEach((button) => {
    button.addEventListener("click", () => startWritingQuiz(button.dataset.group));
  });
}

function startWritingQuiz(group = DEFAULT_WRITING_GROUP) {
  homeTab = "writing";
  const selectedGroup = resolveWritingGroup(group);
  const pool = writingsInGroup(selectedGroup);
  if (pool.length === 0) {
    alert("선택한 그룹에 등록된 작문 문장이 없습니다. 먼저 문장을 추가해 주세요.");
    writingGroup = selectedGroup;
    renderWritings();
    return;
  }

  const quizEnv = writingQuizSettings();
  const questions = shuffle(pool).slice(0, Math.min(quizEnv.quizSize, pool.length));
  quiz = {
    kind: "writing",
    questions,
    index: 0,
    answers: [],
    startedAt: Date.now(),
    timeLimitMs: quizEnv.quizMinutes * 60 * 1000,
    group: selectedGroup,
    currentGrade: null,
    grading: false,
  };
  renderWritingQuiz();
  startQuizTimer();
}

function writingVerdictLabel(verdict) {
  if (verdict === "correct") return "정답";
  if (verdict === "mostly_correct") return "대체로 정답";
  if (verdict === "invalid") return "평가 불가";
  return "오답";
}

function normalizeWritingGrade(grade) {
  if (!grade || typeof grade !== "object") return null;
  const errors = Array.isArray(grade.errors)
    ? grade.errors.map((error) => ({
        original: String(error?.original || ""),
        correction: String(error?.correction || ""),
        reason_ko: String(error?.reason_ko || error?.reasonKo || ""),
      }))
    : [];
  const verdict = String(grade.verdict || "");
  const feedback = String(grade.feedback_ko || grade.feedback || "");
  const corrected = String(grade.corrected_answer || grade.correctedAnswer || "");
  const reference = String(grade.reference_translation || grade.referenceTranslation || "");
  const studentAnswer = String(grade.student_answer || grade.studentAnswer || "");
  if (!verdict && !feedback && !corrected && !reference && !errors.length) return null;
  return {
    verdict,
    meaning_score: Number(grade.meaning_score ?? grade.meaningScore) || 0,
    grammar_score: Number(grade.grammar_score ?? grade.grammarScore) || 0,
    naturalness_score: Number(grade.naturalness_score ?? grade.naturalnessScore) || 0,
    total_score: Number(grade.total_score ?? grade.totalScore) || 0,
    feedback_ko: feedback,
    errors,
    corrected_answer: corrected,
    reference_translation: reference,
    student_answer: studentAnswer,
  };
}

function writingGradeFromAnswer(item) {
  if (!item) return null;
  if (item.grade) {
    return normalizeWritingGrade({
      ...item.grade,
      student_answer: item.grade.student_answer || item.userAnswer || "",
    });
  }
  if (item.userAnswer === "시간 초과" && !item.feedback) return null;
  return normalizeWritingGrade({
    verdict: item.verdict,
    meaning_score: item.meaningScore,
    grammar_score: item.grammarScore,
    naturalness_score: item.naturalnessScore,
    total_score: item.totalScore,
    feedback_ko: item.feedback,
    errors: item.errors,
    corrected_answer: item.correctedAnswer || item.aiResult,
    reference_translation: item.referenceTranslation,
    student_answer: item.userAnswer,
  });
}

function renderWritingQuiz() {
  const current = quiz.questions[quiz.index];
  const total = quiz.questions.length;
  const step = quiz.index + 1;
  const grade = quiz.currentGrade;
  updateHeader(`시험 진행 중 · ${quiz.group} · ${step} / ${total}`);

  app.innerHTML = `
    <div class="toolbar">
      <div class="quiz-title-row">
        <h1 class="section-title">영어 작문 시험 시작</h1>
        <div class="quiz-times">
          <span class="quiz-total-time">총 시험 시간: ${formatElapsed(quiz.timeLimitMs)}</span>
          <span class="quiz-timer" id="quizTimer">시험 경과 시간: ${formatElapsedHundredths(Date.now() - quiz.startedAt)}</span>
        </div>
      </div>
      <button class="btn secondary" id="cancelQuiz">그만두기</button>
    </div>
    <div class="quiz-progress">
      <span>${step}번째 문제</span>
      <span>총 ${total}문항</span>
    </div>
    <div class="progress-track"><div class="progress-bar" style="width: ${(step / total) * 100}%"></div></div>
    <p class="lede">아래 한국어 문장을 영어로 작문한 뒤 채점하기를 누르세요.</p>
    <div class="quiz-word is-meaning" id="writingPrompt"></div>
    <form id="writingQuizForm">
      <div class="quiz-input-row writing-answer-row">
        <div>
          <label for="writingAnswerInput">영어 작문</label>
          <textarea id="writingAnswerInput" name="answer" rows="4" autocomplete="off" placeholder="영어 문장을 입력하세요" ${grade ? "disabled" : ""}></textarea>
          <p class="settings-hint hidden" id="writingInputHint">영어 답안을 입력한 뒤 채점하기를 눌러 주세요.</p>
        </div>
      </div>
      <div class="quiz-actions" id="writingQuizActions"></div>
    </form>
    <div id="writingGradeResult" class="writing-grade${grade ? "" : " hidden"}"></div>
  `;

  document.getElementById("writingPrompt").textContent = current.korean;
  const answerInput = document.getElementById("writingAnswerInput");
  if (grade) answerInput.value = grade.student_answer || "";

  document.getElementById("cancelQuiz").addEventListener("click", () => {
    if (confirm("시험을 중단하고 메인 화면으로 돌아갈까요?")) {
      stopQuizTimer();
      quiz = null;
      renderHome();
    }
  });

  document.getElementById("writingQuizForm").addEventListener("submit", (event) => {
    event.preventDefault();
    submitWritingGrade();
  });

  renderWritingQuizActions();
  if (grade) renderWritingGradeResult(grade);
  if (!grade) answerInput.focus();
}

function renderWritingQuizActions() {
  const actions = document.getElementById("writingQuizActions");
  if (!actions || !quiz) return;
  actions.replaceChildren();
  if (quiz.currentGrade) {
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn";
    nextBtn.textContent = quiz.index < quiz.questions.length - 1 ? "다음 문제" : "시험 마치기";
    nextBtn.addEventListener("click", advanceWritingQuestion);
    actions.appendChild(nextBtn);
    return;
  }
  const gradeBtn = document.createElement("button");
  gradeBtn.type = "submit";
  gradeBtn.className = "btn";
  gradeBtn.id = "writingGradeBtn";
  gradeBtn.textContent = quiz.grading ? "채점 중..." : "채점하기";
  gradeBtn.disabled = Boolean(quiz.grading);
  actions.appendChild(gradeBtn);
}

function fillWritingGradeResult(box, grade) {
  box.replaceChildren();
  if (!grade) {
    const empty = document.createElement("p");
    empty.textContent = "이 문장은 저장된 채점 결과가 없습니다.";
    box.appendChild(empty);
    return;
  }

  const addLine = (label, value) => {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label;
    p.appendChild(strong);
    p.appendChild(document.createTextNode(` ${value}`));
    box.appendChild(p);
  };

  if (grade.student_answer) addLine("입력한 답", grade.student_answer);
  addLine("총점", `${grade.total_score}점`);
  addLine("의미", `${grade.meaning_score}점`);
  addLine("문법", `${grade.grammar_score}점`);
  addLine("자연스러움", `${grade.naturalness_score}점`);
  addLine("판정", writingVerdictLabel(grade.verdict));

  const feedback = document.createElement("p");
  feedback.textContent = grade.feedback_ko || "";
  box.appendChild(feedback);

  if (Array.isArray(grade.errors) && grade.errors.length) {
    const list = document.createElement("ul");
    list.className = "writing-errors";
    for (const error of grade.errors) {
      const item = document.createElement("li");
      const original = document.createElement("div");
      original.textContent = `오류: ${error.original || ""}`;
      const correction = document.createElement("div");
      correction.textContent = `수정: ${error.correction || ""}`;
      const reason = document.createElement("div");
      reason.textContent = `이유: ${error.reason_ko || ""}`;
      item.append(original, correction, reason);
      list.appendChild(item);
    }
    box.appendChild(list);
  }

  const corrected = document.createElement("p");
  const correctedLabel = document.createElement("strong");
  correctedLabel.textContent = "수정한 영어 문장";
  corrected.appendChild(correctedLabel);
  corrected.appendChild(document.createTextNode(` ${grade.corrected_answer || ""}`));
  box.appendChild(corrected);

  const reference = document.createElement("p");
  const referenceLabel = document.createElement("strong");
  referenceLabel.textContent = "참고 번역";
  reference.appendChild(referenceLabel);
  reference.appendChild(document.createTextNode(` ${grade.reference_translation || ""}`));
  box.appendChild(reference);
}

function renderWritingGradeResult(grade) {
  const box = document.getElementById("writingGradeResult");
  if (!box) return;
  box.classList.remove("hidden");
  fillWritingGradeResult(box, grade);
}

function openWritingGradeModal(item) {
  modalTitle.textContent = "채점 상세 결과";
  modalBody.replaceChildren();
  const wrap = document.createElement("div");
  wrap.className = "writing-grade writing-grade-modal";
  fillWritingGradeResult(wrap, writingGradeFromAnswer(item));
  modalBody.appendChild(wrap);
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn";
  closeBtn.textContent = "닫기";
  closeBtn.addEventListener("click", closeModal);
  actions.appendChild(closeBtn);
  modalBody.appendChild(actions);
  modalBackdrop.classList.remove("hidden");
}

async function submitWritingGrade() {
  if (!quiz || quiz.expired || quiz.kind !== "writing" || quiz.grading || quiz.currentGrade) return;
  const input = document.getElementById("writingAnswerInput");
  const hint = document.getElementById("writingInputHint");
  const studentAnswer = String(input?.value || "").trim();
  if (!studentAnswer) {
    if (hint) hint.classList.remove("hidden");
    input?.focus();
    return;
  }
  if (hint) hint.classList.add("hidden");

  quiz.grading = true;
  renderWritingQuizActions();
  const box = document.getElementById("writingGradeResult");
  if (box) {
    box.classList.remove("hidden");
    box.replaceChildren();
    const loading = document.createElement("p");
    loading.textContent = "채점 중입니다...";
    box.appendChild(loading);
  }
  const current = quiz.questions[quiz.index];

  try {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error("로그인이 필요합니다.");
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        problem_id: current.id,
        student_answer: studentAnswer,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.error) {
      throw new Error(payload?.message || "채점에 실패했습니다. 다시 시도해 주세요.");
    }
    quiz.currentGrade = { ...payload, student_answer: studentAnswer };
    renderWritingGradeResult(quiz.currentGrade);
    document.getElementById("writingAnswerInput").disabled = true;
  } catch (error) {
    console.error(error);
    const message = error.message || "채점에 실패했습니다. 다시 시도해 주세요.";
    if (box) {
      box.classList.remove("hidden");
      box.replaceChildren();
      const failed = document.createElement("p");
      failed.textContent = message;
      box.appendChild(failed);
    }
    alert(message);
  } finally {
    if (quiz) quiz.grading = false;
    renderWritingQuizActions();
  }
}

function storeWritingAnswer(grade) {
  const current = quiz.questions[quiz.index];
  const correct = grade?.verdict === "correct";
  if (grade?.corrected_answer) current.aiResult = grade.corrected_answer;
  quiz.answers.push({
    writingId: current.id,
    korean: current.korean,
    english: current.english,
    aiResult: current.aiResult || grade?.corrected_answer || "",
    group: current.group || "",
    userAnswer: grade?.student_answer || "",
    correct,
    verdict: grade?.verdict || "incorrect",
    totalScore: Number(grade?.total_score) || 0,
    meaningScore: Number(grade?.meaning_score) || 0,
    grammarScore: Number(grade?.grammar_score) || 0,
    naturalnessScore: Number(grade?.naturalness_score) || 0,
    feedback: grade?.feedback_ko || "",
    errors: Array.isArray(grade?.errors) ? grade.errors : [],
    correctedAnswer: grade?.corrected_answer || "",
    referenceTranslation: grade?.reference_translation || "",
    grade: normalizeWritingGrade(grade),
  });
}

function advanceWritingQuestion() {
  if (!quiz || quiz.kind !== "writing" || !quiz.currentGrade) return;
  storeWritingAnswer(quiz.currentGrade);
  quiz.currentGrade = null;
  if (quiz.index < quiz.questions.length - 1) {
    quiz.index += 1;
    renderWritingQuiz();
    return;
  }
  finishQuiz();
}

function applyWritingQuizStats(answers, group) {
  for (const answer of answers) {
    const itemGroup = resolveWritingGroup(answer.group || group);
    const item =
      writings.find((writing) => writing.id === answer.writingId) ||
      writings.find(
        (writing) =>
          writing.group === itemGroup && writing.korean.toLowerCase() === String(answer.korean || "").toLowerCase(),
      );
    if (!item) continue;
    item.count = (Number(item.count) || 0) + 1;
    if (answer.correct) item.ansCount = (Number(item.ansCount) || 0) + 1;
    if (answer.aiResult) item.aiResult = answer.aiResult;
    item.rate = wordRate(item);
  }
}

function renderWritingResult(record, justFinished) {
  const percent = record.total ? Math.round((record.correct / record.total) * 100) : 0;
  const wrongCount = record.total - record.correct;
  homeTab = "writing";
  updateHeader(justFinished ? "시험 완료" : "작문 시험 기록 상세");

  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">${justFinished ? "시험 결과표" : "작문 시험 기록 상세"}</h1>
      <div class="actions">
        ${justFinished ? '<button class="btn" id="retryBtn">다시 시험</button>' : ""}
        <button class="btn secondary" id="backBtn">${justFinished ? "홈으로" : "목록으로"}</button>
      </div>
    </div>
    <div class="scoreboard">
      <div class="score-circle">
        <div>
          <span class="score-label">점수</span>
          <strong>${percent}</strong>
          <span>${record.correct} / ${record.total}</span>
        </div>
      </div>
      <div class="result-card">
        <p class="lede">${formatDate(record.date)}에 치른 작문 시험입니다. 입력한 답과 채점 결과를 비교해 보세요.</p>
        <p>작문 그룹 · ${escapeHtml(record.group || DEFAULT_WRITING_GROUP)}</p>
        <p>소요 시간 · ${formatElapsed((Number(record.duration) || 0) * 1000)}</p>
        <p>정답 ${record.correct}개 · 오답 ${wrongCount}개</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>번호</th>
            <th>한글 문장</th>
            <th>입력한 답</th>
            <th>총점</th>
            <th>판정</th>
          </tr>
        </thead>
        <tbody>
          ${record.answers
            .map(
              (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td></td>
              <td></td>
              <td>${Number(item.totalScore) || 0}</td>
              <td class="writing-verdict-cell">
                <span class="badge ${item.correct ? "ok" : "ng"}">${item.correct ? "정답" : escapeHtml(writingVerdictLabel(item.verdict))}</span>
                <button type="button" class="btn secondary writing-detail-btn" data-answer-index="${index}">상세보기</button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  const rows = app.querySelectorAll("tbody tr");
  record.answers.forEach((item, index) => {
    const cells = rows[index]?.querySelectorAll("td");
    if (!cells) return;
    cells[1].textContent = item.korean || "";
    cells[2].textContent = item.userAnswer || "";
  });

  app.querySelectorAll("[data-answer-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = record.answers[Number(button.dataset.answerIndex)];
      if (item) openWritingGradeModal(item);
    });
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    if (justFinished) renderHome();
    else renderWritingRecords();
  });
  document.getElementById("retryBtn")?.addEventListener("click", () => startWritingQuiz(record.group));
}

function renderWritingRecords() {
  homeTab = "writing";
  updateHeader(`작문 시험 기록 · ${writingRecords.length}건`);
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">작문 시험 기록 조회</h1>
      <button class="btn secondary" id="backHome">홈으로</button>
    </div>
    <div id="writingRecordList"></div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  const list = document.getElementById("writingRecordList");

  if (writingRecords.length === 0) {
    list.innerHTML = `<div class="empty-state">아직 저장된 작문 시험 기록이 없습니다.</div>`;
    return;
  }

  list.innerHTML = `
    <div class="history-list">
      ${writingRecords
        .map((record) => {
          const percent = record.total ? Math.round((record.correct / record.total) * 100) : 0;
          return `
            <article class="history-card">
              <div>
                <h3>${percent}점 · ${record.correct}/${record.total}</h3>
                <p>${formatDate(record.date)} · ${escapeHtml(record.group || DEFAULT_WRITING_GROUP)} · ${record.total}문항 · ${formatElapsed((Number(record.duration) || 0) * 1000)}</p>
              </div>
              <button class="btn secondary" data-record="${record.id}">상세 보기</button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  list.querySelectorAll("[data-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = writingRecords.find((item) => item.id === button.dataset.record);
      if (record) renderWritingResult(record, false);
    });
  });
}

function renderWritings() {
  homeTab = "writing";
  selectedWritingIds = new Set();
  updateHeader(`영어 작문 문장 관리 · ${writingGroup} · ${writingsInGroup(writingGroup).length}개`);
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">영어 작문 문장 관리</h1>
      <div class="actions">
        <button class="btn" id="openAddWriting">문장 추가</button>
        <button class="btn secondary" id="backHome">홈으로</button>
      </div>
    </div>
    <label class="group-select-wrap" for="writingGroupSelect">
      영어 작문 그룹
      <select id="writingGroupSelect">${writingGroupOptions(writingGroup)}</select>
    </label>
    <div class="search-row">
      <input id="writingSearch" placeholder="한글 문장 또는 영어 작문 검색" />
      <label class="page-size-wrap" for="writingPageSizeInput">
        페이지당
        <input id="writingPageSizeInput" type="number" min="1" max="200" value="${writingPageSize}" />
        개
      </label>
      <div class="sort-wrap">
        <button type="button" class="btn secondary" id="sortBtn">정렬 · ${currentWritingSortLabel()}</button>
        <div class="sort-panel hidden" id="sortPanel">
          ${WRITING_SORT_OPTIONS.map(
            (option) => `
              <button type="button" class="sort-option ${option.id === writingSort ? "active" : ""}" data-sort="${option.id}">
                ${option.label}
              </button>
            `,
          ).join("")}
        </div>
      </div>
    </div>
    <div id="writingTable"></div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  document.getElementById("openAddWriting").addEventListener("click", openAddWritingModal);
  document.getElementById("writingGroupSelect").addEventListener("change", (event) => {
    writingGroup = event.target.value;
    writingPage = 1;
    selectedWritingIds = new Set();
    drawWritingTable(document.getElementById("writingSearch").value);
  });

  const search = document.getElementById("writingSearch");
  const pageSizeInput = document.getElementById("writingPageSizeInput");
  const sortBtn = document.getElementById("sortBtn");
  const sortPanel = document.getElementById("sortPanel");

  search.addEventListener("input", () => {
    writingPage = 1;
    drawWritingTable(search.value);
  });
  pageSizeInput.addEventListener("change", () => {
    const nextSize = Number(pageSizeInput.value);
    if (!Number.isInteger(nextSize) || nextSize < 1) {
      pageSizeInput.value = String(writingPageSize);
      return;
    }
    writingPageSize = Math.min(nextSize, 200);
    pageSizeInput.value = String(writingPageSize);
    writingPage = 1;
    drawWritingTable(search.value);
  });
  sortBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    sortPanel.classList.toggle("hidden");
  });
  sortPanel.querySelectorAll("[data-sort]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      writingSort = option.dataset.sort;
      sortBtn.textContent = `정렬 · ${currentWritingSortLabel()}`;
      sortPanel.querySelectorAll("[data-sort]").forEach((item) => {
        item.classList.toggle("active", item.dataset.sort === writingSort);
      });
      sortPanel.classList.add("hidden");
      writingPage = 1;
      drawWritingTable(search.value);
    });
  });
  drawWritingTable("");
}

function drawWritingTable(keyword) {
  const grouped = writingsInGroup(writingGroup);
  updateHeader(`영어 작문 문장 관리 · ${writingGroup} · ${grouped.length}개`);
  const query = keyword.trim().toLowerCase();
  const filtered = sortWritings(
    grouped.filter(
      (item) =>
        item.korean.toLowerCase().includes(query) ||
        item.english.toLowerCase().includes(query) ||
        String(item.aiResult || "").toLowerCase().includes(query),
    ),
  );

  const target = document.getElementById("writingTable");
  if (!target) return;
  if (filtered.length === 0) {
    target.innerHTML = `<div class="empty-state">표시할 문장이 없습니다.</div>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / writingPageSize));
  writingPage = Math.min(Math.max(1, writingPage), totalPages);
  const start = (writingPage - 1) * writingPageSize;
  const pageItems = filtered.slice(start, start + writingPageSize);
  const atFirst = writingPage === 1;
  const atLast = writingPage === totalPages;

  target.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-num">번호</th>
            <th>한글 문장</th>
            <th>표준 영어 작문</th>
            <th>AI 작문 결과</th>
            <th>정답율</th>
            <th class="col-manage">
              <div class="manage-head">
                <span>관리</span>
                <button type="button" class="icon-btn" id="bulkDeleteBtn" ${selectedWritingIds.size === 0 ? "disabled" : ""}>
                  선택 삭제${selectedWritingIds.size ? ` (${selectedWritingIds.size})` : ""}
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          ${pageItems
            .map(
              (item, index) => `
                <tr>
                  <td class="col-num">${start + index + 1}</td>
                  <td class="sentence-text">${escapeHtml(item.korean)}</td>
                  <td class="sentence-text">${escapeHtml(item.english)}</td>
                  <td class="sentence-text">${escapeHtml(item.aiResult || "-")}</td>
                  <td class="col-rate">${formatAccuracy(item)}</td>
                  <td>
                    <div class="actions">
                      <button class="icon-btn" data-edit="${item.id}">변경</button>
                      <button class="icon-btn" data-delete="${item.id}">삭제</button>
                      <input
                        class="word-check"
                        type="checkbox"
                        data-select="${item.id}"
                        aria-label="${escapeHtml(item.korean)} 선택"
                        ${selectedWritingIds.has(item.id) ? "checked" : ""}
                      />
                    </div>
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="pager">
      <button type="button" class="btn secondary" data-page="first" ${atFirst ? "disabled" : ""}>처음으로</button>
      <button type="button" class="btn secondary" data-page="prev" ${atFirst ? "disabled" : ""}>앞으로</button>
      <span class="pager-status">${writingPage} / ${totalPages} 페이지 · ${filtered.length}개</span>
      <button type="button" class="btn secondary" data-page="next" ${atLast ? "disabled" : ""}>뒤로</button>
      <button type="button" class="btn secondary" data-page="last" ${atLast ? "disabled" : ""}>끝으로</button>
    </div>
  `;

  target.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditWritingModal(button.dataset.edit));
  });
  target.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteWriting(button.dataset.delete));
  });
  target.querySelectorAll("[data-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedWritingIds.add(checkbox.dataset.select);
      else selectedWritingIds.delete(checkbox.dataset.select);
      updateWritingBulkDeleteButton();
    });
  });
  document.getElementById("bulkDeleteBtn")?.addEventListener("click", () => deleteSelectedWritings(keyword));
  target.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.page === "first") writingPage = 1;
      if (button.dataset.page === "prev") writingPage -= 1;
      if (button.dataset.page === "next") writingPage += 1;
      if (button.dataset.page === "last") writingPage = totalPages;
      drawWritingTable(keyword);
    });
  });
}

function openAddWritingModal() {
  openModal(
    `문장 추가 · ${writingGroup}`,
    `
      <p class="import-hint">선택한 그룹(${escapeHtml(writingGroup)})에 문장이 추가됩니다.</p>
      <div class="import-row">
        <div class="file-picker-wrap">
          <button type="button" class="btn secondary" id="importWritingFileBtn">파일로 추가</button>
          <input id="importWritingFileInput" class="file-picker-input" type="file" accept=".txt,.csv,.json" />
        </div>
      </div>
      <p class="import-hint">txt, csv, json 파일 · 2줄마다 한글 문장, 표준 영어 작문</p>
      <div class="import-divider">또는 직접 입력</div>
      <form class="sentence-form" id="addWritingForm">
        <label for="newWritingKorean">한글 문장</label>
        <textarea id="newWritingKorean" class="sentence-input" name="korean" placeholder="예: 나는 학생이다." required></textarea>
        <div class="modal-field-gap"></div>
        <label for="newWritingEnglish">표준 영어 작문</label>
        <textarea id="newWritingEnglish" class="sentence-input" name="english" placeholder="예: I am a student." required></textarea>
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="cancelAddWriting">취소</button>
          <button type="submit" class="btn">추가</button>
        </div>
      </form>
    `,
  );

  document.getElementById("newWritingKorean").focus();
  document.getElementById("cancelAddWriting").addEventListener("click", closeModal);
  document.getElementById("importWritingFileBtn").addEventListener("click", () => {
    document.getElementById("importWritingFileInput").click();
  });
  document.getElementById("importWritingFileInput").addEventListener("change", handleWritingFile);
  document.getElementById("addWritingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const korean = event.target.korean.value.trim();
    const english = event.target.english.value.trim();
    if (writingsInGroup(writingGroup).some((item) => item.korean.toLowerCase() === korean.toLowerCase())) {
      alert("이 그룹에 이미 등록된 한글 문장입니다.");
      return;
    }
    writings.unshift(createWriting(korean, english, writingGroup));
    await persistWritings();
    closeModal();
    drawWritingTable(document.getElementById("writingSearch").value);
  });
}

function handleWritingFile(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;

  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  if (ext && !["txt", "csv", "json"].includes(ext)) {
    alert("txt, csv, json 파일만 추가할 수 있습니다.");
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => {
    alert("선택한 파일을 읽을 수 없습니다.");
  };
  reader.onload = () => {
    try {
      const parsed = parseWritingFile(file.name, String(reader.result || ""));
      applyImportedWritings(parsed.records, parsed.invalid);
    } catch (error) {
      alert(error.message || "선택한 파일을 읽을 수 없습니다.");
    }
  };

  try {
    reader.readAsText(file, "UTF-8");
  } catch {
    alert("선택한 파일을 읽을 수 없습니다.");
  }
}

function parseWritingFile(filename, text) {
  const content = String(text || "").replace(/^\uFEFF/, "");
  if (content.includes("\u0000")) throw new Error("선택한 파일을 읽을 수 없습니다.");
  if (!content.trim()) throw new Error("선택한 파일을 읽을 수 없습니다.");

  const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
  const parsed = ext === "json" ? parseJsonWritings(content) : parsePairLineWritings(content);
  if (!parsed.records.length && !parsed.invalid) {
    throw new Error("선택한 파일을 읽을 수 없습니다.");
  }
  return parsed;
}

function parseJsonWritings(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return parsePairLineWritings(text);
  }
  return jsonDataToWritings(data);
}

function jsonDataToWritings(data) {
  if (typeof data === "string") return parsePairLineWritings(data);
  if (Array.isArray(data)) {
    if (!data.length) return { records: [], invalid: 0 };
    if (data.every((item) => item == null || typeof item === "string")) {
      return recordsFromPairLines(
        data.map((item) => String(item ?? "").trim()).filter((line) => line && !line.startsWith("#")),
      );
    }
    const records = [];
    let invalid = 0;
    for (const item of data) {
      const record = jsonItemToWriting(item);
      if (record) records.push(record);
      else invalid += 1;
    }
    return { records, invalid };
  }
  if (data && typeof data === "object") {
    const list = data.writings || data.sentences || data.items || data.문장;
    if (Array.isArray(list)) return jsonDataToWritings(list);
    const one = jsonItemToWriting(data);
    return one ? { records: [one], invalid: 0 } : { records: [], invalid: 1 };
  }
  return { records: [], invalid: 0 };
}

function jsonItemToWriting(item) {
  if (typeof item === "string") {
    const lines = item.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return toWritingRecord(lines[0], lines[1]);
  }
  if (Array.isArray(item)) return toWritingRecord(item[0], item[1]);
  if (!item || typeof item !== "object") return null;
  return toWritingRecord(
    pickField(item, ["korean", "한글", "한글 문장", "kor_sentence", "meaning"]),
    pickField(item, ["english", "표준 영어 작문", "영어", "eng_writing", "sentence"]),
  );
}

function parsePairLineWritings(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return recordsFromPairLines(lines);
}

function recordsFromPairLines(lines) {
  const records = [];
  let invalid = 0;
  for (let i = 0; i < lines.length; i += 2) {
    if (i + 1 >= lines.length) {
      invalid += 1;
      break;
    }
    const korean = lines[i];
    const english = lines[i + 1];
    if (isWritingHeaderPair(korean, english)) continue;
    const record = toWritingRecord(korean, english);
    if (record) records.push(record);
    else invalid += 1;
  }
  return { records, invalid };
}

function isWritingHeaderPair(korean, english) {
  return (
    /^(한글|한글 문장|korean)$/i.test(String(korean || "").trim()) &&
    /^(영어|표준 영어 작문|english)$/i.test(String(english || "").trim())
  );
}

function toWritingRecord(korean, english) {
  const kor = String(korean || "").trim();
  const eng = String(english || "").trim();
  if (!kor || !eng) return null;
  return { korean: kor, english: eng };
}

function isSameWriting(a, b) {
  return String(a.korean || "").toLowerCase() === String(b.korean || "").toLowerCase();
}

async function applyImportedWritings(imported, invalid = 0) {
  const added = [];
  let skipped = 0;

  for (const item of imported) {
    const exists = writingsInGroup(writingGroup).some((writing) => isSameWriting(writing, item));
    const alreadyQueued = added.some((writing) => isSameWriting(writing, item));
    if (exists || alreadyQueued) {
      skipped += 1;
      continue;
    }
    added.push(createWriting(item.korean, item.english, writingGroup));
  }

  if (!added.length) {
    if (skipped) {
      alert("이미 등록된 문장만 있어 추가되지 않았습니다.");
    } else if (invalid) {
      alert("한글 문장, 표준 영어 작문 구성이 맞지 않아 추가할 문장이 없습니다.");
    } else {
      alert("파일에서 추가할 문장을 찾지 못했습니다.");
    }
    return;
  }

  writings = [...added, ...writings];
  await persistWritings();
  writingPage = 1;
  closeModal();
  drawWritingTable(document.getElementById("writingSearch").value);
  const extras = [];
  if (skipped) extras.push(`중복 ${skipped}개`);
  if (invalid) extras.push(`형식이 맞지 않는 ${invalid}개`);
  alert(
    extras.length
      ? `${added.length}개 문장을 추가했습니다. ${extras.join(", ")}는 건너뛰었습니다.`
      : `${added.length}개 문장을 추가했습니다.`,
  );
}

function openEditWritingModal(id) {
  const item = writings.find((writing) => writing.id === id);
  if (!item) return;

  openModal(
    "문장 변경",
    `
      <form class="sentence-form" id="editWritingForm">
        <label for="editWritingKorean">한글 문장</label>
        <textarea id="editWritingKorean" class="sentence-input" name="korean" required>${escapeHtml(item.korean)}</textarea>
        <div class="modal-field-gap"></div>
        <label for="editWritingEnglish">표준 영어 작문</label>
        <textarea id="editWritingEnglish" class="sentence-input" name="english" required>${escapeHtml(item.english)}</textarea>
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="cancelEditWriting">취소</button>
          <button type="submit" class="btn">저장</button>
        </div>
      </form>
    `,
  );

  document.getElementById("cancelEditWriting").addEventListener("click", closeModal);
  document.getElementById("editWritingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const korean = event.target.korean.value.trim();
    const english = event.target.english.value.trim();
    const duplicated = writings.some(
      (writing) =>
        writing.id !== id &&
        writing.group === item.group &&
        writing.korean.toLowerCase() === korean.toLowerCase(),
    );
    if (duplicated) {
      alert("이 그룹에 이미 등록된 한글 문장입니다.");
      return;
    }
    item.korean = korean;
    item.english = english;
    await persistWritings();
    closeModal();
    drawWritingTable(document.getElementById("writingSearch").value);
  });
}

async function deleteWriting(id) {
  const item = writings.find((writing) => writing.id === id);
  if (!item) return;
  if (!confirm("이 문장을 삭제할까요?")) return;
  selectedWritingIds.delete(id);
  writings = writings.filter((writing) => writing.id !== id);
  await persistWritings();
  drawWritingTable(document.getElementById("writingSearch").value);
}

function updateWritingBulkDeleteButton() {
  const button = document.getElementById("bulkDeleteBtn");
  if (!button) return;
  button.disabled = selectedWritingIds.size === 0;
  button.textContent = selectedWritingIds.size ? `선택 삭제 (${selectedWritingIds.size})` : "선택 삭제";
}

async function deleteSelectedWritings(keyword = "") {
  const ids = [...selectedWritingIds];
  if (!ids.length) {
    alert("삭제할 문장을 선택해 주세요.");
    return;
  }
  if (!confirm(`선택한 문장 ${ids.length}개를 삭제할까요?`)) return;
  writings = writings.filter((item) => !selectedWritingIds.has(item.id));
  selectedWritingIds = new Set();
  await persistWritings();
  drawWritingTable(keyword);
}

function renderSentenceView(view) {
  homeTab = "sentence";
  if (view === "sentence-manage") {
    renderSentences();
    return;
  }
  if (view === "sentence-quiz") {
    renderSentenceQuizGroupPicker();
    return;
  }
  renderSentenceRecords();
}

function displaySentenceText(english) {
  return String(english || "").replace(/[\[\]]/g, "");
}

function sentenceBlankAnswers(english, fallbackAnswer = "") {
  const blanks = [...String(english || "").matchAll(/\[([^\]]*)\]/g)].map((match) => match[1]);
  if (blanks.length) return blanks;
  const fallback = String(fallbackAnswer || "");
  return fallback ? [fallback] : [];
}

function maxSentenceHintLetters(english, fallbackAnswer = "") {
  const sources = sentenceBlankAnswers(english, fallbackAnswer);
  if (!sources.length) return 0;
  return Math.min(MAX_QUIZ_HINT_LETTERS, Math.max(...sources.map((item) => item.length)));
}

function sentenceBlankHtml(inner, fallbackAnswer, hintLevel) {
  const source = inner || String(fallbackAnswer || "");
  const width = Math.max(inner.length, source.length) + 1;
  const revealed = Math.max(0, Math.min(Number(hintLevel) || 0, MAX_QUIZ_HINT_LETTERS, source.length));
  const hint = source.slice(0, revealed);
  const pad = Math.max(0, width - hint.length);
  return `<span class="quiz-blank">[${escapeHtml(hint)}${"&nbsp;".repeat(pad)}]</span>`;
}

function sentencePromptHtml(english, hintLevel = 0, fallbackAnswer = "") {
  const source = String(english || "");
  let html = "";
  let lastIndex = 0;
  const blanks = /\[([^\]]*)\]/g;
  let match = blanks.exec(source);
  if (!match) return escapeHtml(source);

  while (match) {
    html += escapeHtml(source.slice(lastIndex, match.index));
    html += sentenceBlankHtml(match[1], fallbackAnswer, hintLevel);
    lastIndex = match.index + match[0].length;
    match = blanks.exec(source);
  }
  html += escapeHtml(source.slice(lastIndex));
  return html;
}

function isCorrectSentenceAnswer(userAnswer, answer) {
  const expected = String(answer || "").trim();
  const input = String(userAnswer || "").trim();
  if (!expected || !input) return false;
  return isCorrectEnglish(input, expected) || isCorrectAnswer(input, expected);
}

function renderSentenceQuizGroupPicker() {
  homeTab = "sentence";
  updateHeader("문장 시험 시작 · 그룹 선택");
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">문장 시험 시작</h1>
      <button class="btn secondary" id="backHome">홈으로</button>
    </div>
    <p class="lede">시험을 볼 문장 그룹을 선택하세요.</p>
    <div class="group-picker">
      ${SENTENCE_GROUPS.map((group) => {
        const count = sentencesInGroup(group).length;
        return `
          <button type="button" class="menu-card" data-group="${escapeHtml(group)}" ${count === 0 ? "disabled" : ""}>
            <span class="menu-index">${count}개</span>
            <h2>${escapeHtml(group)}</h2>
            <p>${count === 0 ? "등록된 문장이 없습니다." : "이 그룹의 문장으로 시험을 시작합니다."}</p>
          </button>
        `;
      }).join("")}
    </div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  app.querySelectorAll("[data-group]").forEach((button) => {
    button.addEventListener("click", () => startSentenceQuiz(button.dataset.group));
  });
}

function startSentenceQuiz(group = DEFAULT_SENTENCE_GROUP) {
  homeTab = "sentence";
  const selectedGroup = resolveSentenceGroup(group);
  const pool = sentencesInGroup(selectedGroup);
  if (pool.length === 0) {
    alert("선택한 그룹에 등록된 문장이 없습니다. 먼저 문장을 추가해 주세요.");
    sentenceGroup = selectedGroup;
    renderSentences();
    return;
  }

  const quizEnv = sentenceQuizSettings();
  const questions = shuffle(pool).slice(0, Math.min(quizEnv.quizSize, pool.length));
  quiz = {
    kind: "sentence",
    questions,
    index: 0,
    answers: [],
    startedAt: Date.now(),
    timeLimitMs: quizEnv.quizMinutes * 60 * 1000,
    format: quizEnv.quizFormat,
    meaningDisplay: quizEnv.meaningDisplay,
    hintLevel: 0,
    group: selectedGroup,
  };
  renderSentenceQuiz();
  startQuizTimer();
}

function renderSentenceQuiz() {
  const current = quiz.questions[quiz.index];
  const total = quiz.questions.length;
  const step = quiz.index + 1;
  updateHeader(`시험 진행 중 · ${quiz.group} · ${step} / ${total}`);

  app.innerHTML = `
    <div class="toolbar">
      <div class="quiz-title-row">
        <h1 class="section-title">문장 시험 시작</h1>
        <div class="quiz-times">
          <span class="quiz-total-time">총 시험 시간: ${formatElapsed(quiz.timeLimitMs)}</span>
          <span class="quiz-timer" id="quizTimer">시험 경과 시간: ${formatElapsedPrecise(Date.now() - quiz.startedAt)}</span>
        </div>
      </div>
      <button class="btn secondary" id="cancelQuiz">그만두기</button>
    </div>
    <div class="quiz-progress">
      <span>${step}번째 문제</span>
      <span>총 ${total}문항</span>
    </div>
    <div class="progress-track"><div class="progress-bar" style="width: ${(step / total) * 100}%"></div></div>
    <p class="lede">빈칸에 알맞은 답을 입력한 뒤 확인을 누르세요. 모르면 모름을 누르세요.</p>
    <div class="quiz-sentence">${sentencePromptHtml(current.english, quiz.hintLevel, current.answer)}</div>
    ${
      parseMeaningDisplay(quiz.meaningDisplay) === "표시하기"
        ? `<p class="quiz-sentence-meaning">${escapeHtml(current.meaning)}</p>`
        : ""
    }
    <div class="quiz-hint-row">
      <button type="button" class="btn secondary" id="hintBtn">힌트 보기</button>
    </div>
    <form id="quizForm">
      <div class="quiz-input-row">
        <div>
          <label for="sentenceAnswerInput">정답</label>
          <input id="sentenceAnswerInput" name="answer" autocomplete="off" placeholder="정답을 입력하세요" />
        </div>
        <button class="btn" type="submit">확인</button>
        <button class="btn secondary" type="button" id="unknownBtn">모름</button>
      </div>
    </form>
  `;

  document.getElementById("cancelQuiz").addEventListener("click", () => {
    if (confirm("시험을 중단하고 메인 화면으로 돌아갈까요?")) {
      stopQuizTimer();
      quiz = null;
      renderHome();
    }
  });

  document.getElementById("quizForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = String(new FormData(event.target).get("answer") || "").trim();
    if (!selected) {
      submitSentenceAnswer("모름", true);
      return;
    }
    submitSentenceAnswer(selected);
  });

  document.getElementById("unknownBtn").addEventListener("click", () => {
    submitSentenceAnswer("모름", true);
  });

  const hintBtn = document.getElementById("hintBtn");
  if (hintBtn) {
    hintBtn.addEventListener("click", revealSentenceQuizHint);
    updateSentenceQuizHintUi();
  }

  document.getElementById("sentenceAnswerInput")?.focus();
}

function updateSentenceQuizHintUi() {
  if (!quiz || quiz.kind !== "sentence") return;
  const current = quiz.questions[quiz.index];
  const level = quiz.hintLevel || 0;
  const max = maxSentenceHintLetters(current.english, current.answer);
  const sentenceEl = document.querySelector(".quiz-sentence");
  const hintBtn = document.getElementById("hintBtn");
  if (sentenceEl) sentenceEl.innerHTML = sentencePromptHtml(current.english, level, current.answer);
  if (!hintBtn) return;
  hintBtn.textContent = level === 0 ? "힌트 보기" : "힌트 더보기";
  hintBtn.disabled = max === 0 || level >= max;
}

function revealSentenceQuizHint() {
  if (!quiz || quiz.expired || quiz.kind !== "sentence") return;
  const current = quiz.questions[quiz.index];
  const max = maxSentenceHintLetters(current.english, current.answer);
  if ((quiz.hintLevel || 0) >= max) return;
  quiz.hintLevel = (quiz.hintLevel || 0) + 1;
  updateSentenceQuizHintUi();
  document.getElementById("sentenceAnswerInput")?.focus();
}

function submitSentenceAnswer(userAnswer, unknown = false) {
  if (!quiz || quiz.expired || quiz.kind !== "sentence") return;
  const current = quiz.questions[quiz.index];
  const answer = unknown ? "모름" : userAnswer.trim();
  const correct = !unknown && Boolean(answer) && isCorrectSentenceAnswer(answer, current.answer);
  quiz.answers.push({
    sentenceId: current.id,
    english: current.english,
    meaning: current.meaning,
    answer: current.answer,
    group: current.group || "",
    userAnswer: answer,
    correct,
  });

  if (quiz.index < quiz.questions.length - 1) {
    quiz.index += 1;
    quiz.hintLevel = 0;
    renderSentenceQuiz();
    return;
  }

  finishQuiz();
}

function applySentenceQuizStats(answers, group) {
  for (const answer of answers) {
    const itemGroup = resolveSentenceGroup(answer.group || group);
    const item =
      sentences.find((sentence) => sentence.id === answer.sentenceId) ||
      sentences.find(
        (sentence) =>
          sentence.group === itemGroup && sentence.english.toLowerCase() === String(answer.english || "").toLowerCase(),
      );
    if (!item) continue;
    item.count = (Number(item.count) || 0) + 1;
    if (answer.correct) item.ansCount = (Number(item.ansCount) || 0) + 1;
    item.rate = wordRate(item);
  }
}

function renderSentences() {
  homeTab = "sentence";
  selectedSentenceIds = new Set();
  updateHeader(`문장 관리 · ${sentenceGroup} · ${sentencesInGroup(sentenceGroup).length}개`);
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">문장 관리</h1>
      <div class="actions">
        <button class="btn" id="openAddSentence">문장 추가</button>
        <button class="btn secondary" id="backHome">홈으로</button>
      </div>
    </div>
    <label class="group-select-wrap" for="sentenceGroupSelect">
      문장 그룹
      <select id="sentenceGroupSelect">${sentenceGroupOptions(sentenceGroup)}</select>
    </label>
    <div class="search-row">
      <input id="sentenceSearch" placeholder="문장, 뜻 또는 정답 검색" />
      <label class="page-size-wrap" for="sentencePageSizeInput">
        페이지당
        <input id="sentencePageSizeInput" type="number" min="1" max="200" value="${sentencePageSize}" />
        개
      </label>
      <div class="sort-wrap">
        <button type="button" class="btn secondary" id="sortBtn">정렬 · ${currentSentenceSortLabel()}</button>
        <div class="sort-panel hidden" id="sortPanel">
          ${SENTENCE_SORT_OPTIONS.map(
            (option) => `
              <button type="button" class="sort-option ${option.id === sentenceSort ? "active" : ""}" data-sort="${option.id}">
                ${option.label}
              </button>
            `,
          ).join("")}
        </div>
      </div>
    </div>
    <div id="sentenceTable"></div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  document.getElementById("openAddSentence").addEventListener("click", openAddSentenceModal);
  document.getElementById("sentenceGroupSelect").addEventListener("change", (event) => {
    sentenceGroup = event.target.value;
    sentencePage = 1;
    selectedSentenceIds = new Set();
    drawSentenceTable(document.getElementById("sentenceSearch").value);
  });

  const search = document.getElementById("sentenceSearch");
  const pageSizeInput = document.getElementById("sentencePageSizeInput");
  const sortBtn = document.getElementById("sortBtn");
  const sortPanel = document.getElementById("sortPanel");

  search.addEventListener("input", () => {
    sentencePage = 1;
    drawSentenceTable(search.value);
  });
  pageSizeInput.addEventListener("change", () => {
    const nextSize = Number(pageSizeInput.value);
    if (!Number.isInteger(nextSize) || nextSize < 1) {
      pageSizeInput.value = String(sentencePageSize);
      return;
    }
    sentencePageSize = Math.min(nextSize, 200);
    pageSizeInput.value = String(sentencePageSize);
    sentencePage = 1;
    drawSentenceTable(search.value);
  });
  sortBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    sortPanel.classList.toggle("hidden");
  });
  sortPanel.querySelectorAll("[data-sort]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      sentenceSort = option.dataset.sort;
      sortBtn.textContent = `정렬 · ${currentSentenceSortLabel()}`;
      sortPanel.querySelectorAll("[data-sort]").forEach((item) => {
        item.classList.toggle("active", item.dataset.sort === sentenceSort);
      });
      sortPanel.classList.add("hidden");
      sentencePage = 1;
      drawSentenceTable(search.value);
    });
  });
  drawSentenceTable("");
}

function drawSentenceTable(keyword) {
  const grouped = sentencesInGroup(sentenceGroup);
  updateHeader(`문장 관리 · ${sentenceGroup} · ${grouped.length}개`);
  const query = keyword.trim().toLowerCase();
  const filtered = sortSentences(
    grouped.filter(
      (item) =>
        item.english.toLowerCase().includes(query) ||
        item.meaning.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query),
    ),
  );

  const target = document.getElementById("sentenceTable");
  if (!target) return;
  if (filtered.length === 0) {
    target.innerHTML = `<div class="empty-state">표시할 문장이 없습니다.</div>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / sentencePageSize));
  sentencePage = Math.min(Math.max(1, sentencePage), totalPages);
  const start = (sentencePage - 1) * sentencePageSize;
  const pageItems = filtered.slice(start, start + sentencePageSize);
  const atFirst = sentencePage === 1;
  const atLast = sentencePage === totalPages;

  target.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-num">번호</th>
            <th class="col-sentence">
              <span>문장</span>
              <span>뜻</span>
            </th>
            <th>정답</th>
            <th>정답율</th>
            <th class="col-manage">
              <div class="manage-head">
                <span>관리</span>
                <button type="button" class="icon-btn" id="bulkDeleteBtn" ${selectedSentenceIds.size === 0 ? "disabled" : ""}>
                  선택 삭제${selectedSentenceIds.size ? ` (${selectedSentenceIds.size})` : ""}
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          ${pageItems
            .map(
              (item, index) => `
                <tr>
                  <td class="col-num">${start + index + 1}</td>
                  <td>
                    <div class="sentence-stack">
                      <div class="sentence-text">${escapeHtml(displaySentenceText(item.english))}</div>
                      <div class="sentence-meaning">${escapeHtml(item.meaning)}</div>
                    </div>
                  </td>
                  <td>${escapeHtml(item.answer)}</td>
                  <td class="col-rate">${formatAccuracy(item)}</td>
                  <td>
                    <div class="actions">
                      <button class="icon-btn" data-edit="${item.id}">변경</button>
                      <button class="icon-btn" data-delete="${item.id}">삭제</button>
                      <input
                        class="word-check"
                        type="checkbox"
                        data-select="${item.id}"
                        aria-label="${escapeHtml(item.english)} 선택"
                        ${selectedSentenceIds.has(item.id) ? "checked" : ""}
                      />
                    </div>
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="pager">
      <button type="button" class="btn secondary" data-page="first" ${atFirst ? "disabled" : ""}>처음으로</button>
      <button type="button" class="btn secondary" data-page="prev" ${atFirst ? "disabled" : ""}>앞으로</button>
      <span class="pager-status">${sentencePage} / ${totalPages} 페이지 · ${filtered.length}개</span>
      <button type="button" class="btn secondary" data-page="next" ${atLast ? "disabled" : ""}>뒤로</button>
      <button type="button" class="btn secondary" data-page="last" ${atLast ? "disabled" : ""}>끝으로</button>
    </div>
  `;

  target.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditSentenceModal(button.dataset.edit));
  });
  target.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteSentence(button.dataset.delete));
  });
  target.querySelectorAll("[data-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedSentenceIds.add(checkbox.dataset.select);
      else selectedSentenceIds.delete(checkbox.dataset.select);
      updateSentenceBulkDeleteButton();
    });
  });
  document.getElementById("bulkDeleteBtn")?.addEventListener("click", () => deleteSelectedSentences(keyword));
  target.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.page === "first") sentencePage = 1;
      if (button.dataset.page === "prev") sentencePage -= 1;
      if (button.dataset.page === "next") sentencePage += 1;
      if (button.dataset.page === "last") sentencePage = totalPages;
      drawSentenceTable(keyword);
    });
  });
}

function openAddSentenceModal() {
  openModal(
    `문장 추가 · ${sentenceGroup}`,
    `
      <p class="import-hint">선택한 그룹(${escapeHtml(sentenceGroup)})에 문장이 추가됩니다.</p>
      <div class="import-row">
        <button type="button" class="btn secondary" id="importSentenceFileBtn">파일로 추가</button>
        <input id="importSentenceFileInput" type="file" accept=".txt,.csv,.json,text/plain,text/csv,application/json" hidden />
      </div>
      <p class="import-hint">txt, csv, json 파일 · 3줄마다 영어 문장, 뜻, 정답</p>
      <div class="import-divider">또는 직접 입력</div>
      <form class="sentence-form" id="addSentenceForm">
        <label for="newSentenceEnglish">영어 문장</label>
        <textarea id="newSentenceEnglish" class="sentence-input" name="english" placeholder="예: I [am] a student." required></textarea>
        <p class="import-hint">대괄호 [] 안의 내용은 문장 문제를 풀 때 보이지 않습니다.</p>
        <div class="modal-field-gap"></div>
        <label for="newSentenceMeaning">뜻</label>
        <input id="newSentenceMeaning" name="meaning" placeholder="예: 나는 학생이다" required />
        <div class="modal-field-gap"></div>
        <label for="newSentenceAnswer">정답</label>
        <input id="newSentenceAnswer" name="answer" placeholder="예: am" required />
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="cancelAddSentence">취소</button>
          <button type="submit" class="btn">추가</button>
        </div>
      </form>
    `,
  );

  document.getElementById("newSentenceEnglish").focus();
  document.getElementById("cancelAddSentence").addEventListener("click", closeModal);
  document.getElementById("importSentenceFileBtn").addEventListener("click", () => {
    document.getElementById("importSentenceFileInput").click();
  });
  document.getElementById("importSentenceFileInput").addEventListener("change", handleSentenceFile);
  document.getElementById("addSentenceForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const english = event.target.english.value.trim();
    const meaning = event.target.meaning.value.trim();
    const answer = event.target.answer.value.trim();
    if (sentencesInGroup(sentenceGroup).some((item) => item.english.toLowerCase() === english.toLowerCase())) {
      alert("이 그룹에 이미 등록된 문장입니다.");
      return;
    }
    sentences.unshift(createSentence(english, meaning, answer, sentenceGroup));
    await persistSentences();
    closeModal();
    drawSentenceTable(document.getElementById("sentenceSearch").value);
  });
}

function handleSentenceFile(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;

  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  if (ext && !["txt", "csv", "json"].includes(ext)) {
    alert("txt, csv, json 파일만 추가할 수 있습니다.");
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => {
    alert("선택한 파일을 열 수 없습니다.");
  };
  reader.onload = () => {
    try {
      const parsed = parseSentenceFile(file.name, String(reader.result || ""));
      applyImportedSentences(parsed.records, parsed.invalid);
    } catch (error) {
      alert(error.message || "선택한 파일을 열 수 없습니다.");
    }
  };

  try {
    reader.readAsText(file, "UTF-8");
  } catch {
    alert("선택한 파일을 열 수 없습니다.");
  }
}

function parseSentenceFile(filename, text) {
  const content = String(text || "").replace(/^\uFEFF/, "");
  if (!content.trim()) throw new Error("파일 내용이 비어 있어 문장을 추가할 수 없습니다.");

  const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
  const parsed = ext === "json" ? parseJsonSentences(content) : parseTripleLineSentences(content);
  if (!parsed.records.length && !parsed.invalid) {
    throw new Error("파일에서 추가할 문장을 찾지 못했습니다.");
  }
  return parsed;
}

function parseJsonSentences(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return parseTripleLineSentences(text);
  }
  return jsonDataToSentences(data);
}

function jsonDataToSentences(data) {
  if (typeof data === "string") return parseTripleLineSentences(data);
  if (Array.isArray(data)) {
    if (!data.length) return { records: [], invalid: 0 };
    if (data.every((item) => item == null || typeof item === "string")) {
      return recordsFromTripleLines(
        data.map((item) => String(item ?? "").trim()).filter((line) => line && !line.startsWith("#")),
      );
    }
    const records = [];
    let invalid = 0;
    for (const item of data) {
      const record = jsonItemToSentence(item);
      if (record) records.push(record);
      else invalid += 1;
    }
    return { records, invalid };
  }
  if (data && typeof data === "object") {
    const list = data.sentences || data.items || data.문장;
    if (Array.isArray(list)) return jsonDataToSentences(list);
    const one = jsonItemToSentence(data);
    return one ? { records: [one], invalid: 0 } : { records: [], invalid: 1 };
  }
  return { records: [], invalid: 0 };
}

function jsonItemToSentence(item) {
  if (typeof item === "string") {
    const lines = item.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return toSentenceRecord(lines[0], lines[1], lines[2]);
  }
  if (Array.isArray(item)) return toSentenceRecord(item[0], item[1], item[2]);
  if (!item || typeof item !== "object") return null;
  const block = pickField(item, ["line", "text", "내용"]);
  if (block && block.includes("\n")) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return toSentenceRecord(lines[0], lines[1], lines[2]);
  }
  return toSentenceRecord(
    pickField(item, ["english", "sentence", "문장", "영어 문장", "eng_sentence", "en"]),
    pickField(item, ["meaning", "뜻", "kor_mean", "definition"]),
    pickField(item, ["answer", "정답", "correct"]),
  );
}

function parseTripleLineSentences(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return recordsFromTripleLines(lines);
}

function recordsFromTripleLines(lines) {
  const records = [];
  let invalid = 0;
  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) {
      invalid += 1;
      break;
    }
    const english = lines[i];
    const meaning = lines[i + 1];
    const answer = lines[i + 2];
    if (isSentenceHeaderTriplet(english, meaning, answer)) continue;
    const record = toSentenceRecord(english, meaning, answer);
    if (record) records.push(record);
    else invalid += 1;
  }
  return { records, invalid };
}

function isSentenceHeaderTriplet(english, meaning, answer) {
  return (
    /^(문장|sentence|english|영어|영어 문장)$/i.test(String(english || "").trim()) &&
    /^(뜻|meaning|definition)$/i.test(String(meaning || "").trim()) &&
    /^(정답|answer|correct)$/i.test(String(answer || "").trim())
  );
}

function toSentenceRecord(english, meaning, answer) {
  const sentence = String(english || "").trim();
  const korean = String(meaning || "").trim();
  const key = String(answer || "").trim() || sentenceBracketAnswers(sentence).join(", ");
  if (!sentence || !korean || !key) return null;
  return { english: sentence, meaning: korean, answer: key };
}

async function applyImportedSentences(imported, invalid = 0) {
  const added = [];
  let skipped = 0;

  for (const item of imported) {
    const exists = sentencesInGroup(sentenceGroup).some(
      (sentence) => sentence.english.toLowerCase() === item.english.toLowerCase(),
    );
    const alreadyQueued = added.some((sentence) => sentence.english.toLowerCase() === item.english.toLowerCase());
    if (exists || alreadyQueued) {
      skipped += 1;
      continue;
    }
    added.push(createSentence(item.english, item.meaning, item.answer, sentenceGroup));
  }

  if (!added.length) {
    if (skipped) {
      alert("이미 등록된 문장만 있어 추가되지 않았습니다.");
    } else if (invalid) {
      alert("문장, 뜻, 정답 구성이 맞지 않아 추가할 문장이 없습니다.");
    } else {
      alert("파일에서 추가할 문장을 찾지 못했습니다.");
    }
    return;
  }

  sentences = [...added, ...sentences];
  await persistSentences();
  sentencePage = 1;
  closeModal();
  drawSentenceTable(document.getElementById("sentenceSearch").value);
  const extras = [];
  if (skipped) extras.push(`중복 ${skipped}개`);
  if (invalid) extras.push(`형식이 맞지 않는 ${invalid}개`);
  alert(
    extras.length
      ? `${added.length}개 문장을 추가했습니다. ${extras.join(", ")}는 건너뛰었습니다.`
      : `${added.length}개 문장을 추가했습니다.`,
  );
}

function openEditSentenceModal(id) {
  const item = sentences.find((sentence) => sentence.id === id);
  if (!item) return;

  openModal(
    "문장 변경",
    `
      <form class="sentence-form" id="editSentenceForm">
        <label for="editSentenceEnglish">영어 문장</label>
        <textarea id="editSentenceEnglish" class="sentence-input" name="english" required>${escapeHtml(item.english)}</textarea>
        <p class="import-hint">대괄호 [] 안의 내용은 문장 문제를 풀 때 보이지 않습니다.</p>
        <div class="modal-field-gap"></div>
        <label for="editSentenceMeaning">뜻</label>
        <input id="editSentenceMeaning" name="meaning" value="${escapeHtml(item.meaning)}" required />
        <div class="modal-field-gap"></div>
        <label for="editSentenceAnswer">정답</label>
        <input id="editSentenceAnswer" name="answer" value="${escapeHtml(item.answer)}" required />
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="cancelEditSentence">취소</button>
          <button type="submit" class="btn">저장</button>
        </div>
      </form>
    `,
  );

  document.getElementById("cancelEditSentence").addEventListener("click", closeModal);
  document.getElementById("editSentenceForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const english = event.target.english.value.trim();
    const meaning = event.target.meaning.value.trim();
    const answer = event.target.answer.value.trim();
    const duplicated = sentences.some(
      (sentence) =>
        sentence.id !== id &&
        sentence.group === item.group &&
        sentence.english.toLowerCase() === english.toLowerCase(),
    );
    if (duplicated) {
      alert("이 그룹에 이미 등록된 문장입니다.");
      return;
    }
    item.english = english;
    item.meaning = meaning;
    item.answer = answer;
    await persistSentences();
    closeModal();
    drawSentenceTable(document.getElementById("sentenceSearch").value);
  });
}

async function deleteSentence(id) {
  const item = sentences.find((sentence) => sentence.id === id);
  if (!item) return;
  if (!confirm("이 문장을 삭제할까요?")) return;
  selectedSentenceIds.delete(id);
  sentences = sentences.filter((sentence) => sentence.id !== id);
  await persistSentences();
  drawSentenceTable(document.getElementById("sentenceSearch").value);
}

function updateSentenceBulkDeleteButton() {
  const button = document.getElementById("bulkDeleteBtn");
  if (!button) return;
  button.disabled = selectedSentenceIds.size === 0;
  button.textContent = selectedSentenceIds.size ? `선택 삭제 (${selectedSentenceIds.size})` : "선택 삭제";
}

async function deleteSelectedSentences(keyword = "") {
  const ids = [...selectedSentenceIds];
  if (!ids.length) {
    alert("삭제할 문장을 선택해 주세요.");
    return;
  }
  if (!confirm(`선택한 문장 ${ids.length}개를 삭제할까요?`)) return;
  sentences = sentences.filter((item) => !selectedSentenceIds.has(item.id));
  selectedSentenceIds = new Set();
  await persistSentences();
  drawSentenceTable(keyword);
}

function settingsGroupFields(prefix, env, formatHint) {
  return `
    <div>
      <label for="${prefix}QuizSize">시험 문항 수</label>
      <select id="${prefix}QuizSize" name="${prefix}QuizSize">
        ${QUIZ_SIZE_OPTIONS.map(
          (size) => `<option value="${size}" ${size === env.quizSize ? "selected" : ""}>${size}문항</option>`,
        ).join("")}
      </select>
    </div>
    <div>
      <label for="${prefix}QuizFormat">문제 형식</label>
      <select id="${prefix}QuizFormat" name="${prefix}QuizFormat">
        ${QUIZ_FORMAT_OPTIONS.map(
          (format) => `<option value="${format}" ${format === env.quizFormat ? "selected" : ""}>${format}</option>`,
        ).join("")}
      </select>
      <p class="settings-hint">${formatHint}</p>
    </div>
    <div>
      <label for="${prefix}QuizMinutes">시험 시간 지정</label>
      <input
        id="${prefix}QuizMinutes"
        name="${prefix}QuizMinutes"
        type="number"
        min="${MIN_QUIZ_MINUTES}"
        max="${MAX_QUIZ_MINUTES}"
        value="${env.quizMinutes}"
        required
      />
      <p class="settings-hint">분 단위로 입력합니다. 기본값 10분, ${MIN_QUIZ_MINUTES}분부터 ${MAX_QUIZ_MINUTES}분까지 지정할 수 있습니다.</p>
    </div>
  `;
}

function readQuizEnvFromForm(form, prefix) {
  return {
    quizSize: Number(form[`${prefix}QuizSize`].value),
    quizMinutes: Number(form[`${prefix}QuizMinutes`].value),
    quizFormat: form[`${prefix}QuizFormat`].value,
  };
}

function quizEnvError(env) {
  if (!QUIZ_SIZE_OPTIONS.includes(env.quizSize)) return "시험 문항 수를 다시 선택해 주세요.";
  if (!Number.isInteger(env.quizMinutes) || env.quizMinutes < MIN_QUIZ_MINUTES || env.quizMinutes > MAX_QUIZ_MINUTES) {
    return `시험 시간은 ${MIN_QUIZ_MINUTES}분 이상 ${MAX_QUIZ_MINUTES}분 이하로 입력해 주세요.`;
  }
  if (!QUIZ_FORMAT_OPTIONS.includes(env.quizFormat)) return "문제 형식을 다시 선택해 주세요.";
  if (env.meaningDisplay != null && !MEANING_DISPLAY_OPTIONS.includes(env.meaningDisplay)) {
    return "뜻 표시를 다시 선택해 주세요.";
  }
  return "";
}

function renderSettings() {
  homeTab = "settings";
  const word = wordQuizSettings();
  const sentence = sentenceQuizSettings();
  const writing = writingQuizSettings();
  updateHeader("환경 설정");
  app.innerHTML = `
    ${homeTabsHtml()}
    <form class="settings-form" id="settingsForm">
      <fieldset class="settings-group">
        <legend>단어 시험 환경</legend>
        ${settingsGroupFields(
          "word",
          word,
          "주관식은 뜻을 보고 영어 단어를 입력하고, 객관식은 영어 단어의 뜻을 5지선다에서 고릅니다.",
        )}
      </fieldset>
      <fieldset class="settings-group">
        <legend>문장 시험 환경</legend>
        ${settingsGroupFields(
          "sentence",
          sentence,
          "주관식은 답을 직접 입력하고, 객관식은 5지선다에서 고릅니다.",
        )}
        <div>
          <label for="sentenceMeaningDisplay">뜻 표시</label>
          <select id="sentenceMeaningDisplay" name="sentenceMeaningDisplay">
            ${MEANING_DISPLAY_OPTIONS.map(
              (option) =>
                `<option value="${option}" ${option === sentence.meaningDisplay ? "selected" : ""}>${option}</option>`,
            ).join("")}
          </select>
        </div>
      </fieldset>
      <fieldset class="settings-group">
        <legend>작문 시험 환경</legend>
        <div>
          <label for="writingQuizSize">시험 문항 수</label>
          <select id="writingQuizSize" name="writingQuizSize">
            ${WRITING_QUIZ_SIZE_OPTIONS.map(
              (size) => `<option value="${size}" ${size === writing.quizSize ? "selected" : ""}>${size}문항</option>`,
            ).join("")}
          </select>
        </div>
        <div>
          <label for="writingQuizMinutes">시험 시간 지정</label>
          <input
            id="writingQuizMinutes"
            name="writingQuizMinutes"
            type="number"
            min="${MIN_QUIZ_MINUTES}"
            max="${MAX_QUIZ_MINUTES}"
            value="${writing.quizMinutes}"
            required
          />
          <p class="settings-hint">분 단위로 입력합니다. 기본값 10분, ${MIN_QUIZ_MINUTES}분부터 ${MAX_QUIZ_MINUTES}분까지 지정할 수 있습니다.</p>
        </div>
      </fieldset>
      <div class="modal-actions">
        <button type="submit" class="btn">저장</button>
      </div>
    </form>
  `;

  bindHomeTabs();
  document.getElementById("settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const wordEnv = readQuizEnvFromForm(event.target, "word");
    const sentenceEnv = {
      ...readQuizEnvFromForm(event.target, "sentence"),
      meaningDisplay: event.target.sentenceMeaningDisplay.value,
    };
    const writingEnv = {
      quizSize: Number(event.target.writingQuizSize.value),
      quizMinutes: Number(event.target.writingQuizMinutes.value),
    };
    const writingError = !WRITING_QUIZ_SIZE_OPTIONS.includes(writingEnv.quizSize)
      ? "시험 문항 수를 다시 선택해 주세요."
      : !Number.isInteger(writingEnv.quizMinutes) || writingEnv.quizMinutes < MIN_QUIZ_MINUTES || writingEnv.quizMinutes > MAX_QUIZ_MINUTES
        ? `시험 시간은 ${MIN_QUIZ_MINUTES}분 이상 ${MAX_QUIZ_MINUTES}분 이하로 입력해 주세요.`
        : "";
    const error = quizEnvError(wordEnv) || quizEnvError(sentenceEnv) || writingError;
    if (error) {
      alert(error);
      return;
    }
    settings = { word: wordEnv, sentence: sentenceEnv, writing: writingEnv };
    try {
      await saveSettingsToFirebase();
      alert("환경 설정을 저장했습니다.");
      renderHome();
    } catch (error) {
      console.error(error);
      alert("환경 설정을 Firebase에 저장하지 못했습니다.");
    }
  });
}

function renderQuizGroupPicker() {
  updateHeader("단어 시험 시작 · 그룹 선택");
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">단어 시험 시작</h1>
      <button class="btn secondary" id="backHome">홈으로</button>
    </div>
    <p class="lede">시험을 볼 단어 그룹을 선택하세요.</p>
    <div class="group-picker">
      ${[...WORD_GROUPS, WRONG_WORD_QUIZ]
        .map((group) => {
          const isWrongQuiz = group === WRONG_WORD_QUIZ;
          const count = isWrongQuiz ? collectWrongWords().length : wordsInGroup(group).length;
          return `
          <button type="button" class="menu-card" data-group="${escapeHtml(group)}" ${count === 0 ? "disabled" : ""}>
            <span class="menu-index">${count}개</span>
            <h2>${escapeHtml(group)}</h2>
            <p>${
              count === 0
                ? isWrongQuiz
                  ? "오답인 단어가 없습니다."
                  : "등록된 단어가 없습니다."
                : isWrongQuiz
                  ? "한 번이라도 틀린 단어로 시험을 시작합니다."
                  : "이 그룹의 단어로 시험을 시작합니다."
            }</p>
          </button>
        `;
        })
        .join("")}
    </div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  app.querySelectorAll("[data-group]").forEach((button) => {
    button.addEventListener("click", () => startQuiz(button.dataset.group));
  });
}

function startQuiz(group = DEFAULT_WORD_GROUP) {
  const isWrongQuiz = group === WRONG_WORD_QUIZ;
  const selectedGroup = isWrongQuiz || WORD_GROUPS.includes(group) ? group : DEFAULT_WORD_GROUP;
  const pool = isWrongQuiz ? wordsEverWrong() : wordsInGroup(selectedGroup);
  if (pool.length === 0) {
    if (isWrongQuiz) {
      alert("오답인 단어가 없습니다. 다른 그룹에서 시험을 치른 뒤 다시 시도해 주세요.");
      renderQuizGroupPicker();
      return;
    }
    alert("선택한 그룹에 등록된 단어가 없습니다. 먼저 단어를 추가해 주세요.");
    wordGroup = selectedGroup;
    renderWords();
    return;
  }

  const quizEnv = wordQuizSettings();
  const choicePool = isWrongQuiz && words.length > 1 ? words : pool;
  const questions = shuffle(pool)
    .slice(0, Math.min(quizEnv.quizSize, pool.length))
    .map((word) => ({
      ...word,
      choices: quizEnv.quizFormat === "객관식" ? buildChoiceOptions(word, choicePool) : null,
    }));
  quiz = {
    kind: "word",
    questions,
    index: 0,
    answers: [],
    startedAt: Date.now(),
    timeLimitMs: quizEnv.quizMinutes * 60 * 1000,
    format: quizEnv.quizFormat,
    group: selectedGroup,
    hintLevel: 0,
  };
  renderQuiz();
  startQuizTimer();
}

function buildChoiceOptions(current, pool = words) {
  const distractors = shuffle(pool.filter((word) => word.id !== current.id && word.meaning !== current.meaning))
    .map((word) => word.meaning)
    .filter((meaning, index, list) => list.indexOf(meaning) === index)
    .slice(0, 4);
  return shuffle([current.meaning, ...distractors]);
}

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatElapsedPrecise(ms) {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = String(Math.floor(totalMs / 3600000)).padStart(2, "0");
  const minutes = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, "0");
  const millis = String(totalMs % 1000).padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

function formatElapsedHundredths(ms) {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = String(Math.floor(totalMs / 3600000)).padStart(2, "0");
  const minutes = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, "0");
  const hundredths = String(Math.floor((totalMs % 1000) / 10)).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}.${hundredths}`;
}

function updateQuizTimer() {
  if (!quiz?.startedAt) return;
  const elapsed = Date.now() - quiz.startedAt;
  const timer = document.getElementById("quizTimer");
  const elapsedText = quiz.kind === "writing" ? formatElapsedHundredths(elapsed) : formatElapsedPrecise(elapsed);
  if (timer) timer.textContent = `시험 경과 시간: ${elapsedText}`;
  if (quiz.timeLimitMs && elapsed >= quiz.timeLimitMs) expireQuiz();
}

function expireQuiz() {
  if (!quiz || quiz.expired) return;
  quiz.expired = true;
  stopQuizTimer();
  if (quiz.kind === "writing" && quiz.currentGrade) {
    storeWritingAnswer(quiz.currentGrade);
    quiz.currentGrade = null;
  }
  while (quiz.answers.length < quiz.questions.length) {
    const current = quiz.questions[quiz.answers.length];
    if (quiz.kind === "sentence") {
      quiz.answers.push({
        sentenceId: current.id,
        english: current.english,
        meaning: current.meaning,
        answer: current.answer || "",
        group: current.group || "",
        userAnswer: "시간 초과",
        correct: false,
      });
    } else if (quiz.kind === "writing") {
      quiz.answers.push({
        writingId: current.id,
        korean: current.korean,
        english: current.english,
        aiResult: current.aiResult || "",
        group: current.group || "",
        userAnswer: "시간 초과",
        correct: false,
        verdict: "incorrect",
        totalScore: 0,
      });
    } else {
      quiz.answers.push({
        wordId: current.id,
        english: current.english,
        pos: current.pos || "",
        meaning: current.meaning,
        group: current.group || "",
        userAnswer: "시간 초과",
        correct: false,
      });
    }
  }
  alert("시험 시간이 종료되었습니다.");
  finishQuiz();
}

function startQuizTimer() {
  stopQuizTimer();
  const tick = () => {
    updateQuizTimer();
    if (quiz && !quiz.expired) quizTimerId = requestAnimationFrame(tick);
  };
  quizTimerId = requestAnimationFrame(tick);
}

function stopQuizTimer() {
  if (quizTimerId) {
    cancelAnimationFrame(quizTimerId);
    quizTimerId = null;
  }
}

function englishHintSource(english) {
  return String(english || "").trim();
}

function maxHintLetters(english) {
  return Math.min(MAX_QUIZ_HINT_LETTERS, englishHintSource(english).length);
}

function quizHintPreview(english, level) {
  return englishHintSource(english).slice(0, Math.max(0, Number(level) || 0));
}

function updateQuizHintUi() {
  if (!quiz || quiz.format !== "주관식") return;
  const current = quiz.questions[quiz.index];
  const level = quiz.hintLevel || 0;
  const max = maxHintLetters(current.english);
  const hintEl = document.getElementById("quizHint");
  const hintBtn = document.getElementById("hintBtn");
  if (!hintEl || !hintBtn) return;
  if (level > 0) {
    hintEl.textContent = `힌트: ${quizHintPreview(current.english, level)}`;
    hintEl.classList.remove("hidden");
  } else {
    hintEl.textContent = "";
    hintEl.classList.add("hidden");
  }
  hintBtn.textContent = level === 0 ? "힌트" : "힌트 더보기";
  hintBtn.disabled = max === 0 || level >= max;
}

function revealQuizHint() {
  if (!quiz || quiz.expired || quiz.format !== "주관식") return;
  const current = quiz.questions[quiz.index];
  const max = maxHintLetters(current.english);
  if ((quiz.hintLevel || 0) >= max) return;
  quiz.hintLevel = (quiz.hintLevel || 0) + 1;
  updateQuizHintUi();
  document.getElementById("englishInput")?.focus();
}

function renderQuiz() {
  const current = quiz.questions[quiz.index];
  const total = quiz.questions.length;
  const step = quiz.index + 1;
  updateHeader(`시험 진행 중 · ${quiz.group} · ${step} / ${total}`);

  app.innerHTML = `
    <div class="toolbar">
      <div class="quiz-title-row">
        <h1 class="section-title">단어 시험 시작</h1>
        <div class="quiz-times">
          <span class="quiz-total-time">총 시험 시간: ${formatElapsed(quiz.timeLimitMs)}</span>
          <span class="quiz-timer" id="quizTimer">시험 경과 시간: ${formatElapsedPrecise(Date.now() - quiz.startedAt)}</span>
        </div>
      </div>
      <button class="btn secondary" id="cancelQuiz">그만두기</button>
    </div>
    <div class="quiz-progress">
      <span>${step}번째 문제</span>
      <span>총 ${total}문항</span>
    </div>
    <div class="progress-track"><div class="progress-bar" style="width: ${(step / total) * 100}%"></div></div>
    <p class="lede">${
      quiz.format === "객관식"
        ? "아래 영어 단어의 뜻을 보기에서 고른 뒤 확인을 누르세요. 모르면 모름을 누르세요."
        : "아래 뜻에 맞는 영어 단어를 입력한 뒤 확인을 누르세요. 모르면 모름을 누르세요."
    }</p>
    <div class="quiz-word${quiz.format === "객관식" ? "" : " is-meaning"}">${escapeHtml(
      quiz.format === "객관식" ? current.english : current.meaning,
    )}</div>
    ${
      quiz.format === "주관식"
        ? `
          <div class="quiz-hint-row">
            <p class="quiz-hint hidden" id="quizHint" aria-live="polite"></p>
            <button type="button" class="btn secondary" id="hintBtn">힌트</button>
          </div>
        `
        : ""
    }
    <form id="quizForm">
      ${
        quiz.format === "객관식"
          ? `
            <div class="choice-list">
              ${(current.choices || [])
                .map(
                  (choice, index) => `
                    <label class="choice-option">
                      <input type="radio" name="answer" value="${escapeHtml(choice)}" required />
                      <span>${index + 1}. ${escapeHtml(choice)}</span>
                    </label>
                  `,
                )
                .join("")}
            </div>
            <div class="quiz-actions">
              <button class="btn" type="submit">확인</button>
              <button class="btn secondary" type="button" id="unknownBtn">모름</button>
            </div>
          `
          : `
            <div class="quiz-input-row">
              <div>
                <label for="englishInput">영단어</label>
                <input id="englishInput" name="answer" autocomplete="off" placeholder="영어 단어를 입력하세요" required />
              </div>
              <button class="btn" type="submit">확인</button>
              <button class="btn secondary" type="button" id="unknownBtn">모름</button>
            </div>
          `
      }
    </form>
  `;

  document.getElementById("cancelQuiz").addEventListener("click", () => {
    if (confirm("시험을 중단하고 메인 화면으로 돌아갈까요?")) {
      stopQuizTimer();
      quiz = null;
      renderHome();
    }
  });

  document.getElementById("quizForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = new FormData(event.target).get("answer");
    submitAnswer(String(selected || ""));
  });

  document.getElementById("unknownBtn").addEventListener("click", () => {
    submitAnswer("모름", true);
  });

  const hintBtn = document.getElementById("hintBtn");
  if (hintBtn) {
    hintBtn.addEventListener("click", revealQuizHint);
    updateQuizHintUi();
  }

  const input = document.getElementById("englishInput");
  if (input) input.focus();
}

function submitAnswer(userAnswer, unknown = false) {
  if (!quiz || quiz.expired) return;
  const current = quiz.questions[quiz.index];
  const answer = unknown ? "모름" : userAnswer.trim();
  const correct = unknown
    ? false
    : quiz.format === "객관식"
      ? answer === current.meaning
      : isCorrectEnglish(answer, current.english);
  quiz.answers.push({
    wordId: current.id,
    english: current.english,
    pos: current.pos || "",
    meaning: current.meaning,
    group: current.group || "",
    userAnswer: answer,
    correct,
  });

  if (quiz.index < quiz.questions.length - 1) {
    quiz.index += 1;
    quiz.hintLevel = 0;
    renderQuiz();
    return;
  }

  finishQuiz();
}

function applyQuizStats(answers, group) {
  for (const answer of answers) {
    const wordGroup = WORD_GROUPS.includes(answer.group) ? answer.group : group;
    const word =
      words.find((item) => item.id === answer.wordId) ||
      words.find(
        (item) =>
          item.group === wordGroup && item.english.toLowerCase() === String(answer.english || "").toLowerCase(),
      ) ||
      words.find((item) => item.english.toLowerCase() === String(answer.english || "").toLowerCase());
    if (!word) continue;
    word.count = (Number(word.count) || 0) + 1;
    if (answer.correct) word.ansCount = (Number(word.ansCount) || 0) + 1;
    word.rate = wordRate(word);
  }
}

async function finishQuiz() {
  const currentQuiz = quiz;
  const total = currentQuiz.answers.length;
  const correct = currentQuiz.answers.filter((item) => item.correct).length;
  const record = {
    id: crypto.randomUUID(),
    date: Date.now(),
    duration: Math.max(0, Math.floor((Date.now() - currentQuiz.startedAt) / 1000)),
    total,
    correct,
    group: currentQuiz.group,
    answers: currentQuiz.answers,
    kind: currentQuiz.kind || "word",
  };
  stopQuizTimer();
  quiz = null;
  if (currentQuiz.kind === "sentence") {
    homeTab = "sentence";
    applySentenceQuizStats(currentQuiz.answers, currentQuiz.group);
    sentenceRecords.unshift(record);
    await persistSentencesAndExams();
    renderSentenceResult(record, true);
    return;
  }
  if (currentQuiz.kind === "writing") {
    homeTab = "writing";
    applyWritingQuizStats(currentQuiz.answers, currentQuiz.group);
    writingRecords.unshift(record);
    await persistWritingsAndExams();
    renderWritingResult(record, true);
    return;
  }
  record.group = currentQuiz.group || DEFAULT_WORD_GROUP;
  applyQuizStats(currentQuiz.answers, currentQuiz.group);
  records.unshift(record);
  await persistExamsAndWords();
  renderResult(record, true);
}

function renderSentenceResult(record, justFinished) {
  const percent = Math.round((record.correct / record.total) * 100);
  const wrongCount = record.total - record.correct;
  homeTab = "sentence";
  updateHeader(justFinished ? "시험 완료" : "문장 시험 기록 상세");

  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">${justFinished ? "시험 결과표" : "문장 시험 기록 상세"}</h1>
      <div class="actions">
        ${justFinished ? '<button class="btn" id="retryBtn">다시 시험</button>' : ""}
        <button class="btn secondary" id="backBtn">${justFinished ? "홈으로" : "목록으로"}</button>
      </div>
    </div>
    <div class="scoreboard">
      <div class="score-circle">
        <div>
          <span class="score-label">점수</span>
          <strong>${percent}</strong>
          <span>${record.correct} / ${record.total}</span>
        </div>
      </div>
      <div class="result-card">
        <p class="lede">${formatDate(record.date)}에 치른 시험입니다. 입력한 답과 정답을 비교해 보세요.</p>
        <p>문장 그룹 · ${escapeHtml(record.group || DEFAULT_SENTENCE_GROUP)}</p>
        <p>소요 시간 · ${formatElapsed((Number(record.duration) || 0) * 1000)}</p>
        <p>
          <button type="button" class="result-count-btn ok" data-answer-list="correct">정답 ${record.correct}개</button>
          ·
          <button type="button" class="result-count-btn ng" data-answer-list="wrong">오답 ${wrongCount}개</button>
        </p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>번호</th>
            <th>문장</th>
            <th>뜻</th>
            <th>정답</th>
            <th>입력한 답</th>
            <th>결과</th>
          </tr>
        </thead>
        <tbody>
          ${record.answers
            .map(
              (item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td class="sentence-text${item.correct ? "" : " wrong-emphasis"}">${escapeHtml(item.english)}</td>
                  <td${item.correct ? "" : ' class="wrong-emphasis"'}>${escapeHtml(item.meaning)}</td>
                  <td>${escapeHtml(item.answer || "-")}</td>
                  <td>${escapeHtml(item.userAnswer || "-")}</td>
                  <td><span class="badge ${item.correct ? "ok" : "ng"}">${item.correct ? "정답" : "오답"}</span></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("backBtn").addEventListener("click", () => {
    if (justFinished) renderHome();
    else renderSentenceRecords();
  });

  document.querySelectorAll("[data-answer-list]").forEach((button) => {
    button.addEventListener("click", () => {
      openSentenceAnswerListModal(record, button.dataset.answerList === "correct");
    });
  });

  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.addEventListener("click", () => startSentenceQuiz(record.group));
}

function openSentenceAnswerListModal(record, correctOnly) {
  const items = (record.answers || []).filter((item) => Boolean(item.correct) === correctOnly);
  const label = correctOnly ? "정답" : "오답";
  const listHtml =
    items.length === 0
      ? `<div class="empty-state">${label} 문장이 없습니다.</div>`
      : `
        <div class="table-wrap answer-list-wrap">
          <table>
            <thead>
              <tr>
                <th class="col-num">번호</th>
                <th>문장</th>
                <th>뜻</th>
                <th>정답</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, index) => `
                    <tr>
                      <td class="col-num">${index + 1}</td>
                      <td class="sentence-text">${escapeHtml(item.english)}</td>
                      <td>${escapeHtml(item.meaning)}</td>
                      <td>${escapeHtml(item.answer || "-")}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

  openModal(
    `${label} 문장 · ${items.length}개`,
    `
      ${listHtml}
      <div class="modal-actions">
        <button type="button" class="btn secondary" id="closeAnswerList">닫기</button>
      </div>
    `,
  );
  document.getElementById("closeAnswerList").addEventListener("click", closeModal);
}

function collectWrongSentences() {
  const seen = new Set();
  const items = [];
  for (const record of sentenceRecords) {
    for (const answer of record.answers || []) {
      if (answer.correct) continue;
      const english = String(answer.english || "").trim();
      if (!english) continue;
      const group = resolveSentenceGroup(answer.group || record.group);
      const key = `${group}::${english.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        english,
        meaning: answer.meaning || "",
        answer: answer.answer || "",
        group,
      });
    }
  }
  return items.sort((a, b) => a.english.localeCompare(b.english, "en", { sensitivity: "base" }));
}

function openAllWrongSentencesModal() {
  const items = collectWrongSentences();
  const listHtml =
    items.length === 0
      ? `<div class="empty-state">전체 시험에서 오답인 문장이 없습니다.</div>`
      : `
        <div class="table-wrap answer-list-wrap wrong-note-wrap">
          <table>
            <thead>
              <tr>
                <th class="col-num">번호</th>
                <th>문장</th>
                <th>뜻</th>
                <th>정답</th>
                <th>문장 그룹</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, index) => `
                    <tr>
                      <td class="col-num">${index + 1}</td>
                      <td class="sentence-text">${escapeHtml(item.english)}</td>
                      <td>${escapeHtml(item.meaning)}</td>
                      <td>${escapeHtml(item.answer || "-")}</td>
                      <td>${escapeHtml(item.group)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

  openModal(
    `오답 노트 · ${items.length}개`,
    `
      ${listHtml}
      <div class="modal-actions">
        <button type="button" class="btn secondary" id="closeAnswerList">닫기</button>
      </div>
    `,
  );
  document.getElementById("closeAnswerList").addEventListener("click", closeModal);
}

function renderSentenceRecords() {
  homeTab = "sentence";
  updateHeader(`문장 시험 기록 · ${sentenceRecords.length}건`);
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">문장 시험 기록 조회</h1>
      <div class="actions">
        <button class="btn" id="openWrongSentences">오답 노트</button>
        <button class="btn secondary" id="backHome">홈으로</button>
      </div>
    </div>
    <div id="sentenceRecordList"></div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  document.getElementById("openWrongSentences").addEventListener("click", openAllWrongSentencesModal);
  const list = document.getElementById("sentenceRecordList");

  if (sentenceRecords.length === 0) {
    list.innerHTML = `<div class="empty-state">아직 저장된 문장 시험 기록이 없습니다.</div>`;
    return;
  }

  list.innerHTML = `
    <div class="history-list">
      ${sentenceRecords
        .map((record) => {
          const percent = Math.round((record.correct / record.total) * 100);
          return `
            <article class="history-card">
              <div>
                <h3>${percent}점 · ${record.correct}/${record.total}</h3>
                <p>${formatDate(record.date)} · ${escapeHtml(record.group || DEFAULT_SENTENCE_GROUP)} · ${record.total}문항 · ${formatElapsed((Number(record.duration) || 0) * 1000)}</p>
              </div>
              <button class="btn secondary" data-record="${record.id}">상세 보기</button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  list.querySelectorAll("[data-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = sentenceRecords.find((item) => item.id === button.dataset.record);
      if (record) renderSentenceResult(record, false);
    });
  });
}

function renderResult(record, justFinished) {
  const percent = Math.round((record.correct / record.total) * 100);
  const wrongCount = record.total - record.correct;
  updateHeader(justFinished ? "시험 완료" : "단어 시험 기록 상세");

  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">${justFinished ? "시험 결과표" : "단어 시험 기록 상세"}</h1>
      <div class="actions">
        ${justFinished ? '<button class="btn" id="retryBtn">다시 시험</button>' : ""}
        <button class="btn secondary" id="backBtn">${justFinished ? "홈으로" : "목록으로"}</button>
      </div>
    </div>
    <div class="scoreboard">
      <div class="score-circle">
        <div>
          <span class="score-label">점수</span>
          <strong>${percent}</strong>
          <span>${record.correct} / ${record.total}</span>
        </div>
      </div>
      <div class="result-card">
        <p class="lede">${formatDate(record.date)}에 치른 시험입니다. 입력한 답과 정답을 비교해 보세요.</p>
        <p>단어 그룹 · ${escapeHtml(record.group || DEFAULT_WORD_GROUP)}</p>
        <p>소요 시간 · ${formatElapsed((Number(record.duration) || 0) * 1000)}</p>
        <p>
          <button type="button" class="result-count-btn ok" data-answer-list="correct">정답 ${record.correct}개</button>
          ·
          <button type="button" class="result-count-btn ng" data-answer-list="wrong">오답 ${wrongCount}개</button>
        </p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>번호</th>
            <th>영단어</th>
            <th>원래 뜻</th>
            <th>입력한 답</th>
            <th>결과</th>
          </tr>
        </thead>
        <tbody>
          ${record.answers
            .map(
              (item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td${item.correct ? "" : ' class="wrong-emphasis"'}>${escapeHtml(item.english)}</td>
                  <td${item.correct ? "" : ' class="wrong-emphasis"'}>${escapeHtml(item.meaning)}</td>
                  <td>${escapeHtml(item.userAnswer || "-")}</td>
                  <td><span class="badge ${item.correct ? "ok" : "ng"}">${item.correct ? "정답" : "오답"}</span></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("backBtn").addEventListener("click", () => {
    if (justFinished) renderHome();
    else renderRecords();
  });

  document.querySelectorAll("[data-answer-list]").forEach((button) => {
    button.addEventListener("click", () => {
      openAnswerListModal(record, button.dataset.answerList === "correct");
    });
  });

  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.addEventListener("click", () => startQuiz(record.group));
}

function answerPos(item, record) {
  if (item.pos) return item.pos;
  const english = String(item.english || "").toLowerCase();
  const match = words.find(
    (word) =>
      word.english.toLowerCase() === english &&
      (!record?.group || word.group === record.group),
  );
  return match?.pos || "-";
}

function openAnswerListModal(record, correctOnly) {
  const items = (record.answers || []).filter((item) => Boolean(item.correct) === correctOnly);
  const label = correctOnly ? "정답" : "오답";
  const listHtml =
    items.length === 0
      ? `<div class="empty-state">${label} 단어가 없습니다.</div>`
      : `
        <div class="table-wrap answer-list-wrap">
          <table>
            <thead>
              <tr>
                <th class="col-num">번호</th>
                <th>영단어</th>
                <th>품사</th>
                <th>뜻</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, index) => `
                    <tr>
                      <td class="col-num">${index + 1}</td>
                      <td>${escapeHtml(item.english)}</td>
                      <td><span class="pos-tag">${escapeHtml(answerPos(item, record))}</span></td>
                      <td>${escapeHtml(item.meaning)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

  openModal(
    `${label} 단어 · ${items.length}개`,
    `
      ${listHtml}
      <div class="modal-actions">
        <button type="button" class="btn secondary" id="closeAnswerList">닫기</button>
      </div>
    `,
  );
  document.getElementById("closeAnswerList").addEventListener("click", closeModal);
}

function renderWords() {
  selectedWordIds = new Set();
  updateHeader(`단어 관리 · ${wordGroup} · ${wordsInGroup(wordGroup).length}개`);
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">단어 관리</h1>
      <div class="actions">
        <button class="btn" id="openAddWord">단어 추가</button>
        <button class="btn secondary" id="backHome">홈으로</button>
      </div>
    </div>
    <label class="group-select-wrap" for="wordGroupSelect">
      단어 그룹
      <select id="wordGroupSelect">${groupOptions(wordGroup)}</select>
    </label>
    <div class="search-row">
      <input id="wordSearch" placeholder="단어 또는 뜻 검색" />
      <label class="page-size-wrap" for="pageSizeInput">
        페이지당
        <input id="pageSizeInput" type="number" min="1" max="200" value="${wordPageSize}" />
        개
      </label>
      <div class="sort-wrap">
        <button type="button" class="btn secondary" id="sortBtn">정렬 · ${currentSortLabel()}</button>
        <div class="sort-panel hidden" id="sortPanel">
          ${SORT_OPTIONS.map(
            (option) => `
              <button type="button" class="sort-option ${option.id === wordSort ? "active" : ""}" data-sort="${option.id}">
                ${option.label}
              </button>
            `,
          ).join("")}
        </div>
      </div>
    </div>
    <div id="wordTable"></div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  document.getElementById("openAddWord").addEventListener("click", openAddModal);
  document.getElementById("wordGroupSelect").addEventListener("change", (event) => {
    wordGroup = event.target.value;
    wordPage = 1;
    selectedWordIds = new Set();
    drawWordTable(document.getElementById("wordSearch").value);
  });

  const search = document.getElementById("wordSearch");
  const pageSizeInput = document.getElementById("pageSizeInput");
  const sortBtn = document.getElementById("sortBtn");
  const sortPanel = document.getElementById("sortPanel");

  search.addEventListener("input", () => {
    wordPage = 1;
    drawWordTable(search.value);
  });
  pageSizeInput.addEventListener("change", () => {
    const nextSize = Number(pageSizeInput.value);
    if (!Number.isInteger(nextSize) || nextSize < 1) {
      pageSizeInput.value = String(wordPageSize);
      return;
    }
    wordPageSize = Math.min(nextSize, 200);
    pageSizeInput.value = String(wordPageSize);
    wordPage = 1;
    drawWordTable(search.value);
  });
  sortBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    sortPanel.classList.toggle("hidden");
  });
  sortPanel.querySelectorAll("[data-sort]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      wordSort = option.dataset.sort;
      sortBtn.textContent = `정렬 · ${currentSortLabel()}`;
      sortPanel.querySelectorAll("[data-sort]").forEach((item) => {
        item.classList.toggle("active", item.dataset.sort === wordSort);
      });
      sortPanel.classList.add("hidden");
      wordPage = 1;
      drawWordTable(search.value);
    });
  });
  drawWordTable("");
}

function drawWordTable(keyword) {
  const grouped = wordsInGroup(wordGroup);
  updateHeader(`단어 관리 · ${wordGroup} · ${grouped.length}개`);
  const query = keyword.trim().toLowerCase();
  const filtered = sortWords(
    grouped.filter(
      (word) =>
        word.english.toLowerCase().includes(query) ||
        word.meaning.toLowerCase().includes(query) ||
        (word.pos || "").includes(query),
    ),
  );

  const target = document.getElementById("wordTable");
  if (filtered.length === 0) {
    target.innerHTML = `<div class="empty-state">표시할 단어가 없습니다.</div>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / wordPageSize));
  wordPage = Math.min(Math.max(1, wordPage), totalPages);
  const start = (wordPage - 1) * wordPageSize;
  const pageItems = filtered.slice(start, start + wordPageSize);
  const atFirst = wordPage === 1;
  const atLast = wordPage === totalPages;

  target.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-num">번호</th>
            <th>영어 단어</th>
            <th>품사</th>
            <th>뜻</th>
            <th>정답율</th>
            <th class="col-manage">
              <div class="manage-head">
                <span>관리</span>
                <button type="button" class="icon-btn" id="bulkDeleteBtn" ${selectedWordIds.size === 0 ? "disabled" : ""}>
                  선택 삭제${selectedWordIds.size ? ` (${selectedWordIds.size})` : ""}
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          ${pageItems
            .map(
              (word, index) => `
                <tr>
                  <td class="col-num">${start + index + 1}</td>
                  <td>${escapeHtml(word.english)}</td>
                  <td><span class="pos-tag">${escapeHtml(word.pos || "-")}</span></td>
                  <td>${escapeHtml(word.meaning)}</td>
                  <td class="col-rate">${formatAccuracy(word)}</td>
                  <td>
                    <div class="actions">
                      <button class="icon-btn" data-edit="${word.id}">변경</button>
                      <button class="icon-btn" data-delete="${word.id}">삭제</button>
                      <input
                        class="word-check"
                        type="checkbox"
                        data-select="${word.id}"
                        aria-label="${escapeHtml(word.english)} 선택"
                        ${selectedWordIds.has(word.id) ? "checked" : ""}
                      />
                    </div>
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="pager">
      <button type="button" class="btn secondary" data-page="first" ${atFirst ? "disabled" : ""}>처음으로</button>
      <button type="button" class="btn secondary" data-page="prev" ${atFirst ? "disabled" : ""}>앞으로</button>
      <span class="pager-status">${wordPage} / ${totalPages} 페이지 · ${filtered.length}개</span>
      <button type="button" class="btn secondary" data-page="next" ${atLast ? "disabled" : ""}>뒤로</button>
      <button type="button" class="btn secondary" data-page="last" ${atLast ? "disabled" : ""}>끝으로</button>
    </div>
  `;

  target.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditModal(button.dataset.edit));
  });
  target.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteWord(button.dataset.delete));
  });
  target.querySelectorAll("[data-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedWordIds.add(checkbox.dataset.select);
      else selectedWordIds.delete(checkbox.dataset.select);
      updateBulkDeleteButton();
    });
  });
  document.getElementById("bulkDeleteBtn")?.addEventListener("click", () => deleteSelectedWords(keyword));
  target.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.page === "first") wordPage = 1;
      if (button.dataset.page === "prev") wordPage -= 1;
      if (button.dataset.page === "next") wordPage += 1;
      if (button.dataset.page === "last") wordPage = totalPages;
      drawWordTable(keyword);
    });
  });
}

function openAddModal() {
  openModal(
    `단어 추가 · ${wordGroup}`,
    `
      <p class="import-hint">선택한 그룹(${escapeHtml(wordGroup)})에 단어가 추가됩니다.</p>
      <div class="import-row">
        <button type="button" class="btn secondary" id="importFileBtn">파일로 추가</button>
        <input id="importFileInput" type="file" accept=".txt,.csv,.json,text/plain,text/csv,application/json" hidden />
      </div>
      <p class="import-hint">txt, csv, json 파일 · 한 줄에 단어 (품사) 뜻1, 뜻2</p>
      <div class="import-divider">또는 직접 입력</div>
      <form id="addWordForm">
        <label for="newEnglish">영어 단어</label>
        <input id="newEnglish" name="english" placeholder="예: expand" required />
        <div class="modal-field-gap"></div>
        <label for="newPos">품사</label>
        <select id="newPos" name="pos" required>${posOptions("명사")}</select>
        <div class="modal-field-gap"></div>
        <label for="newMeaning">뜻</label>
        <input id="newMeaning" name="meaning" placeholder="예: 확장하다" required />
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="cancelAdd">취소</button>
          <button type="submit" class="btn">추가</button>
        </div>
      </form>
    `,
  );

  document.getElementById("newEnglish").focus();
  document.getElementById("cancelAdd").addEventListener("click", closeModal);
  document.getElementById("importFileBtn").addEventListener("click", () => {
    document.getElementById("importFileInput").click();
  });
  document.getElementById("importFileInput").addEventListener("change", handleWordFile);
  document.getElementById("addWordForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const english = event.target.english.value.trim();
    const meaning = event.target.meaning.value.trim();
    const pos = event.target.pos.value;
    if (wordsInGroup(wordGroup).some((word) => word.english.toLowerCase() === english.toLowerCase())) {
      alert("이 그룹에 이미 등록된 단어입니다.");
      return;
    }
    words.unshift(createWord(english, meaning, pos, wordGroup));
    await persistWords();
    closeModal();
    drawWordTable(document.getElementById("wordSearch").value);
  });
}

function handleWordFile(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onerror = () => {
    alert("선택한 파일을 열 수 없습니다.");
  };
  reader.onload = () => {
    try {
      const imported = parseWordFile(file.name, String(reader.result || ""));
      applyImportedWords(imported);
    } catch (error) {
      alert(error.message || "선택한 파일을 열 수 없습니다.");
    }
  };

  try {
    reader.readAsText(file, "UTF-8");
  } catch {
    alert("선택한 파일을 열 수 없습니다.");
  }
}

function parseWordFile(filename, text) {
  const content = text.replace(/^\uFEFF/, "").trim();
  if (!content) throw new Error("파일 내용이 비어 있어 단어를 추가할 수 없습니다.");

  const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
  let imported = [];

  if (ext === "json") {
    imported = parseJsonWords(content);
  } else {
    imported = parseLineWords(content);
  }

  if (!imported.length) throw new Error("파일에서 추가할 단어를 찾지 못했습니다.");
  return imported;
}

function parseJsonWords(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSON 파일 형식이 올바르지 않습니다.");
  }

  const list = Array.isArray(data) ? data : data.words || data.items || data.단어;
  if (!Array.isArray(list)) throw new Error("JSON 파일에서 단어 목록을 찾지 못했습니다.");
  return list.map(jsonItemToWord).filter(Boolean);
}

function pickField(item, keys) {
  for (const key of keys) {
    if (item[key] != null && String(item[key]).trim()) return String(item[key]).trim();
  }
  return "";
}

function jsonItemToWord(item) {
  if (typeof item === "string") return parseWordLine(item);
  if (Array.isArray(item)) return parseWordLine(item.filter((value) => value != null && String(value).trim()).join(" "));
  if (!item || typeof item !== "object") return null;

  const line = pickField(item, ["line", "text", "내용"]);
  if (line) return parseWordLine(line);

  const english = pickField(item, ["english", "word", "단어", "영단어", "en"]);
  const pos = resolvePos(pickField(item, ["pos", "partOfSpeech", "품사"])) || "명사";
  const meaning1 = pickField(item, ["meaning1", "meaning", "뜻1", "뜻", "definition"]);
  const meaning2 = pickField(item, ["meaning2", "뜻2"]);
  const meaning = [meaning1, meaning2].filter(Boolean).join(", ");
  if (!english || !meaning) return null;
  return { english, meaning, pos };
}

function parseLineWords(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map(parseWordLine)
    .filter(Boolean);
}

function parseWordLine(line) {
  const text = String(line || "").trim();
  if (!text || /^(단어|word|english)\b/i.test(text) && /(품사|뜻|meaning)/i.test(text)) return null;

  const withPos = text.match(/^(.+?)\s*\(([^)]+)\)\s+(.+)$/);
  if (withPos) {
    const english = withPos[1].trim();
    const pos = resolvePos(withPos[2]) || "명사";
    const meaning = formatMeanings(withPos[3]);
    if (!english || !meaning) return null;
    return { english, meaning, pos };
  }

  const withoutPos = text.match(/^([A-Za-z][A-Za-z0-9\s\-'’]+?)\s+(.+)$/);
  if (withoutPos) {
    const english = withoutPos[1].trim();
    const meaning = formatMeanings(withoutPos[2]);
    if (!english || !meaning) return null;
    return { english, meaning, pos: "명사" };
  }

  return null;
}

function formatMeanings(text) {
  return String(text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

async function applyImportedWords(imported) {
  const addedWords = [];
  let skipped = 0;

  for (const item of imported) {
    const exists = wordsInGroup(wordGroup).some((word) => word.english.toLowerCase() === item.english.toLowerCase());
    const alreadyQueued = addedWords.some((word) => word.english.toLowerCase() === item.english.toLowerCase());
    if (exists || alreadyQueued) {
      skipped += 1;
      continue;
    }
    addedWords.push(createWord(item.english, item.meaning, item.pos, wordGroup));
  }

  if (!addedWords.length) {
    alert(skipped ? "이미 등록된 단어만 있어 추가되지 않았습니다." : "파일에서 추가할 단어를 찾지 못했습니다.");
    return;
  }

  words = [...addedWords, ...words];
  await persistWords();
  wordPage = 1;
  closeModal();
  drawWordTable(document.getElementById("wordSearch").value);
  alert(
    skipped
      ? `${addedWords.length}개 단어를 추가했습니다. 중복 ${skipped}개는 건너뛰었습니다.`
      : `${addedWords.length}개 단어를 추가했습니다.`,
  );
}

function openEditModal(id) {
  const word = words.find((item) => item.id === id);
  if (!word) return;

  openModal(
    "단어 변경",
    `
      <form id="editWordForm">
        <label for="editEnglish">영어 단어</label>
        <input id="editEnglish" name="english" value="${escapeHtml(word.english)}" required />
        <div class="modal-field-gap"></div>
        <label for="editPos">품사</label>
        <select id="editPos" name="pos" required>${posOptions(word.pos || "명사")}</select>
        <div class="modal-field-gap"></div>
        <label for="editMeaning">뜻</label>
        <input id="editMeaning" name="meaning" value="${escapeHtml(word.meaning)}" required />
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="cancelEdit">취소</button>
          <button type="submit" class="btn">저장</button>
        </div>
      </form>
    `,
  );

  document.getElementById("cancelEdit").addEventListener("click", closeModal);
  document.getElementById("editWordForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const english = event.target.english.value.trim();
    const meaning = event.target.meaning.value.trim();
    const pos = event.target.pos.value;
    const duplicated = words.some(
      (item) =>
        item.id !== id &&
        item.group === word.group &&
        item.english.toLowerCase() === english.toLowerCase(),
    );
    if (duplicated) {
      alert("이 그룹에 이미 등록된 단어입니다.");
      return;
    }
    word.english = english;
    word.meaning = meaning;
    word.pos = pos;
    await persistWords();
    closeModal();
    drawWordTable(document.getElementById("wordSearch").value);
  });
}

async function deleteWord(id) {
  const word = words.find((item) => item.id === id);
  if (!word) return;
  if (!confirm(`'${word.english}' 단어를 삭제할까요?`)) return;
  selectedWordIds.delete(id);
  words = words.filter((item) => item.id !== id);
  await persistWords();
  drawWordTable(document.getElementById("wordSearch").value);
}

function updateBulkDeleteButton() {
  const button = document.getElementById("bulkDeleteBtn");
  if (!button) return;
  button.disabled = selectedWordIds.size === 0;
  button.textContent = selectedWordIds.size ? `선택 삭제 (${selectedWordIds.size})` : "선택 삭제";
}

async function deleteSelectedWords(keyword = "") {
  const ids = [...selectedWordIds];
  if (!ids.length) {
    alert("삭제할 단어를 선택해 주세요.");
    return;
  }
  if (!confirm(`선택한 단어 ${ids.length}개를 삭제할까요?`)) return;
  words = words.filter((item) => !selectedWordIds.has(item.id));
  selectedWordIds = new Set();
  await persistWords();
  drawWordTable(keyword);
}

function collectWrongWords() {
  const seen = new Set();
  const items = [];
  for (const record of records) {
    for (const answer of record.answers || []) {
      if (answer.correct) continue;
      const english = String(answer.english || "").trim();
      if (!english) continue;
      const group = answerGroup(answer, record);
      const key = `${group}::${english.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        english,
        pos: answerPos(answer, record),
        meaning: answer.meaning || "",
        group,
      });
    }
  }
  return items.sort((a, b) => a.english.localeCompare(b.english, "en", { sensitivity: "base" }));
}

function openAllWrongWordsModal() {
  const items = collectWrongWords();
  const listHtml =
    items.length === 0
      ? `<div class="empty-state">전체 시험에서 오답인 단어가 없습니다.</div>`
      : `
        <div class="table-wrap answer-list-wrap wrong-note-wrap">
          <table>
            <thead>
              <tr>
                <th class="col-num">번호</th>
                <th>영단어</th>
                <th>품사</th>
                <th>뜻</th>
                <th>단어 그룹</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, index) => `
                    <tr>
                      <td class="col-num">${index + 1}</td>
                      <td>${escapeHtml(item.english)}</td>
                      <td><span class="pos-tag">${escapeHtml(item.pos)}</span></td>
                      <td>${escapeHtml(item.meaning)}</td>
                      <td>${escapeHtml(item.group)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

  openModal(
    `오답 노트 · ${items.length}개`,
    `
      ${listHtml}
      <div class="modal-actions">
        <button type="button" class="btn secondary" id="closeAnswerList">닫기</button>
      </div>
    `,
  );
  document.getElementById("closeAnswerList").addEventListener("click", closeModal);
}

function renderRecords() {
  updateHeader(`단어 시험 기록 · ${records.length}건`);
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">단어 시험 기록 조회</h1>
      <div class="actions">
        <button class="btn" id="openWrongWords">오답 노트</button>
        <button class="btn secondary" id="backHome">홈으로</button>
      </div>
    </div>
    <div id="recordList"></div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  document.getElementById("openWrongWords").addEventListener("click", openAllWrongWordsModal);
  const list = document.getElementById("recordList");

  if (records.length === 0) {
    list.innerHTML = `<div class="empty-state">아직 저장된 시험 기록이 없습니다.</div>`;
    return;
  }

  list.innerHTML = `
    <div class="history-list">
      ${records
        .map((record) => {
          const percent = Math.round((record.correct / record.total) * 100);
          return `
            <article class="history-card">
              <div>
                <h3>${percent}점 · ${record.correct}/${record.total}</h3>
                <p>${formatDate(record.date)} · ${escapeHtml(record.group || DEFAULT_WORD_GROUP)} · ${record.total}문항 · ${formatElapsed((Number(record.duration) || 0) * 1000)}</p>
              </div>
              <button class="btn secondary" data-record="${record.id}">상세 보기</button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  list.querySelectorAll("[data-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = records.find((item) => item.id === button.dataset.record);
      if (record) renderResult(record, false);
    });
  });
}
