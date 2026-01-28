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
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { // C Major
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
let highScore = parseInt(localStorage.getItem('flagQuizHighScore')) || 0;
let remainingCountries = [];
let currentQuestion = null;
let isAnswered = false;

// DOM Elements
const scoreEl = document.getElementById('score');
const countEl = document.getElementById('count');
const gameContainer = document.getElementById('game-container');
const gameOverSection = document.getElementById('game-over');
const finalScoreVal = document.getElementById('final-score-value');
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
    finalScoreVal.textContent = currentScore;

    // Confetti or extra sound could go here
    SoundManager.playWin();
    SoundManager.playWin(); // Double celebrate
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

    // Pick Random from REMAINING
    const randomIndex = Math.floor(Math.random() * remainingCountries.length);
    const correctCountry = remainingCountries[randomIndex];

    // Remove from pool
    remainingCountries.splice(randomIndex, 1);
    updateScoreUI();

    // Find Distractors (Same Continent) from FULL list (distractors can repeat)
    const sameContinent = countries.filter(c =>
        c.continent === correctCountry.continent && c.code !== correctCountry.code
    );

    // Shuffle and pick 5 distractors
    const shuffledDistractors = sameContinent.sort(() => 0.5 - Math.random());
    const distractors = shuffledDistractors.slice(0, 5);

    // Combine and Shuffle Options
    const options = [correctCountry, ...distractors].sort(() => 0.5 - Math.random());

    currentQuestion = {
        correct: correctCountry,
        options: options
    };

    // Render DOM
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
    const allButtons = optionsContainer.querySelectorAll('.option-btn');

    if (selectedCountry.code === correctCode) {
        // Correct
        currentScore++;
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

        // Highlight correct
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

// Start Game
init();
