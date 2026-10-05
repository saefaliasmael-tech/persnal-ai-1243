import React, { useState } from 'react';
import { Minus, Square, X, Copy, Terminal, Globe } from 'lucide-react';
import { TerminalWindow } from './TerminalWindow.tsx';
import { BrowserWindow } from './BrowserWindow.tsx';

interface WindowManagerState {
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface WindowManagerProps {
  terminalOpen: boolean;
  browserOpen: boolean;
  onCloseTerminal: () => void;
  onCloseBrowser: () => void;
}

export const WindowManager: React.FC<WindowManagerProps> = ({
  terminalOpen,
  browserOpen,
  onCloseTerminal,
  onCloseBrowser,
}) => {
  const [terminalState, setTerminalState] = useState<WindowManagerState>({
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    position: { x: 80, y: 60 },
    size: { width: 840, height: 500 },
  });

  const [browserState, setBrowserState] = useState<WindowManagerState>({
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    position: { x: 140, y: 100 },
    size: { width: 900, height: 560 },
  });

  const [activeWindow, setActiveWindow] = useState<'terminal' | 'browser' | null>('terminal');
  const [dragState, setDragState] = useState<{
    windowType: 'terminal' | 'browser';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, type: 'terminal' | 'browser') => {
    setActiveWindow(type);
    const targetState = type === 'terminal' ? terminalState : browserState;
    if (targetState.isMaximized) return;

    setDragState({
      windowType: type,
      startX: e.clientX,
      startY: e.clientY,
      initialX: targetState.position.x,
      initialY: targetState.position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    const newX = Math.max(10, dragState.initialX + dx);
    const newY = Math.max(10, dragState.initialY + dy);

    if (dragState.windowType === 'terminal') {
      setTerminalState((prev) => ({
        ...prev,
        position: { x: newX, y: newY },
      }));
    } else {
      setBrowserState((prev) => ({
        ...prev,
        position: { x: newX, y: newY },
      }));
    }
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`fixed inset-0 pointer-events-none z-40 ${dragState ? 'cursor-move' : ''}`}
    >
      {/* Floating Terminal Child Window */}
      {terminalOpen && !terminalState.isMinimized && (
        <div
          onClick={() => setActiveWindow('terminal')}
          style={{
            left: terminalState.isMaximized ? 0 : `${terminalState.position.x}px`,
            top: terminalState.isMaximized ? 36 : `${terminalState.position.y}px`,
            width: terminalState.isMaximized ? '100vw' : `${terminalState.size.width}px`,
            height: terminalState.isMaximized ? 'calc(100vh - 36px)' : `${terminalState.size.height}px`,
            zIndex: activeWindow === 'terminal' ? 45 : 42,
          }}
          className={`absolute flex flex-col rounded-lg border border-neutral-700/80 bg-neutral-950 shadow-2xl overflow-hidden pointer-events-auto transition-all ${
            terminalState.isMaximized ? 'rounded-none border-0' : ''
          }`}
        >
          {/* Windows 10 Titlebar for Popup */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'terminal')}
            className="h-8 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between select-none px-2 cursor-move shrink-0"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Personal AI — Agent Terminal Popup</span>
            </div>
            <div className="flex items-center h-full -mr-2">
              <button
                onClick={() => setTerminalState((s) => ({ ...s, isMinimized: true }))}
                className="w-10 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => setTerminalState((s) => ({ ...s, isMaximized: !s.isMaximized }))}
                className="w-10 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                {terminalState.isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
              </button>
              <button
                onClick={onCloseTerminal}
                className="w-10 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-rose-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <TerminalWindow onClose={onCloseTerminal} />
          </div>
        </div>
      )}

      {/* Floating Browser Child Window */}
      {browserOpen && !browserState.isMinimized && (
        <div
          onClick={() => setActiveWindow('browser')}
          style={{
            left: browserState.isMaximized ? 0 : `${browserState.position.x}px`,
            top: browserState.isMaximized ? 36 : `${browserState.position.y}px`,
            width: browserState.isMaximized ? '100vw' : `${browserState.size.width}px`,
            height: browserState.isMaximized ? 'calc(100vh - 36px)' : `${browserState.size.height}px`,
            zIndex: activeWindow === 'browser' ? 45 : 42,
          }}
          className={`absolute flex flex-col rounded-lg border border-neutral-700/80 bg-neutral-950 shadow-2xl overflow-hidden pointer-events-auto transition-all ${
            browserState.isMaximized ? 'rounded-none border-0' : ''
          }`}
        >
          {/* Windows 10 Titlebar for Popup */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'browser')}
            className="h-8 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between select-none px-2 cursor-move shrink-0"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Personal AI — Agent Browser Automation Popup</span>
            </div>
            <div className="flex items-center h-full -mr-2">
              <button
                onClick={() => setBrowserState((s) => ({ ...s, isMinimized: true }))}
                className="w-10 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => setBrowserState((s) => ({ ...s, isMaximized: !s.isMaximized }))}
                className="w-10 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                {browserState.isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
              </button>
              <button
                onClick={onCloseBrowser}
                className="w-10 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-rose-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <BrowserWindow onClose={onCloseBrowser} />
          </div>
        </div>
      )}

      {/* Dock for Minimized Popups */}
      {((terminalOpen && terminalState.isMinimized) || (browserOpen && browserState.isMinimized)) && (
        <div className="absolute bottom-3 right-4 flex items-center gap-2 pointer-events-auto bg-neutral-900/90 border border-neutral-700/80 p-1 rounded-lg shadow-xl backdrop-blur-xs">
          {terminalOpen && terminalState.isMinimized && (
            <button
              onClick={() => {
                setTerminalState((s) => ({ ...s, isMinimized: false }));
                setActiveWindow('terminal');
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-medium transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Terminal</span>
            </button>
          )}

          {browserOpen && browserState.isMinimized && (
            <button
              onClick={() => {
                setBrowserState((s) => ({ ...s, isMinimized: false }));
                setActiveWindow('browser');
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-blue-400 text-xs font-medium transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Browser</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
