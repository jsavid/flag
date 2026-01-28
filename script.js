const countries = window.gameData.countries;

// Audio System
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const SoundManager = {
    playTone: (freq, type, duration) => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },

    playWin: () => {
        // Major Arpeggio
        const now = audioCtx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.05, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    },

    playLose: () => {
        // Dissonant Buzz
        SoundManager.playTone(150, 'sawtooth', 0.4);
        SoundManager.playTone(140, 'sawtooth', 0.4);
    }
};

// Game State
let currentScore = 0;
let remainingCountries = [];
let currentQuestion = null;
let isAnswered = false;
let continentStats = {};

// DOM Elements
const scoreEl = document.getElementById('score');
const countEl = document.getElementById('count');
const gameContainer = document.getElementById('game-container');
const gameOverSection = document.getElementById('game-over');
const finalScoreVal = document.getElementById('final-score-value');
const statsBreakdown = document.getElementById('stats-breakdown');
const finalMessage = document.getElementById('final-message');
const restartBtn = document.getElementById('restart-btn');
const flagImg = document.getElementById('flag-img');
const continentHint = document.getElementById('continent-hint');
const optionsContainer = document.getElementById('options-container');
const feedbackArea = document.getElementById('feedback');
const nextBtn = document.getElementById('next-btn');
const flashOverlay = document.getElementById('flash-overlay');

// Initialize
function init() {
    remainingCountries = [...countries];
    currentScore = 0;

    // Reset Stats
    continentStats = {};
    countries.forEach(c => {
        if (!continentStats[c.continent]) {
            continentStats[c.continent] = { correct: 0, total: 0 };
        }
    });

    updateScoreUI();

    // UI Reset
    gameContainer.classList.remove('hidden');
    gameOverSection.classList.add('hidden');

    generateQuestion();

    nextBtn.onclick = () => generateQuestion();
    restartBtn.onclick = () => init();
}

function updateScoreUI() {
    scoreEl.textContent = currentScore;
    countEl.textContent = `${countries.length - remainingCountries.length}/${countries.length}`;
}

function triggerFlash(type) {
    flashOverlay.className = 'flash-overlay'; // Reset
    void flashOverlay.offsetWidth; // Force reflow
    if (type === 'correct') {
        flashOverlay.classList.add('flash-correct');
    } else {
        flashOverlay.classList.add('flash-wrong');
    }
}

function endGame() {
    gameContainer.classList.add('hidden');
    gameOverSection.classList.remove('hidden');

    const totalQuestions = countries.length;
    const percentage = Math.round((currentScore / totalQuestions) * 100);

    finalScoreVal.textContent = `${percentage}%`;

    // Set Message
    let msg = "";
    if (percentage === 100) msg = "Perfect!";
    else if (percentage >= 90) msg = "Epic!";
    else if (percentage >= 80) msg = "Very Good!";
    else if (percentage >= 70) msg = "Good";
    else if (percentage >= 60) msg = "Acceptable";
    else msg = "Needs practice";

    finalMessage.textContent = msg;

    // Render Stats
    statsBreakdown.innerHTML = '';
    const sortedContinents = Object.keys(continentStats).sort();

    sortedContinents.forEach(cont => {
        const data = continentStats[cont];
        let contPercent = data.total === 0 ? 0 : Math.round((data.correct / data.total) * 100);

        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `
            <span class="continent-name">${cont}</span>
            <span class="continent-score">${contPercent}% (${data.correct}/${data.total})</span>
        `;
        statsBreakdown.appendChild(row);
    });

    SoundManager.playWin();
}

function generateQuestion() {
    if (remainingCountries.length === 0) {
        endGame();
        return;
    }

    // Reset UI
    isAnswered = false;
    feedbackArea.classList.add('hidden');
    optionsContainer.innerHTML = '';
    flagImg.style.opacity = '0';

    // Pick Random
    const randomIndex = Math.floor(Math.random() * remainingCountries.length);
    const correctCountry = remainingCountries[randomIndex];

    // Track attempt for this continent (we track total here)
    continentStats[correctCountry.continent].total++;

    remainingCountries.splice(randomIndex, 1);
    updateScoreUI();

    // Distractors
    const sameContinent = countries.filter(c =>
        c.continent === correctCountry.continent && c.code !== correctCountry.code
    );

    const shuffledDistractors = sameContinent.sort(() => 0.5 - Math.random());
    const distractors = shuffledDistractors.slice(0, 5);
    const options = [correctCountry, ...distractors].sort(() => 0.5 - Math.random());

    currentQuestion = {
        correct: correctCountry,
        options: options
    };

    // Render
    const img = new Image();
    img.onload = () => {
        flagImg.src = img.src;
        flagImg.style.opacity = '1';
    };
    img.src = `https://flagcdn.com/w640/${correctCountry.code.toLowerCase()}.png`;

    continentHint.textContent = correctCountry.continent;

    options.forEach(country => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = country.name;
        btn.dataset.code = country.code;
        btn.addEventListener('click', () => handleAnswer(country, btn));
        optionsContainer.appendChild(btn);
    });
}

function handleAnswer(selectedCountry, btnElement) {
    if (isAnswered) return;
    isAnswered = true;

    const correctCode = currentQuestion.correct.code;
    const continent = currentQuestion.correct.continent;
    const allButtons = optionsContainer.querySelectorAll('.option-btn');

    if (selectedCountry.code === correctCode) {
        // Correct
        currentScore++;
        // Track unique success (we already tracked total in generate)
        continentStats[continent].correct++;

        SoundManager.playWin();
        triggerFlash('correct');
        btnElement.classList.add('correct');
        scoreEl.parentElement.classList.add('pulse');
        setTimeout(() => scoreEl.parentElement.classList.remove('pulse'), 500);
    } else {
        // Incorrect
        SoundManager.playLose();
        triggerFlash('wrong');
        btnElement.classList.add('wrong');

        allButtons.forEach(btn => {
            if (btn.dataset.code === correctCode) {
                btn.classList.add('correct');
            }
        });
    }

    updateScoreUI();

    allButtons.forEach(btn => btn.disabled = true);
    feedbackArea.classList.remove('hidden');
    nextBtn.focus();
}

init();
