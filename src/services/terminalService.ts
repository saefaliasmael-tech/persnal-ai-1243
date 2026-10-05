import type { TerminalOutputLine, TerminalProcessState } from '../types/models.ts';
import type { ITerminalService } from '../types/services.ts';
import { activityService } from './activityService.ts';
import { desktopBridge } from './desktopBridge.ts';

class TerminalService implements ITerminalService {
  private state: TerminalProcessState = {
    pid: null,
    command: '',
    cwd: 'C:\\Users\\saif\\Desktop\\personal-ai',
    startTime: null,
    endTime: null,
    exitCode: null,
    status: 'idle',
    lines: [
      {
        id: 'line-init',
        type: 'system',
        text: 'Personal AI Terminal Subsystem [Version 1.0.0]\nReady for background command execution.\n',
        timestamp: new Date().toTimeString().split(' ')[0],
      },
    ],
  };

  private subscribers: ((state: TerminalProcessState) => void)[] = [];
  private unsubscribeProcessData: (() => void) | null = null;
  private unsubscribeProcessExit: (() => void) | null = null;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    this.unsubscribeProcessData = desktopBridge.onProcessData(({ pid, stream, text }) => {
      if (this.state.pid === pid) {
        this.appendLine(stream === 'stdout' ? 'stdout' : 'stderr', text);
      }
    });

    this.unsubscribeProcessExit = desktopBridge.onProcessExit(({ pid, code }) => {
      if (this.state.pid === pid) {
        const endTime = new Date().toTimeString().split(' ')[0];
        const status = code === 0 ? 'completed' : 'failed';
        this.state = {
          ...this.state,
          endTime,
          exitCode: code,
          status,
        };

        this.appendLine(
          'system',
          `\n[Process exited with code ${code} at ${endTime}]\n`
        );

        activityService.logEvent({
          category: 'terminal',
          icon: code === 0 ? 'CheckSquare' : 'AlertTriangle',
          title: `Terminal Process Finished (Exit ${code})`,
          description: `Command: ${this.state.command}`,
          status: code === 0 ? 'completed' : 'failed',
          command: this.state.command,
        });

        this.notify();
      }
    });
  }

  getState(): TerminalProcessState {
    return { ...this.state };
  }

  async executeCommand(command: string = '', cwd?: string): Promise<number> {
    const workingDir = cwd || this.state.cwd;
    const startTime = new Date().toTimeString().split(' ')[0];

    // Log command in buffer if provided
    if (command && command.trim()) {
      this.appendLine('command', `\n> ${command}\n`);
    }

    this.state = {
      ...this.state,
      command,
      cwd: workingDir,
      startTime,
      endTime: null,
      exitCode: null,
      status: 'running',
    };
    this.notify();

    if (command && command.trim()) {
      activityService.logEvent({
        category: 'terminal',
        icon: 'Terminal',
        title: 'Executing Terminal Command',
        description: `Command: ${command}`,
        status: 'in_progress',
        command,
        path: workingDir,
      });
    }

    try {
      const { pid } = await desktopBridge.executeCommand({ command, cwd: workingDir });
      this.state.pid = pid;
      this.notify();
      return pid;
    } catch (err: any) {
      this.appendLine('stderr', `Execution failed to start: ${err?.message || err}\n`);
      this.state.status = 'failed';
      this.state.exitCode = -1;
      this.notify();
      return -1;
    }
  }

  async writeInput(input: string): Promise<boolean> {
    if (this.state.pid && this.state.status === 'running') {
      return desktopBridge.writeProcessInput(this.state.pid, input);
    }
    return false;
  }

  async sendInterrupt(): Promise<boolean> {
    if (this.state.pid && this.state.status === 'running') {
      return desktopBridge.interruptProcess(this.state.pid);
    }
    return false;
  }

  async stopCommand(): Promise<boolean> {
    if (this.state.pid && this.state.status === 'running') {
      const success = await desktopBridge.killProcess(this.state.pid);
      if (success) {
        this.state.status = 'stopped';
        this.state.endTime = new Date().toTimeString().split(' ')[0];
        this.appendLine('system', '[Process stopped by user]\n');
        this.notify();
        activityService.logEvent({
          category: 'terminal',
          icon: 'StopCircle',
          title: 'Process Stopped by User',
          description: `Killed process PID: ${this.state.pid}`,
          status: 'completed',
        });
      }
      return success;
    }
    return false;
  }

  clearOutput() {
    this.state.lines = [];
    this.notify();
  }

  private appendLine(type: 'stdout' | 'stderr' | 'system' | 'command', text: string) {
    const newLine: TerminalOutputLine = {
      id: `tl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      text,
      timestamp: new Date().toTimeString().split(' ')[0],
    };
    this.state.lines.push(newLine);
    // Keep reasonable line count in memory
    if (this.state.lines.length > 2000) {
      this.state.lines = this.state.lines.slice(-1500);
    }
    this.notify();
  }

  subscribe(callback: (state: TerminalProcessState) => void): () => void {
    this.subscribers.push(callback);
    callback({ ...this.state });
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const copy = { ...this.state, lines: [...this.state.lines] };
    for (const sub of this.subscribers) {
      sub(copy);
    }
  }
}

export const terminalService = new TerminalService();
