document.addEventListener('DOMContentLoaded', () => {
    // Fetch dataset - use relative path so it works on the same host
    fetch('/php/unload.php')
        .then(res => {
            if (!res.ok) throw new Error('Netzwerkantwort nicht OK');
            return res.json();
        })
        .then(data => {
            buildDateTimePicker(data);
        })
        .catch(err => {
            console.error('Fehler beim Laden der Daten:', err);
            showFetchError(err);
        });

    function showFetchError(err) {
        const msg = document.createElement('div');
        msg.style.color = 'red';
        msg.style.padding = '12px';
        msg.textContent = 'Fehler beim Laden der Daten. Siehe Konsole.';
        document.body.prepend(msg);
    }

    // Build date->times picker UI from API data
    function buildDateTimePicker(items) {
        if (!Array.isArray(items) || items.length === 0) {
            const noData = document.createElement('p');
            noData.textContent = 'Keine Daten vorhanden.';
            document.body.appendChild(noData);
            return;
        }

        // Avoid inserting the picker twice if the script runs more than once
        if (document.getElementById('datePickerContainer')) {
            return;
        }


        // Collect all unique dates and all unique times (independent)
            const datesSet = new Set();
            const timesSet = new Set();
            items.forEach(it => {
                if (!it.publication_time) return;
                // publication_time expected like 'YYYY-MM-DD HH:MM:SS'
                const parts = it.publication_time.split(' ');
                if (parts.length < 2) return;
                const date = parts[0];
                const time = parts[1].slice(0,5); // HH:MM
                datesSet.add(date);
                timesSet.add(time);
            });

            // Sort dates (newest first) and times (ascending)
            const dates = Array.from(datesSet).sort((a,b) => b.localeCompare(a));
            const times = Array.from(timesSet).sort();

        // Container
        const container = document.createElement('div');
        container.id = 'datePickerContainer';
        container.style.maxWidth = '600px';
        container.style.margin = '36px auto';
        container.style.padding = '18px';
        container.style.background = 'rgba(255,255,255,0.95)';
        container.style.borderRadius = '12px';
        container.style.display = 'flex';
        container.style.gap = '12px';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';

        // Date input (native calendar). We intentionally do NOT provide
        // suggestion options; user should pick the date from the native
        // calendar UI. We will set min/max to the available date range.
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = 'dateInput';
        dateInput.style.padding = '8px 10px';
        dateInput.style.fontSize = '26px';
        dateInput.style.fontWeight = '700';

        // set min/max based on available dates (if present)
        if (dates.length > 0) {
            // dates array is currently newest-first; compute ascending order
            const sortedAsc = Array.from(dates).slice().sort();
            dateInput.min = sortedAsc[0];
            dateInput.max = sortedAsc[sortedAsc.length - 1];
        }

        // Time input (editable) with datalist suggestions — time required
        const timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.id = 'timeInput';
        timeInput.style.padding = '8px 10px';
        timeInput.style.fontSize = '26px';
        timeInput.style.fontWeight = '700';
        
        timeInput.setAttribute('list', 'timeSuggestions');
        timeInput.setAttribute('step', '60'); // minute granularity

        const timeDatalist = document.createElement('datalist');
        timeDatalist.id = 'timeSuggestions';
        // populate global times as suggestions
        times.forEach(t => {
            const o = document.createElement('option');
            o.value = t;
            timeDatalist.appendChild(o);
        });

        // Confirm button (requires both date and time)
        const confirmBtn = document.createElement('button');
    confirmBtn.id = 'confirmDateBtn';
    confirmBtn.className = 'btn';
    confirmBtn.disabled = true;
    // replace button label with confirm image
    const confirmImg = document.createElement('img');
        confirmImg.src = 'img/confirm_date.png';
        confirmImg.alt = 'Bestätigen';
        confirmImg.style.height = '56px';
        confirmImg.style.width = 'auto';
        confirmImg.style.display = 'block';
        // fallback: if relative path fails (e.g. opened via file://), try absolute path
        confirmImg.onerror = function () {
            if (confirmImg.src.indexOf('/img/confirm_date.png') === -1) {
                confirmImg.src = '/img/confirm_date.png';
            } else {
                // final fallback: show text so user can still click
                confirmImg.style.display = 'none';
                confirmBtn.textContent = 'Bestätigen';
            }
        };
        confirmBtn.appendChild(confirmImg);

        function updateConfirmState() {
            const dateVal = dateInput.value;
            const timeVal = timeInput.value;
            confirmBtn.disabled = !(dateVal && timeVal);
        }

        // enable when both fields have values
        dateInput.addEventListener('input', updateConfirmState);
        timeInput.addEventListener('input', updateConfirmState);

        confirmBtn.addEventListener('click', () => {
            const date = dateInput.value;
            const time = timeInput.value;
            if (!date) return alert('Bitte ein Datum auswählen.');
            if (!time) return alert('Bitte eine Uhrzeit auswählen.');
            // Ensure time is in HH:MM format (time input should provide that)
            const url = 'parkhaus_waehlen.html?date=' + encodeURIComponent(date) + '&time=' + encodeURIComponent(time);
            window.location.href = url;
        });

    // Assemble (inputs)
    container.appendChild(dateInput);
    container.appendChild(timeInput);
    container.appendChild(confirmBtn);
    container.appendChild(timeDatalist);

        // Inject into the wrapper div if present so CSS can style it; otherwise
        // fall back to inserting after the header or at the top of the body.
        const wrapper = document.getElementById('datePickerWrapper');
        if (wrapper) {
            wrapper.appendChild(container);
        } else {
            const header = document.getElementById('gameHeader');
            if (header && header.parentNode) header.parentNode.insertBefore(container, header.nextSibling);
            else document.body.prepend(container);
        }

        // Prefill the date with today's date if possible; otherwise pick nearest allowed date.
        const pad = n => String(n).padStart(2, '0');
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
        if (dateInput.min && dateInput.max) {
            if (todayStr >= dateInput.min && todayStr <= dateInput.max) {
                dateInput.value = todayStr;
            } else if (todayStr < dateInput.min) {
                dateInput.value = dateInput.min;
            } else {
                dateInput.value = dateInput.max;
            }
        } else {
            // if no min/max supplied, just prefill today's date
            dateInput.value = todayStr;
        }

        // Prefill time suggestion if available.
        if (times.length > 0) timeInput.value = times[0];
        updateConfirmState();

        // Open the native date picker where supported to show the small calendar
        try {
            dateInput.focus();
            if (typeof dateInput.showPicker === 'function') {
                dateInput.showPicker();
            } else {
                // fallback: try to trigger a click which may open some pickers
                dateInput.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
        } catch (e) {
            // ignore errors — best-effort UX
        }
    }
});
