const STORAGE_KEYS = {
  words: "vocab-words",
  records: "vocab-records",
  pageSize: "vocab-page-size",
  partsOfSpeech: "vocab-pos",
  settings: "vocab-settings",
};

const QUIZ_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const QUIZ_FORMAT_OPTIONS = ["주관식", "객관식"];
const DEFAULT_QUIZ_SIZE = 30;
const DEFAULT_QUIZ_MINUTES = 10;
const DEFAULT_QUIZ_FORMAT = "주관식";
const MIN_QUIZ_MINUTES = 10;
const MAX_QUIZ_MINUTES = 99;

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

const DEFAULT_WORDS = [
  ["abandon", "버리다, 포기하다", "동사"],
  ["ability", "능력", "명사"],
  ["abundant", "풍부한", "형용사"],
  ["achieve", "성취하다", "동사"],
  ["acquire", "획득하다", "동사"],
  ["adapt", "적응하다", "동사"],
  ["adequate", "충분한, 적절한", "형용사"],
  ["advantage", "이점, 유리함", "명사"],
  ["ancient", "고대의", "형용사"],
  ["anxious", "불안한", "형용사"],
  ["apparent", "명백한", "형용사"],
  ["approach", "접근하다, 접근법", "동사"],
  ["benefit", "이익, 혜택", "명사"],
  ["capable", "유능한", "형용사"],
  ["circumstance", "상황", "명사"],
  ["complex", "복잡한", "형용사"],
  ["conclude", "결론짓다", "동사"],
  ["consider", "고려하다", "동사"],
  ["contribute", "기여하다", "동사"],
  ["decline", "감소하다, 거절하다", "동사"],
  ["demonstrate", "보여주다, 입증하다", "동사"],
  ["distinct", "뚜렷한, 구별되는", "형용사"],
  ["efficient", "효율적인", "형용사"],
  ["emphasize", "강조하다", "동사"],
  ["establish", "설립하다, 확립하다", "동사"],
  ["evaluate", "평가하다", "동사"],
  ["evidence", "증거", "명사"],
  ["expand", "확장하다", "동사"],
  ["frequent", "빈번한", "형용사"],
  ["generate", "생성하다", "동사"],
  ["identify", "확인하다, 식별하다", "동사"],
  ["indicate", "나타내다", "동사"],
  ["maintain", "유지하다", "동사"],
  ["obtain", "얻다", "동사"],
  ["occur", "발생하다", "동사"],
  ["precise", "정확한", "형용사"],
  ["require", "요구하다", "동사"],
  ["significant", "중요한, 상당한", "형용사"],
  ["sufficient", "충분한", "형용사"],
  ["various", "다양한", "형용사"],
];

const DEFAULT_POS_BY_ENGLISH = new Map(DEFAULT_WORDS.map(([english, , pos]) => [english.toLowerCase(), pos]));

const app = document.getElementById("app");
const headerMeta = document.getElementById("headerMeta");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

let words = loadWords();
let records = loadRecords();
let partsOfSpeech = loadPartsOfSpeech();
let quiz = null;
let quizTimerId = null;
let wordSort = "date";
let wordPage = 1;
let wordPageSize = loadPageSize();
let wordGroup = DEFAULT_WORD_GROUP;
let settings = loadSettings();

document.getElementById("homeBtn").addEventListener("click", () => {
  if (quiz && !confirm("진행 중인 시험을 종료하고 메인 화면으로 돌아갈까요?")) return;
  stopQuizTimer();
  quiz = null;
  renderHome();
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

renderHome();

function loadWords() {
  const saved = localStorage.getItem(STORAGE_KEYS.words);
  if (saved) return migrateWords(JSON.parse(saved));
  const seeded = DEFAULT_WORDS.map(([english, meaning, pos]) => createWord(english, meaning, pos, DEFAULT_WORD_GROUP));
  localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(seeded));
  return seeded;
}

function migrateWords(list) {
  let changed = false;
  const migrated = list.map((word) => {
    let next = word;
    if (!word.pos) {
      changed = true;
      next = {
        ...next,
        pos: DEFAULT_POS_BY_ENGLISH.get(word.english.toLowerCase()) || "명사",
      };
    }
    if (!WORD_GROUPS.includes(word.group)) {
      changed = true;
      next = { ...next, group: DEFAULT_WORD_GROUP };
    }
    return next;
  });
  if (changed) localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(migrated));
  return migrated;
}

function wordsInGroup(group) {
  return words.filter((word) => word.group === group);
}

function groupOptions(selected) {
  return WORD_GROUPS.map(
    (group) => `<option value="${escapeHtml(group)}" ${group === selected ? "selected" : ""}>${escapeHtml(group)}</option>`,
  ).join("");
}

function loadSettings() {
  const defaults = {
    quizSize: DEFAULT_QUIZ_SIZE,
    quizMinutes: DEFAULT_QUIZ_MINUTES,
    quizFormat: DEFAULT_QUIZ_FORMAT,
  };
  const saved = localStorage.getItem(STORAGE_KEYS.settings);
  if (!saved) return defaults;
  try {
    const parsed = JSON.parse(saved);
    const quizSize = QUIZ_SIZE_OPTIONS.includes(parsed.quizSize) ? parsed.quizSize : defaults.quizSize;
    const minutes = Number(parsed.quizMinutes);
    const quizMinutes =
      Number.isInteger(minutes) && minutes >= MIN_QUIZ_MINUTES && minutes <= MAX_QUIZ_MINUTES
        ? minutes
        : defaults.quizMinutes;
    const quizFormat = QUIZ_FORMAT_OPTIONS.includes(parsed.quizFormat) ? parsed.quizFormat : defaults.quizFormat;
    return { quizSize, quizMinutes, quizFormat };
  } catch {
    return defaults;
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

function loadPageSize() {
  const saved = Number(localStorage.getItem(STORAGE_KEYS.pageSize));
  if (Number.isInteger(saved) && saved >= 1 && saved <= 200) return saved;
  return DEFAULT_PAGE_SIZE;
}

function savePageSize() {
  localStorage.setItem(STORAGE_KEYS.pageSize, String(wordPageSize));
}

function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEYS.records);
  return saved ? JSON.parse(saved) : [];
}

function saveWords() {
  localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(words));
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

function createWord(english, meaning, pos, group) {
  return {
    id: crypto.randomUUID(),
    english: english.trim(),
    meaning: meaning.trim(),
    pos: pos || "명사",
    group: WORD_GROUPS.includes(group) ? group : DEFAULT_WORD_GROUP,
    createdAt: Date.now(),
  };
}

function loadPartsOfSpeech() {
  const saved = localStorage.getItem(STORAGE_KEYS.partsOfSpeech);
  const extras = saved ? JSON.parse(saved) : [];
  const merged = [...DEFAULT_PARTS_OF_SPEECH];
  for (const pos of extras) {
    const name = String(pos || "").trim();
    if (name && !merged.includes(name)) merged.push(name);
  }
  return merged;
}

function savePartsOfSpeech() {
  const extras = partsOfSpeech.filter((pos) => !DEFAULT_PARTS_OF_SPEECH.includes(pos));
  localStorage.setItem(STORAGE_KEYS.partsOfSpeech, JSON.stringify(extras));
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
  savePartsOfSpeech();
  return pos;
}

function posOptions(selected) {
  return partsOfSpeech.map(
    (pos) => `<option value="${escapeHtml(pos)}" ${pos === selected ? "selected" : ""}>${escapeHtml(pos)}</option>`,
  ).join("");
}

function buildWordStats() {
  const byId = new Map();
  const byEnglish = new Map();

  for (const record of records) {
    for (const answer of record.answers || []) {
      const target = answer.wordId ? byId : byEnglish;
      const key = answer.wordId || answer.english.toLowerCase();
      const current = target.get(key) || { asked: 0, correct: 0 };
      current.asked += 1;
      if (answer.correct) current.correct += 1;
      target.set(key, current);
    }
  }

  return { byId, byEnglish };
}

function getWordAccuracy(word, stats) {
  const fromId = stats.byId.get(word.id) || { asked: 0, correct: 0 };
  const fromEnglish = stats.byEnglish.get(word.english.toLowerCase()) || { asked: 0, correct: 0 };
  return {
    asked: fromId.asked + fromEnglish.asked,
    correct: fromId.correct + fromEnglish.correct,
  };
}

function currentSortLabel() {
  return SORT_OPTIONS.find((option) => option.id === wordSort)?.label || "등록일순";
}

function sortWords(list, stats) {
  return [...list].sort((a, b) => {
    if (wordSort === "alpha") {
      return a.english.localeCompare(b.english, "en", { sensitivity: "base" });
    }

    if (wordSort === "rate") {
      const aAcc = getWordAccuracy(a, stats);
      const bAcc = getWordAccuracy(b, stats);
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

function formatAccuracy(word, stats) {
  const { asked, correct } = getWordAccuracy(word, stats);
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

function renderHome() {
  const latest = records[0];
  updateHeader(`단어 ${words.length}개 · 기록 ${records.length}건`);
  app.innerHTML = `
    <section class="hero">
      <h1>오늘 외울 단어를<br />시험으로 점검하세요</h1>
      <p>영어 단어를 보고 뜻을 입력한 뒤, 결과표와 기록을 바로 확인할 수 있습니다.</p>
    </section>
    <div class="menu-grid">
      <button class="menu-card" data-view="quiz">
        <span class="menu-index">01</span>
        <h2>시험 시작</h2>
        <p>단어 그룹을 고른 뒤 ${settings.quizSize}문항 · ${settings.quizFormat} 시험을 시작합니다.</p>
      </button>
      <button class="menu-card" data-view="words">
        <span class="menu-index">02</span>
        <h2>단어 관리</h2>
        <p>단어 목록을 추가, 수정, 삭제합니다.</p>
      </button>
      <button class="menu-card" data-view="records">
        <span class="menu-index">03</span>
        <h2>시험 기록 조회</h2>
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
        <span>저장된 시험 기록</span>
      </div>
      <div class="stat-card">
        <strong>${latest ? `${latest.correct}/${latest.total}` : "-"}</strong>
        <span>최근 시험 점수</span>
      </div>
    </div>
    <div class="home-settings">
      <button type="button" class="btn secondary" id="openSettings">환경 설정</button>
    </div>
  `;

  app.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      if (view === "quiz") renderQuizGroupPicker();
      if (view === "words") renderWords();
      if (view === "records") renderRecords();
    });
  });
  document.getElementById("openSettings").addEventListener("click", renderSettings);
}

function renderSettings() {
  updateHeader("환경 설정");
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">환경 설정</h1>
      <button class="btn secondary" id="backHome">홈으로</button>
    </div>
    <form class="settings-form" id="settingsForm">
      <div>
        <label for="quizSizeSelect">시험 문항 수</label>
        <select id="quizSizeSelect" name="quizSize">
          ${QUIZ_SIZE_OPTIONS.map(
            (size) => `<option value="${size}" ${size === settings.quizSize ? "selected" : ""}>${size}문항</option>`,
          ).join("")}
        </select>
      </div>
      <div>
        <label for="quizMinutesInput">시험 시간 (분)</label>
        <input
          id="quizMinutesInput"
          name="quizMinutes"
          type="number"
          min="${MIN_QUIZ_MINUTES}"
          max="${MAX_QUIZ_MINUTES}"
          value="${settings.quizMinutes}"
          required
        />
        <p class="settings-hint">${MIN_QUIZ_MINUTES}분부터 ${MAX_QUIZ_MINUTES}분까지 입력할 수 있습니다.</p>
      </div>
      <div>
        <label for="quizFormatSelect">문제 형식</label>
        <select id="quizFormatSelect" name="quizFormat">
          ${QUIZ_FORMAT_OPTIONS.map(
            (format) => `<option value="${format}" ${format === settings.quizFormat ? "selected" : ""}>${format}</option>`,
          ).join("")}
        </select>
        <p class="settings-hint">주관식은 뜻을 직접 입력하고, 객관식은 5지선다에서 고릅니다.</p>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn">저장</button>
      </div>
    </form>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  document.getElementById("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const quizSize = Number(event.target.quizSize.value);
    const quizMinutes = Number(event.target.quizMinutes.value);
    const quizFormat = event.target.quizFormat.value;
    if (!QUIZ_SIZE_OPTIONS.includes(quizSize)) {
      alert("시험 문항 수를 다시 선택해 주세요.");
      return;
    }
    if (!Number.isInteger(quizMinutes) || quizMinutes < MIN_QUIZ_MINUTES || quizMinutes > MAX_QUIZ_MINUTES) {
      alert(`시험 시간은 ${MIN_QUIZ_MINUTES}분 이상 ${MAX_QUIZ_MINUTES}분 이하로 입력해 주세요.`);
      return;
    }
    if (!QUIZ_FORMAT_OPTIONS.includes(quizFormat)) {
      alert("문제 형식을 다시 선택해 주세요.");
      return;
    }
    settings = { quizSize, quizMinutes, quizFormat };
    saveSettings();
    alert("환경 설정을 저장했습니다.");
    renderHome();
  });
}

function renderQuizGroupPicker() {
  updateHeader("시험 시작 · 그룹 선택");
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">시험 시작</h1>
      <button class="btn secondary" id="backHome">홈으로</button>
    </div>
    <p class="lede">시험을 볼 단어 그룹을 선택하세요.</p>
    <div class="group-picker">
      ${WORD_GROUPS.map((group) => {
        const count = wordsInGroup(group).length;
        return `
          <button type="button" class="menu-card" data-group="${escapeHtml(group)}" ${count === 0 ? "disabled" : ""}>
            <span class="menu-index">${count}개</span>
            <h2>${escapeHtml(group)}</h2>
            <p>${count === 0 ? "등록된 단어가 없습니다." : "이 그룹의 단어로 시험을 시작합니다."}</p>
          </button>
        `;
      }).join("")}
    </div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
  app.querySelectorAll("[data-group]").forEach((button) => {
    button.addEventListener("click", () => startQuiz(button.dataset.group));
  });
}

function startQuiz(group = DEFAULT_WORD_GROUP) {
  const selectedGroup = WORD_GROUPS.includes(group) ? group : DEFAULT_WORD_GROUP;
  const pool = wordsInGroup(selectedGroup);
  if (pool.length === 0) {
    alert("선택한 그룹에 등록된 단어가 없습니다. 먼저 단어를 추가해 주세요.");
    wordGroup = selectedGroup;
    renderWords();
    return;
  }

  const questions = shuffle(pool)
    .slice(0, Math.min(settings.quizSize, pool.length))
    .map((word) => ({
      ...word,
      choices: settings.quizFormat === "객관식" ? buildChoiceOptions(word, pool) : null,
    }));
  quiz = {
    questions,
    index: 0,
    answers: [],
    startedAt: Date.now(),
    timeLimitMs: settings.quizMinutes * 60 * 1000,
    format: settings.quizFormat,
    group: selectedGroup,
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

function updateQuizTimer() {
  if (!quiz?.startedAt) return;
  const elapsed = Date.now() - quiz.startedAt;
  const timer = document.getElementById("quizTimer");
  if (timer) timer.textContent = formatElapsed(elapsed);
  if (quiz.timeLimitMs && elapsed >= quiz.timeLimitMs) expireQuiz();
}

function expireQuiz() {
  if (!quiz || quiz.expired) return;
  quiz.expired = true;
  stopQuizTimer();
  while (quiz.answers.length < quiz.questions.length) {
    const current = quiz.questions[quiz.answers.length];
    quiz.answers.push({
      wordId: current.id,
      english: current.english,
      meaning: current.meaning,
      userAnswer: "시간 초과",
      correct: false,
    });
  }
  alert("시험 시간이 종료되었습니다.");
  finishQuiz();
}

function startQuizTimer() {
  stopQuizTimer();
  updateQuizTimer();
  quizTimerId = setInterval(updateQuizTimer, 250);
}

function stopQuizTimer() {
  if (quizTimerId) {
    clearInterval(quizTimerId);
    quizTimerId = null;
  }
}

function renderQuiz() {
  const current = quiz.questions[quiz.index];
  const total = quiz.questions.length;
  const step = quiz.index + 1;
  updateHeader(`시험 진행 중 · ${quiz.group} · ${step} / ${total}`);

  app.innerHTML = `
    <div class="toolbar">
      <div class="quiz-title-row">
        <h1 class="section-title">시험 시작</h1>
        <span class="quiz-timer" id="quizTimer">${formatElapsed(Date.now() - quiz.startedAt)}</span>
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
        : "아래 영어 단어의 뜻을 입력한 뒤 확인을 누르세요. 모르면 모름을 누르세요."
    }</p>
    <div class="quiz-word">${escapeHtml(current.english)}</div>
    <form id="quizForm">
      ${
        quiz.format === "객관식"
          ? `
            <div class="choice-list">
              ${(current.choices || [])
                .map(
                  (choice, index) => `
                    <label class="choice-option">
                      <input type="radio" name="meaning" value="${escapeHtml(choice)}" required />
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
                <label for="meaningInput">뜻</label>
                <input id="meaningInput" name="meaning" autocomplete="off" placeholder="뜻을 입력하세요" required />
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
    const selected = new FormData(event.target).get("meaning");
    submitAnswer(String(selected || ""));
  });

  document.getElementById("unknownBtn").addEventListener("click", () => {
    submitAnswer("모름", true);
  });

  const input = document.getElementById("meaningInput");
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
      : isCorrectAnswer(answer, current.meaning);
  quiz.answers.push({
    wordId: current.id,
    english: current.english,
    meaning: current.meaning,
    userAnswer: answer,
    correct,
  });

  if (quiz.index < quiz.questions.length - 1) {
    quiz.index += 1;
    renderQuiz();
    return;
  }

  finishQuiz();
}

function finishQuiz() {
  const total = quiz.answers.length;
  const correct = quiz.answers.filter((item) => item.correct).length;
  const record = {
    id: crypto.randomUUID(),
    date: Date.now(),
    total,
    correct,
    group: quiz.group || DEFAULT_WORD_GROUP,
    answers: quiz.answers,
  };
  records.unshift(record);
  saveRecords();
  stopQuizTimer();
  quiz = null;
  renderResult(record, true);
}

function renderResult(record, justFinished) {
  const percent = Math.round((record.correct / record.total) * 100);
  updateHeader(justFinished ? "시험 완료" : "시험 기록 상세");

  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">${justFinished ? "시험 결과표" : "기록 상세"}</h1>
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
        <p class="lede">${formatDate(record.date)}에 치른 시험입니다. 입력한 뜻과 원래 뜻을 비교해 보세요.</p>
        <p>단어 그룹 · ${escapeHtml(record.group || DEFAULT_WORD_GROUP)}</p>
        <p>정답 ${record.correct}개 · 오답 ${record.total - record.correct}개</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>번호</th>
            <th>영단어</th>
            <th>원래 뜻</th>
            <th>입력한 뜻</th>
            <th>결과</th>
          </tr>
        </thead>
        <tbody>
          ${record.answers
            .map(
              (item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapeHtml(item.english)}</td>
                  <td>${escapeHtml(item.meaning)}</td>
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

  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.addEventListener("click", () => startQuiz(record.group));
}

function renderWords() {
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
    savePageSize();
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
  const stats = buildWordStats();
  const filtered = sortWords(
    grouped.filter(
      (word) =>
        word.english.toLowerCase().includes(query) ||
        word.meaning.toLowerCase().includes(query) ||
        (word.pos || "").includes(query),
    ),
    stats,
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
            <th>관리</th>
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
                  <td class="col-rate">${formatAccuracy(word, stats)}</td>
                  <td>
                    <div class="actions">
                      <button class="icon-btn" data-edit="${word.id}">변경</button>
                      <button class="icon-btn" data-delete="${word.id}">삭제</button>
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
  document.getElementById("addWordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const english = event.target.english.value.trim();
    const meaning = event.target.meaning.value.trim();
    const pos = event.target.pos.value;
    if (wordsInGroup(wordGroup).some((word) => word.english.toLowerCase() === english.toLowerCase())) {
      alert("이 그룹에 이미 등록된 단어입니다.");
      return;
    }
    words.unshift(createWord(english, meaning, pos, wordGroup));
    saveWords();
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

function applyImportedWords(imported) {
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
  saveWords();
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
  document.getElementById("editWordForm").addEventListener("submit", (event) => {
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
    saveWords();
    closeModal();
    drawWordTable(document.getElementById("wordSearch").value);
  });
}

function deleteWord(id) {
  const word = words.find((item) => item.id === id);
  if (!word) return;
  if (!confirm(`'${word.english}' 단어를 삭제할까요?`)) return;
  words = words.filter((item) => item.id !== id);
  saveWords();
  drawWordTable(document.getElementById("wordSearch").value);
}

function renderRecords() {
  updateHeader(`시험 기록 · ${records.length}건`);
  app.innerHTML = `
    <div class="toolbar">
      <h1 class="section-title">시험 기록 조회</h1>
      <button class="btn secondary" id="backHome">홈으로</button>
    </div>
    <div id="recordList"></div>
  `;

  document.getElementById("backHome").addEventListener("click", renderHome);
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
                <p>${formatDate(record.date)} · ${escapeHtml(record.group || DEFAULT_WORD_GROUP)} · ${record.total}문항</p>
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
