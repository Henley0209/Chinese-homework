(() => {
  // Vietnam's Women's Day uses the same calendar dates for all visitors.
  const calendar = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', month: 'numeric', day: 'numeric'
  });
  function updateGreeting() {
    const parts = calendar.formatToParts(new Date());
    const month = Number(parts.find(part => part.type === 'month').value);
    const day = Number(parts.find(part => part.type === 'day').value);
    const visible = month === 10 && day >= 15 && day <= 25;
    document.querySelectorAll('.womens-day').forEach(section => {
      section.hidden = !visible;
    });
  }
  function scheduleUpdate() {
    updateGreeting();
    // UTC+7 has no daylight saving time; refresh at the next local midnight.
    const dayMs = 24 * 60 * 60 * 1000;
    const elapsed = (Date.now() + 7 * 60 * 60 * 1000) % dayMs;
    window.setTimeout(scheduleUpdate, dayMs - elapsed + 100);
  }
  scheduleUpdate();
  document.addEventListener('visibilitychange', updateGreeting);
  window.addEventListener('pageshow', updateGreeting);
})();
