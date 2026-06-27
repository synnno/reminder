Markdown
# pixel reminder

a pixel-art styled reminder app for the windows system tray.

## features
* **retro ui:** minimalist pixel aesthetic
* **tray app:** runs quietly in the background
* **alerts:** native windows notifications and audio cues
* **persistence:** saves reminders automatically to local storage
* **startup:** launches automatically with windows

## setup
```bash
npm install
npm start
development
Bash
npm run dev   # dev mode
npm run build # build installer
usage
click the tray icon to open the interface.

set a date, time, and text, then click add.

close the window to minimize it back to the tray.

right-click the tray icon and select exit to close the app completely.

details
data is stored in %APPDATA%\pixel-reminder\reminders.json.

checks for active reminders every 60 seconds.
