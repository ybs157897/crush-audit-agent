const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const isDev = !app.isPackaged;
const WEB_PORT = Number(process.env.CRUSH_WEB_PORT || 3000);
const API_PORT = Number(process.env.CRUSH_API_PORT || 7600);
const DEV_URL = process.env.CRUSH_WEB_URL || `http://localhost:${WEB_PORT}`;

/** @type {import('http').Server | null} */
let staticServer = null;

function waitForUrl(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      function retry() {
        if (Date.now() > deadline) {
          reject(new Error(`Timeout waiting for ${url}`));
          return;
        }
        setTimeout(tick, 500);
      }
    };
    tick();
  });
}

function startStaticServer() {
  const dist = path.join(__dirname, '..', 'web', 'dist');
  const indexHtml = path.join(dist, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    throw new Error(`Missing web build at ${dist}. Run: npm run build:web`);
  }

  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  };

  staticServer = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath.startsWith('/v1/')) {
      const proxyReq = http.request(
        {
          hostname: '127.0.0.1',
          port: API_PORT,
          path: urlPath,
          method: req.method,
          headers: req.headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
          proxyRes.pipe(res);
        },
      );
      proxyReq.on('error', () => {
        res.writeHead(502);
        res.end('Crush API unavailable');
      });
      req.pipe(proxyReq);
      return;
    }

    let filePath = path.join(dist, urlPath === '/' ? 'index.html' : urlPath);
    if (!filePath.startsWith(dist)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = indexHtml;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    staticServer.listen(0, '127.0.0.1', () => {
      const port = staticServer.address().port;
      resolve(`http://127.0.0.1:${port}`);
    });
    staticServer.on('error', reject);
  });
}

async function resolveLoadUrl() {
  if (isDev) {
    await waitForUrl(DEV_URL);
    return DEV_URL;
  }
  return startStaticServer();
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

async function createWindow() {
  const loadUrl = await resolveLoadUrl();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Crush',
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(loadUrl);

  if (isDev && process.env.CRUSH_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  ipcMain.handle('pick-folder', async () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const result = await dialog.showOpenDialog(win ?? undefined, {
      properties: ['openDirectory'],
      title: '选择工作区文件夹',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  return createWindow();
});

app.on('window-all-closed', () => {
  if (staticServer) staticServer.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
