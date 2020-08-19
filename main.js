// Modules to control application life and create native browser window
const {app, BrowserWindow, dialog, ipcMain, ipcRenderer, Tray} = require('electron')
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

let loadingScreen;
let mainWindow;

const createLoadingScreen = () => {
  /// create a browser window
  loadingScreen = new BrowserWindow(Object.assign({
    /// set the window height / width
    width: 250,
    height: 250,
    /// remove the window frame, so it will rendered without frames
    frame: false,
    /// and set the transparency to true, to remove any kind of background
    transparent: true
  }));
  loadingScreen.setResizable(false);
  loadingScreen.loadURL('file://' + __dirname + '/loading/loading.html');
  loadingScreen.on('closed', () => loadingScreen = null);
  loadingScreen.webContents.on('did-finish-load', () => {
    loadingScreen.show();
  });
}

function createWindow()
{
  const mainWindow = new BrowserWindow({
    width: 1050,
    height: 875,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    },
    show: false,
    backgroundColor: '#EEEEEE'
  });

  mainWindow.webContents.once('did-finish-load', () => {
    
    if (loadingScreen) {
      loadingScreen.close();
    }
    
    mainWindow.show();
  });

  ipcMain.on('change-style', (event, arg) =>
  {
    mainWindow.webContents.send('set-main-style', arg);
  })

  ipcMain.on('log-added', (event, arg) => {
    mainWindow.webContents.send('reload-table', arg);
  })
    
  let debug = false;
  if(debug)
  {
    devtools = new BrowserWindow();
    mainWindow.webContents.setDevToolsWebContents(devtools.webContents)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.removeMenu();
  mainWindow.loadFile('main/main.html');
}

app.on('ready', () => {
  createLoadingScreen();
  createWindow();
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('log-added', function () {
  
})

/*
ipcMain.on('resize', (e,x,y) =>
{
  mainWindow.setSize(x,y)
})

*/



// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
