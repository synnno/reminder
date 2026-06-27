const { app, BrowserWindow, Menu, Tray, ipcMain, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { shouldTriggerReminder } = require('./reminder-logic');

let tray = null;
let mainWindow = null;
const remindersFile = path.join(app.getPath('userData'), 'reminders.json');

function loadReminders() {
  try {
    if (fs.existsSync(remindersFile)) {
      return JSON.parse(fs.readFileSync(remindersFile, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading reminders:', e);
  }
  return [];
}

function saveReminders(reminders) {
  fs.writeFileSync(remindersFile, JSON.stringify(reminders, null, 2));
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const windowConfig = {
    width: 500,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  };

  if (fs.existsSync(iconPath)) {
    windowConfig.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowConfig);

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }

  const simpleIcon = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0xF3, 0xFF, 0x61, 0x00, 0x00, 0x00,
    0x1D, 0x74, 0x45, 0x58, 0x74, 0x53, 0x6F, 0x66, 0x74, 0x77, 0x61, 0x72,
    0x65, 0x00, 0x41, 0x64, 0x6F, 0x62, 0x65, 0x20, 0x49, 0x6D, 0x61, 0x67,
    0x65, 0x52, 0x65, 0x61, 0x64, 0x79, 0x71, 0xC9, 0x65, 0x3C, 0x00, 0x00,
    0x00, 0x8E, 0x49, 0x44, 0x41, 0x54, 0x38, 0x8D, 0x63, 0xF8, 0xCF, 0xC0,
    0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00,
    0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayImage;
  
  if (fs.existsSync(iconPath)) {
    trayImage = nativeImage.createFromPath(iconPath);
  } else {
    trayImage = nativeImage.createFromBuffer(simpleIcon, { width: 16, height: 16 });
  }

  tray = new Tray(trayImage);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📝 Open Reminders',
      click: () => {
        if (mainWindow === null) createWindow();
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: app.getLoginItemSettings().openAtLogin ? '🟢 Start on startup: On' : '⚪ Start on startup: Off',
      click: () => {
        toggleAutoStart();
      }
    },
    { type: 'separator' },
    {
      label: '❌ Exit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow === null) createWindow();
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function setAutoStart(enabled = true) {
  const exePath = app.getPath('exe');

  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: exePath
  });
}

function toggleAutoStart() {
  const nextState = !app.getLoginItemSettings().openAtLogin;
  setAutoStart(nextState);
  createTray();
  buildAppMenu();
}

function buildAppMenu() {
  const autoStartEnabled = app.getLoginItemSettings().openAtLogin;
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Reminders',
          click: () => {
            if (mainWindow === null) createWindow();
            mainWindow.show();
            mainWindow.focus();
          }
        },
        {
          label: autoStartEnabled ? 'Disable startup launch' : 'Enable startup launch',
          click: () => {
            toggleAutoStart();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function checkReminders() {
  const reminders = loadReminders();
  const now = new Date();
  
  reminders.forEach((reminder, index) => {
    const reminderTime = new Date(reminder.date);
    const shouldTrigger = shouldTriggerReminder(reminder, now);

    if (shouldTrigger) {
      showReminderNotification(reminder);
      reminders[index].triggered = true;
      saveReminders(reminders);

      if (mainWindow) {
        mainWindow.webContents.send('reminder-triggered', reminder);
      }
    }
  });
}

function showReminderNotification(reminder) {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const notificationConfig = {
    title: '🎉 Reminder!',
    body: reminder.text
  };

  if (fs.existsSync(iconPath)) {
    notificationConfig.icon = iconPath;
  }

  new Notification(notificationConfig).show();

  const soundPath = path.join(__dirname, 'assets', 'notification.wav');
  if (fs.existsSync(soundPath)) {
    try {
      const audio = new (require('electron').Audio)(soundPath);
      audio.play();
    } catch (e) {
      console.error('Error playing sound file:', e);
    }
  }
}

app.on('ready', () => {
  createTray();
  createWindow();
  buildAppMenu();
  setAutoStart(app.getLoginItemSettings().openAtLogin);

  checkReminders();
  setInterval(checkReminders, 10000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit on Windows/Linux when window closes, keep in tray
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('get-reminders', () => {
  return loadReminders();
});

ipcMain.handle('add-reminder', (event, reminder) => {
  const reminders = loadReminders();
  reminder.id = Date.now();
  reminder.triggered = false;
  reminders.push(reminder);
  saveReminders(reminders);
  return reminder;
});

ipcMain.handle('delete-reminder', (event, id) => {
  let reminders = loadReminders();
  reminders = reminders.filter(r => r.id !== id);
  saveReminders(reminders);
  return true;
});

ipcMain.handle('update-reminder', (event, reminder) => {
  let reminders = loadReminders();
  const index = reminders.findIndex(r => r.id === reminder.id);
  if (index !== -1) {
    reminders[index] = { ...reminders[index], ...reminder, triggered: false };
    saveReminders(reminders);
  }
  return reminder;
});
