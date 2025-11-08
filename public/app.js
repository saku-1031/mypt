// グローバル変数
let allKanji = [];
let currentFlashcardIndex = 0;
let quizQuestions = [];
let currentQuestionIndex = 0;
let quizScore = 0;

// API基本URL
const API_URL = 'http://localhost:3000/api';

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await loadKanji();
  setupTabs();
  displayKanjiGrid();
  loadStats();
});

// タブ切り替え
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(tabName).classList.add('active');

      // タブ切り替え時の処理
      if (tabName === 'flashcard') {
        initFlashcard();
      } else if (tabName === 'stats') {
        loadStats();
      }
    });
  });
}

// 漢字データ読み込み
async function loadKanji() {
  try {
    const response = await fetch(`${API_URL}/kanji`);
    allKanji = await response.json();
  } catch (error) {
    console.error('漢字データの読み込みに失敗しました:', error);
    allKanji = [];
  }
}

// 漢字グリッド表示
function displayKanjiGrid(filter = 'all') {
  const grid = document.getElementById('kanjiGrid');
  const filteredKanji = filter === 'all'
    ? allKanji
    : allKanji.filter(k => k.level === filter);

  grid.innerHTML = filteredKanji.map(kanji => `
    <div class="kanji-card" onclick="showKanjiDetail(${kanji.id})">
      <div class="character">${kanji.character}</div>
      <div class="level">${kanji.level}</div>
    </div>
  `).join('');
}

// レベルフィルター
document.addEventListener('DOMContentLoaded', () => {
  const levelFilter = document.getElementById('levelFilter');
  if (levelFilter) {
    levelFilter.addEventListener('change', (e) => {
      displayKanjiGrid(e.target.value);
    });
  }
});

// 漢字詳細モーダル
function showKanjiDetail(id) {
  const kanji = allKanji.find(k => k.id === id);
  if (!kanji) return;

  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
    <h2>${kanji.character}</h2>

    <div class="detail-section">
      <h3>📖 読み方</h3>
      <p><strong>音読み:</strong> ${kanji.readings.on.join('、')}</p>
      <p><strong>訓読み:</strong> ${kanji.readings.kun.join('、')}</p>
    </div>

    <div class="detail-section">
      <h3>💡 意味</h3>
      <p>${kanji.meanings.join(', ')}</p>
    </div>

    <div class="detail-section">
      <h3>✏️ 画数</h3>
      <p>${kanji.strokes}画</p>
    </div>

    <div class="detail-section">
      <h3>📚 例文</h3>
      <div class="examples">
        ${kanji.examples.map(ex => `
          <div class="example-item">
            <strong>${ex.word}</strong> (${ex.reading})<br>
            ${ex.meaning}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  modal.style.display = 'block';
}

function closeModal() {
  document.getElementById('detailModal').style.display = 'none';
}

// モーダルの外側をクリックで閉じる
window.onclick = function(event) {
  const modal = document.getElementById('detailModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}

// フラッシュカード
function initFlashcard() {
  if (allKanji.length === 0) return;
  currentFlashcardIndex = 0;
  updateFlashcard();
}

function updateFlashcard() {
  if (allKanji.length === 0) return;

  const kanji = allKanji[currentFlashcardIndex];
  const flashcard = document.getElementById('flashcard');

  // カードをリセット
  flashcard.classList.remove('flipped');

  // 表面
  document.getElementById('flashcardKanji').textContent = kanji.character;

  // 裏面
  const details = `
    <h3>${kanji.character}</h3>
    <p><strong>読み方:</strong></p>
    <p>音: ${kanji.readings.on.join('、')}</p>
    <p>訓: ${kanji.readings.kun.join('、')}</p>
    <p><strong>意味:</strong> ${kanji.meanings.join(', ')}</p>
    <p><strong>画数:</strong> ${kanji.strokes}画</p>
  `;
  document.getElementById('flashcardDetails').innerHTML = details;

  // カウンター更新
  document.getElementById('cardCounter').textContent =
    `${currentFlashcardIndex + 1} / ${allKanji.length}`;
}

function flipCard() {
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.toggle('flipped');
}

function nextCard() {
  currentFlashcardIndex = (currentFlashcardIndex + 1) % allKanji.length;
  updateFlashcard();
}

function previousCard() {
  currentFlashcardIndex = (currentFlashcardIndex - 1 + allKanji.length) % allKanji.length;
  updateFlashcard();
}

// クイズ機能
async function startQuiz() {
  const count = parseInt(document.getElementById('quizCount').value);

  try {
    const response = await fetch(`${API_URL}/quiz/${count}`);
    quizQuestions = await response.json();
    currentQuestionIndex = 0;
    quizScore = 0;

    document.getElementById('quizStart').style.display = 'none';
    document.getElementById('quizQuestion').style.display = 'block';
    document.getElementById('quizResults').style.display = 'none';

    showQuestion();
  } catch (error) {
    console.error('クイズの読み込みに失敗しました:', error);
  }
}

function showQuestion() {
  if (currentQuestionIndex >= quizQuestions.length) {
    showResults();
    return;
  }

  const question = quizQuestions[currentQuestionIndex];

  document.getElementById('quizProgress').textContent =
    `問題 ${currentQuestionIndex + 1} / ${quizQuestions.length}`;
  document.getElementById('quizScore').textContent =
    `正解: ${quizScore}`;
  document.getElementById('questionText').textContent = question.question;

  const optionsContainer = document.getElementById('questionOptions');
  optionsContainer.innerHTML = question.options.map(option => `
    <div class="option" onclick="selectAnswer('${option}', '${question.correctAnswer}')">
      ${option}
    </div>
  `).join('');
}

function selectAnswer(selected, correct) {
  const options = document.querySelectorAll('.option');

  options.forEach(option => {
    option.classList.add('disabled');

    if (option.textContent.trim() === correct) {
      option.classList.add('correct');
    } else if (option.textContent.trim() === selected && selected !== correct) {
      option.classList.add('incorrect');
    }
  });

  if (selected === correct) {
    quizScore++;
    document.getElementById('quizScore').textContent = `正解: ${quizScore}`;
  }

  setTimeout(() => {
    currentQuestionIndex++;
    showQuestion();
  }, 1500);
}

function showResults() {
  document.getElementById('quizQuestion').style.display = 'none';
  document.getElementById('quizResults').style.display = 'block';

  const percentage = Math.round((quizScore / quizQuestions.length) * 100);
  document.getElementById('finalScore').textContent =
    `${quizScore} / ${quizQuestions.length} (${percentage}%)`;

  let message = '';
  if (percentage === 100) {
    message = '完璧です！素晴らしい！';
  } else if (percentage >= 80) {
    message = 'とても良くできました！';
  } else if (percentage >= 60) {
    message = '良い成績です！';
  } else {
    message = 'もう少し頑張りましょう！';
  }

  document.getElementById('scoreMessage').textContent = message;
}

function resetQuiz() {
  document.getElementById('quizStart').style.display = 'block';
  document.getElementById('quizQuestion').style.display = 'none';
  document.getElementById('quizResults').style.display = 'none';
  quizQuestions = [];
  currentQuestionIndex = 0;
  quizScore = 0;
}

// 統計
async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/stats`);
    const stats = await response.json();

    const statsContainer = document.getElementById('statsContent');
    statsContainer.innerHTML = `
      <div class="stat-card">
        <h3>総漢字数</h3>
        <div class="value">${stats.totalKanji}</div>
      </div>
      ${Object.entries(stats.byLevel).map(([level, count]) => `
        <div class="stat-card">
          <h3>${level} レベル</h3>
          <div class="value">${count}</div>
        </div>
      `).join('')}
      <div class="stat-card">
        <h3>平均画数</h3>
        <div class="value">${stats.avgStrokes.toFixed(1)}</div>
      </div>
    `;
  } catch (error) {
    console.error('統計の読み込みに失敗しました:', error);
  }
}
