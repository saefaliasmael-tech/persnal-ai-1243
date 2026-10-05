import React, { useState } from 'react';
import { Cpu, X, CheckCircle2, AlertCircle, RefreshCw, Power } from 'lucide-react';
import { aiService } from '../../services/aiService.ts';
import type { AIProviderConfig, ServiceConnectionStatus } from '../../types/models.ts';

interface ConnectAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectAIModal: React.FC<ConnectAIModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AIProviderConfig>(aiService.getConfig());
  const [endpoint, setEndpoint] = useState(config.endpoint);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);

  if (!isOpen) return null;

  const handleTestAndConnect = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    setStatusType(null);

    const success = await aiService.connect(endpoint);
    setIsTesting(false);
    const updated = aiService.getConfig();
    setConfig(updated);

    if (success) {
      setStatusType('success');
      setStatusMessage(`Connected! Found ${updated.availableModels.length} models on local Ollama runner.`);
    } else {
      setStatusType('error');
      setStatusMessage(`Connection failed at ${endpoint}. Ensure Ollama is running on your Windows 10 PC with model qwen3:14b.`);
    }
  };

  const handleDisconnect = async () => {
    await aiService.disconnect();
    setConfig(aiService.getConfig());
    setStatusMessage('Disconnected from local model runner.');
    setStatusType(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border border-neutral-700/80 bg-neutral-900 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2 text-neutral-100 font-semibold text-sm">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Connect Local Ollama (qwen3:14b)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-1 text-neutral-400 font-sans">
            <p className="text-neutral-300 font-medium">Configure Local Ollama Runner</p>
            <p className="text-[11px] text-neutral-500">
              Direct connection via Electron Main Process IPC to <code className="text-neutral-300 font-mono">http://127.0.0.1:11434</code>.
              Your code and queries never leave your Windows 10 machine.
            </p>
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Runner Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEndpoint('http://127.0.0.1:11434');
                }}
                className={`p-2 rounded-lg border text-left font-medium transition-colors ${
                  endpoint.includes('11434')
                    ? 'border-blue-500/60 bg-blue-950/30 text-blue-300'
                    : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <div className="font-semibold text-neutral-200">Ollama (Local)</div>
                <div className="text-[10px] text-neutral-500 font-mono">http://127.0.0.1:11434</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEndpoint('http://localhost:11434');
                }}
                className={`p-2 rounded-lg border text-left font-medium transition-colors ${
                  endpoint.includes('localhost:11434')
                    ? 'border-blue-500/60 bg-blue-950/30 text-blue-300'
                    : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <div className="font-semibold text-neutral-200">Ollama (Localhost)</div>
                <div className="text-[10px] text-neutral-500 font-mono">http://localhost:11434</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Endpoint URL (Local Only)</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://127.0.0.1:11434"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {config.availableModels.length > 0 && (
            <div>
              <label className="block text-neutral-400 font-medium mb-1.5">Selected Model</label>
              <select
                value={config.selectedModel}
                onChange={(e) => aiService.setSelectedModel(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
              >
                {config.availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {statusMessage && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg border text-[11px] ${
                statusType === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusType === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
            {config.status === 'connected' ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-rose-400 font-medium transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
                Disconnect
              </button>
            ) : (
              <span className="text-neutral-500 text-[11px]">Current state: Disconnected</span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleTestAndConnect}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    Test & Connect
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
