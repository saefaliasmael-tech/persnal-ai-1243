import React, { useEffect, useState } from 'react';
import {
  Activity,
  Filter,
  Search,
  Trash2,
  Download,
  Terminal,
  Globe,
  FileCode,
  Hammer,
  FlaskConical,
  AlertTriangle,
  Bot,
  Shield,
} from 'lucide-react';
import { activityService } from '../../services/activityService.ts';
import type { ActivityEvent } from '../../types/models.ts';

type FilterTab = 'all' | 'agent' | 'terminal' | 'browser' | 'files' | 'build' | 'tests' | 'errors';

export const ActivityView: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>(activityService.getEvents());
  const [currentFilter, setCurrentFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = activityService.subscribe((list) => {
      setEvents(list);
    });
    return () => unsub();
  }, []);

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All Events' },
    { id: 'agent', label: 'Agent' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'browser', label: 'Browser' },
    { id: 'files', label: 'Files' },
    { id: 'build', label: 'Build' },
    { id: 'tests', label: 'Tests' },
    { id: 'errors', label: 'Errors' },
  ];

  const filteredEvents = events.filter((evt) => {
    if (currentFilter === 'errors') {
      if (evt.status !== 'failed' && evt.category !== 'errors') return false;
    } else if (currentFilter !== 'all' && evt.category !== currentFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        evt.title.toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q) ||
        (evt.details && evt.details.toLowerCase().includes(q)) ||
        (evt.command && evt.command.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleClear = () => {
    activityService.clearEvents();
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `personal_ai_activity_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'agent':
        return <Bot className="w-4 h-4 text-purple-400" />;
      case 'terminal':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'browser':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'files':
        return <FileCode className="w-4 h-4 text-amber-400" />;
      case 'build':
        return <Hammer className="w-4 h-4 text-orange-400" />;
      case 'tests':
        return <FlaskConical className="w-4 h-4 text-teal-400" />;
      default:
        return <Shield className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Activity Center & System Audit Log
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Transparent event log recording all agent actions, terminal processes, browser navigations, file edits, and permission decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Log
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-400 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Segmented Filter Controls */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentFilter(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                currentFilter === tab.id
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity events..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-1.5 pl-8 pr-3 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">Audit Events</h2>
          <span className="text-xs text-neutral-500 font-mono">
            {filteredEvents.length} matching events
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-xs space-y-2 border border-dashed border-neutral-800 rounded-lg">
            <Activity className="w-8 h-8 mx-auto text-neutral-600" />
            <p className="font-medium text-neutral-400">No activity events found.</p>
            <p className="text-[11px] text-neutral-500">Events will appear here as tasks run.</p>
          </div>
        ) : (
          <div className="space-y-2 select-text">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-950/80 text-xs hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-neutral-900 border border-neutral-800 mt-0.5 shrink-0">
                    {getCategoryIcon(evt.category)}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200">{evt.title}</span>
                      <span className="text-neutral-600 font-mono">·</span>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">
                        {evt.category}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                          evt.status === 'completed'
                            ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20'
                            : evt.status === 'in_progress'
                            ? 'text-blue-400 bg-blue-950/40 border border-blue-500/20 animate-pulse'
                            : evt.status === 'waiting_permission'
                            ? 'text-amber-400 bg-amber-950/40 border border-amber-500/20'
                            : 'text-rose-400 bg-rose-950/40 border border-rose-500/20'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>

                    <p className="text-neutral-400 text-xs font-sans leading-relaxed">
                      {evt.description}
                    </p>

                    {evt.details && (
                      <div className="font-mono text-[11px] text-neutral-500 bg-neutral-900/60 p-1.5 rounded mt-1 border border-neutral-800/60 break-all">
                        {evt.details}
                      </div>
                    )}
                    {evt.command && (
                      <div className="font-mono text-[11px] text-emerald-400 bg-neutral-900/80 p-1.5 rounded mt-1 border border-neutral-800/60">
                        &gt; {evt.command}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 pl-4 space-y-0.5">
                  <div className="font-mono text-[11px] text-neutral-400 tabular-nums">
                    {evt.timestamp}
                  </div>
                  <div className="font-mono text-[10px] text-neutral-600">
                    {evt.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
