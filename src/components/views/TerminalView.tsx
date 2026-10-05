import React from 'react';
import { Terminal, ExternalLink } from 'lucide-react';
import { TerminalWindow } from '../windows/TerminalWindow.tsx';

interface TerminalViewProps {
  onOpenPopup: () => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ onOpenPopup }) => {
  return (
    <div className="flex-1 h-full flex flex-col bg-neutral-950 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h1 className="text-sm font-semibold text-neutral-100">Process Terminal Console</h1>
          <span className="text-neutral-600">·</span>
          <span className="text-xs text-neutral-400">
            Real process execution subsystem streaming live stdout and stderr
          </span>
        </div>

        <button
          onClick={onOpenPopup}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-medium transition-colors border border-neutral-700/80"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Dedicated Popup Window
        </button>
      </div>

      {/* Embedded Viewport */}
      <div className="flex-1 overflow-hidden">
        <TerminalWindow isEmbedded={true} />
      </div>
    </div>
  );
};
