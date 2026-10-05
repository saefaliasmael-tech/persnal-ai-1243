import type { ElectronAPI, SystemInfo, OllamaCheckResult, OllamaChatOptions } from '../types/ipc.ts';

/**
 * Universal Desktop Bridge
 * Automatically detects whether Personal AI is running inside real Electron or web preview.
 * Exposes a uniform, typed API so that all services and UI components remain completely agnostic.
 */

class WebDesktopBridge implements ElectronAPI {
  private isMax = false;
  private processDataListeners: ((data: { pid: number; stream: 'stdout' | 'stderr'; text: string }) => void)[] = [];
  private processExitListeners: ((data: { pid: number; code: number }) => void)[] = [];
  private activePids = new Set<number>();

  async minimize(): Promise<void> {
    // Handled by UI window layer
  }

  async maximize(): Promise<void> {
    this.isMax = !this.isMax;
  }

  async close(): Promise<void> {
    // Window close request
  }

  async isMaximized(): Promise<boolean> {
    return this.isMax;
  }

  async openPopup(type: 'terminal' | 'browser'): Promise<void> {
    window.dispatchEvent(new CustomEvent('personalai:open-popup', { detail: { type } }));
  }

  async closePopup(type: 'terminal' | 'browser'): Promise<void> {
    window.dispatchEvent(new CustomEvent('personalai:close-popup', { detail: { type } }));
  }

  async getSystemInfo(): Promise<SystemInfo> {
    return {
      platform: 'win32',
      osVersion: 'Windows 10 Pro (Build 19045)',
      isWindows10: true,
      appVersion: '1.0.0-foundation',
      appDataPath: 'C:\\Users\\User\\AppData\\Roaming\\PersonalAI',
      isElectron: typeof window !== 'undefined' && !!window.electronAPI,
    };
  }

  async selectFolder(defaultPath?: string): Promise<string | null> {
    // Prompt the user or return selected path
    return defaultPath || 'C:\\Projects\\PersonalAI-Workspace';
  }

  async selectFiles(options?: { filters?: { name: string; extensions: string[] }[]; allowMultiple?: boolean }): Promise<string[]> {
    return ['C:\\Projects\\Docs\\architecture_guide.md', 'C:\\Projects\\Docs\\api_reference.pdf'];
  }

  async executeCommand(options: { command: string; args?: string[]; cwd?: string }): Promise<{ pid: number }> {
    const pid = Math.floor(Math.random() * 9000) + 1000;
    this.activePids.add(pid);

    const fullCmd = [options.command, ...(options.args || [])].join(' ').trim();
    const cwd = options.cwd || 'C:\\Projects\\PersonalAI-Workspace';

    // Broadcast command launch
    setTimeout(() => {
      this.broadcastData(pid, 'stdout', `[Process started: PID ${pid}]\nWorking Directory: ${cwd}\nCommand: ${fullCmd}\n\n`);
    }, 50);

    // Simulate realistic process output stream based on command
    this.runSimulatedProcess(pid, fullCmd);

    return { pid };
  }

  async killProcess(pid: number): Promise<boolean> {
    if (this.activePids.has(pid)) {
      this.activePids.delete(pid);
      this.broadcastData(pid, 'stderr', `\n[Process terminated by user: PID ${pid}]\n`);
      this.broadcastExit(pid, 130);
      return true;
    }
    return false;
  }

  async writeProcessInput(pid: number, input: string): Promise<boolean> {
    if (this.activePids.has(pid)) {
      this.broadcastData(pid, 'stdout', input);
      return true;
    }
    return false;
  }

  async interruptProcess(pid: number): Promise<boolean> {
    if (this.activePids.has(pid)) {
      this.broadcastData(pid, 'stdout', '^C\n');
      return true;
    }
    return false;
  }

  onProcessData(callback: (data: { pid: number; stream: 'stdout' | 'stderr'; text: string }) => void): () => void {
    this.processDataListeners.push(callback);
    return () => {
      this.processDataListeners = this.processDataListeners.filter((cb) => cb !== callback);
    };
  }

  onProcessExit(callback: (data: { pid: number; code: number }) => void): () => void {
    this.processExitListeners.push(callback);
    return () => {
      this.processExitListeners = this.processExitListeners.filter((cb) => cb !== callback);
    };
  }

  async readFile(filePath: string): Promise<string> {
    const storageKey = `personal_ai_file:${filePath}`;
    const content = localStorage.getItem(storageKey);
    if (content !== null) return content;
    return `// File: ${filePath}\n// Read from local workspace storage\nexport const initialized = true;\n`;
  }

  async writeFile(filePath: string, content: string): Promise<boolean> {
    localStorage.setItem(`personal_ai_file:${filePath}`, content);
    return true;
  }

  async listFiles(dirPath: string): Promise<{ name: string; isDirectory: boolean; size: number }[]> {
    return [
      { name: 'src', isDirectory: true, size: 4096 },
      { name: 'package.json', isDirectory: false, size: 1024 },
      { name: 'tsconfig.json', isDirectory: false, size: 450 },
      { name: 'README.md', isDirectory: false, size: 2840 },
    ];
  }

  async deleteFile(filePath: string): Promise<boolean> {
    localStorage.removeItem(`personal_ai_file:${filePath}`);
    return true;
  }

  async getStoredItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const val = localStorage.getItem(`personal_ai_store:${key}`);
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async setStoredItem<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(`personal_ai_store:${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  // Real Local Ollama Integration
  async ollamaCheck(endpoint = 'http://127.0.0.1:11434'): Promise<OllamaCheckResult> {
    try {
      const urlObj = new URL(endpoint);
      const isLocal = urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost' || urlObj.hostname === '::1';
      if (!isLocal) {
        return {
          ok: false,
          models: [],
          error: 'Security Block: Only local addresses (127.0.0.1 or localhost) are allowed.',
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const url = endpoint.endsWith('/') ? `${endpoint}api/tags` : `${endpoint}/api/tags`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => m.name || m.model || '').filter(Boolean);
        return { ok: true, models };
      }
      return { ok: false, models: [], error: `Ollama returned HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, models: [], error: `Cannot reach Ollama at ${endpoint}: ${e.message}` };
    }
  }

  async ollamaChat(options: OllamaChatOptions): Promise<{ content: string }> {
    const endpoint = options.endpoint || 'http://127.0.0.1:11434';
    const urlObj = new URL(endpoint);
    const isLocal = urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost' || urlObj.hostname === '::1';
    if (!isLocal) {
      throw new Error('Security Block: Only local addresses are permitted.');
    }

    const url = endpoint.endsWith('/') ? `${endpoint}api/chat` : `${endpoint}/api/chat`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return { content: data.message?.content || '' };
  }

  private activeWebAbortControllers = new Map<string, AbortController>();

  async ollamaAbortStream(streamId: string): Promise<boolean> {
    const controller = this.activeWebAbortControllers.get(streamId);
    if (controller) {
      controller.abort();
      this.activeWebAbortControllers.delete(streamId);
      return true;
    }
    return false;
  }

  async ollamaStreamChat(
    options: OllamaChatOptions,
    onChunk: (chunk: string) => void,
    onDone?: () => void,
    onError?: (err: string) => void
  ): Promise<() => void> {
    const controller = new AbortController();
    const streamId = 'web_stream_' + Date.now();
    this.activeWebAbortControllers.set(streamId, controller);
    const endpoint = options.endpoint || 'http://127.0.0.1:11434';

    try {
      const urlObj = new URL(endpoint);
      const isLocal = urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost' || urlObj.hostname === '::1';
      if (!isLocal) {
        if (onError) onError('Security Block: Only local addresses are permitted.');
        this.activeWebAbortControllers.delete(streamId);
        return () => {};
      }
    } catch (err: any) {
      if (onError) onError(`Invalid endpoint URL: ${err.message}`);
      this.activeWebAbortControllers.delete(streamId);
      return () => {};
    }

    const url = endpoint.endsWith('/') ? `${endpoint}api/chat` : `${endpoint}/api/chat`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/x-ndjson, text/event-stream, */*',
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: true,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) {
          throw new Error(`Ollama HTTP ${res.status}: ${res.statusText}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let isFinished = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              const content = parsed.message?.content ?? parsed.response ?? '';
              if (content) {
                onChunk(content);
              }
              if (parsed.done) {
                isFinished = true;
                this.activeWebAbortControllers.delete(streamId);
                if (onDone) onDone();
                break;
              }
            } catch {
              // wait for complete NDJSON line
            }
          }
          if (isFinished) break;
        }

        if (!isFinished) {
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer.trim());
              const content = parsed.message?.content ?? parsed.response ?? '';
              if (content) onChunk(content);
            } catch {}
          }
          this.activeWebAbortControllers.delete(streamId);
          if (onDone) onDone();
        }
      })
      .catch((err: any) => {
        this.activeWebAbortControllers.delete(streamId);
        if (err.name !== 'AbortError' && onError) {
          onError(err.message);
        }
      });

    return () => {
      this.activeWebAbortControllers.delete(streamId);
      controller.abort();
    };
  }

  private broadcastData(pid: number, stream: 'stdout' | 'stderr', text: string) {
    for (const listener of this.processDataListeners) {
      listener({ pid, stream, text });
    }
  }

  private broadcastExit(pid: number, code: number) {
    for (const listener of this.processExitListeners) {
      listener({ pid, code });
    }
  }

  private runSimulatedProcess(pid: number, cmd: string) {
    const lower = cmd.toLowerCase();

    if (lower.includes('gradlew') || lower.includes('build')) {
      const steps = [
        { delay: 400, stream: 'stdout', text: '> Starting Gradle Daemon...\n> Connecting to Daemon\n' },
        { delay: 900, stream: 'stdout', text: '> Task :app:preBuild UP-TO-DATE\n> Task :app:compileDebugKotlin\n' },
        { delay: 1600, stream: 'stdout', text: '> Task :app:mergeDebugResources\n> Task :app:processDebugManifest\n' },
        { delay: 2400, stream: 'stdout', text: '> Task :app:assembleDebug\n' },
        { delay: 3000, stream: 'stdout', text: '\nBUILD SUCCESSFUL in 2.8s\n4 actionable tasks: 2 executed, 2 up-to-date\n' },
      ];

      steps.forEach(({ delay, stream, text }, index) => {
        setTimeout(() => {
          if (!this.activePids.has(pid)) return;
          this.broadcastData(pid, stream as any, text);
          if (index === steps.length - 1) {
            this.activePids.delete(pid);
            this.broadcastExit(pid, 0);
          }
        }, delay);
      });
    } else if (lower.includes('test')) {
      const steps = [
        { delay: 300, stream: 'stdout', text: 'Running test runner v2.4.0...\nScanning test suites...\n' },
        { delay: 800, stream: 'stdout', text: 'PASS  tests/auth.test.ts (1.2s)\nPASS  tests/project_service.test.ts (0.8s)\n' },
        { delay: 1500, stream: 'stdout', text: 'PASS  tests/permission_engine.test.ts (0.4s)\n\nTest Suites: 3 passed, 3 total\nTests:       14 passed, 14 total\nSnapshots:   0 total\nTime:        2.45s\n' },
      ];

      steps.forEach(({ delay, stream, text }, index) => {
        setTimeout(() => {
          if (!this.activePids.has(pid)) return;
          this.broadcastData(pid, stream as any, text);
          if (index === steps.length - 1) {
            this.activePids.delete(pid);
            this.broadcastExit(pid, 0);
          }
        }, delay);
      });
    } else if (lower.includes('git status')) {
      setTimeout(() => {
        if (!this.activePids.has(pid)) return;
        this.broadcastData(pid, 'stdout', 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nChanges to be committed:\n  modified: src/services/agentService.ts\n\nUntracked files:\n  docs/architecture.md\n');
        this.activePids.delete(pid);
        this.broadcastExit(pid, 0);
      }, 400);
    } else {
      setTimeout(() => {
        if (!this.activePids.has(pid)) return;
        this.broadcastData(pid, 'stdout', `Running: ${cmd}\nCommand completed successfully.\n`);
        this.activePids.delete(pid);
        this.broadcastExit(pid, 0);
      }, 600);
    }
  }
}

// Export singleton instance: use real window.electronAPI if available, otherwise WebDesktopBridge
export const desktopBridge: ElectronAPI =
  typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : new WebDesktopBridge();
