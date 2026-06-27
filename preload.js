const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reminderAPI', {
  getReminders: () => ipcRenderer.invoke('get-reminders'),
  addReminder: (reminder) => ipcRenderer.invoke('add-reminder', reminder),
  deleteReminder: (id) => ipcRenderer.invoke('delete-reminder', id),
  updateReminder: (reminder) => ipcRenderer.invoke('update-reminder', reminder),
  onReminderTriggered: (callback) => ipcRenderer.on('reminder-triggered', (event, reminder) => callback(reminder))
});
