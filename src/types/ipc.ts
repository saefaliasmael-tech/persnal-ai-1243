import {
  ActivityEvent,
  BrowserAutomationState,
  KnowledgeItem,
  OllamaRuntimeOptions,
  PermissionRequest,
  ProjectMetadata,
  SystemPermissions,
  TerminalProcessState,
  TrainingConfig,
} from './models.ts';

export type { OllamaRuntimeOptions };

export type IPCChannel =
  | 'app:minimize'
  | 'app:maximize'
  | 'app:unmaximize'
  | 'app:close'
  | 'app:isMaximized'
  | 'app:getSystemInfo'
  | 'window:openPopup'
  | 'window:closePopup'
  | 'window:focusPopup'
  | 'process:execute'
  | 'process:kill'
  | 'process:write'
  | 'process:interrupt'
  | 'process:onData'
  | 'process:onExit'
  | 'dialog:selectFolder'
  | 'dialog:selectFiles'
  | 'fs:readFile'
  | 'fs:writeFile'
  | 'fs:listFiles'
  | 'fs:deleteFile'
  | 'browser:navigate'
  | 'browser:executeAction'
  | 'permission:request'
  | 'permission:respond'
  | 'ollama:check'
  | 'ollama:chat'
  | 'ollama:streamChat'
  | 'ollama:abortStream';

export interface OllamaCheckResult {
  ok: boolean;
  models: string[];
  error?: string;
}

export interface OllamaChatMessage {
  role: string;
  content: string;
}

export interface OllamaChatOptions {
  endpoint?: string;
  model: string;
  messages: OllamaChatMessage[];
  options?: OllamaRuntimeOptions;
  think?: boolean;
}

export interface SystemInfo {
  platform: 'win32' | 'darwin' | 'linux' | 'browser';
  osVersion: string;
  isWindows10: boolean;
  appVersion: string;
  appDataPath: string;
  workingDirectory?: string;
  isElectron: boolean;
}

export interface ElectronAPI {
  // Window Management
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // Dedicated Popups
  openPopup: (type: 'terminal' | 'browser') => Promise<void>;
  closePopup: (type: 'terminal' | 'browser') => Promise<void>;

  // System & Dialogs
  getSystemInfo: () => Promise<SystemInfo>;
  selectFolder: (defaultPath?: string) => Promise<string | null>;
  selectFiles: (options?: { filters?: { name: string; extensions: string[] }[]; allowMultiple?: boolean }) => Promise<string[]>;

  // Real Process Execution
  executeCommand: (options: {
    command: string;
    args?: string[];
    cwd?: string;
  }) => Promise<{ pid: number }>;
  killProcess: (pid: number) => Promise<boolean>;
  writeProcessInput: (pid: number, input: string) => Promise<boolean>;
  interruptProcess: (pid: number) => Promise<boolean>;
  onProcessData: (callback: (data: { pid: number; stream: 'stdout' | 'stderr'; text: string }) => void) => () => void;
  onProcessExit: (callback: (data: { pid: number; code: number }) => void) => () => void;

  // File System
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  listFiles: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; size: number }[]>;
  deleteFile: (filePath: string) => Promise<boolean>;

  // Storage
  getStoredItem: <T>(key: string, defaultValue: T) => Promise<T>;
  setStoredItem: <T>(key: string, value: T) => Promise<void>;

  // Real Ollama Local AI Integration
  ollamaCheck: (endpoint?: string) => Promise<OllamaCheckResult>;
  ollamaChat: (options: OllamaChatOptions) => Promise<{ content: string; thinking?: string }>;
  ollamaStreamChat: (
    options: OllamaChatOptions,
    onChunk: (chunk: string) => void,
    onDone?: () => void,
    onError?: (err: string) => void,
    onThinking?: (thinkingChunk: string) => void
  ) => Promise<() => void>;
  ollamaAbortStream?: (streamId: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
