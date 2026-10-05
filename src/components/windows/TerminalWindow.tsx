import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Square, Trash2, ArrowDown } from 'lucide-react';
import { terminalService } from '../../services/terminalService.ts';
import type { TerminalProcessState } from '../../types/models.ts';

interface TerminalWindowProps {
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({ isEmbedded = false }) => {
  const [state, setState] = useState<TerminalProcessState>(terminalService.getState());
  const [autoScroll, setAutoScroll] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    const unsub = terminalService.subscribe((newState) => {
      setState(newState);
    });

    // Auto-start persistent shell if idle on mount
    if (terminalService.getState().status === 'idle') {
      terminalService.executeCommand('');
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.lines, autoScroll]);

  useEffect(() => {
    // Focus input on mount or state change
    inputRef.current?.focus();
  }, [state.status]);

  const handleRunCommand = (cmd: string) => {
    if (state.status === 'running' && state.pid) {
      terminalService.writeInput(cmd + '\r\n');
      if (cmd.trim()) {
        historyRef.current.push(cmd.trim());
        historyIndexRef.current = -1;
      }
    } else {
      terminalService.executeCommand(cmd);
      if (cmd.trim()) {
        historyRef.current.push(cmd.trim());
        historyIndexRef.current = -1;
      }
    }
    inputRef.current?.focus();
  };

  const handleStop = () => {
    terminalService.stopCommand();
    inputRef.current?.focus();
  };

  const handleClear = () => {
    terminalService.clearOutput();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Ctrl+C (Interrupt signal)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      const selectedText = window.getSelection()?.toString();
      if (!selectedText) {
        e.preventDefault();
        if (state.status === 'running' && state.pid) {
          terminalService.sendInterrupt();
        }
        setInputValue('');
        return;
      }
    }

    // Handle Enter (Execute or send to shell stdin)
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmdToSend = inputValue;

      if (state.status === 'running' && state.pid) {
        // Send directly to persistent shell stdin
        terminalService.writeInput(cmdToSend + '\r\n');
      } else {
        // Spawn a new shell session
        terminalService.executeCommand(cmdToSend.trim());
      }

      if (cmdToSend.trim()) {
        historyRef.current.push(cmdToSend.trim());
        historyIndexRef.current = -1;
      }

      setInputValue('');
      return;
    }

    // Handle Command History: ArrowUp
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyRef.current.length > 0) {
        if (historyIndexRef.current === -1) {
          historyIndexRef.current = historyRef.current.length - 1;
        } else if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
        }
        setInputValue(historyRef.current[historyIndexRef.current] || '');
      }
      return;
    }

    // Handle Command History: ArrowDown
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndexRef.current !== -1) {
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current += 1;
          setInputValue(historyRef.current[historyIndexRef.current] || '');
        } else {
          historyIndexRef.current = -1;
          setInputValue('');
        }
      }
      return;
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`flex flex-col h-full bg-neutral-950 text-neutral-200 font-mono text-xs ${
        isEmbedded ? '' : 'rounded-b-lg'
      }`}
    >
      {/* Top Bar: Process Status & Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/70 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-neutral-200">Process Terminal</span>
          <span className="text-neutral-600">·</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium uppercase tracking-wider ${
              state.status === 'running'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30 animate-pulse'
                : state.status === 'completed'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                : state.status === 'failed'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            {state.status}
          </span>
          {state.pid && (
            <span className="text-[11px] text-neutral-500 font-mono">
              PID: {state.pid}
            </span>
          )}
          {state.exitCode !== null && (
            <span className="text-[11px] text-neutral-500">
              Exit: {state.exitCode}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {state.status === 'running' ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1 px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/40 rounded text-[11px] font-sans transition-colors"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop Shell
            </button>
          ) : (
            <button
              onClick={() => handleRunCommand('')}
              className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 rounded text-[11px] font-sans transition-colors"
            >
              Start Shell
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleRunCommand('gradlew assembleDebug')}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-sans transition-colors"
              title="Execute assembleDebug build"
            >
              Assemble
            </button>
            <button
              onClick={() => handleRunCommand('gradlew test')}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-sans transition-colors"
              title="Execute project tests"
            >
              Run Tests
            </button>
            <button
              onClick={() => handleRunCommand('git status')}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-sans transition-colors"
            >
              Git Status
            </button>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded text-neutral-400 hover:text-neutral-200 transition-colors ${
              autoScroll ? 'bg-neutral-800 text-emerald-400' : 'hover:bg-neutral-800'
            }`}
            title="Toggle Auto-scroll"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleClear}
            className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title="Clear Terminal Buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CWD Bar */}
      <div className="px-3 py-1 bg-neutral-900/40 border-b border-neutral-800/60 text-[11px] text-neutral-500 flex items-center justify-between shrink-0 select-none">
        <div className="truncate">
          <span className="text-neutral-600">cwd: </span>
          <span className="text-neutral-400">{state.cwd}</span>
        </div>
        {state.startTime && (
          <div className="text-[10px] text-neutral-600 shrink-0">
            Started: {state.startTime}
            {state.endTime && ` · Finished: ${state.endTime}`}
          </div>
        )}
      </div>

      {/* Terminal Live Output Log Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 select-text font-mono text-[11px] leading-relaxed cursor-text">
        {state.lines.length === 0 ? (
          <div className="text-neutral-600 italic py-4">Terminal buffer empty. Ready for commands.</div>
        ) : (
          state.lines.map((line) => {
            const isErr = line.type === 'stderr';
            const isCmd = line.type === 'command';
            const isSys = line.type === 'system';

            return (
              <div
                key={line.id}
                className={`whitespace-pre-wrap break-all ${
                  isErr
                    ? 'text-rose-400 bg-rose-950/20 px-1 py-0.5 rounded'
                    : isCmd
                    ? 'text-emerald-400 font-semibold pt-1'
                    : isSys
                    ? 'text-neutral-500 italic'
                    : 'text-neutral-300'
                }`}
              >
                {line.text}
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>

      {/* Interactive Command Input Line */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/90 border-t border-neutral-800 shrink-0">
        <span className="text-emerald-400 font-bold select-none text-xs">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            state.status === 'running'
              ? 'Type a command and press Enter (e.g. dir, npm test, git status)...'
              : 'Session ended. Type a command or press Enter to launch new shell...'
          }
          className="flex-1 bg-transparent border-none outline-hidden text-neutral-100 font-mono text-xs placeholder:text-neutral-600 focus:outline-hidden"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        {state.status === 'running' && state.pid ? (
          <span className="text-[10px] text-neutral-500 font-sans select-none shrink-0">
            Active Shell (PID {state.pid})
          </span>
        ) : (
          <span className="text-[10px] text-neutral-600 font-sans select-none shrink-0">
            Shell Inactive
          </span>
        )}
      </div>
    </div>
  );
};
