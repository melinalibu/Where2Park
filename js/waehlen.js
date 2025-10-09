// waehlen.js
// Reads ?date=YYYY-MM-DD&time=HH:MM from the URL, fetches datasets, and shows up to 5 entries
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const selectedDate = params.get('date');
  const selectedTime = params.get('time');

  const listEl = document.getElementById('parkhausList');
  const infoEl = document.getElementById('info');
  if (!listEl) return;

  if (!selectedDate) {
    infoEl && (infoEl.textContent = 'Kein Datum angegeben');
    listEl.innerHTML = '<li>Bitte Datum auswählen</li>';
    return;
  }

  infoEl && (infoEl.textContent = `Parkhäuser für ${selectedDate}`);

  fetch('/php/unload.php')
    .then(res => {
      if (!res.ok) throw new Error('Netzwerkantwort nicht OK');
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data)) {
        listEl.innerHTML = '<li>Unerwartetes Datenformat</li>';
        return;
      }

      // Collect unique park names that appear on the chosen date
      const namesSet = new Set();
      data.forEach(item => {
        if (!item.publication_time) return;
        const pubDate = item.publication_time.split(' ')[0];
        if (pubDate === selectedDate && item.name) namesSet.add(item.name);
      });

      const names = Array.from(namesSet);

      if (names.length === 0) {
        listEl.innerHTML = '<li>Keine Parkhäuser für dieses Datum gefunden</li>';
        return;
      }

      // Shuffle names (Fisher-Yates) and pick up to 5 random names
      for (let i = names.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [names[i], names[j]] = [names[j], names[i]];
      }

      const chosen = names.slice(0, 5);

      infoEl && (infoEl.textContent = `Zufällige Auswahl (${chosen.length} von ${namesSet.size}) für ${selectedDate}`);

      listEl.innerHTML = '';
      chosen.forEach(name => {
        const li = document.createElement('li');
        const a = document.createElement('a');
  a.href = `game.html?date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(selectedTime||'')}&name=${encodeURIComponent(name)}`;
        a.textContent = name;
        li.appendChild(a);
        listEl.appendChild(li);
      });
    })
    .catch(err => {
      console.error(err);
      listEl.innerHTML = '<li>Fehler beim Laden der Daten</li>';
    });
});
const params = new URLSearchParams(window.location.search);
const selectedDate = params.get('date');
const selectedTime = params.get('time');

