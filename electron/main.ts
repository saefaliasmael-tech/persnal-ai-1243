import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItem } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import { URL } from 'url';
import { PopupWindowManager } from './windowManager.ts';
import type { SystemInfo, OllamaCheckResult, OllamaChatOptions } from '../src/types/ipc.ts';

let mainWindow: BrowserWindow | null = null;
let popupManager: PopupWindowManager | null = null;
const runningProcesses = new Map<number, ChildProcess>();
const activeOllamaStreams = new Map<string, http.ClientRequest>();

export function setupContextMenu(win: BrowserWindow) {
  win.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();

    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo', label: 'Undo' }));
      menu.append(new MenuItem({ role: 'redo', label: 'Redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'cut', label: 'Cut' }));
      menu.append(new MenuItem({ role: 'copy', label: 'Copy' }));
      menu.append(new MenuItem({ role: 'paste', label: 'Paste' }));
      menu.append(new MenuItem({ role: 'selectAll', label: 'Select All' }));
    } else if (params.selectionText && params.selectionText.trim().length > 0) {
      menu.append(new MenuItem({ role: 'copy', label: 'Copy' }));
      menu.append(new MenuItem({ role: 'selectAll', label: 'Select All' }));
    } else {
      menu.append(new MenuItem({ role: 'copy', label: 'Copy', enabled: Boolean(params.selectionText) }));
      menu.append(new MenuItem({ role: 'selectAll', label: 'Select All' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'reload', label: 'Reload' }));
    }

    menu.popup({ window: win, x: params.x, y: params.y });
  });
}

function validateLocalEndpoint(endpointUrl: string): { valid: boolean; url?: URL; error?: string } {
  try {
    const parsed = new URL(endpointUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Invalid protocol: only local HTTP is allowed' };
    }
    const hostname = parsed.hostname.toLowerCase();
    const isLocal = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
    if (!isLocal) {
      return {
        valid: false,
        error: 'Security Block: Only local addresses (127.0.0.1 or localhost) are permitted. External / cloud connections are disabled.',
      };
    }
    return { valid: true, url: parsed };
  } catch (err: any) {
    return { valid: false, error: `Invalid URL: ${err.message}` };
  }
}

const isDev = process.env.NODE_ENV !== 'production';
const APP_PORT = process.env.PORT || '3000';
const APP_URL = process.env.APP_URL || `http://localhost:${APP_PORT}`;

function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js');
}

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'Personal AI',
    backgroundColor: '#09090b',
    frame: false, // Windows 10 custom titlebar
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  popupManager = new PopupWindowManager(getPreloadPath(), APP_URL);
  popupManager.setParentWindow(mainWindow);

  const distHtmlPath = path.join(__dirname, '../dist/index.html');
  if (app.isPackaged || (!process.env.APP_URL && fs.existsSync(distHtmlPath))) {
    mainWindow.loadURL(`file://${distHtmlPath}`);
  } else {
    mainWindow.loadURL(APP_URL);
  }

  setupContextMenu(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    popupManager?.closeAll();
    // Kill any lingering background processes
    for (const [pid, proc] of runningProcesses.entries()) {
      try {
        if (process.platform === 'win32' && proc.pid) {
          spawn('taskkill', ['/pid', proc.pid.toString(), '/t', '/f'], { windowsHide: true });
        } else {
          proc.kill('SIGTERM');
        }
      } catch (err) {
        console.error(`Failed to kill process ${pid}:`, err);
      }
    }
    runningProcesses.clear();

    // Abort any ongoing Ollama streams
    for (const req of activeOllamaStreams.values()) {
      try {
        req.destroy();
      } catch {}
    }
    activeOllamaStreams.clear();
  });

  return mainWindow;
}

function setupIpcHandlers() {
  // Window Controls
  ipcMain.handle('app:minimize', (event: any) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle('app:maximize', (event: any) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.handle('app:close', (event: any) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle('app:isMaximized', (event: any) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
  });

  // Dedicated Popups
  ipcMain.handle('window:openPopup', (_event: any, type: 'terminal' | 'browser') => {
    popupManager?.openPopup(type);
  });

  ipcMain.handle('window:closePopup', (_event: any, type: 'terminal' | 'browser') => {
    popupManager?.closePopup(type);
  });

  // System Info
  ipcMain.handle('app:getSystemInfo', (): SystemInfo => {
    const platform = process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux';
    const osRelease = os.release();
    const isWindows10 = platform === 'win32' && osRelease.startsWith('10.');
    return {
      platform,
      osVersion: `${os.type()} ${osRelease}`,
      isWindows10,
      appVersion: app.getVersion() || '1.0.0',
      appDataPath: app.getPath('userData'),
      workingDirectory: process.cwd(),
      isElectron: true,
    };
  });

  // Folder & File Selection Dialogs
  ipcMain.handle('dialog:selectFolder', async (_event: any, defaultPath?: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Project Folder',
      defaultPath,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:selectFiles', async (_event: any, options: any) => {
    if (!mainWindow) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Data Files for Knowledge Base',
      properties: ['openFile', 'multiSelections'],
      filters: options?.filters || [
        { name: 'All Supported Documents', extensions: ['md', 'txt', 'pdf', 'json', 'ts', 'js', 'py', 'kt', 'java'] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  // Real Process Execution Engine (Persistent Shell Session)
  ipcMain.handle('process:execute', async (event: any, { command = '', args = [], cwd }: { command?: string; args?: string[]; cwd?: string }) => {
    const workingDir = cwd && fs.existsSync(cwd) ? cwd : process.cwd();
    const isWin = process.platform === 'win32';
    const shellExecutable = isWin ? 'cmd.exe' : '/bin/sh';
    const shellArgs: string[] = [];

    try {
      const child = spawn(shellExecutable, shellArgs, {
        cwd: workingDir,
        env: { ...process.env },
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!child.pid) {
        throw new Error('Failed to spawn shell process (PID was not assigned)');
      }

      const pid = child.pid;
      runningProcesses.set(pid, child);

      child.stdout.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('process:data', { pid, stream: 'stdout', text });
        }
        // Also broadcast to popup windows
        const terminalPopup = popupManager?.getPopup('terminal');
        if (terminalPopup && !terminalPopup.isDestroyed()) {
          terminalPopup.webContents.send('process:data', { pid, stream: 'stdout', text });
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('process:data', { pid, stream: 'stderr', text });
        }
        const terminalPopup = popupManager?.getPopup('terminal');
        if (terminalPopup && !terminalPopup.isDestroyed()) {
          terminalPopup.webContents.send('process:data', { pid, stream: 'stderr', text });
        }
      });

      child.on('close', (code: number | null) => {
        runningProcesses.delete(pid);
        const exitCode = code ?? 0;
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('process:exit', { pid, code: exitCode });
        }
        const terminalPopup = popupManager?.getPopup('terminal');
        if (terminalPopup && !terminalPopup.isDestroyed()) {
          terminalPopup.webContents.send('process:exit', { pid, code: exitCode });
        }
      });

      child.on('error', (err: Error) => {
        runningProcesses.delete(pid);
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('process:data', { pid, stream: 'stderr', text: `Process error: ${err.message}\n` });
          event.sender.send('process:exit', { pid, code: -1 });
        }
        const terminalPopup = popupManager?.getPopup('terminal');
        if (terminalPopup && !terminalPopup.isDestroyed()) {
          terminalPopup.webContents.send('process:data', { pid, stream: 'stderr', text: `Process error: ${err.message}\n` });
          terminalPopup.webContents.send('process:exit', { pid, code: -1 });
        }
      });

      // If an initial command was provided, write it into the persistent shell session
      const fullCmd = [command, ...(args || [])].filter(Boolean).join(' ').trim();
      if (fullCmd && child.stdin && !child.stdin.destroyed && child.stdin.writable) {
        child.stdin.write(`${fullCmd}\r\n`);
      }

      return { pid };
    } catch (err: any) {
      console.error('Spawn error:', err);
      throw new Error(`Failed to initialize persistent shell: ${err.message}`);
    }
  });

  ipcMain.handle('process:write', (_event: any, { pid, input }: { pid: number; input: string }) => {
    if (typeof pid !== 'number' || typeof input !== 'string') {
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

  ipcMain.handle('process:interrupt', async (_event: any, pid: number) => {
    if (typeof pid !== 'number') {
      return false;
    }
    const child = runningProcesses.get(pid);
    if (!child || !child.pid) {
      return false;
    }

    if (process.platform === 'win32') {
      try {
        // On Windows, terminate any active foreground child processes spawned by this shell (e.g. ping, python, gradlew)
        // using PowerShell CIM query. This stops the running command immediately while keeping cmd.exe persistent
        // and leaving stdin completely clean for subsequent commands (no polluted 0x03 bytes).
        const psCmd = `Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq ${pid} } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
        spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], {
          windowsHide: true,
        });

        // Also fallback to WMIC query for maximum Windows compatibility
        try {
          const wmic = spawn('cmd.exe', ['/c', `wmic process where (ParentProcessId=${pid}) get ProcessId`], { windowsHide: true });
          let wmicOut = '';
          wmic.stdout?.on('data', (d) => { wmicOut += d.toString(); });
          wmic.on('close', () => {
            const childPids = wmicOut
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => /^\d+$/.test(l))
              .map((l) => parseInt(l, 10))
              .filter((p) => p && p !== pid);
            for (const cp of childPids) {
              try {
                spawn('taskkill', ['/pid', cp.toString(), '/t', '/f'], { windowsHide: true });
              } catch {}
            }
          });
        } catch {}

        return true;
      } catch (err) {
        console.error(`Failed to interrupt child process under ${pid}:`, err);
        return false;
      }
    } else {
      // Unix / macOS: Send SIGINT to child processes cleanly
      try {
        const pgrep = spawn('pgrep', ['-P', pid.toString()]);
        let pidsStr = '';
        pgrep.stdout?.on('data', (d) => { pidsStr += d.toString(); });
        pgrep.on('close', () => {
          const childPids = pidsStr.split('\n').map((l) => parseInt(l.trim(), 10)).filter(Boolean);
          for (const cp of childPids) {
            try { process.kill(cp, 'SIGINT'); } catch {}
          }
        });
        return true;
      } catch {
        return false;
      }
    }
  });

  ipcMain.handle('process:kill', (_event: any, pid: number) => {
    if (typeof pid !== 'number') {
      return false;
    }
    const child = runningProcesses.get(pid);
    if (child) {
      try {
        if (process.platform === 'win32' && child.pid) {
          spawn('taskkill', ['/pid', child.pid.toString(), '/t', '/f'], { windowsHide: true });
        } else {
          child.kill('SIGTERM');
        }
      } catch (err) {
        console.error(`Failed to kill process ${pid}:`, err);
        try {
          child.kill('SIGKILL');
        } catch {}
      }
      runningProcesses.delete(pid);
      return true;
    }
    return false;
  });

  // Secure File Operations
  ipcMain.handle('fs:readFile', async (_event: any, filePath: string) => {
    const raw = (filePath || '').trim().replace(/^["']|["']$/g, '');
    let resolvedPath = path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(process.cwd(), raw);

    if (!fs.existsSync(resolvedPath)) {
      const inSrc = path.resolve(process.cwd(), 'src', raw);
      if (fs.existsSync(inSrc)) {
        resolvedPath = inSrc;
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }

    const stat = await fs.promises.stat(resolvedPath);
    if (stat.isDirectory()) {
      throw new Error(`EISDIR: illegal operation on a directory, read '${resolvedPath}'`);
    }
    return fs.promises.readFile(resolvedPath, 'utf-8');
  });

  ipcMain.handle('fs:writeFile', async (_event: any, filePath: string, content: string) => {
    const raw = (filePath || '').trim().replace(/^["']|["']$/g, '');
    const resolvedPath = path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(process.cwd(), raw);
    await fs.promises.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.promises.writeFile(resolvedPath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('fs:listFiles', async (_event: any, dirPath: string) => {
    const raw = (dirPath || '').trim().replace(/^["']|["']$/g, '');
    const resolvedPath = path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(process.cwd(), raw);
    const entries = await fs.promises.readdir(resolvedPath, { withFileTypes: true });
    return Promise.all(
      entries.map(async (entry) => {
        let size = 0;
        try {
          if (!entry.isDirectory()) {
            const stat = await fs.promises.stat(path.join(resolvedPath, entry.name));
            size = stat.size;
          }
        } catch {
          // ignore stat errors
        }
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size,
        };
      })
    );
  });

  ipcMain.handle('fs:deleteFile', async (_event: any, filePath: string) => {
    const raw = (filePath || '').trim().replace(/^["']|["']$/g, '');
    const resolvedPath = path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(process.cwd(), raw);
    await fs.promises.unlink(resolvedPath);
    return true;
  });

  // App Storage
  ipcMain.handle('storage:get', async (_event: any, key: string, defaultValue: any) => {
    const storageFile = path.join(app.getPath('userData'), 'app-storage.json');
    try {
      if (fs.existsSync(storageFile)) {
        const raw = await fs.promises.readFile(storageFile, 'utf-8');
        const data = JSON.parse(raw);
        return data[key] !== undefined ? data[key] : defaultValue;
      }
    } catch (err) {
      console.error('Storage read error:', err);
    }
    return defaultValue;
  });

  ipcMain.handle('storage:set', async (_event: any, key: string, value: any) => {
    const storageFile = path.join(app.getPath('userData'), 'app-storage.json');
    try {
      let data: Record<string, any> = {};
      if (fs.existsSync(storageFile)) {
        const raw = await fs.promises.readFile(storageFile, 'utf-8');
        data = JSON.parse(raw);
      }
      data[key] = value;
      await fs.promises.writeFile(storageFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Storage write error:', err);
    }
  });

  // ==========================================
  // Real Local Ollama Integration Handlers
  // ==========================================

  // 1. Check Ollama tags & discovery
  ipcMain.handle('ollama:check', async (_event: any, endpoint = 'http://127.0.0.1:11434'): Promise<OllamaCheckResult> => {
    const check = validateLocalEndpoint(endpoint);
    if (!check.valid || !check.url) {
      return { ok: false, models: [], error: check.error };
    }

    const parsedUrl = check.url;
    const reqPath = parsedUrl.pathname.endsWith('/') ? `${parsedUrl.pathname}api/tags` : `${parsedUrl.pathname}/api/tags`;

    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 11434,
          path: reqPath.replace('//', '/'),
          method: 'GET',
          timeout: 3000,
        },
        (res) => {
          let rawData = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            rawData += chunk;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const data = JSON.parse(rawData);
                const models = (data.models || []).map((m: any) => m.name || m.model || '').filter(Boolean);
                resolve({ ok: true, models });
              } catch (err: any) {
                resolve({ ok: false, models: [], error: `Failed to parse Ollama response: ${err.message}` });
              }
            } else {
              resolve({ ok: false, models: [], error: `Ollama returned HTTP ${res.statusCode}` });
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, models: [], error: `Connection timed out to Ollama at ${endpoint}` });
      });

      req.on('error', (err) => {
        resolve({ ok: false, models: [], error: `Cannot reach Ollama at ${endpoint}: ${err.message}` });
      });

      req.end();
    });
  });

  // Helper to build clean Ollama payload without sending unconfigured or empty fields
  function buildOllamaPayload(model: string, messages: any[], stream: boolean, options?: any, think?: boolean): string {
    const payload: any = {
      model,
      messages,
      stream,
    };

    if (options && typeof options === 'object' && Object.keys(options).length > 0) {
      const cleanOpts: Record<string, any> = {};
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined && value !== null && value !== '') {
          cleanOpts[key] = value;
        }
      }
      if (Object.keys(cleanOpts).length > 0) {
        payload.options = cleanOpts;
      }
    }

    if (typeof think === 'boolean') {
      payload.think = think;
    }

    return JSON.stringify(payload);
  }

  // 2. Chat (single completion)
  ipcMain.handle('ollama:chat', async (_event: any, { endpoint = 'http://127.0.0.1:11434', model, messages, options, think }: OllamaChatOptions) => {
    const check = validateLocalEndpoint(endpoint);
    if (!check.valid || !check.url) {
      throw new Error(check.error || 'Invalid local endpoint');
    }

    const parsedUrl = check.url;
    const reqBody = buildOllamaPayload(model, messages, false, options, think);

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 11434,
          path: '/api/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(reqBody),
          },
          timeout: 120000,
        },
        (res) => {
          let rawData = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            rawData += chunk;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const data = JSON.parse(rawData);
                resolve({
                  content: data.message?.content || '',
                  thinking: data.message?.thinking || undefined,
                });
              } catch (e: any) {
                reject(new Error(`Failed to parse response: ${e.message}`));
              }
            } else {
              reject(new Error(`Ollama error HTTP ${res.statusCode}: ${rawData}`));
            }
          });
        }
      );

      req.on('error', (err) => reject(err));
      req.write(reqBody);
      req.end();
    });
  });

  // 3. Streaming Chat
  ipcMain.handle('ollama:streamChat', async (event: any, { streamId, endpoint = 'http://127.0.0.1:11434', model, messages, options, think }: any) => {
    const check = validateLocalEndpoint(endpoint);
    if (!check.valid || !check.url) {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('ollama:streamChunk', { streamId, chunk: '', done: true, error: check.error });
      }
      return;
    }

    const parsedUrl = check.url;
    const basePath = parsedUrl.pathname.replace(/\/+$/, '');
    const chatPath = (basePath ? `${basePath}/api/chat` : '/api/chat').replace('//', '/');

    const reqBody = buildOllamaPayload(model, messages, true, options, think);

    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 11434,
        path: chatPath,
        method: 'POST',
        agent: false, // Bypass socket pooling so chunks are not buffered
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/x-ndjson, text/event-stream, */*',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Content-Length': Buffer.byteLength(reqBody),
        },
      },
      (res) => {
        // Disable TCP buffering on incoming response socket immediately
        if (res.socket) {
          res.socket.setNoDelay(true);
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          let errBody = '';
          res.on('data', (d) => { errBody += d; });
          res.on('end', () => {
            if (event.sender && !event.sender.isDestroyed()) {
              event.sender.send('ollama:streamChunk', {
                streamId,
                chunk: '',
                done: true,
                error: `Ollama HTTP ${res.statusCode}: ${errBody || 'Error response'}`,
              });
            }
            activeOllamaStreams.delete(streamId);
          });
          return;
        }

        res.setEncoding('utf8');
        let buffer = '';
        let isCompleted = false;

        res.on('data', (chunkStr: string) => {
          buffer += chunkStr;
          const lines = buffer.split('\n');
          // Keep incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              const content = parsed.message?.content ?? parsed.response ?? '';
              const thinking = parsed.message?.thinking ?? '';
              const isDone = Boolean(parsed.done);

              if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('ollama:streamChunk', {
                  streamId,
                  chunk: content,
                  thinking: thinking,
                  done: isDone,
                });
              }

              if (isDone) {
                isCompleted = true;
                activeOllamaStreams.delete(streamId);
                try { req.destroy(); } catch {}
                break;
              }
            } catch {
              // Wait for full NDJSON line
            }
          }
        });

        res.on('end', () => {
          if (!isCompleted) {
            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim());
                const content = parsed.message?.content ?? parsed.response ?? '';
                const thinking = parsed.message?.thinking ?? '';
                if (event.sender && !event.sender.isDestroyed()) {
                  event.sender.send('ollama:streamChunk', {
                    streamId,
                    chunk: content,
                    thinking: thinking,
                    done: true,
                  });
                }
              } catch {}
            }
            if (activeOllamaStreams.has(streamId)) {
              activeOllamaStreams.delete(streamId);
              if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('ollama:streamChunk', { streamId, chunk: '', done: true });
              }
            }
          }
        });
      }
    );

    // Disable TCP delay on outgoing request socket immediately
    req.setNoDelay(true);
    req.on('socket', (socket) => {
      socket.setNoDelay(true);
    });

    req.on('error', (err) => {
      if (activeOllamaStreams.has(streamId)) {
        activeOllamaStreams.delete(streamId);
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('ollama:streamChunk', {
            streamId,
            chunk: '',
            done: true,
            error: `Connection error: ${err.message}`,
          });
        }
      }
    });

    activeOllamaStreams.set(streamId, req);
    req.write(reqBody);
    req.end();
  });

  // 4. Abort stream
  ipcMain.handle('ollama:abortStream', (_event: any, streamId: string) => {
    const req = activeOllamaStreams.get(streamId);
    if (req) {
      activeOllamaStreams.delete(streamId);
      try {
        req.destroy();
      } catch {}
      return true;
    }
    return false;
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
