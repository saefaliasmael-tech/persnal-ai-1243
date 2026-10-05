import React from 'react';
import { ShieldAlert, AlertTriangle, Check, X, Terminal, FileCode, Globe, Trash2 } from 'lucide-react';
import type { PermissionRequest } from '../../types/models.ts';

interface PermissionDialogProps {
  requests: PermissionRequest[];
  onRespond: (requestId: string, allowed: boolean) => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({ requests, onRespond }) => {
  if (requests.length === 0) return null;

  const current = requests[0];

  const getIcon = () => {
    switch (current.type) {
      case 'runTerminalCommands':
        return <Terminal className="w-5 h-5 text-amber-400" />;
      case 'deleteFiles':
      case 'deleteProject':
        return <Trash2 className="w-5 h-5 text-rose-400" />;
      case 'internetAccess':
        return <Globe className="w-5 h-5 text-blue-400" />;
      case 'editFiles':
      case 'readFiles':
      default:
        return <FileCode className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-xl border border-amber-500/40 bg-neutral-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-950/40 border-b border-amber-500/20 text-amber-300">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <div className="flex-1 text-xs font-semibold uppercase tracking-wider">
            Permission Request Required
          </div>
          <span className="font-mono text-[10px] text-amber-400/80">{current.timestamp}</span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-neutral-800 border border-neutral-700 shrink-0">
              {getIcon()}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-100">
                Agent wants to perform action
              </h3>
              <p className="text-xs text-neutral-400 font-sans">
                The agent is requesting approval to execute the following operation:
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5 font-mono text-xs">
            <div className="text-neutral-500 text-[11px]">Action:</div>
            <div className="text-neutral-200 font-semibold">{current.action}</div>
            <div className="text-neutral-500 text-[11px] pt-1">Target Resource:</div>
            <div className="text-amber-300 break-all">{current.resource}</div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-400 bg-neutral-800/40 p-2.5 rounded border border-neutral-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Safe Mode is active. All system commands and file edits require explicit human authorization.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 px-4 py-3 bg-neutral-950/80 border-t border-neutral-800">
          <button
            onClick={() => onRespond(current.id, false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            Deny
          </button>

          <button
            onClick={() => onRespond(current.id, true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Allow Action
          </button>
        </div>
      </div>
    </div>
  );
};
