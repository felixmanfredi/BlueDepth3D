const { app, BrowserWindow,screen  } = require('electron')
const path = require('path');
const fs = require('fs');

var basepath = getAppBasePath();

function getAppBasePath() {
  // In modalità produzione (pacchettata), app.getAppPath() punta a app.asar
  const appPath = app.getAppPath();

  // Recupera la directory "base" reale, non quella dentro .asar
  let basePath;
  if (app.isPackaged) {
    // In app pacchettata, __dirname o app.getAppPath() è dentro .asar
    // Quindi saliamo fino alla directory dove si trova l’eseguibile
    basePath = path.dirname(process.execPath);
  } else {
    // In sviluppo, __dirname punta al progetto sorgente
    basePath = path.resolve(__dirname);
  }

  return basePath;
}

function loadConfig() {
  const configPath = path.join(basepath, 'config.json');
  console.log(configPath)
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
      marginright: 0,
      margintop: 0,
      marginbottom: 0,
      transparent: true
    };
  }
}

function isValidHttpUrl(string) {
  let url;
  
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

const createWindow = () => {
  const config = loadConfig();
  const windowWidth = config.windowWidth || 300;


    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: windowWidth,
    height: screenHeight-config.margintop-config.marginbottom,
    x: screenWidth - windowWidth - config.marginright, // posiziona in alto a destra
    y: config.margintop, 
    transparent:false,
    alwaysOnTop: config.alwaysOnTop,
    frame: config.frame,
    transparent: config.transparent,
     autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
       webSecurity: false,
    },
  })
      //win.webContents.openDevTools();
 
  if(isValidHttpUrl(config.path)){
      win.loadURL(config.path);
 
  }else{
    const indexPath = path.join(basepath,config.path);
    win.loadFile(indexPath);
 
  }

  win.webContents.setWindowOpenHandler(({ url, features, disposition }) => {
    console.log('Richiesta apertura nuova finestra per:', url);

    // Se vuoi applicare specifiche webPreferences alla nuova finestra
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        title: '',
        webPreferences: {
          preload: path.join(__dirname, 'preload-child.js'),
          nodeIntegration: true,
          contextIsolation: false,
          webSecurity: false,
        },
        frame: true,
        autoHideMenuBar: true,
        
        
      }
    };
  });

  
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
