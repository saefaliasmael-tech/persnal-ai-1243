// electron/preload.ts
var import_electron = require("electron");
var electronAPI = {
  // Window controls
  minimize: () => import_electron.ipcRenderer.invoke("app:minimize"),
  maximize: () => import_electron.ipcRenderer.invoke("app:maximize"),
  close: () => import_electron.ipcRenderer.invoke("app:close"),
  isMaximized: () => import_electron.ipcRenderer.invoke("app:isMaximized"),
  // Popups
  openPopup: (type) => import_electron.ipcRenderer.invoke("window:openPopup", type),
  closePopup: (type) => import_electron.ipcRenderer.invoke("window:closePopup", type),
  // System & Dialogs
  getSystemInfo: () => import_electron.ipcRenderer.invoke("app:getSystemInfo"),
  selectFolder: (defaultPath) => import_electron.ipcRenderer.invoke("dialog:selectFolder", defaultPath),
  selectFiles: (options) => import_electron.ipcRenderer.invoke("dialog:selectFiles", options),
  // Process Execution
  executeCommand: (options) => import_electron.ipcRenderer.invoke("process:execute", options),
  killProcess: (pid) => import_electron.ipcRenderer.invoke("process:kill", pid),
  writeProcessInput: (pid, input) => import_electron.ipcRenderer.invoke("process:write", { pid, input }),
  interruptProcess: (pid) => import_electron.ipcRenderer.invoke("process:interrupt", pid),
  onProcessData: (callback) => {
    const handler = (_event, data) => callback(data);
    import_electron.ipcRenderer.on("process:data", handler);
    return () => {
      import_electron.ipcRenderer.removeListener("process:data", handler);
    };
  },
  onProcessExit: (callback) => {
    const handler = (_event, data) => callback(data);
    import_electron.ipcRenderer.on("process:exit", handler);
    return () => {
      import_electron.ipcRenderer.removeListener("process:exit", handler);
    };
  },
  // File System
  readFile: (filePath) => import_electron.ipcRenderer.invoke("fs:readFile", filePath),
  writeFile: (filePath, content) => import_electron.ipcRenderer.invoke("fs:writeFile", filePath, content),
  listFiles: (dirPath) => import_electron.ipcRenderer.invoke("fs:listFiles", dirPath),
  deleteFile: (filePath) => import_electron.ipcRenderer.invoke("fs:deleteFile", filePath),
  // Storage
  getStoredItem: (key, defaultValue) => import_electron.ipcRenderer.invoke("storage:get", key, defaultValue),
  setStoredItem: (key, value) => import_electron.ipcRenderer.invoke("storage:set", key, value),
  // Real Ollama Local AI Integration
  ollamaCheck: (endpoint) => import_electron.ipcRenderer.invoke("ollama:check", endpoint),
  ollamaChat: (options) => import_electron.ipcRenderer.invoke("ollama:chat", options),
  ollamaStreamChat: (options, onChunk, onDone, onError, onThinking) => {
    const streamId = "stream_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    let isTerminated = false;
    const cleanup = () => {
      if (isTerminated) return;
      isTerminated = true;
      import_electron.ipcRenderer.removeListener("ollama:streamChunk", chunkHandler);
      import_electron.ipcRenderer.invoke("ollama:abortStream", streamId).catch(() => {
      });
    };
    const chunkHandler = (_event, data) => {
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
        import_electron.ipcRenderer.removeListener("ollama:streamChunk", chunkHandler);
        if (onDone) onDone();
      }
    };
    import_electron.ipcRenderer.on("ollama:streamChunk", chunkHandler);
    import_electron.ipcRenderer.invoke("ollama:streamChat", { streamId, ...options }).catch((err) => {
      if (onError && !isTerminated) onError(err?.message || "Streaming failed");
      cleanup();
    });
    return Promise.resolve(cleanup);
  },
  ollamaAbortStream: (streamId) => import_electron.ipcRenderer.invoke("ollama:abortStream", streamId)
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
