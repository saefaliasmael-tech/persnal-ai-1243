import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Shield, Terminal, Globe, Cpu } from 'lucide-react';
import { desktopBridge } from '../../services/desktopBridge.ts';
import { permissionService } from '../../services/permissionService.ts';
import { projectService } from '../../services/projectService.ts';
import type { ProjectMetadata, SystemPermissions } from '../../types/models.ts';

interface WindowsTitlebarProps {
  onOpenTerminalPopup: () => void;
  onOpenBrowserPopup: () => void;
  terminalPopupOpen: boolean;
  browserPopupOpen: boolean;
}

export const WindowsTitlebar: React.FC<WindowsTitlebarProps> = ({
  onOpenTerminalPopup,
  onOpenBrowserPopup,
  terminalPopupOpen,
  browserPopupOpen,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(null);
  const [permissions, setPermissions] = useState<SystemPermissions>(permissionService.getPermissions());

  useEffect(() => {
    const unsubProject = projectService.subscribe((_, active) => {
      setActiveProject(active);
    });
    const unsubPerms = permissionService.subscribe((perms) => {
      setPermissions(perms);
    });
    return () => {
      unsubProject();
      unsubPerms();
    };
  }, []);

  const handleMinimize = () => {
    desktopBridge.minimize();
  };

  const handleMaximize = async () => {
    await desktopBridge.maximize();
    const isMax = await desktopBridge.isMaximized();
    setIsMaximized(isMax);
  };

  const handleClose = () => {
    desktopBridge.close();
  };

  return (
    <header
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="h-9 bg-neutral-900 border-b border-neutral-800/80 flex items-center justify-between select-none px-2 z-50 shrink-0"
    >
      {/* Zone 1: App Identity & Active Project */}
      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-2.5"
      >
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-neutral-800/60 text-neutral-300">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold tracking-tight text-neutral-100">Personal AI</span>
        </div>
        <span className="text-neutral-600 text-xs font-mono">|</span>
        {activeProject ? (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="text-neutral-500">Project:</span>
            <span className="text-neutral-200 font-medium truncate max-w-[220px]">{activeProject.name}</span>
          </div>
        ) : (
          <span className="text-xs text-neutral-500 italic">No project loaded</span>
        )}
      </div>

      {/* Zone 2: System Status & Popups Bar */}
      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="hidden md:flex items-center gap-3 text-xs"
      >
        {/* Safe Mode Indicator */}
        <div className="flex items-center gap-1 text-neutral-400">
          <Shield className={`w-3.5 h-3.5 ${permissions.safeMode ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-[11px] text-neutral-400">Safe Mode {permissions.safeMode ? 'ON' : 'OFF'}</span>
        </div>

        <span className="text-neutral-700">·</span>

        {/* Dedicated Popups Launchers */}
        <button
          onClick={onOpenTerminalPopup}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            terminalPopupOpen
              ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
          }`}
          title="Toggle Dedicated Terminal Popup Window"
        >
          <Terminal className="w-3 h-3" />
          <span>Terminal Popup</span>
          {terminalPopupOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
        </button>

        <button
          onClick={onOpenBrowserPopup}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            browserPopupOpen
              ? 'bg-neutral-800 text-blue-400 border border-blue-500/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
          }`}
          title="Toggle Dedicated Browser Automation Popup Window"
        >
          <Globe className="w-3 h-3" />
          <span>Browser Popup</span>
          {browserPopupOpen && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
        </button>
      </div>

      {/* Zone 3: Windows 10 Titlebar Controls */}
      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center h-full -mr-2"
      >
        <button
          onClick={handleMinimize}
          className="w-11 h-9 flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-11 h-9 flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="w-11 h-9 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-red-600 transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
