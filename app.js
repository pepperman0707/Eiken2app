// ── データ ──────────────────────────────
let words = [];
let queue = [];          // 出題キュー
let currentWord = null;
let currentMode = null;  // "jp2en" | "en2jp" | "weak"
let sessionScore = { done: 0, total: 20 };

// 苦手単語: { word: カウント数 }
let weakMap = JSON.parse(localStorage.getItem("weakMap") || "{}");

// 英語→日本語モードの「答え表示済み」フラグ
let answerRevealed = false;

// ── 起動 ────────────────────────────────
fetch("words.json")
  .then(r => r.json())
  .then(data => {
    words = data;
    showHome();
  });

// ── 画面描画ヘルパー ──────────────────────
function setView(html) {
  document.getElementById("app").innerHTML = html;
}

// ── ホーム画面 ───────────────────────────
function showHome() {
  currentMode = null;
  const done  = Object.keys(weakMap).length;
  const total = words.length;

  setView(`
    <div class="title">英検2級 単語トレーニング</div>

    <button class="btn-main" onclick="startMode('jp2en')">① 日本語 → 英語</button>
    <button class="btn-main" onclick="startMode('en2jp')">② 英語 → 日本語</button>
    <button class="btn-main" onclick="startMode('weak')">③ 苦手単語復習</button>
    <button class="btn-main btn-sub" onclick="showSearch()">④ 単語検索</button>

    <div class="progress-label">苦手登録: ${done} / ${total} 語</div>
  `);
}

// ── モード開始 ───────────────────────────
function startMode(mode) {
  currentMode = mode;
  sessionScore = { done: 0, total: 20 };

  if (mode === "weak") {
    // 苦手単語を回数の多い順に最大20問
    const sorted = Object.entries(weakMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([w]) => words.find(x => x.word === w))
      .filter(Boolean);

    if (sorted.length === 0) {
      alert("苦手単語がまだありません。まず日本語→英語か英語→日本語を練習しましょう。");
      showHome();
      return;
    }
    queue = shuffle([...sorted]);
    sessionScore.total = queue.length;
    showWeakRanking(sorted);
    return;
  }

  // jp2en / en2jp: ランダム20問
  queue = shuffle([...words]).slice(0, 20);
  nextQuestion();
}

// ── 苦手ランキング表示 ──────────────────
function showWeakRanking(sorted) {
  const rows = sorted.slice(0, 10).map((w, i) =>
    `<div class="rank-row">
       <span class="rank-num">${i + 1}位</span>
       <span class="rank-word">${w.word}</span>
       <span class="rank-miss">${weakMap[w.word] || 0}回</span>
     </div>`
  ).join("");

  setView(`
    <div class="title">苦手単語 TOP${sorted.length}</div>
    <div class="rank-list">${rows}</div>
    <button class="btn-main" onclick="nextQuestion()">この単語を出題する</button>
    <button class="btn-back" onclick="showHome()">← ホームに戻る</button>
  `);
}

// ── 次の問題 ─────────────────────────────
function nextQuestion() {
  if (queue.length === 0 || sessionScore.done >= sessionScore.total) {
    showResult();
    return;
  }

  currentWord = queue.shift();
  answerRevealed = false;

  if (currentMode === "jp2en") {
    showJp2En();
  } else {
    showEn2Jp();
  }
}

// ── 日本語 → 英語 画面 ───────────────────
function showJp2En() {
  const prog = `${sessionScore.done + 1} / ${sessionScore.total}`;
  setView(`
    <div class="mode-label">日本語 → 英語　${prog}</div>
    <div id="question">${currentWord.meaning}</div>

    <input id="answer" type="text" placeholder="英単語を入力" />

    <button class="btn-main" onclick="checkJp2En()">回答</button>
    <div id="result"></div>
    <div id="example" class="example-box" style="display:none"></div>

    <button class="btn-next" id="btn-next" style="display:none" onclick="proceedNext()">次の問題 →</button>
    <button class="btn-back" onclick="showHome()">← ホームに戻る</button>
  `);

  document.getElementById("answer").addEventListener("keydown", e => {
    if (e.key === "Enter") checkJp2En();
  });
  document.getElementById("answer").focus();
}

function checkJp2En() {
  const input = document.getElementById("answer").value.trim().toLowerCase();
  if (!input) return;

  const correct = currentWord.answers.map(a => a.toLowerCase());
  const isOk = correct.includes(input);

  const resultEl = document.getElementById("result");
  const exEl     = document.getElementById("example");
  const btnNext  = document.getElementById("btn-next");

  if (isOk) {
    resultEl.innerHTML = `<span class="correct">✓ 正解！</span>`;
  } else {
    resultEl.innerHTML =
      `<span class="wrong">✗ 不正解</span><br>正解: <b>${correct[0]}</b>`;
    addWeak(currentWord.word);
  }

  exEl.innerHTML = `<i>"${currentWord.example}"</i>`;
  exEl.style.display = "block";
  btnNext.style.display = "inline-block";
  document.getElementById("answer").disabled = true;

  sessionScore.done++;
}

// ── 英語 → 日本語 画面 ───────────────────
function showEn2Jp() {
  const prog = `${sessionScore.done + 1} / ${sessionScore.total}`;
  setView(`
    <div class="mode-label">英語 → 日本語　${prog}</div>
    <div id="question">${currentWord.word}</div>

    <button class="btn-reveal" onclick="revealAnswer()">意味を見る</button>
    <div id="meaning-area" style="display:none">
      <div class="meaning-text">${currentWord.meaning}</div>
      <div class="example-box"><i>"${currentWord.example}"</i></div>
      <div class="self-eval-label">自己評価</div>
      <div class="self-eval">
        <button class="btn-eval good"  onclick="evalEn2Jp('good')">覚えていた</button>
        <button class="btn-eval vague" onclick="evalEn2Jp('vague')">あいまい</button>
        <button class="btn-eval bad"   onclick="evalEn2Jp('bad')">知らなかった</button>
      </div>
    </div>
    <button class="btn-back" onclick="showHome()">← ホームに戻る</button>
  `);
}

function revealAnswer() {
  document.getElementById("meaning-area").style.display = "block";
  document.querySelector(".btn-reveal").style.display = "none";
  answerRevealed = true;
}

function evalEn2Jp(rating) {
  if (rating === "vague") {
    addWeak(currentWord.word, 1);
  } else if (rating === "bad") {
    addWeak(currentWord.word, 2);
  } else {
    removeWeak(currentWord.word);
  }
  sessionScore.done++;
  proceedNext();
}

// ── 共通: 次へ進む ────────────────────────
function proceedNext() {
  nextQuestion();
}

// ── 結果画面 ─────────────────────────────
function showResult() {
  const modeLabel = currentMode === "jp2en" ? "日本語→英語"
                  : currentMode === "en2jp" ? "英語→日本語"
                  : "苦手単語復習";
  setView(`
    <div class="title">お疲れ様でした！</div>
    <div class="result-mode">${modeLabel} ${sessionScore.total}問 完了</div>
    <div class="result-weak">現在の苦手単語: ${Object.keys(weakMap).length} 語</div>
    <button class="btn-main" onclick="startMode(currentMode)">もう一度</button>
    <button class="btn-main btn-sub" onclick="showHome()">ホームに戻る</button>
  `);
}

// ── 単語検索 ─────────────────────────────
function showSearch() {
  setView(`
    <div class="title">単語検索</div>
    <input id="search-input" type="text" placeholder="英単語または日本語で検索" oninput="doSearch()" />
    <div id="search-results"></div>
    <button class="btn-back" onclick="showHome()">← ホームに戻る</button>
  `);
  document.getElementById("search-input").focus();
}

function doSearch() {
  const q = document.getElementById("search-input").value.trim().toLowerCase();
  const res = document.getElementById("search-results");
  if (!q) { res.innerHTML = ""; return; }

  const hits = words.filter(w =>
    w.word.toLowerCase().includes(q) ||
    w.meaning.includes(q)
  ).slice(0, 20);

  if (hits.length === 0) {
    res.innerHTML = `<div class="no-hit">見つかりませんでした</div>`;
    return;
  }

  res.innerHTML = hits.map(w => `
    <div class="search-row">
      <span class="s-word">${w.word}</span>
      <span class="s-meaning">${w.meaning}</span>
    </div>
  `).join("");
}

// ── 苦手単語管理 ─────────────────────────
function addWeak(word, delta = 1) {
  weakMap[word] = (weakMap[word] || 0) + delta;
  saveWeak();
}

function removeWeak(word) {
  delete weakMap[word];
  saveWeak();
}

function saveWeak() {
  localStorage.setItem("weakMap", JSON.stringify(weakMap));
}

// ── ユーティリティ ───────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}