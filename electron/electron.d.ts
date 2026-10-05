declare module 'electron' {
  export interface App {
    whenReady(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): void;
    quit(): void;
    getVersion(): string;
    getPath(name: string): string;
    isPackaged?: boolean;
  }

  export interface Display {
    workAreaSize: { width: number; height: number };
  }

  export interface Screen {
    getPrimaryDisplay(): Display;
  }

  export interface WebPreferences {
    preload?: string;
    contextIsolation?: boolean;
    nodeIntegration?: boolean;
    sandbox?: boolean;
    webSecurity?: boolean;
  }

  export interface BrowserWindowConstructorOptions {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    x?: number;
    y?: number;
    parent?: BrowserWindow;
    modal?: boolean;
    title?: string;
    backgroundColor?: string;
    frame?: boolean;
    titleBarStyle?: 'hidden' | 'default' | 'hiddenInset' | 'customButtonsOnHover';
    webPreferences?: WebPreferences;
    show?: boolean;
  }

  export interface WebContents {
    send(channel: string, ...args: any[]): void;
  }

  export class BrowserWindow {
    constructor(options?: BrowserWindowConstructorOptions);
    static getAllWindows(): BrowserWindow[];
    static fromWebContents(contents: any): BrowserWindow | null;
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string, options?: any): Promise<void>;
    show(): void;
    close(): void;
    minimize(): void;
    maximize(): void;
    unmaximize(): void;
    isMaximized(): boolean;
    isMinimized(): boolean;
    restore(): void;
    focus(): void;
    isDestroyed(): boolean;
    once(event: string, listener: (...args: any[]) => void): void;
    on(event: string, listener: (...args: any[]) => void): void;
    webContents: WebContents;
  }

  export interface OpenDialogOptions {
    title?: string;
    defaultPath?: string;
    properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory'>;
    filters?: Array<{ name: string; extensions: string[] }>;
  }

  export interface OpenDialogReturnValue {
    canceled: boolean;
    filePaths: string[];
  }

  export interface Dialog {
    showOpenDialog(browserWindow: BrowserWindow, options: OpenDialogOptions): Promise<OpenDialogReturnValue>;
  }

  export interface IpcMain {
    handle(channel: string, listener: (event: any, ...args: any[]) => any): void;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  }

  export interface IpcRenderer {
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
    removeListener(channel: string, listener: (event: any, ...args: any[]) => void): void;
  }

  export interface ContextBridge {
    exposeInMainWorld(apiKey: string, api: any): void;
  }

  export const app: App;
  export const screen: Screen;
  export const dialog: Dialog;
  export const ipcMain: IpcMain;
  export const ipcRenderer: IpcRenderer;
  export const contextBridge: ContextBridge;
}
