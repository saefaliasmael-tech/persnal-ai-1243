import React, { useState } from 'react';
import { Brain, File, Folder, X } from 'lucide-react';
import { desktopBridge } from '../../services/desktopBridge.ts';
import { knowledgeService } from '../../services/knowledgeService.ts';

interface AddKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddKnowledgeModal: React.FC<AddKnowledgeModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [path, setPath] = useState('C:\\Users\\Developer\\Documents\\');
  const [type, setType] = useState<'file' | 'folder'>('file');
  const [category, setCategory] = useState<'code' | 'text' | 'docs' | 'pdf' | 'other'>('docs');

  if (!isOpen) return null;

  const handleBrowse = async () => {
    if (type === 'folder') {
      const selected = await desktopBridge.selectFolder(path);
      if (selected) {
        setPath(selected);
        const folderName = selected.split(/\\|\//).pop() || '';
        if (folderName && !name) setName(folderName);
      }
    } else {
      const selected = await desktopBridge.selectFiles();
      if (selected && selected.length > 0) {
        setPath(selected[0]);
        const fileName = selected[0].split(/\\|\//).pop() || '';
        if (fileName && !name) setName(fileName);
        if (fileName.endsWith('.pdf')) setCategory('pdf');
        else if (fileName.match(/\.(ts|js|py|kt|java|cpp)$/)) setCategory('code');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;

    await knowledgeService.addItem({
      name: name.trim(),
      path: path.trim(),
      type,
      category,
      sizeBytes: Math.floor(Math.random() * 5000000) + 50000,
      itemCount: Math.floor(Math.random() * 40) + 5,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border border-neutral-700/80 bg-neutral-900 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2 text-neutral-100 font-semibold text-sm">
            <Brain className="w-4 h-4 text-purple-400" />
            <span>Add Data to Knowledge Base (RAG)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-[11px] text-neutral-400 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="font-semibold text-neutral-200">Note: </span>
            Knowledge items are parsed, chunked, and embedded into the local vector index for context retrieval.
            This is separate from model training.
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Source Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('file')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-medium transition-colors ${
                  type === 'file'
                    ? 'border-purple-500/60 bg-purple-950/30 text-purple-300'
                    : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <File className="w-4 h-4" />
                <span>Single File</span>
              </button>

              <button
                type="button"
                onClick={() => setType('folder')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-medium transition-colors ${
                  type === 'folder'
                    ? 'border-purple-500/60 bg-purple-950/30 text-purple-300'
                    : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <Folder className="w-4 h-4" />
                <span>Entire Folder</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Label / Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jetpack Compose Navigation Guide"
              required
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">File / Folder Path</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                required
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-purple-500"
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium border border-neutral-700 transition-colors shrink-0"
              >
                Browse
              </button>
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Content Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 focus:outline-hidden focus:border-purple-500"
            >
              <option value="code">Source Code (.ts, .kt, .py, .java)</option>
              <option value="docs">Markdown Documentation (.md)</option>
              <option value="pdf">PDF Manual / Whitepaper (.pdf)</option>
              <option value="text">Plain Text (.txt, .json)</option>
              <option value="other">Other Supported Project Data</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
            >
              Index Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
