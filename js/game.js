const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startGameBtn = document.getElementById("startGameBtn");
const restartBtn = document.getElementById("restartBtn");
const timerDisplay = document.getElementById("timerDisplay");
const survivedTimeDisplay = document.getElementById("survivedTimeDisplay");

// Formatierte Zeit (mm:ss)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return String(mins).padStart(2, '0') + ":" + String(secs).padStart(2, '0');
}

// Bilder
const playerImg = new Image();
playerImg.src = "/img/player.png";
const enemyImg = new Image();
enemyImg.src = "/img/enemy.png";
const backgroundImg = new Image();
backgroundImg.src = "/img/back_park.png";

// Spielvariablen
let player, enemies, enemyCount = 0, gameOver, gameWin, timeLeft, mouseX, mouseY, timer, gameRunning;
let startTime, invincibleTime = 1000; // 1 Sekunde Schutzzeit
let survivedTime = 0;
const MAX_ENEMIES = 600;
// enemy base speed multiplier (tune this value to make enemies faster/slower)
const ENEMY_SPEED = 5;

// Read params and load parkhaus data
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const selectedDate = params.get('date');
  const selectedTime = params.get('time');
  const selectedName = params.get('name');

  const parkhausLabel = document.getElementById('parkhausName');
  if (parkhausLabel && selectedName) parkhausLabel.textContent = selectedName;

  // Fetch datasets and find matching record for this parkhaus/name + date/time
  fetch('/php/unload.php')
    .then(function (res) { if (!res.ok) throw new Error('Netzwerkfehler'); return res.json(); })
    .then(function (data) {
      if (!Array.isArray(data)) return;
      // find entries with matching name and date. Use a robust parser for publication_time
      function parsePublication(pub) {
        // match formats like 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DDTHH:MM:SS'
        if (!pub) return null;
        var m = pub.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(:?\d{0,2})?/);
        if (m) return { date: m[1], hm: m[2], full: pub };
        // fallback: try splitting by space
        var parts = pub.split(' ');
        if (parts.length >= 2) return { date: parts[0], hm: (parts[1] || '').slice(0,5), full: pub };
        return { date: pub, hm: null, full: pub };
      }

      var candidates = data.filter(function (it) {
        if (!it || !it.publication_time) return false;
        var p = parsePublication(it.publication_time);
        return it.name === selectedName && p && p.date === selectedDate;
      });

      // Choose the best matching candidate:
      // - if the user provided a time -> pick the candidate with the closest HH:MM
      // - otherwise -> pick the most recent (max publication_time)
      var chosen = null;
      if (candidates.length > 0) {
        function hmToMinutes(hm) {
          if (!hm) return null;
          var parts = hm.split(':');
          if (parts.length < 2) return null;
          var hh = parseInt(parts[0], 10);
          var mm = parseInt(parts[1], 10);
          if (isNaN(hh) || isNaN(mm)) return null;
          return hh * 60 + mm;
        }

        if (selectedTime) {
          var targetMin = hmToMinutes(selectedTime);
          var bestDiff = Infinity;
          for (var i = 0; i < candidates.length; i++) {
            var parsed = parsePublication(candidates[i].publication_time);
            var pubHM = (parsed && parsed.hm) ? parsed.hm : '';
            var pubMin = hmToMinutes(pubHM);
            if (pubMin === null) continue;
            var diff = Math.abs(pubMin - targetMin);
            if (diff === 0) { chosen = candidates[i]; break; }
            if (diff < bestDiff) { bestDiff = diff; chosen = candidates[i]; }
          }
        }

        if (!chosen) {
          // pick the candidate with the largest (latest) publication_time string
          chosen = candidates.reduce(function (a, b) {
            return (a.publication_time > b.publication_time) ? a : b;
          }, candidates[0]);
        }
      }
      if (chosen) {
        // if the chosen record indicates the parkhaus is closed (status == 2), redirect to closed page
        if (Number(chosen.status) === 2) {
          window.location.href = 'closed.html';
          return; // stop further initialization
        }
        var total = Number(chosen.total) || 0;
        var free = Number(chosen.free) || 0;
        var occupied = Math.max(0, total - free);
        enemyCount = Math.min(MAX_ENEMIES, occupied);
        // update UI count if element exists
        var carCountEl = document.getElementById('carCount');
        if (carCountEl) carCountEl.textContent = occupied;
        // show matched timestamp + occupied in the game UI for easier debugging
        var matchedEl = document.getElementById('matchedInfo');
        if (matchedEl) {
            matchedEl.textContent = occupied;
        }
      }
      // initialize game (points creation uses enemyCount)
      init();
      // draw initial frame
      requestAnimationFrame(update);
    })
    .catch(function (err) {
      console.error('Fehler beim Laden der Parkhausdaten', err);
      // still initialize with defaults
      init();
      requestAnimationFrame(update);
    });
});

// Initialisierung
function init() {
  player = { x: canvas.width / 20, y: canvas.height / 5, radius: 20 };
  enemies = [];

  // enemyCount is determined from the selected parkhaus data (total - free)
  enemyCount = Math.max(0, Math.min(MAX_ENEMIES, Number(enemyCount) || 0));
  gameOver = false;
  gameWin = false;
  gameRunning = false;
  timeLeft = 30;
  mouseX = player.x;
  mouseY = player.y;
  startTime = null;
  survivedTime = 0;

  for (let i = 0; i < enemyCount; i++) {
    enemies.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 20,
      dx: (Math.random() - 0.5) * ENEMY_SPEED,
      dy: (Math.random() - 0.5) * ENEMY_SPEED
    });
  }
}

// Mausbewegung
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  
  // Mausposition korrekt berechnen, inkl. Header-Padding
  mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
  mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
});


// Timer
function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!gameOver && gameRunning) {
      timeLeft--;
      timerDisplay.textContent = "Zeit: " + formatTime(timeLeft);

      if (timeLeft <= 0) {
        gameWin = true;            // Spieler hat gewonnen
        gameOver = true;
        gameRunning = false;
        survivedTime = 30;
        clearInterval(timer);
        showGameOver();            // Overlay anzeigen
      }
    }
  }, 1000);
}

// Spieler zeichnen
function drawPlayer(player) {
  const width = player.radius * 2;
  const height = player.radius * 1.0;
  ctx.drawImage(playerImg, player.x - width / 2, player.y - height / 2, width, height);
}

// Gegner zeichnen
function drawEnemy(enemy) {
  const width = enemy.radius * 2;
  const height = enemy.radius * 1.0;
  ctx.drawImage(enemyImg, enemy.x - width / 2, enemy.y - height / 2, width, height);
}

// Update & Render
function update(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Hintergrund
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

  if (gameRunning) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    player.x = mouseX;
    player.y = mouseY;
    drawPlayer(player);

    for (let enemy of enemies) {
      enemy.x += enemy.dx;
      enemy.y += enemy.dy;

      if (enemy.x < enemy.radius || enemy.x > canvas.width - enemy.radius) enemy.dx *= -1;
      if (enemy.y < enemy.radius || enemy.y > canvas.height - enemy.radius) enemy.dy *= -1;

      drawEnemy(enemy);

      // Kollision prüfen
      if (elapsed > invincibleTime) {
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < player.radius + enemy.radius) {
          gameOver = true;
          gameRunning = false;
          survivedTime = Math.floor((timestamp - startTime) / 1000);
          clearInterval(timer);
          showGameOver();
        }
      }
    }
  }

  requestAnimationFrame(update);
}

// Game Over Overlay anzeigen
function showGameOver() {
  survivedTimeDisplay.textContent = formatTime(survivedTime);
  const overlay = document.getElementById("gameOverScreen");
  const title = document.querySelector("#gameOverWindow h1");
  const message = document.querySelector("#gameOverWindow p");

  if(gameWin){
    title.textContent = "Gewonnen!";
    message.textContent = "Du hast " + formatTime(survivedTime) + " Sekunden überlebt.";
  } else {
    title.textContent = "Unfall!!";
    message.textContent = formatTime(survivedTime) + " Sekunden bis zum Zusammenprall.";
  }

  overlay.style.display = "flex";
}

// Startbutton
startGameBtn.addEventListener("click", () => {
  // assume init() already called after data load; only start running
  gameRunning = true;
  gameOver = false;
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("gameOverScreen").style.display = "none";
  startTimer();
});

// Wiederholen Button
restartBtn.addEventListener("click", () => {
  init();
  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("startScreen").style.display = "flex";
});

// Spiel wird nach dem Laden der Parkhausdaten initialisiert (siehe DOMContentLoaded handler)