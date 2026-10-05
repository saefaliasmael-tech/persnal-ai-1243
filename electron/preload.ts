import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, SystemInfo } from '../src/types/ipc.ts';

const electronAPI: ElectronAPI = {
  // Window controls
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  close: () => ipcRenderer.invoke('app:close'),
  isMaximized: () => ipcRenderer.invoke('app:isMaximized'),

  // Popups
  openPopup: (type: 'terminal' | 'browser') => ipcRenderer.invoke('window:openPopup', type),
  closePopup: (type: 'terminal' | 'browser') => ipcRenderer.invoke('window:closePopup', type),

  // System & Dialogs
  getSystemInfo: (): Promise<SystemInfo> => ipcRenderer.invoke('app:getSystemInfo'),
  selectFolder: (defaultPath?: string) => ipcRenderer.invoke('dialog:selectFolder', defaultPath),
  selectFiles: (options) => ipcRenderer.invoke('dialog:selectFiles', options),

  // Process Execution
  executeCommand: (options) => ipcRenderer.invoke('process:execute', options),
  killProcess: (pid: number) => ipcRenderer.invoke('process:kill', pid),
  writeProcessInput: (pid: number, input: string) => ipcRenderer.invoke('process:write', { pid, input }),
  interruptProcess: (pid: number) => ipcRenderer.invoke('process:interrupt', pid),
  onProcessData: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('process:data', handler);
    return () => {
      ipcRenderer.removeListener('process:data', handler);
    };
  },
  onProcessExit: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('process:exit', handler);
    return () => {
      ipcRenderer.removeListener('process:exit', handler);
    };
  },

  // File System
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  listFiles: (dirPath: string) => ipcRenderer.invoke('fs:listFiles', dirPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),

  // Storage
  getStoredItem: <T>(key: string, defaultValue: T): Promise<T> =>
    ipcRenderer.invoke('storage:get', key, defaultValue),
  setStoredItem: <T>(key: string, value: T): Promise<void> =>
    ipcRenderer.invoke('storage:set', key, value),

  // Real Ollama Local AI Integration
  ollamaCheck: (endpoint?: string) => ipcRenderer.invoke('ollama:check', endpoint),
  ollamaChat: (options) => ipcRenderer.invoke('ollama:chat', options),
  ollamaStreamChat: (options, onChunk, onDone, onError, onThinking) => {
    const streamId = 'stream_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    let isTerminated = false;

    const cleanup = () => {
      if (isTerminated) return;
      isTerminated = true;
      ipcRenderer.removeListener('ollama:streamChunk', chunkHandler);
      ipcRenderer.invoke('ollama:abortStream', streamId).catch(() => {});
    };

    const chunkHandler = (
      _event: any,
      data: { streamId: string; chunk?: string; thinking?: string; done: boolean; error?: string }
    ) => {
      if (data.streamId !== streamId || isTerminated) return;
      if (data.error) {
        if (onError) onError(data.error);
        cleanup();
        return;
      }
      if (data.thinking && onThinking) {
        onThinking(data.thinking);
      }
      if (data.chunk) {
        onChunk(data.chunk);
      }
      if (data.done) {
        isTerminated = true;
        ipcRenderer.removeListener('ollama:streamChunk', chunkHandler);
        if (onDone) onDone();
      }
    };

    ipcRenderer.on('ollama:streamChunk', chunkHandler);
    ipcRenderer.invoke('ollama:streamChat', { streamId, ...options }).catch((err: any) => {
      if (onError && !isTerminated) onError(err?.message || 'Streaming failed');
      cleanup();
    });

    return Promise.resolve(cleanup);
  },
  ollamaAbortStream: (streamId: string) => ipcRenderer.invoke('ollama:abortStream', streamId),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
