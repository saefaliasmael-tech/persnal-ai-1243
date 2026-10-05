import React, { useEffect, useState } from 'react';
import {
  Brain,
  Plus,
  FileText,
  Folder,
  Trash2,
  RefreshCw,
  Database,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { knowledgeService } from '../../services/knowledgeService.ts';
import type { KnowledgeItem } from '../../types/models.ts';

interface KnowledgeViewProps {
  onOpenAddKnowledge: () => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({ onOpenAddKnowledge }) => {
  const [items, setItems] = useState<KnowledgeItem[]>(knowledgeService.getItems());
  const [stats, setStats] = useState(knowledgeService.getStorageStats());

  useEffect(() => {
    const unsub = knowledgeService.subscribe((newItems) => {
      setItems(newItems);
      setStats(knowledgeService.getStorageStats());
    });
    return () => unsub();
  }, []);

  const handleReindex = (id: string) => {
    knowledgeService.reindexItem(id);
  };

  const handleRemove = (id: string) => {
    knowledgeService.removeItem(id);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Knowledge Base & RAG Index
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Local retrieval-augmented generation (RAG) system. Documents and code are chunked into vector embeddings.
          </p>
        </div>

        <button
          onClick={onOpenAddKnowledge}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Data
        </button>
      </div>

      {/* Storage & Indexing Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-neutral-800 text-purple-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Indexed Sources</div>
            <div className="text-lg font-bold text-neutral-100 font-mono tabular-nums">
              {stats.totalItems} Sources
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-neutral-800 text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Vector Store Adapter</div>
            <div className="text-xs font-semibold text-neutral-200">
              Qdrant / Chroma Ready
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-neutral-800 text-emerald-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Vector Storage Used</div>
            <div className="text-lg font-bold text-neutral-100 font-mono tabular-nums">
              {formatBytes(stats.totalBytes)}
            </div>
          </div>
        </div>
      </div>

      {/* Distinction Banner */}
      <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/40 text-xs text-neutral-400 leading-relaxed font-sans">
        <strong className="text-neutral-200">Knowledge Architecture: </strong>
        Knowledge indexing performs semantic embedding and vector chunking for contextual prompt retrieval.
        This does NOT modify model weights and is completely distinct from Model Training.
      </div>

      {/* Knowledge Items Table */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">Indexed Knowledge Items</h2>
          <span className="text-xs text-neutral-500 font-mono">{items.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 font-medium font-mono text-[11px]">
                <th className="pb-2.5 pl-2">Source / Name</th>
                <th className="pb-2.5">Category</th>
                <th className="pb-2.5">Disk Size</th>
                <th className="pb-2.5">Chunks</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5">Added Date</th>
                <th className="pb-2.5 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3 pl-2 max-w-xs truncate">
                    <div className="flex items-center gap-2">
                      {item.type === 'folder' ? (
                        <Folder className="w-4 h-4 text-purple-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-neutral-200 truncate">{item.name}</div>
                        <div className="text-[10px] font-mono text-neutral-500 truncate" title={item.path}>
                          {item.path}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 capitalize text-neutral-400 font-mono text-[11px]">
                    {item.category}
                  </td>
                  <td className="py-3 font-mono text-neutral-400 text-[11px]">
                    {formatBytes(item.sizeBytes)}
                  </td>
                  <td className="py-3 font-mono text-neutral-400 text-[11px]">
                    {item.itemCount}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                        item.status === 'completed'
                          ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20'
                          : item.status === 'indexing'
                          ? 'text-blue-400 bg-blue-950/40 border border-blue-500/20 animate-pulse'
                          : item.status === 'processing'
                          ? 'text-amber-400 bg-amber-950/40 border border-amber-500/20'
                          : 'text-rose-400 bg-rose-950/40 border border-rose-500/20'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-neutral-500 text-[11px]">
                    {item.addedAt}
                  </td>
                  <td className="py-3 text-right pr-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleReindex(item.id)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                        title="Re-index embeddings"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                        title="Delete from knowledge index"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
