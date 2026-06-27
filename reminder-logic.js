function shouldTriggerReminder(reminder, now) {
  if (!reminder || reminder.triggered) {
    return false;
  }

  const reminderTime = new Date(reminder.date);
  if (Number.isNaN(reminderTime.getTime())) {
    return false;
  }

  const nowTime = now instanceof Date ? now : new Date(now);
  const timePassed = reminderTime <= nowTime;
  const withinTwoMinutes = (nowTime - reminderTime) / (1000 * 60) < 2;

  return timePassed && (!withinTwoMinutes || reminderTime.getTime() <= nowTime.getTime());
}

module.exports = { shouldTriggerReminder };
