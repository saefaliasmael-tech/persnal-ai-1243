import React, { useEffect, useState } from 'react';
import {
  FolderKanban,
  FolderPlus,
  Folder,
  Edit2,
  Trash2,
  Check,
  GitBranch,
  FileCode,
  Calendar,
  Sparkles,
  Layers,
} from 'lucide-react';
import { projectService } from '../../services/projectService.ts';
import type { ProjectMetadata } from '../../types/models.ts';

interface ProjectsViewProps {
  onOpenNewProjectModal: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onOpenNewProjectModal }) => {
  const [projects, setProjects] = useState<ProjectMetadata[]>(projectService.getProjects());
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(projectService.getActiveProject());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => {
    const unsub = projectService.subscribe((list, active) => {
      setProjects(list);
      setActiveProject(active);
    });
    return () => unsub();
  }, []);

  const handleSetActive = (id: string) => {
    projectService.setActiveProject(id);
  };

  const handleStartEdit = (p: ProjectMetadata) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDesc(p.description);
  };

  const handleSaveEdit = async (id: string) => {
    await projectService.updateProject(id, {
      name: editName.trim(),
      description: editDesc.trim(),
    });
    setEditingId(null);
  };

  const handleRemove = async (id: string, name: string) => {
    if (confirm(`Remove "${name}" from Personal AI workspace?\n\n(Your actual disk files will NOT be deleted).`)) {
      await projectService.removeProject(id);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Project Manager
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage your local Windows codebases. Real project metadata and frameworks are discovered automatically.
          </p>
        </div>

        <button
          onClick={onOpenNewProjectModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm self-start md:self-auto"
        >
          <FolderPlus className="w-4 h-4" />
          Add Existing Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => {
          const isActive = activeProject?.id === proj.id;
          const isEditing = editingId === proj.id;

          return (
            <div
              key={proj.id}
              className={`p-5 rounded-xl border transition-all ${
                isActive
                  ? 'border-blue-500/50 bg-neutral-900/80 shadow-md'
                  : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
              }`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-300"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 rounded bg-neutral-800 text-xs text-neutral-300 hover:bg-neutral-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(proj.id)}
                      className="px-3 py-1 rounded bg-blue-600 text-xs text-white font-medium hover:bg-blue-500"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        <h3 className="text-sm font-semibold text-neutral-100">{proj.name}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-500/30 font-semibold">
                            ACTIVE
                          </span>
                        )}
                        {proj.framework && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {proj.framework}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-sans">
                        {proj.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(proj)}
                        className="p-1.5 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                        title="Rename / Edit details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(proj.id, proj.name)}
                        className="p-1.5 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                        title="Remove project entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata & File Info */}
                  <div className="space-y-2 p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs font-mono">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="text-neutral-500">Root Path:</span>
                      <span className="text-neutral-300 truncate max-w-[280px]" title={proj.rootPath || proj.path}>
                        {proj.rootPath || proj.path}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="flex items-center gap-1.5 text-neutral-500">
                        <GitBranch className="w-3 h-3" /> Branch:
                      </span>
                      <span className="text-neutral-300">{proj.gitBranch || 'main'}</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="flex items-center gap-1.5 text-neutral-500">
                        <FileCode className="w-3 h-3" /> Files:
                      </span>
                      <span className="text-neutral-300">{proj.fileCount} items</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="flex items-center gap-1.5 text-neutral-500">
                        <Calendar className="w-3 h-3" /> Modified:
                      </span>
                      <span className="text-neutral-300">{proj.lastModified}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {proj.languages.map((lang) => (
                        <span
                          key={lang}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>

                    {!isActive ? (
                      <button
                        onClick={() => handleSetActive(proj.id)}
                        className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded transition-colors"
                      >
                        Set as Active
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Current Target
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
