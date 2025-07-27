const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;
const configPath = path.join(__dirname, 'config.json');

function isConfigured() {
  if (!fs.existsSync(configPath)) return false;
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.siteUrl && config.gitRepo && config.gitName && config.gitEmail && config.gitToken;
  } catch {
    return false;
  }
}

function runProcessAndExit() {
  // Substitua pelo seu script real (ex: node gerarRSS.js)
  exec('node rss-generator.mjs', (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao executar script: ${error.message}`);
    } else {
      console.log(stdout);
    }
    app.quit();
  });
}

function createConfigWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('salvar-config', async (_, newConfig) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(() => {
  if (isConfigured()) {
    runProcessAndExit();
  } else {
    createConfigWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
