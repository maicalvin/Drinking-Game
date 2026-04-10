const panelButtons = document.querySelectorAll(".cta");
const panels = document.querySelectorAll(".panel");

panelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === target);
    });

    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const beerPongState = {
  cups: { a: 10, b: 10 },
  history: [],
  turn: "a",
  winner: null,
};

const cupsA = document.getElementById("cups-a");
const cupsB = document.getElementById("cups-b");
const beerPongStatus = document.getElementById("beer-pong-status");
const resetBeerPong = document.getElementById("reset-beer-pong");

function updateBeerPongUI() {
  cupsA.textContent = beerPongState.cups.a;
  cupsB.textContent = beerPongState.cups.b;

  if (beerPongState.winner) {
    const winnerName = beerPongState.winner === "a" ? "Team A" : "Team B";
    beerPongStatus.textContent = `${winnerName} wins. Time for a victory lap.`;
    return;
  }

  const activeTeam = beerPongState.turn === "a" ? "Team A" : "Team B";
  beerPongStatus.textContent = `${activeTeam} to throw.`;
}

function scoreCup(scoringTeam) {
  if (beerPongState.winner) {
    return;
  }

  const defendingTeam = scoringTeam === "a" ? "b" : "a";
  if (beerPongState.cups[defendingTeam] <= 0) {
    return;
  }

  beerPongState.cups[defendingTeam] -= 1;
  beerPongState.history.push(defendingTeam);
  beerPongState.turn = defendingTeam;

  if (beerPongState.cups[defendingTeam] === 0) {
    beerPongState.winner = scoringTeam;
  }

  updateBeerPongUI();
}

function undoCup(team) {
  if (beerPongState.history.length === 0) {
    return;
  }

  const lastTarget = beerPongState.history.pop();
  beerPongState.cups[lastTarget] += 1;
  beerPongState.winner = null;
  beerPongState.turn = team;
  updateBeerPongUI();
}

document.querySelectorAll("[data-action='score']").forEach((button) => {
  button.addEventListener("click", () => {
    scoreCup(button.dataset.team);
  });
});

document.querySelectorAll("[data-action='undo']").forEach((button) => {
  button.addEventListener("click", () => {
    undoCup(button.dataset.team);
  });
});

resetBeerPong.addEventListener("click", () => {
  beerPongState.cups = { a: 10, b: 10 };
  beerPongState.history = [];
  beerPongState.turn = "a";
  beerPongState.winner = null;
  updateBeerPongUI();
});

const beerPongCanvas = document.getElementById("beer-pong-canvas");
const beerPongSwipeStatus = document.getElementById("beer-pong-swipe-status");
const resetBeerPongSwipe = document.getElementById("reset-beer-pong-swipe");
const swipeTurnEl = document.getElementById("swipe-turn");
const swipeScoreAEl = document.getElementById("swipe-score-a");
const swipeScoreBEl = document.getElementById("swipe-score-b");

if (
  beerPongCanvas &&
  beerPongSwipeStatus &&
  resetBeerPongSwipe &&
  swipeTurnEl &&
  swipeScoreAEl &&
  swipeScoreBEl
) {
  const ctx = beerPongCanvas.getContext("2d");
  const tableWidth = beerPongCanvas.width;
  const tableHeight = beerPongCanvas.height;
  const cupRadius = 20;
  let audioCtx = null;

  const swipeState = {
    cups: [],
    particles: [],
    ball: {
      x: tableWidth / 2,
      y: tableHeight - 34,
      vx: 0,
      vy: 0,
      r: 12,
      moving: false,
    },
    dragging: false,
    dragStart: null,
    dragCurrent: null,
    cupsLeft: 6,
    won: false,
    turn: "a",
    shotTeam: null,
    score: { a: 0, b: 0 },
  };

  function ensureAudio() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        return null;
      }
      audioCtx = new AudioCtx();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  }

  function playTone(type) {
    const localCtx = ensureAudio();
    if (!localCtx) {
      return;
    }

    const now = localCtx.currentTime;
    const osc = localCtx.createOscillator();
    const gain = localCtx.createGain();
    osc.connect(gain);
    gain.connect(localCtx.destination);

    if (type === "hit") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.14);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.22);
      return;
    }

    if (type === "win") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.2);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.3);
      return;
    }

    osc.type = "square";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  function updateScoreboard() {
    swipeTurnEl.textContent = swipeState.turn === "a" ? "Team A" : "Team B";
    swipeScoreAEl.textContent = swipeState.score.a;
    swipeScoreBEl.textContent = swipeState.score.b;
  }

  function updateSwipeStatus(message = "") {
    if (message) {
      beerPongSwipeStatus.textContent = message;
      return;
    }

    if (swipeState.won) {
      const winnerName = swipeState.turn === "a" ? "Team A" : "Team B";
      beerPongSwipeStatus.textContent = `${winnerName} wins the table! Reset to play again.`;
      return;
    }

    const turnName = swipeState.turn === "a" ? "Team A" : "Team B";
    beerPongSwipeStatus.textContent = `${turnName} to shoot. Cups left: ${swipeState.cupsLeft}`;
  }

  function buildCups() {
    const rowY = 78;
    const spacing = 42;
    const startX = tableWidth / 2;
    swipeState.cups = [];

    const rows = [3, 2, 1];
    rows.forEach((count, rowIndex) => {
      const rowOffset = ((count - 1) * spacing) / 2;
      for (let i = 0; i < count; i += 1) {
        swipeState.cups.push({
          x: startX - rowOffset + i * spacing,
          y: rowY + rowIndex * 36,
          r: cupRadius,
          hit: false,
        });
      }
    });
  }

  function resetBall() {
    swipeState.ball.x = tableWidth / 2;
    swipeState.ball.y = tableHeight - 34;
    swipeState.ball.vx = 0;
    swipeState.ball.vy = 0;
    swipeState.ball.moving = false;
    swipeState.dragging = false;
    swipeState.dragStart = null;
    swipeState.dragCurrent = null;
  }

  function resetSwipeGame() {
    buildCups();
    swipeState.cupsLeft = swipeState.cups.length;
    swipeState.won = false;
    swipeState.turn = "a";
    swipeState.shotTeam = null;
    swipeState.score.a = 0;
    swipeState.score.b = 0;
    swipeState.particles = [];
    resetBall();
    updateScoreboard();
    updateSwipeStatus();
  }

  function canvasPointFromEvent(event) {
    const rect = beerPongCanvas.getBoundingClientRect();
    const scaleX = tableWidth / rect.width;
    const scaleY = tableHeight / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function drawTable() {
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, tableWidth, tableHeight);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffbd3a";
    ctx.beginPath();
    ctx.ellipse(tableWidth / 2, tableHeight + 12, 220, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(44, 64);
    ctx.lineTo(tableWidth - 44, 64);
    ctx.stroke();

    swipeState.cups.forEach((cup) => {
      if (cup.hit) {
        return;
      }

      ctx.fillStyle = "#fffaf4";
      ctx.strokeStyle = "#e64862";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cup.x, cup.y, cup.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(230, 72, 98, 0.28)";
      ctx.beginPath();
      ctx.arc(cup.x, cup.y + 3, cup.r - 5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (swipeState.dragging && swipeState.dragStart && swipeState.dragCurrent) {
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 4;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(swipeState.dragStart.x, swipeState.dragStart.y);
      ctx.lineTo(swipeState.dragCurrent.x, swipeState.dragCurrent.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    swipeState.particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ffcf55";
    ctx.beginPath();
    ctx.arc(swipeState.ball.x, swipeState.ball.y, swipeState.ball.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ff7a59";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.arc(swipeState.ball.x - 3, swipeState.ball.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function createSplash(x, y) {
    const colors = ["#ffd166", "#ff7a59", "#f8edeb", "#ef476f"];
    for (let i = 0; i < 28; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.8;
      swipeState.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.7,
        life: 34 + Math.random() * 24,
        maxLife: 56,
        size: 1.5 + Math.random() * 2.6,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function updateParticles() {
    for (let i = swipeState.particles.length - 1; i >= 0; i -= 1) {
      const particle = swipeState.particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.07;
      particle.vx *= 0.98;
      particle.life -= 1;

      if (particle.life <= 0) {
        swipeState.particles.splice(i, 1);
      }
    }
  }

  function switchTurn() {
    swipeState.turn = swipeState.turn === "a" ? "b" : "a";
  }

  function finishShot({ hit, message }) {
    const shootingTeam = swipeState.shotTeam || swipeState.turn;

    if (hit) {
      swipeState.score[shootingTeam] += 1;
      playTone("hit");
    }

    if (swipeState.cupsLeft <= 0) {
      swipeState.won = true;
      swipeState.turn = shootingTeam;
      playTone("win");
      updateScoreboard();
      updateSwipeStatus();
      resetBall();
      return;
    }

    switchTurn();
    updateScoreboard();
    resetBall();
    updateSwipeStatus(message || "");
  }

  function stepPhysics() {
    updateParticles();

    const ball = swipeState.ball;
    if (!ball.moving || swipeState.won) {
      return;
    }

    ball.vy += 0.16;
    ball.vx *= 0.996;
    ball.vy *= 0.996;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x <= ball.r || ball.x >= tableWidth - ball.r) {
      ball.x = Math.max(ball.r, Math.min(tableWidth - ball.r, ball.x));
      ball.vx *= -0.72;
    }

    if (ball.y <= ball.r) {
      ball.y = ball.r;
      ball.vy *= -0.72;
    }

    if (ball.y > tableHeight + 45) {
      finishShot({ hit: false });
      return;
    }

    if (Math.abs(ball.vx) + Math.abs(ball.vy) < 0.12 && ball.y > tableHeight - 60) {
      finishShot({ hit: false });
      return;
    }

    for (let i = 0; i < swipeState.cups.length; i += 1) {
      const cup = swipeState.cups[i];
      if (cup.hit) {
        continue;
      }

      if (distance(ball, cup) < cup.r) {
        cup.hit = true;
        swipeState.cupsLeft -= 1;
        createSplash(cup.x, cup.y);
        finishShot({ hit: true, message: `Bucket by ${swipeState.shotTeam === "a" ? "Team A" : "Team B"}!` });
        break;
      }
    }
  }

  function gameLoop() {
    stepPhysics();
    drawTable();
    window.requestAnimationFrame(gameLoop);
  }

  beerPongCanvas.addEventListener("pointerdown", (event) => {
    if (swipeState.ball.moving || swipeState.won) {
      return;
    }

    ensureAudio();

    const point = canvasPointFromEvent(event);
    if (distance(point, swipeState.ball) > swipeState.ball.r * 2.4) {
      return;
    }

    swipeState.dragging = true;
    swipeState.dragStart = { x: swipeState.ball.x, y: swipeState.ball.y };
    swipeState.dragCurrent = point;
    beerPongCanvas.setPointerCapture(event.pointerId);
  });

  beerPongCanvas.addEventListener("pointermove", (event) => {
    if (!swipeState.dragging) {
      return;
    }

    event.preventDefault();
    swipeState.dragCurrent = canvasPointFromEvent(event);
  });

  function releaseSwipe(event) {
    if (!swipeState.dragging || !swipeState.dragStart || !swipeState.dragCurrent) {
      return;
    }

    const dx = swipeState.dragCurrent.x - swipeState.dragStart.x;
    const dy = swipeState.dragCurrent.y - swipeState.dragStart.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed > 10) {
      swipeState.ball.vx = dx * 0.08;
      swipeState.ball.vy = dy * 0.08;
      swipeState.ball.moving = true;
      swipeState.shotTeam = swipeState.turn;
      playTone("launch");
      updateSwipeStatus("Ball in flight...");
    }

    swipeState.dragging = false;
    swipeState.dragCurrent = null;
    swipeState.dragStart = null;

    if (event) {
      beerPongCanvas.releasePointerCapture(event.pointerId);
    }
  }

  beerPongCanvas.addEventListener("pointerup", releaseSwipe);
  beerPongCanvas.addEventListener("pointercancel", releaseSwipe);

  resetBeerPongSwipe.addEventListener("click", resetSwipeGame);

  resetSwipeGame();
  gameLoop();
}

const rankRules = {
  A: "Waterfall: Everyone starts drinking, no one stops before the person to the right.",
  K: "King's Cup: Add a drink to the center cup. Last king drinks it.",
  Q: "Question Master: Ask questions. Anyone answering you drinks.",
  J: "Make a Rule: Create a new rule for this round.",
  10: "Categories: Name items in a category. First fail drinks.",
  9: "Rhyme Time: Say a word. Go around with rhymes.",
  8: "Mate: Pick a drinking partner for the round.",
  7: "Heaven: Last person to raise a hand drinks.",
  6: "Chicks: Women drink.",
  5: "Thumb Master: Last to copy your hidden thumb drinks.",
  4: "Floor: Last person touching the floor drinks.",
  3: "Me: You drink.",
  2: "You: Choose someone to drink.",
};

const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
const ranks = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

let deck = [];

const drawCardButton = document.getElementById("draw-card");
const cardOutput = document.getElementById("card-output");
const cardsLeft = document.getElementById("cards-left");
const resetRingFire = document.getElementById("reset-ring-fire");
const ringFirePokerCard = document.getElementById("ring-fire-poker-card");

const suitSymbolMap = {
  Hearts: "♥",
  Diamonds: "♦",
  Clubs: "♣",
  Spades: "♠",
};

function renderPokerCard(target, card = null) {
  if (!target) {
    return;
  }

  if (!card) {
    target.className = "poker-card is-back";
    target.innerHTML = `
      <div class="poker-card-face poker-card-back">
        <p>PARTY</p>
      </div>
    `;
    return;
  }

  const symbol = suitSymbolMap[card.suit] || "?";
  const colorClass = card.suit === "Hearts" || card.suit === "Diamonds" ? "red" : "black";
  target.className = `poker-card dealt ${colorClass}`;
  target.innerHTML = `
    <div class="poker-card-face">
      <div class="poker-corner top">
        <span class="poker-rank">${card.rank}</span>
        <span class="poker-suit">${symbol}</span>
      </div>
      <div class="poker-center">${symbol}</div>
      <div class="poker-corner bottom">
        <span class="poker-rank">${card.rank}</span>
        <span class="poker-suit">${symbol}</span>
      </div>
    </div>
  `;

  window.setTimeout(() => {
    target.classList.remove("dealt");
  }, 420);
}

function shuffleDeck(cards) {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function createDeck() {
  const newDeck = [];
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      newDeck.push({ rank, suit });
    });
  });
  return shuffleDeck(newDeck);
}

function updateDeckUI(messageTitle = "Ready to draw", messageBody = "Press draw to start your round.") {
  cardsLeft.textContent = `${deck.length} cards left`;

  const title = cardOutput.querySelector(".card-rank");
  const rule = cardOutput.querySelector(".card-rule");
  title.textContent = messageTitle;
  rule.textContent = messageBody;
}

function drawCard() {
  if (deck.length === 0) {
    updateDeckUI("Deck Empty", "Reset to shuffle a new Ring of Fire round.");
    renderPokerCard(ringFirePokerCard, null);
    return;
  }

  const card = deck.pop();
  const label = `${card.rank} of ${card.suit}`;
  const rule = rankRules[card.rank] || "House choice: create your own move.";
  updateDeckUI(label, rule);
  renderPokerCard(ringFirePokerCard, card);
}

drawCardButton.addEventListener("click", drawCard);

resetRingFire.addEventListener("click", () => {
  deck = createDeck();
  updateDeckUI();
  renderPokerCard(ringFirePokerCard, null);
});

const nhiePrompts = [
  "Never have I ever sent a text to the wrong person.",
  "Never have I ever pretended to know a song I did not know.",
  "Never have I ever laughed so hard a drink came out.",
  "Never have I ever blamed my friend for my mistake.",
  "Never have I ever missed a morning alarm three times in a row.",
  "Never have I ever danced in public with no music.",
  "Never have I ever stayed up all night for no good reason.",
  "Never have I ever taken food from someone else's plate.",
  "Never have I ever forgotten where I parked.",
  "Never have I ever made a dramatic exit and returned right away.",
];

const mostLikelyToPrompts = [
  "Most likely to start a group trip and cancel last minute.",
  "Most likely to lose their phone at a party.",
  "Most likely to accidentally become the DJ.",
  "Most likely to win karaoke with zero practice.",
  "Most likely to show up in a costume to a normal dinner.",
  "Most likely to become famous for a random meme.",
  "Most likely to survive a zombie movie.",
  "Most likely to order dessert before dinner.",
  "Most likely to flirt their way out of trouble.",
  "Most likely to start a business after midnight.",
];

const truthOrDrinkPrompts = [
  "What is your most chaotic travel story?",
  "What is one thing in your notes app nobody should read?",
  "Who in this room would you trust with your biggest secret?",
  "What is your worst date story in one sentence?",
  "What habit do you hide from most people?",
  "What is a red flag you ignored way too long?",
  "What is your most expensive impulse purchase?",
  "What is the weirdest thing you believed as a kid?",
  "What is a message you regret sending?",
  "What is a harmless lie you tell all the time?",
];

function pickRandom(list) {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function setupPromptGame(buttonId, outputId, titleText, prompts) {
  const button = document.getElementById(buttonId);
  const output = document.getElementById(outputId);
  const title = output.querySelector(".card-rank");
  const body = output.querySelector(".card-rule");

  button.addEventListener("click", () => {
    title.textContent = titleText;
    body.textContent = pickRandom(prompts);
  });
}

setupPromptGame("draw-nhie", "nhie-output", "Never have I ever...", nhiePrompts);
setupPromptGame("draw-mlt", "mlt-output", "Most likely to...", mostLikelyToPrompts);
setupPromptGame("draw-tod", "tod-output", "Truth or drink", truthOrDrinkPrompts);

const flipState = {
  a: 0,
  b: 0,
  running: false,
  startedAt: 0,
  elapsed: 0,
  timerId: null,
};

const flipAEl = document.getElementById("flip-a");
const flipBEl = document.getElementById("flip-b");
const flipTimerEl = document.getElementById("flip-timer");
const flipStart = document.getElementById("flip-start");
const flipStop = document.getElementById("flip-stop");
const flipReset = document.getElementById("flip-reset");

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateFlipUI() {
  flipAEl.textContent = flipState.a;
  flipBEl.textContent = flipState.b;
  const shownElapsed = flipState.running
    ? flipState.elapsed + (Date.now() - flipState.startedAt)
    : flipState.elapsed;
  flipTimerEl.textContent = formatMs(shownElapsed);
}

document.getElementById("flip-a-plus").addEventListener("click", () => {
  flipState.a += 1;
  updateFlipUI();
});

document.getElementById("flip-a-minus").addEventListener("click", () => {
  flipState.a = Math.max(0, flipState.a - 1);
  updateFlipUI();
});

document.getElementById("flip-b-plus").addEventListener("click", () => {
  flipState.b += 1;
  updateFlipUI();
});

document.getElementById("flip-b-minus").addEventListener("click", () => {
  flipState.b = Math.max(0, flipState.b - 1);
  updateFlipUI();
});

flipStart.addEventListener("click", () => {
  if (flipState.running) {
    return;
  }

  flipState.running = true;
  flipState.startedAt = Date.now();
  flipState.timerId = window.setInterval(updateFlipUI, 250);
});

flipStop.addEventListener("click", () => {
  if (!flipState.running) {
    return;
  }

  flipState.elapsed += Date.now() - flipState.startedAt;
  flipState.running = false;
  window.clearInterval(flipState.timerId);
  flipState.timerId = null;
  updateFlipUI();
});

flipReset.addEventListener("click", () => {
  if (flipState.timerId) {
    window.clearInterval(flipState.timerId);
  }
  flipState.a = 0;
  flipState.b = 0;
  flipState.running = false;
  flipState.startedAt = 0;
  flipState.elapsed = 0;
  flipState.timerId = null;
  updateFlipUI();
});

const powerRoundEl = document.getElementById("power-round");
const powerStatusEl = document.getElementById("power-status");
const powerNext = document.getElementById("power-next");
const powerReset = document.getElementById("power-reset");

const powerState = {
  round: 0,
  maxRound: 60,
};

function updatePowerUI() {
  powerRoundEl.textContent = `${powerState.round} / ${powerState.maxRound}`;
  if (powerState.round >= powerState.maxRound) {
    powerStatusEl.textContent = "Power Hour complete. Hydrate and celebrate.";
  } else {
    powerStatusEl.textContent = "Press next round when the minute hits.";
  }
}

powerNext.addEventListener("click", () => {
  if (powerState.round < powerState.maxRound) {
    powerState.round += 1;
    updatePowerUI();
  }
});

powerReset.addEventListener("click", () => {
  powerState.round = 0;
  updatePowerUI();
});

const hlCurrentEl = document.getElementById("hl-current");
const hlStatusEl = document.getElementById("hl-status");
const hlHigher = document.getElementById("hl-higher");
const hlLower = document.getElementById("hl-lower");
const hlReset = document.getElementById("hl-reset");
const hlPokerCard = document.getElementById("hl-poker-card");

const hlValueMap = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  10: 10,
  9: 9,
  8: 8,
  7: 7,
  6: 6,
  5: 5,
  4: 4,
  3: 3,
  2: 2,
};

const higherLowerState = {
  deck: [],
  current: null,
};

function createPlayingDeck() {
  const cards = [];
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      cards.push({ rank, suit });
    });
  });
  return shuffleDeck(cards);
}

function cardLabel(card) {
  return `${card.rank} of ${card.suit}`;
}

function resetHigherLower() {
  higherLowerState.deck = createPlayingDeck();
  higherLowerState.current = higherLowerState.deck.pop();
  hlCurrentEl.textContent = cardLabel(higherLowerState.current);
  hlStatusEl.textContent = "Guess higher or lower to reveal the next card.";
  renderPokerCard(hlPokerCard, higherLowerState.current);
}

function playHigherLower(guess) {
  if (higherLowerState.deck.length === 0) {
    hlStatusEl.textContent = "Deck finished. Reset to play again.";
    return;
  }

  const next = higherLowerState.deck.pop();
  const currentValue = hlValueMap[higherLowerState.current.rank];
  const nextValue = hlValueMap[next.rank];
  let result = "Tie. No drink this turn.";

  if (nextValue !== currentValue) {
    const isCorrect = (guess === "higher" && nextValue > currentValue) || (guess === "lower" && nextValue < currentValue);
    result = isCorrect ? "Correct guess. Pass a drink." : "Wrong guess. Take a drink.";
  }

  higherLowerState.current = next;
  hlCurrentEl.textContent = cardLabel(next);
  hlStatusEl.textContent = `${result} ${higherLowerState.deck.length} cards left.`;
  renderPokerCard(hlPokerCard, next);
}

hlHigher.addEventListener("click", () => playHigherLower("higher"));
hlLower.addEventListener("click", () => playHigherLower("lower"));
hlReset.addEventListener("click", resetHigherLower);

deck = createDeck();
updateBeerPongUI();
updateDeckUI();
renderPokerCard(ringFirePokerCard, null);
updateFlipUI();
updatePowerUI();
resetHigherLower();
