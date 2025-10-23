const { app, BrowserWindow,screen  } = require('electron')
const path = require('path');
const fs = require('fs');



function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Errore nel caricamento di config.json:', error);
    // valori di default in caso di errore
    return {
      path:"",
      windowWidth: 800,
      alwaysOnTop: true,
      frame: true,
      marginright: 0
    };
  }
}

const createWindow = () => {
  const config = loadConfig();
  const windowWidth = config.windowWidth || 300;


    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: windowWidth,
    height: screenHeight,
    x: screenWidth - windowWidth - config.marginright, // posiziona in alto a destra
    y: 0, 
    transparent:false,
    alwaysOnTop: config.alwaysOnTop,
    frame: config.frame,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
   //win.webContents.openDevTools();
  // Percorso del file index.html compilato da Angular
  const indexPath = path.join(__dirname,config.path);
 
  // Carica la pagina Angular
  win.loadFile(indexPath);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});