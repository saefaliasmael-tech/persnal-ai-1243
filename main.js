var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/main.ts
var main_exports = {};
__export(main_exports, {
  setupContextMenu: () => setupContextMenu
});
module.exports = __toCommonJS(main_exports);
var import_electron2 = require("electron");
var import_child_process = require("child_process");
var import_path2 = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_http = __toESM(require("http"));
var import_url = require("url");

// electron/windowManager.ts
var import_electron = require("electron");
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var PopupWindowManager = class {
  constructor(preloadPath, appUrl) {
    this.windows = {
      terminal: null,
      browser: null
    };
    this.parentWindow = null;
    this.preloadPath = preloadPath;
    this.appUrl = appUrl;
  }
  setParentWindow(parent) {
    this.parentWindow = parent;
  }
  openPopup(type) {
    const existing = this.windows[type];
    if (existing && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore();
      existing.focus();
      return existing;
    }
    const { width: screenWidth, height: screenHeight } = import_electron.screen.getPrimaryDisplay().workAreaSize;
    const initialWidth = type === "terminal" ? 840 : 980;
    const initialHeight = type === "terminal" ? 520 : 640;
    const xPos = Math.max(50, Math.floor((screenWidth - initialWidth) / 2) + (type === "terminal" ? -40 : 40));
    const yPos = Math.max(50, Math.floor((screenHeight - initialHeight) / 2) + (type === "terminal" ? -30 : 30));
    const popup = new import_electron.BrowserWindow({
      width: initialWidth,
      height: initialHeight,
      minWidth: 500,
      minHeight: 350,
      x: xPos,
      y: yPos,
      parent: this.parentWindow || void 0,
      modal: false,
      title: type === "terminal" ? "Personal AI - Agent Terminal Process" : "Personal AI - Agent Browser Automation",
      backgroundColor: "#09090b",
      frame: false,
      // Windows 10 custom modern titlebar
      titleBarStyle: "hidden",
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true
      }
    });
    const distHtmlPath = import_path.default.join(__dirname, "../dist/index.html");
    if (import_electron.app.isPackaged || !process.env.APP_URL && import_fs.default.existsSync(distHtmlPath)) {
      popup.loadURL(`file://${distHtmlPath}?popup=${type}`);
    } else {
      const targetUrl = `${this.appUrl}?popup=${type}`;
      popup.loadURL(targetUrl);
    }
    popup.webContents.on("context-menu", (_event, params) => {
      const menu = new import_electron.Menu();
      if (params.isEditable) {
        menu.append(new import_electron.MenuItem({ role: "undo", label: "Undo" }));
        menu.append(new import_electron.MenuItem({ role: "redo", label: "Redo" }));
        menu.append(new import_electron.MenuItem({ type: "separator" }));
        menu.append(new import_electron.MenuItem({ role: "cut", label: "Cut" }));
        menu.append(new import_electron.MenuItem({ role: "copy", label: "Copy" }));
        menu.append(new import_electron.MenuItem({ role: "paste", label: "Paste" }));
        menu.append(new import_electron.MenuItem({ role: "selectAll", label: "Select All" }));
      } else if (params.selectionText && params.selectionText.trim().length > 0) {
        menu.append(new import_electron.MenuItem({ role: "copy", label: "Copy" }));
        menu.append(new import_electron.MenuItem({ role: "selectAll", label: "Select All" }));
      } else {
        menu.append(new import_electron.MenuItem({ role: "copy", label: "Copy", enabled: Boolean(params.selectionText) }));
        menu.append(new import_electron.MenuItem({ role: "selectAll", label: "Select All" }));
      }
      menu.popup({ window: popup, x: params.x, y: params.y });
    });
    popup.on("closed", () => {
      this.windows[type] = null;
    });
    this.windows[type] = popup;
    return popup;
  }
  closePopup(type) {
    const target = this.windows[type];
    if (target && !target.isDestroyed()) {
      target.close();
      this.windows[type] = null;
    }
  }
  getPopup(type) {
    const win = this.windows[type];
    return win && !win.isDestroyed() ? win : null;
  }
  closeAll() {
    this.closePopup("terminal");
    this.closePopup("browser");
  }
};

// electron/main.ts
var mainWindow = null;
var popupManager = null;
var runningProcesses = /* @__PURE__ */ new Map();
var activeOllamaStreams = /* @__PURE__ */ new Map();
function setupContextMenu(win) {
  win.webContents.on("context-menu", (_event, params) => {
    const menu = new import_electron2.Menu();
    if (params.isEditable) {
      menu.append(new import_electron2.MenuItem({ role: "undo", label: "Undo" }));
      menu.append(new import_electron2.MenuItem({ role: "redo", label: "Redo" }));
      menu.append(new import_electron2.MenuItem({ type: "separator" }));
      menu.append(new import_electron2.MenuItem({ role: "cut", label: "Cut" }));
      menu.append(new import_electron2.MenuItem({ role: "copy", label: "Copy" }));
      menu.append(new import_electron2.MenuItem({ role: "paste", label: "Paste" }));
      menu.append(new import_electron2.MenuItem({ role: "selectAll", label: "Select All" }));
    } else if (params.selectionText && params.selectionText.trim().length > 0) {
      menu.append(new import_electron2.MenuItem({ role: "copy", label: "Copy" }));
      menu.append(new import_electron2.MenuItem({ role: "selectAll", label: "Select All" }));
    } else {
      menu.append(new import_electron2.MenuItem({ role: "copy", label: "Copy", enabled: Boolean(params.selectionText) }));
      menu.append(new import_electron2.MenuItem({ role: "selectAll", label: "Select All" }));
      menu.append(new import_electron2.MenuItem({ type: "separator" }));
      menu.append(new import_electron2.MenuItem({ role: "reload", label: "Reload" }));
    }
    menu.popup({ window: win, x: params.x, y: params.y });
  });
}
function validateLocalEndpoint(endpointUrl) {
  try {
    const parsed = new import_url.URL(endpointUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Invalid protocol: only local HTTP is allowed" };
    }
    const hostname = parsed.hostname.toLowerCase();
    const isLocal = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
    if (!isLocal) {
      return {
        valid: false,
        error: "Security Block: Only local addresses (127.0.0.1 or localhost) are permitted. External / cloud connections are disabled."
      };
    }
    return { valid: true, url: parsed };
  } catch (err) {
    return { valid: false, error: `Invalid URL: ${err.message}` };
  }
}
var isDev = process.env.NODE_ENV !== "production";
var APP_PORT = process.env.PORT || "3000";
var APP_URL = process.env.APP_URL || `http://localhost:${APP_PORT}`;
function getPreloadPath() {
  return import_path2.default.join(__dirname, "preload.js");
}
function createMainWindow() {
  mainWindow = new import_electron2.BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: "Personal AI",
    backgroundColor: "#09090b",
    frame: false,
    // Windows 10 custom titlebar
    titleBarStyle: "hidden",
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  });
  popupManager = new PopupWindowManager(getPreloadPath(), APP_URL);
  popupManager.setParentWindow(mainWindow);
  const distHtmlPath = import_path2.default.join(__dirname, "../dist/index.html");
  if (import_electron2.app.isPackaged || !process.env.APP_URL && import_fs2.default.existsSync(distHtmlPath)) {
    mainWindow.loadURL(`file://${distHtmlPath}`);
  } else {
    mainWindow.loadURL(APP_URL);
  }
  setupContextMenu(mainWindow);
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    popupManager?.closeAll();
    for (const [pid, proc] of runningProcesses.entries()) {
      try {
        if (process.platform === "win32" && proc.pid) {
          (0, import_child_process.spawn)("taskkill", ["/pid", proc.pid.toString(), "/t", "/f"], { windowsHide: true });
        } else {
          proc.kill("SIGTERM");
        }
      } catch (err) {
        console.error(`Failed to kill process ${pid}:`, err);
      }
    }
    runningProcesses.clear();
    for (const req of activeOllamaStreams.values()) {
      try {
        req.destroy();
      } catch {
      }
    }
    activeOllamaStreams.clear();
  });
  return mainWindow;
}
function setupIpcHandlers() {
  import_electron2.ipcMain.handle("app:minimize", (event) => {
    const win = import_electron2.BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  import_electron2.ipcMain.handle("app:maximize", (event) => {
    const win = import_electron2.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });
  import_electron2.ipcMain.handle("app:close", (event) => {
    const win = import_electron2.BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });
  import_electron2.ipcMain.handle("app:isMaximized", (event) => {
    const win = import_electron2.BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
  });
  import_electron2.ipcMain.handle("window:openPopup", (_event, type) => {
    popupManager?.openPopup(type);
  });
  import_electron2.ipcMain.handle("window:closePopup", (_event, type) => {
    popupManager?.closePopup(type);
  });
  import_electron2.ipcMain.handle("app:getSystemInfo", () => {
    const platform = process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux";
    const osRelease = import_os.default.release();
    const isWindows10 = platform === "win32" && osRelease.startsWith("10.");
    return {
      platform,
      osVersion: `${import_os.default.type()} ${osRelease}`,
      isWindows10,
      appVersion: import_electron2.app.getVersion() || "1.0.0",
      appDataPath: import_electron2.app.getPath("userData"),
      workingDirectory: process.cwd(),
      isElectron: true
    };
  });
  import_electron2.ipcMain.handle("dialog:selectFolder", async (_event, defaultPath) => {
    if (!mainWindow) return null;
    const result = await import_electron2.dialog.showOpenDialog(mainWindow, {
      title: "Select Project Folder",
      defaultPath,
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
  import_electron2.ipcMain.handle("dialog:selectFiles", async (_event, options) => {
    if (!mainWindow) return [];
    const result = await import_electron2.dialog.showOpenDialog(mainWindow, {
      title: "Select Data Files for Knowledge Base",
      properties: ["openFile", "multiSelections"],
      filters: options?.filters || [
        { name: "All Supported Documents", extensions: ["md", "txt", "pdf", "json", "ts", "js", "py", "kt", "java"] }
      ]
    });
    if (result.canceled) return [];
    return result.filePaths;
  });
  import_electron2.ipcMain.handle("process:execute", async (event, { command = "", args = [], cwd }) => {
    const workingDir = cwd && import_fs2.default.existsSync(cwd) ? cwd : process.cwd();
    const isWin = process.platform === "win32";
    const shellExecutable = isWin ? "cmd.exe" : "/bin/sh";
    const shellArgs = [];
    try {
      const child = (0, import_child_process.spawn)(shellExecutable, shellArgs, {
        cwd: workingDir,
        env: { ...process.env },
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });
      if (!child.pid) {
        throw new Error("Failed to spawn shell process (PID was not assigned)");
      }
      const pid = child.pid;
      runningProcesses.set(pid, child);
      child.stdout.on("data", (data) => {
        const text = data.toString("utf-8");
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send("process:data", { pid, stream: "stdout", text });
        }
        const terminalPopup = popupManager?.getPopup("terminal");
        if (terminalPopup && !terminalPopup.isDestroyed()) {
          terminalPopup.webContents.send("process:data", { pid, stream: "stdout", text });
        }
      });
      child.stderr.on("data", (data) => {
        const text = data.toString("utf-8");
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send("process:data", { pid, stream: "stderr", text });
        }
        const terminalPopup = popupManager?.getPopup("terminal");
        if (terminalPopup && !terminalPopup.isDestroyed()) {
          terminalPopup.webContents.send("process:data", { pid, stream: "stderr", text });
        }
      });
      child.on("close", (code) => {
        runningProcesses.delete(pid);
        const exitCode = code ?? 0;
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send("process:exit", { pid, code: exitCode });
        }
        const terminalPopup = popupManager?.getPopup("terminal");
        if (terminalPopup && !terminalPopup.isDestroyed()) {
          terminalPopup.webContents.send("process:exit", { pid, code: exitCode });
        }
      });
      child.on("error", (err) => {
        runningProcesses.delete(pid);
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send("process:data", { pid, stream: "stderr", text: `Process error: ${err.message}
` });
          event.sender.send("process:exit", { pid, code: -1 });
        }
        const terminalPopup = popupManager?.getPopup("terminal");
        if (terminalPopup && !terminalPopup.isDestroyed()) {
          terminalPopup.webContents.send("process:data", { pid, stream: "stderr", text: `Process error: ${err.message}
` });
          terminalPopup.webContents.send("process:exit", { pid, code: -1 });
        }
      });
      const fullCmd = [command, ...args || []].filter(Boolean).join(" ").trim();
      if (fullCmd && child.stdin && !child.stdin.destroyed && child.stdin.writable) {
        child.stdin.write(`${fullCmd}\r
`);
      }
      return { pid };
    } catch (err) {
      console.error("Spawn error:", err);
      throw new Error(`Failed to initialize persistent shell: ${err.message}`);
    }
  });
  import_electron2.ipcMain.handle("process:write", (_event, { pid, input }) => {
    if (typeof pid !== "number" || typeof input !== "string") {
      return false;
    }
    const child = runningProcesses.get(pid);
    if (child && child.stdin && !child.stdin.destroyed && child.stdin.writable) {
      try {
        child.stdin.write(input);
        return true;
      } catch (err) {
        console.error(`Failed to write to process ${pid}:`, err);
        return false;
      }
    }
    return false;
  });
  import_electron2.ipcMain.handle("process:interrupt", async (_event, pid) => {
    if (typeof pid !== "number") {
      return false;
    }
    const child = runningProcesses.get(pid);
    if (!child || !child.pid) {
      return false;
    }
    if (process.platform === "win32") {
      try {
        const psCmd = `Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq ${pid} } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
        (0, import_child_process.spawn)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psCmd], {
          windowsHide: true
        });
        try {
          const wmic = (0, import_child_process.spawn)("cmd.exe", ["/c", `wmic process where (ParentProcessId=${pid}) get ProcessId`], { windowsHide: true });
          let wmicOut = "";
          wmic.stdout?.on("data", (d) => {
            wmicOut += d.toString();
          });
          wmic.on("close", () => {
            const childPids = wmicOut.split("\n").map((l) => l.trim()).filter((l) => /^\d+$/.test(l)).map((l) => parseInt(l, 10)).filter((p) => p && p !== pid);
            for (const cp of childPids) {
              try {
                (0, import_child_process.spawn)("taskkill", ["/pid", cp.toString(), "/t", "/f"], { windowsHide: true });
              } catch {
              }
            }
          });
        } catch {
        }
        return true;
      } catch (err) {
        console.error(`Failed to interrupt child process under ${pid}:`, err);
        return false;
      }
    } else {
      try {
        const pgrep = (0, import_child_process.spawn)("pgrep", ["-P", pid.toString()]);
        let pidsStr = "";
        pgrep.stdout?.on("data", (d) => {
          pidsStr += d.toString();
        });
        pgrep.on("close", () => {
          const childPids = pidsStr.split("\n").map((l) => parseInt(l.trim(), 10)).filter(Boolean);
          for (const cp of childPids) {
            try {
              process.kill(cp, "SIGINT");
            } catch {
            }
          }
        });
        return true;
      } catch {
        return false;
      }
    }
  });
  import_electron2.ipcMain.handle("process:kill", (_event, pid) => {
    if (typeof pid !== "number") {
      return false;
    }
    const child = runningProcesses.get(pid);
    if (child) {
      try {
        if (process.platform === "win32" && child.pid) {
          (0, import_child_process.spawn)("taskkill", ["/pid", child.pid.toString(), "/t", "/f"], { windowsHide: true });
        } else {
          child.kill("SIGTERM");
        }
      } catch (err) {
        console.error(`Failed to kill process ${pid}:`, err);
        try {
          child.kill("SIGKILL");
        } catch {
        }
      }
      runningProcesses.delete(pid);
      return true;
    }
    return false;
  });
  import_electron2.ipcMain.handle("fs:readFile", async (_event, filePath) => {
    const raw = (filePath || "").trim().replace(/^["']|["']$/g, "");
    let resolvedPath = import_path2.default.isAbsolute(raw) ? import_path2.default.normalize(raw) : import_path2.default.resolve(process.cwd(), raw);
    if (!import_fs2.default.existsSync(resolvedPath)) {
      const inSrc = import_path2.default.resolve(process.cwd(), "src", raw);
      if (import_fs2.default.existsSync(inSrc)) {
        resolvedPath = inSrc;
      }
    }
    if (!import_fs2.default.existsSync(resolvedPath)) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    const stat = await import_fs2.default.promises.stat(resolvedPath);
    if (stat.isDirectory()) {
      throw new Error(`EISDIR: illegal operation on a directory, read '${resolvedPath}'`);
    }
    return import_fs2.default.promises.readFile(resolvedPath, "utf-8");
  });
  import_electron2.ipcMain.handle("fs:writeFile", async (_event, filePath, content) => {
    const raw = (filePath || "").trim().replace(/^["']|["']$/g, "");
    const resolvedPath = import_path2.default.isAbsolute(raw) ? import_path2.default.normalize(raw) : import_path2.default.resolve(process.cwd(), raw);
    await import_fs2.default.promises.mkdir(import_path2.default.dirname(resolvedPath), { recursive: true });
    await import_fs2.default.promises.writeFile(resolvedPath, content, "utf-8");
    return true;
  });
  import_electron2.ipcMain.handle("fs:listFiles", async (_event, dirPath) => {
    const raw = (dirPath || "").trim().replace(/^["']|["']$/g, "");
    const resolvedPath = import_path2.default.isAbsolute(raw) ? import_path2.default.normalize(raw) : import_path2.default.resolve(process.cwd(), raw);
    const entries = await import_fs2.default.promises.readdir(resolvedPath, { withFileTypes: true });
    return Promise.all(
      entries.map(async (entry) => {
        let size = 0;
        try {
          if (!entry.isDirectory()) {
            const stat = await import_fs2.default.promises.stat(import_path2.default.join(resolvedPath, entry.name));
            size = stat.size;
          }
        } catch {
        }
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size
        };
      })
    );
  });
  import_electron2.ipcMain.handle("fs:deleteFile", async (_event, filePath) => {
    const raw = (filePath || "").trim().replace(/^["']|["']$/g, "");
    const resolvedPath = import_path2.default.isAbsolute(raw) ? import_path2.default.normalize(raw) : import_path2.default.resolve(process.cwd(), raw);
    await import_fs2.default.promises.unlink(resolvedPath);
    return true;
  });
  import_electron2.ipcMain.handle("storage:get", async (_event, key, defaultValue) => {
    const storageFile = import_path2.default.join(import_electron2.app.getPath("userData"), "app-storage.json");
    try {
      if (import_fs2.default.existsSync(storageFile)) {
        const raw = await import_fs2.default.promises.readFile(storageFile, "utf-8");
        const data = JSON.parse(raw);
        return data[key] !== void 0 ? data[key] : defaultValue;
      }
    } catch (err) {
      console.error("Storage read error:", err);
    }
    return defaultValue;
  });
  import_electron2.ipcMain.handle("storage:set", async (_event, key, value) => {
    const storageFile = import_path2.default.join(import_electron2.app.getPath("userData"), "app-storage.json");
    try {
      let data = {};
      if (import_fs2.default.existsSync(storageFile)) {
        const raw = await import_fs2.default.promises.readFile(storageFile, "utf-8");
        data = JSON.parse(raw);
      }
      data[key] = value;
      await import_fs2.default.promises.writeFile(storageFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Storage write error:", err);
    }
  });
  import_electron2.ipcMain.handle("ollama:check", async (_event, endpoint = "http://127.0.0.1:11434") => {
    const check = validateLocalEndpoint(endpoint);
    if (!check.valid || !check.url) {
      return { ok: false, models: [], error: check.error };
    }
    const parsedUrl = check.url;
    const reqPath = parsedUrl.pathname.endsWith("/") ? `${parsedUrl.pathname}api/tags` : `${parsedUrl.pathname}/api/tags`;
    return new Promise((resolve) => {
      const req = import_http.default.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 11434,
          path: reqPath.replace("//", "/"),
          method: "GET",
          timeout: 3e3
        },
        (res) => {
          let rawData = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            rawData += chunk;
          });
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const data = JSON.parse(rawData);
                const models = (data.models || []).map((m) => m.name || m.model || "").filter(Boolean);
                resolve({ ok: true, models });
              } catch (err) {
                resolve({ ok: false, models: [], error: `Failed to parse Ollama response: ${err.message}` });
              }
            } else {
              resolve({ ok: false, models: [], error: `Ollama returned HTTP ${res.statusCode}` });
            }
          });
        }
      );
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, models: [], error: `Connection timed out to Ollama at ${endpoint}` });
      });
      req.on("error", (err) => {
        resolve({ ok: false, models: [], error: `Cannot reach Ollama at ${endpoint}: ${err.message}` });
      });
      req.end();
    });
  });
  function buildOllamaPayload(model, messages, stream, options, think) {
    const payload = {
      model,
      messages,
      stream
    };
    if (options && typeof options === "object" && Object.keys(options).length > 0) {
      const cleanOpts = {};
      for (const [key, value] of Object.entries(options)) {
        if (value !== void 0 && value !== null && value !== "") {
          cleanOpts[key] = value;
        }
      }
      if (Object.keys(cleanOpts).length > 0) {
        payload.options = cleanOpts;
      }
    }
    if (typeof think === "boolean") {
      payload.think = think;
    }
    return JSON.stringify(payload);
  }
  import_electron2.ipcMain.handle("ollama:chat", async (_event, { endpoint = "http://127.0.0.1:11434", model, messages, options, think }) => {
    const check = validateLocalEndpoint(endpoint);
    if (!check.valid || !check.url) {
      throw new Error(check.error || "Invalid local endpoint");
    }
    const parsedUrl = check.url;
    const reqBody = buildOllamaPayload(model, messages, false, options, think);
    return new Promise((resolve, reject) => {
      const req = import_http.default.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 11434,
          path: "/api/chat",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(reqBody)
          },
          timeout: 12e4
        },
        (res) => {
          let rawData = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            rawData += chunk;
          });
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const data = JSON.parse(rawData);
                resolve({
                  content: data.message?.content || "",
                  thinking: data.message?.thinking || void 0
                });
              } catch (e) {
                reject(new Error(`Failed to parse response: ${e.message}`));
              }
            } else {
              reject(new Error(`Ollama error HTTP ${res.statusCode}: ${rawData}`));
            }
          });
        }
      );
      req.on("error", (err) => reject(err));
      req.write(reqBody);
      req.end();
    });
  });
  import_electron2.ipcMain.handle("ollama:streamChat", async (event, { streamId, endpoint = "http://127.0.0.1:11434", model, messages, options, think }) => {
    const check = validateLocalEndpoint(endpoint);
    if (!check.valid || !check.url) {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send("ollama:streamChunk", { streamId, chunk: "", done: true, error: check.error });
      }
      return;
    }
    const parsedUrl = check.url;
    const basePath = parsedUrl.pathname.replace(/\/+$/, "");
    const chatPath = (basePath ? `${basePath}/api/chat` : "/api/chat").replace("//", "/");
    const reqBody = buildOllamaPayload(model, messages, true, options, think);
    const req = import_http.default.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 11434,
        path: chatPath,
        method: "POST",
        agent: false,
        // Bypass socket pooling so chunks are not buffered
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/x-ndjson, text/event-stream, */*",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Content-Length": Buffer.byteLength(reqBody)
        }
      },
      (res) => {
        if (res.socket) {
          res.socket.setNoDelay(true);
        }
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          let errBody = "";
          res.on("data", (d) => {
            errBody += d;
          });
          res.on("end", () => {
            if (event.sender && !event.sender.isDestroyed()) {
              event.sender.send("ollama:streamChunk", {
                streamId,
                chunk: "",
                done: true,
                error: `Ollama HTTP ${res.statusCode}: ${errBody || "Error response"}`
              });
            }
            activeOllamaStreams.delete(streamId);
          });
          return;
        }
        res.setEncoding("utf8");
        let buffer = "";
        let isCompleted = false;
        res.on("data", (chunkStr) => {
          buffer += chunkStr;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              const content = parsed.message?.content ?? parsed.response ?? "";
              const thinking = parsed.message?.thinking ?? "";
              const isDone = Boolean(parsed.done);
              if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send("ollama:streamChunk", {
                  streamId,
                  chunk: content,
                  thinking,
                  done: isDone
                });
              }
              if (isDone) {
                isCompleted = true;
                activeOllamaStreams.delete(streamId);
                try {
                  req.destroy();
                } catch {
                }
                break;
              }
            } catch {
            }
          }
        });
        res.on("end", () => {
          if (!isCompleted) {
            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim());
                const content = parsed.message?.content ?? parsed.response ?? "";
                const thinking = parsed.message?.thinking ?? "";
                if (event.sender && !event.sender.isDestroyed()) {
                  event.sender.send("ollama:streamChunk", {
                    streamId,
                    chunk: content,
                    thinking,
                    done: true
                  });
                }
              } catch {
              }
            }
            if (activeOllamaStreams.has(streamId)) {
              activeOllamaStreams.delete(streamId);
              if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send("ollama:streamChunk", { streamId, chunk: "", done: true });
              }
            }
          }
        });
      }
    );
    req.setNoDelay(true);
    req.on("socket", (socket) => {
      socket.setNoDelay(true);
    });
    req.on("error", (err) => {
      if (activeOllamaStreams.has(streamId)) {
        activeOllamaStreams.delete(streamId);
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send("ollama:streamChunk", {
            streamId,
            chunk: "",
            done: true,
            error: `Connection error: ${err.message}`
          });
        }
      }
    });
    activeOllamaStreams.set(streamId, req);
    req.write(reqBody);
    req.end();
  });
  import_electron2.ipcMain.handle("ollama:abortStream", (_event, streamId) => {
    const req = activeOllamaStreams.get(streamId);
    if (req) {
      activeOllamaStreams.delete(streamId);
      try {
        req.destroy();
      } catch {
      }
      return true;
    }
    return false;
  });
}
import_electron2.app.whenReady().then(() => {
  setupIpcHandlers();
  createMainWindow();
  import_electron2.app.on("activate", () => {
    if (import_electron2.BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});
import_electron2.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron2.app.quit();
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  setupContextMenu
});
