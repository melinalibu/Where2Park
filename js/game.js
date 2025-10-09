// details.js — spawn moving points for occupied/free spots; player is cursor-controlled and must avoid collisions
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const selectedDate = params.get('date');
  const selectedTime = params.get('time');
  const selectedName = params.get('name');

  const titleEl = document.getElementById('title');
  const subtitleEl = document.getElementById('subtitle');
  const tableEl = document.getElementById('detailsTable');
  const carCountEl = document.getElementById('carCount');

  // hide table if present
  if (tableEl) tableEl.style.display = 'none';

  titleEl && (titleEl.textContent = selectedName || 'Parkhaus Details');
  subtitleEl && (subtitleEl.textContent = `Datum: ${selectedDate || '-'}  •  Zeit: ${selectedTime || '-'}`);

  if (!selectedName) {
    console.error('Kein Parkhausname im Query-String');
    return;
  }

  fetch('/php/unload.php')
    .then(res => { if (!res.ok) throw new Error('Netzwerkantwort nicht OK'); return res.json(); })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('Unerwartetes Datenformat');

      const entries = data.filter(item => item.name === selectedName && item.publication_time && (!selectedDate || item.publication_time.split(' ')[0] === selectedDate));
      if (entries.length === 0) {
        alert('Keine Daten für dieses Parkhaus gefunden');
        return;
      }

      // pick best entry (closest to selectedTime if provided)
      let chosen = entries[0];
      if (selectedTime) {
        const target = new Date(`${selectedDate}T${selectedTime}:00`);
        entries.sort((a, b) => Math.abs(new Date(a.publication_time.replace(' ', 'T')) - target) - Math.abs(new Date(b.publication_time.replace(' ', 'T')) - target));
        chosen = entries[0];
      } else {
        entries.sort((a, b) => new Date(b.publication_time) - new Date(a.publication_time));
        chosen = entries[0];
      }

  const capacity = Number(chosen.total) || 0;
  const free = Number(chosen.free) || 0;
  // number of points = total - occupied (= free)
  const numPoints = Math.max(0, free);

  // Update UI count
  if (carCountEl) carCountEl.textContent = String(numPoints);

  // start simulation with number of points = free spots
  startPointsSimulation(numPoints);
    })
    .catch(err => {
      console.error(err);
      alert('Fehler beim Laden der Daten');
    });
});

function startPointsSimulation(numPoints) {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const startBtn = document.getElementById('startGameBtn');
  const restartBtn = document.getElementById('restartBtn');
  const carCountEl = document.getElementById('carCount');
  const backToDateBtn = document.getElementById('backToDateBtn');

  // clamp numbers for performance
  const MAX_POINTS = 200;
  const pointCount = Math.min(numPoints, MAX_POINTS);

  let points = [];

  const player = { x: canvas.width / 2, y: canvas.height / 2, r: 10 };
  let running = false;
  let rafId = null;

  function makePoint(type) {
    const speed = 0.3 + Math.random() * 1.0;
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      r: 6,
      type
    };
  }

  function init() {
    points = [];
    for (let i = 0; i < pointCount; i++) points.push(makePoint('free'));
    if (carCountEl) carCountEl.textContent = String(pointCount);
  }

  function update() {
  const all = points;
    for (const p of all) {
      p.x += p.vx;
      p.y += p.vy;
      // bounce
      if (p.x < p.r) { p.x = p.r; p.vx *= -1; }
      if (p.x > canvas.width - p.r) { p.x = canvas.width - p.r; p.vx *= -1; }
      if (p.y < p.r) { p.y = p.r; p.vy *= -1; }
      if (p.y > canvas.height - p.r) { p.y = canvas.height - p.r; p.vy *= -1; }
      // jitter
      p.vx += (Math.random() - 0.5) * 0.08;
      p.vy += (Math.random() - 0.5) * 0.08;
      // clamp speed
      const sp = Math.hypot(p.vx, p.vy);
      const maxSp = 1.8;
      if (sp > maxSp) { p.vx = (p.vx / sp) * maxSp; p.vy = (p.vy / sp) * maxSp; }
    }

    // collision with player
    for (const p of all) {
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < p.r + player.r) {
        // collision -> stop
        running = false;
        cancelAnimationFrame(rafId);
        // show overlay simple
        showCollision();
        return;
      }
    }
  }

  function draw() {
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // background
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // points (free spots)
    for (const p of points) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = '#4caf50'; ctx.fill();
    }

    // player
    ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fillStyle = '#2196f3'; ctx.fill();
  }

  function frame() {
    if (!running) return;
    update();
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function showCollision() {
    // simple alert for now
    alert('Berührung! Spiel beendet.');
  }

  // mouse move controls player
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left;
    player.y = e.clientY - rect.top;
  });

  startBtn.addEventListener('click', () => {
    if (running) return;
    running = true;
    init();
    rafId = requestAnimationFrame(frame);
  });

  restartBtn.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(rafId);
    init();
    running = true;
    rafId = requestAnimationFrame(frame);
  });

  if (backToDateBtn) {
    backToDateBtn.addEventListener('click', () => {
      // go back to the date/time picker (index.html)
      window.location.href = 'index.html';
    });
  }

  // initialize
  init();
}
