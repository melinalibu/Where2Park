document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const selectedDate = params.get('date');
  const selectedTime = params.get('time');

  const listEl = document.getElementById('parkhausList');
  const infoEl = document.getElementById('info');
  var gallery = document.getElementById('parkhausGallery');

  if (!selectedDate) {
    if (infoEl) infoEl.textContent = 'Kein Datum angegeben';
    else {
      var m = document.createElement('div'); m.textContent = 'Kein Datum angegeben'; document.body.insertBefore(m, document.body.firstChild);
    }
    if (listEl) listEl.innerHTML = '<li>Bitte Datum auswählen</li>';
    else if (gallery) gallery.innerHTML = '<div>Bitte Datum auswählen</div>';
    else {
      var m2 = document.createElement('div'); m2.textContent = 'Bitte Datum auswählen'; document.body.appendChild(m2);
    }
    return;
  }
  
  // --- Hover label for images: show parkhaus name near cursor ---
  function createHoverLabel() {
    let label = document.getElementById('parkhausHoverLabel');
    if (!label) {
      label = document.createElement('div');
      label.id = 'parkhausHoverLabel';
      label.className = 'hover-name';
      document.body.appendChild(label);
    }
    return label;
  }

  const hoverLabel = createHoverLabel();

  function attachHoverHandlersToImg(imgEl, name) {
    if (!imgEl) return;
    imgEl.addEventListener('mouseenter', (e) => {
      hoverLabel.textContent = name || imgEl.alt || '';
      hoverLabel.style.display = 'block';
      // position initially
      hoverLabel.style.left = (e.clientX + 12) + 'px';
      hoverLabel.style.top = (e.clientY + 12) + 'px';
    });
    imgEl.addEventListener('mousemove', (e) => {
      hoverLabel.style.left = (e.clientX + 12) + 'px';
      hoverLabel.style.top = (e.clientY + 12) + 'px';
    });
    imgEl.addEventListener('mouseleave', () => {
      hoverLabel.style.display = 'none';
    });
  }

  if (infoEl) infoEl.textContent = 'Parkhäuser für ' + selectedDate;

  fetch('/php/unload.php')
    .then(res => {
      if (!res.ok) throw new Error('Netzwerkantwort nicht OK');
      return res.json();
    })
    .then(data => {
      if (!Array.isArray(data)) {
        if (listEl) listEl.innerHTML = '<li>Unerwartetes Datenformat</li>';
        else if (gallery) gallery.innerHTML = '<div>Unerwartetes Datenformat</div>';
        else { var e = document.createElement('div'); e.textContent = 'Unerwartetes Datenformat'; document.body.appendChild(e); }
        return;
      }

      // Filter entries matching the selected date.
      // We intentionally do NOT require an exact time match on this page so
      // users see all parkhäuser for the chosen date. The game page will
      // decide which timestamp (closest to the requested time) to use.
      const matching = data.filter(item => {
        if (!item.publication_time) return false;
        const parts = item.publication_time.split(' ');
        const pubDate = parts[0];
        return pubDate === selectedDate;
      });

      if (matching.length === 0) {
        if (listEl) listEl.innerHTML = '<li>Keine Parkhäuser für dieses Datum gefunden</li>';
        else if (gallery) gallery.innerHTML = '<div>Keine Parkhäuser für dieses Datum gefunden</div>';
        else { var e2 = document.createElement('div'); e2.textContent = 'Keine Parkhäuser für dieses Datum gefunden'; document.body.appendChild(e2); }
        return;
      }

      // Collect unique park names (up to 16 total in data) and shuffle
      const namesSet = new Set();
      matching.forEach(item => { if (item.name) namesSet.add(item.name); });
      const names = Array.from(namesSet);

      // Shuffle and pick up to 5
      for (let i = names.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [names[i], names[j]] = [names[j], names[i]];
      }
      const chosen = names.slice(0, 5);

  infoEl && (infoEl.textContent = `Zufällige Auswahl (${chosen.length} von ${namesSet.size}) für ${selectedDate} (Uhrzeit wird im Spiel verwendet)`);

      // Assign each chosen parkhaus to one of the five image files 1parkhaus.png..5parkhaus.png
      gallery = document.getElementById('parkhausGallery') || gallery;
      if (!gallery) {
        // create fallback gallery container if not present
        gallery = document.createElement('div');
        gallery.id = 'parkhausGallery';
        gallery.className = 'gallery';
        var header = document.getElementById('gameHeader');
        if (header && header.parentNode) header.parentNode.insertBefore(gallery, header.nextSibling);
        else document.body.appendChild(gallery);
      }
      // clear existing gallery content (we'll reuse static images if present)
      gallery.innerHTML = '';

      for (var i = 0; i < chosen.length; i++) {
        var name = chosen[i];
        var imgIndex = (i % 5) + 1; // 1..5
        var staticId = 'parkhaus' + imgIndex;
        var staticImg = document.getElementById(staticId);

        var targetUrl = 'game.html?date=' + encodeURIComponent(selectedDate) + '&time=' + encodeURIComponent(selectedTime || '') + '&name=' + encodeURIComponent(name);

        if (staticImg) {
          // Reuse static image element and make it a real link (anchor)
          staticImg.src = '/img/' + imgIndex + 'parkhaus.png';
          staticImg.alt = name;
          // if the image isn't already inside an anchor, wrap it
          var parent = staticImg.parentNode;
          if (!parent || parent.tagName.toLowerCase() !== 'a') {
            var a = document.createElement('a');
            a.href = targetUrl;
            a.title = name;
            a.style.display = 'inline-block';
            // move image into the anchor
            if (parent) parent.replaceChild(a, staticImg);
            a.appendChild(staticImg);
            parent = a;
          } else {
            parent.href = targetUrl;
          }
          staticImg.style.cursor = 'pointer';

          // attach hover label handlers
          attachHoverHandlersToImg(staticImg, name);

          // no captions: we intentionally don't create caption elements here
        } else {
          // If static images are not present, create a clickable gallery item
          var item = document.createElement('a');
          item.href = targetUrl;
          item.className = 'galleryItem';
          item.style.display = 'inline-block';
          item.style.margin = '6px';

          var thumb = document.createElement('img');
          thumb.src = '/img/' + imgIndex + 'parkhaus.png';
          thumb.alt = name;
          thumb.style.width = '160px';
          thumb.style.height = 'auto';

          item.appendChild(thumb);
          gallery.appendChild(item);

          // attach hover handlers to generated thumb
          attachHoverHandlersToImg(thumb, name);
        }
      }
    })
    .catch(err => {
      console.error(err);
      if (listEl) listEl.innerHTML = '<li>Fehler beim Laden der Daten</li>';
      else if (gallery) gallery.innerHTML = '<div>Fehler beim Laden der Daten</div>';
      else { var e3 = document.createElement('div'); e3.textContent = 'Fehler beim Laden der Daten'; document.body.appendChild(e3); }
    });
});