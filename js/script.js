// Script for the index (date/time picker) page
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('dateInput');
  const timeInput = document.getElementById('timeInput');
  const confirmBtn = document.getElementById('confirmBtn');

  // If the elements are not present, this script simply does nothing (it's safe to include on other pages).
  if (!confirmBtn || !dateInput || !timeInput) return;

  confirmBtn.addEventListener('click', () => {
    const date = dateInput.value;
    const time = timeInput.value;

    if (!date || !time) {
      alert('Bitte Datum und Uhrzeit eingeben!');
      return;
    }

    // Round time to the nearest hour (>=30 -> next hour)
    let [hour, minute] = time.split(':').map(Number);
    if (minute >= 30) hour += 1;
    hour = hour % 24;
    const roundedTime = hour.toString().padStart(2, '0') + ':00';

    const url = `parkhaus_waehlen.html?date=${encodeURIComponent(date)}&time=${encodeURIComponent(roundedTime)}`;
    window.location.href = url;
  });
});
