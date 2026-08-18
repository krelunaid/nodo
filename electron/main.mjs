import { app, BrowserWindow, Menu, shell } from "electron";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".map": "application/json",
};

function webRoot() {
  const packed = path.join(process.resourcesPath, "web");
  if (fs.existsSync(packed)) return packed;
  const local = path.join(here, "..", "desktop-web");
  if (fs.existsSync(local)) return local;
  return path.join(here, "..", "public");
}

function startStatic(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
      if (!file.startsWith(root)) {
        res.statusCode = 403;
        res.end();
        return;
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
        file = path.join(file, "index.html");
      }
      if (!fs.existsSync(file)) {
        const fallback = path.join(root, "index.html");
        file = fs.existsSync(fallback) ? fallback : file;
      }
      if (!fs.existsSync(file)) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.setHeader("content-type", MIME[ext] ?? "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("bind"));
        return;
      }
      resolve(`http://127.0.0.1:${addr.port}/`);
    });
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 880,
    minHeight: 600,
    title: "Nodo by Kreluna",
    backgroundColor: "#eef3fb",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(here, "preload.cjs"),
      contextIsolation: true,
    },
  });

  const fromEnv = process.env.NODO_URL;
  if (fromEnv) {
    await win.loadURL(fromEnv);
  } else {
    const url = await startStatic(webRoot());
    await win.loadURL(url);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Nodo",
        submenu: [
          { role: "about", label: "Informazioni su Nodo" },
          { type: "separator" },
          { role: "quit", label: "Esci" },
        ],
      },
      { label: "Modifica", submenu: [{ role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
      { label: "Visualizza", submenu: [{ role: "reload" }, { role: "togglefullscreen" }] },
    ]),
  );
  void createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

void pathToFileURL;
