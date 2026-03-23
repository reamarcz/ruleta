const loadingScreen = document.getElementById("loading-screen");
const gameScreen = document.getElementById("game-screen");
const winScreen = document.getElementById("win-screen");
const loseScreen = document.getElementById("lose-screen");
const spinBtn = document.getElementById("spin-btn");
const statusText = document.getElementById("status");
const betButtons = document.querySelectorAll(".bet-btn");
const resetButtons = document.querySelectorAll("[data-reset]");
const winVideo = document.getElementById("win-video");
const loseVideo = document.getElementById("lose-video");
const winRollResult = document.getElementById("win-roll-result");
const loseRollResult = document.getElementById("lose-roll-result");
const wheel = document.getElementById("wheel");
const confettiCanvas = document.getElementById("confetti-canvas");
const ctx = confettiCanvas.getContext("2d");

let currentBet = null;
let spinning = false;
let confettiAnimation = null;
let confettiPieces = [];
let wheelRotation = 0;
let loadingTimer = null;

const roulettePool = [
  ...Array(18).fill("red"),
  ...Array(18).fill("black"),
  "zero"
];

const wheelOrder = [
  "red",
  "black",
  "red",
  "black",
  "red",
  "black",
  "red",
  "black",
  "red",
  "black",
  "zero",
  "black",
  "red",
  "black",
  "red",
  "black",
  "red",
  "black",
  "red",
  "black"
];

function pickRouletteResult() {
  const index = Math.floor(Math.random() * roulettePool.length);
  return roulettePool[index];
}

function getWeightedSegmentIndex(result) {
  const matchingIndexes = [];
  wheelOrder.forEach((value, index) => {
    if (value === result) matchingIndexes.push(index);
  });
  return matchingIndexes[Math.floor(Math.random() * matchingIndexes.length)];
}

function spinWheelToResult(result) {
  const segmentAngle = 360 / wheelOrder.length;
  const segmentIndex = getWeightedSegmentIndex(result);
  const targetCenterAngle = segmentIndex * segmentAngle + segmentAngle / 2;
  const extraTurns = 360 * (6 + Math.floor(Math.random() * 3));
  const finalRotation = wheelRotation + extraTurns + (360 - targetCenterAngle);
  wheelRotation = finalRotation % 360;

  wheel.style.transition = "transform 3s cubic-bezier(0.12, 0.85, 0.15, 1)";
  wheel.style.transform = `rotate(${finalRotation}deg)`;

  return new Promise((resolve) => {
    const onEnd = () => {
      wheel.removeEventListener("transitionend", onEnd);
      wheel.style.transition = "none";
      wheel.style.transform = `rotate(${wheelRotation}deg)`;
      resolve();
    };
    wheel.addEventListener("transitionend", onEnd, { once: true });
  });
}

function labelFor(value) {
  if (value === "red") return "červená";
  if (value === "black") return "černá";
  return "nula";
}

function resultTextFor(value) {
  return `Padla ${labelFor(value)}`;
}

function rollClassFor(value) {
  if (value === "red") return "result-roll--red";
  if (value === "black") return "result-roll--black";
  return "result-roll--zero";
}

function setRollDisplay(element, value) {
  element.classList.remove("result-roll--red", "result-roll--black", "result-roll--zero");
  element.classList.add(rollClassFor(value));
  element.textContent = resultTextFor(value);
}

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function createConfetti() {
  const colors = ["#ff4458", "#6f7cff", "#13b66e", "#ffe066", "#ffffff"];
  confettiPieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: Math.random() * confettiCanvas.height - confettiCanvas.height,
    size: Math.random() * 7 + 4,
    speedY: Math.random() * 2.6 + 1.4,
    speedX: (Math.random() - 0.5) * 2.4,
    rotation: Math.random() * Math.PI,
    rotationSpeed: (Math.random() - 0.5) * 0.24,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));
}

function runConfetti() {
  confettiCanvas.classList.remove("hidden");
  resizeCanvas();
  createConfetti();

  const draw = () => {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces.forEach((piece) => {
      piece.y += piece.speedY;
      piece.x += piece.speedX;
      piece.rotation += piece.rotationSpeed;

      if (piece.y > confettiCanvas.height + 20) {
        piece.y = -20;
        piece.x = Math.random() * confettiCanvas.width;
      }

      if (piece.x < -20) piece.x = confettiCanvas.width + 20;
      if (piece.x > confettiCanvas.width + 20) piece.x = -20;

      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
      ctx.restore();
    });
    confettiAnimation = requestAnimationFrame(draw);
  };

  draw();
}

function stopConfetti() {
  if (confettiAnimation) {
    cancelAnimationFrame(confettiAnimation);
    confettiAnimation = null;
  }
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiCanvas.classList.add("hidden");
}

function stopAllVideos() {
  [winVideo, loseVideo].forEach((video) => {
    video.pause();
    video.currentTime = 0;
  });
}

function playResultVideo(video) {
  video.currentTime = 0;
  video.play().catch(() => {});
}

function showResultScreen(win, result) {
  gameScreen.classList.add("hidden");

  if (win) {
    loseScreen.classList.add("hidden");
    winScreen.classList.remove("hidden");
    setRollDisplay(winRollResult, result);
    runConfetti();
    playResultVideo(winVideo);
  } else {
    winScreen.classList.add("hidden");
    loseScreen.classList.remove("hidden");
    setRollDisplay(loseRollResult, result);
    playResultVideo(loseVideo);
  }
}

function resetGame() {
  stopAllVideos();
  stopConfetti();
  currentBet = null;
  spinning = false;
  betButtons.forEach((btn) => btn.classList.remove("selected"));
  spinBtn.disabled = true;
  statusText.textContent = "Nejdřív zvol sázku.";
  loadingScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  loseScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
}

function showLoadingThenReset() {
  stopAllVideos();
  stopConfetti();
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }

  gameScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  loseScreen.classList.add("hidden");
  loadingScreen.classList.remove("hidden");

  loadingTimer = setTimeout(() => {
    loadingTimer = null;
    resetGame();
  }, 2500);
}

betButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (spinning) return;
    currentBet = button.dataset.bet;
    betButtons.forEach((btn) => btn.classList.remove("selected"));
    button.classList.add("selected");
    spinBtn.disabled = false;
    statusText.textContent = `Sázíš na ${labelFor(currentBet)}.`;
  });
});

spinBtn.addEventListener("click", () => {
  if (!currentBet || spinning) return;
  spinning = true;
  spinBtn.disabled = true;
  statusText.textContent = "Ruleta se točí...";
  const result = pickRouletteResult();

  spinWheelToResult(result).then(() => {
    const didWin = result === currentBet;
    statusText.textContent = `Padla ${labelFor(result)}.`;
    setTimeout(() => showResultScreen(didWin, result), 350);
  });
});

resetButtons.forEach((button) => {
  button.addEventListener("click", showLoadingThenReset);
});

window.addEventListener("resize", resizeCanvas);
showLoadingThenReset();
