import { BrowserWindow, screen, app, Menu, MenuItem } from 'electron';
import path from 'path';
import fs from 'fs';

export interface ChildWindows {
  terminal: BrowserWindow | null;
  browser: BrowserWindow | null;
}

export class PopupWindowManager {
  private windows: ChildWindows = {
    terminal: null,
    browser: null,
  };

  private parentWindow: BrowserWindow | null = null;
  private preloadPath: string;
  private appUrl: string;

  constructor(preloadPath: string, appUrl: string) {
    this.preloadPath = preloadPath;
    this.appUrl = appUrl;
  }

  setParentWindow(parent: BrowserWindow) {
    this.parentWindow = parent;
  }

  openPopup(type: 'terminal' | 'browser'): BrowserWindow {
    const existing = this.windows[type];
    if (existing && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore();
      existing.focus();
      return existing;
    }

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    
    // Windows 10 style child popup dimensions
    const initialWidth = type === 'terminal' ? 840 : 980;
    const initialHeight = type === 'terminal' ? 520 : 640;
    
    // Offset child popup nicely relative to screen
    const xPos = Math.max(50, Math.floor((screenWidth - initialWidth) / 2) + (type === 'terminal' ? -40 : 40));
    const yPos = Math.max(50, Math.floor((screenHeight - initialHeight) / 2) + (type === 'terminal' ? -30 : 30));

    const popup = new BrowserWindow({
      width: initialWidth,
      height: initialHeight,
      minWidth: 500,
      minHeight: 350,
      x: xPos,
      y: yPos,
      parent: this.parentWindow || undefined,
      modal: false,
      title: type === 'terminal' ? 'Personal AI - Agent Terminal Process' : 'Personal AI - Agent Browser Automation',
      backgroundColor: '#09090b',
      frame: false, // Windows 10 custom modern titlebar
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
      },
    });

    const distHtmlPath = path.join(__dirname, '../dist/index.html');
    if (app.isPackaged || (!process.env.APP_URL && fs.existsSync(distHtmlPath))) {
      popup.loadURL(`file://${distHtmlPath}?popup=${type}`);
    } else {
      const targetUrl = `${this.appUrl}?popup=${type}`;
      popup.loadURL(targetUrl);
    }

    popup.webContents.on('context-menu', (_event, params) => {
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
      }
      menu.popup({ window: popup, x: params.x, y: params.y });
    });

    popup.on('closed', () => {
      this.windows[type] = null;
    });

    this.windows[type] = popup;
    return popup;
  }

  closePopup(type: 'terminal' | 'browser') {
    const target = this.windows[type];
    if (target && !target.isDestroyed()) {
      target.close();
      this.windows[type] = null;
    }
  }

  getPopup(type: 'terminal' | 'browser'): BrowserWindow | null {
    const win = this.windows[type];
    return win && !win.isDestroyed() ? win : null;
  }

  closeAll() {
    this.closePopup('terminal');
    this.closePopup('browser');
  }
}
