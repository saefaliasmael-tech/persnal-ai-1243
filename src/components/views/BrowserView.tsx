import React from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import { BrowserWindow } from '../windows/BrowserWindow.tsx';

interface BrowserViewProps {
  onOpenPopup: () => void;
}

export const BrowserView: React.FC<BrowserViewProps> = ({ onOpenPopup }) => {
  return (
    <div className="flex-1 h-full flex flex-col bg-neutral-950 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <h1 className="text-sm font-semibold text-neutral-100">Browser Automation Console</h1>
          <span className="text-neutral-600">·</span>
          <span className="text-xs text-neutral-400">
            Real browser viewport for web documentation, search, and page reading
          </span>
        </div>

        <button
          onClick={onOpenPopup}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-blue-400 text-xs font-medium transition-colors border border-neutral-700/80"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Dedicated Popup Window
        </button>
      </div>

      {/* Embedded Viewport */}
      <div className="flex-1 overflow-hidden">
        <BrowserWindow isEmbedded={true} />
      </div>
    </div>
  );
};
