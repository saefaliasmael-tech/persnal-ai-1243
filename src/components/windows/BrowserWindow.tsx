import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Globe,
  ExternalLink,
  Code,
  FileText,
  Lock,
} from 'lucide-react';
import { browserService } from '../../services/browserService.ts';
import type { BrowserAutomationState } from '../../types/models.ts';

interface BrowserWindowProps {
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const BrowserWindow: React.FC<BrowserWindowProps> = ({ onClose, isEmbedded = false }) => {
  const [state, setState] = useState<BrowserAutomationState>(browserService.getState());
  const [inputUrl, setInputUrl] = useState(state.url);
  const [activeTab, setActiveTab] = useState<'view' | 'inspector'>('view');

  useEffect(() => {
    const unsub = browserService.subscribe((newState) => {
      setState(newState);
      setInputUrl(newState.url);
    });
    return () => unsub();
  }, []);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    browserService.navigate(inputUrl);
  };

  const handleQuickSearch = (query: string) => {
    setInputUrl(query);
    browserService.search(query);
  };

  return (
    <div className={`flex flex-col h-full bg-neutral-950 text-neutral-200 text-xs ${isEmbedded ? '' : 'rounded-b-lg'}`}>
      {/* Browser Controls / Address Bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-800 bg-neutral-900/80 shrink-0 select-none">
        <button
          onClick={() => browserService.goBack()}
          disabled={!state.canGoBack}
          className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => browserService.goForward()}
          disabled={!state.canGoForward}
          className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Forward"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => browserService.reload()}
          className={`p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors ${
            state.isLoading ? 'animate-spin text-blue-400' : ''
          }`}
          title="Reload"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Address Input */}
        <form onSubmit={handleNavigate} className="flex-1 flex items-center relative">
          <div className="absolute left-2.5 flex items-center pointer-events-none text-neutral-500">
            {state.url.startsWith('https://') ? (
              <Lock className="w-3 h-3 text-emerald-400" />
            ) : (
              <Globe className="w-3 h-3" />
            )}
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Search web or enter URL (e.g. Kotlin Compose navigation)"
            className="w-full bg-neutral-950 border border-neutral-700/80 rounded-md py-1 pl-8 pr-16 text-xs text-neutral-100 focus:outline-hidden focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-1 px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-medium transition-colors"
          >
            Go
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'view' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Viewport
          </button>
          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'inspector' ? 'bg-neutral-800 text-blue-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code className="w-3 h-3" />
            DOM Text
          </button>
        </div>
      </div>

      {/* Quick Search Suggestions Bar */}
      <div className="px-3 py-1 bg-neutral-900/40 border-b border-neutral-800/60 text-[11px] flex items-center gap-2 overflow-x-auto select-none shrink-0">
        <span className="text-neutral-500 shrink-0">Agent Suggestions:</span>
        <button
          onClick={() => handleQuickSearch('Kotlin Compose navigation')}
          className="px-2 py-0.5 bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 rounded hover:text-white transition-colors shrink-0"
        >
          Kotlin Compose navigation
        </button>
        <button
          onClick={() => handleQuickSearch('Android Gradle 8.0 compileDebugKotlin error')}
          className="px-2 py-0.5 bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 rounded hover:text-white transition-colors shrink-0"
        >
          Gradle assembleDebug errors
        </button>
        <button
          onClick={() => handleQuickSearch('Ollama API documentation localhost:11434')}
          className="px-2 py-0.5 bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 rounded hover:text-white transition-colors shrink-0"
        >
          Ollama API docs
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-hidden bg-neutral-950 flex flex-col">
        {activeTab === 'view' ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-text">
            {state.isLoading ? (
              <div className="space-y-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-neutral-400 font-medium">Navigating to {state.url}...</div>
              </div>
            ) : (
              <div className="max-w-2xl w-full p-6 rounded-lg border border-neutral-800 bg-neutral-900/40 text-left space-y-4">
                <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-100">{state.title}</h3>
                    <p className="text-xs font-mono text-neutral-500 mt-0.5">{state.url}</p>
                  </div>
                  <a
                    href={state.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-neutral-800 transition-colors"
                  >
                    <span>External</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2 text-xs text-neutral-300 leading-relaxed font-sans">
                  <div className="text-neutral-400 font-medium">Active Page Content:</div>
                  <p className="bg-neutral-950 p-3 rounded border border-neutral-800/80 font-mono text-[11px] text-neutral-300 whitespace-pre-wrap">
                    {state.pageContentSummary}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-800/80">
                  <span>Browser Automation Status: Connected</span>
                  <span>Sandbox Security: Isolated</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full p-4 overflow-y-auto select-text font-mono text-[11px] leading-relaxed bg-neutral-950 text-neutral-300 space-y-2">
            <div className="text-neutral-500">// Extracted Document Object Model (DOM) Representation for Agent Parsing</div>
            <div className="text-neutral-500">// Target URL: {state.url}</div>
            <div className="text-neutral-500">// Timestamp: {new Date().toISOString()}</div>
            <pre className="p-3 bg-neutral-900/50 rounded border border-neutral-800 whitespace-pre-wrap text-emerald-400">
{`<!DOCTYPE html>
<html>
  <head>
    <title>${state.title}</title>
    <meta name="target" content="${state.url}" />
  </head>
  <body>
    <main>
      <h1>${state.title}</h1>
      <section class="content">
        <p>${state.pageContentSummary}</p>
      </section>
    </main>
  </body>
</html>`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
