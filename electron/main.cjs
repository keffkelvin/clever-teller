const { app, BrowserWindow, Menu, shell } = require('electron');

const APP_URL = process.env.PHOTON_POS_URL || 'https://clever-teller.lovable.app';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Photon POS',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'persist:photon-pos',
    },
  });

  win.loadURL(APP_URL);

  // Open external links (http/https to other hosts) in the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      const target = new URL(APP_URL);
      if (u.host !== target.host) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    } catch (_) {}
    return { action: 'allow' };
  });
}

// Minimal menu with reload + devtools for the shop.
const template = [
  {
    label: 'App',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  { role: 'editMenu' },
  { role: 'viewMenu' },
];
Menu.setApplicationMenu(Menu.buildFromTemplate(template));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});