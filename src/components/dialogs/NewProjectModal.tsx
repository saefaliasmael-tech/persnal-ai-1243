import React, { useState } from 'react';
import { FolderPlus, Folder, X, Sparkles, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { desktopBridge } from '../../services/desktopBridge.ts';
import { projectService } from '../../services/projectService.ts';
import type { ProjectDiscoveryInfo } from '../../types/models.ts';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [path, setPath] = useState('C:\\Users\\saif\\Desktop\\personal-ai');
  const [description, setDescription] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [languages, setLanguages] = useState('TypeScript, React');
  const [discoveryInfo, setDiscoveryInfo] = useState<ProjectDiscoveryInfo | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  if (!isOpen) return null;

  const performDiscovery = async (folderPath: string) => {
    if (!folderPath.trim()) return;
    setIsDiscovering(true);
    try {
      const info = await projectService.discoverProject(folderPath);
      setDiscoveryInfo(info);
      if (info.validationStatus === 'valid') {
        if (!name || name === 'Workspace Project') {
          setName(info.name);
        }
        if (info.languages.length > 0) {
          setLanguages(info.languages.join(', '));
        }
        if (info.framework) {
          setDescription(`${info.projectType} (${info.framework})`);
        } else {
          setDescription(info.projectType);
        }
      }
    } catch {
      // Safe fallback
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleBrowseFolder = async () => {
    const selected = await desktopBridge.selectFolder(path);
    if (selected) {
      setPath(selected);
      await performDiscovery(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;

    await projectService.addProject({
      name: name.trim(),
      path: path.trim(),
      rootPath: path.trim(),
      description: description.trim() || 'Local software project workspace.',
      gitBranch: gitBranch.trim() || 'main',
      fileCount: discoveryInfo?.fileCount || 25,
      languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
      projectType: discoveryInfo?.projectType,
      framework: discoveryInfo?.framework,
      markerFiles: discoveryInfo?.markerFiles,
      validationStatus: discoveryInfo?.validationStatus || 'valid',
      lastDiscovered: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border border-neutral-700/80 bg-neutral-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2 text-neutral-100 font-semibold text-sm">
            <FolderPlus className="w-4 h-4 text-blue-400" />
            <span>Add Existing Project</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Project Folder (Windows Root Path)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => {
                  setPath(e.target.value);
                  performDiscovery(e.target.value);
                }}
                required
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium border border-neutral-700 transition-colors shrink-0"
              >
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                Browse
              </button>
            </div>
          </div>

          {/* Real Discovery Banner */}
          {discoveryInfo && (
            <div
              className={`p-3 rounded-lg border text-[11px] space-y-1.5 ${
                discoveryInfo.validationStatus === 'valid'
                  ? 'bg-blue-950/30 border-blue-800/60 text-blue-200'
                  : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <div className="flex items-center gap-1.5">
                  {discoveryInfo.validationStatus === 'valid' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>
                    {discoveryInfo.validationStatus === 'valid'
                      ? 'Project Discovered Successfully'
                      : `Validation: ${discoveryInfo.validationStatus}`}
                  </span>
                </div>
                {discoveryInfo.framework && (
                  <span className="px-2 py-0.5 rounded bg-blue-900/60 border border-blue-700/60 text-[10px] text-blue-300">
                    {discoveryInfo.framework}
                  </span>
                )}
              </div>

              {discoveryInfo.validationStatus === 'valid' && (
                <div className="flex items-center gap-2 text-[10px] text-neutral-400 flex-wrap">
                  <span>Type: <strong className="text-neutral-200">{discoveryInfo.projectType}</strong></span>
                  {discoveryInfo.markerFiles.length > 0 && (
                    <span>• Markers: <strong className="text-neutral-300">{discoveryInfo.markerFiles.join(', ')}</strong></span>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal AI"
              required
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief summary of this codebase..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1.5">Git Branch</label>
              <input
                type="text"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1.5">Languages (comma separated)</label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="TypeScript, React"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>
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
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              Add Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
