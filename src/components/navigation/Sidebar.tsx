import React, { useEffect, useState } from 'react';
import {
  Plus,
  MessageSquare,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Brain,
  GraduationCap,
  FlaskConical,
  Globe,
  Terminal,
  Activity,
  Settings,
  Bot,
  Circle,
  Cpu,
} from 'lucide-react';
import { aiService } from '../../services/aiService.ts';
import type { Conversation, NavSection, ServiceConnectionStatus } from '../../types/models.ts';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  aiStatus: ServiceConnectionStatus;
  agentStatus: ServiceConnectionStatus;
  onOpenConnectAI?: () => void;
}

interface WorkspaceTool {
  id: NavSection;
  label: string;
  icon: React.ElementType;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  aiStatus,
  agentStatus,
  onOpenConnectAI,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>(aiService.getConversations());
  const [activeConvId, setActiveConvId] = useState<string>(aiService.getActiveConversationId());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    const unsub = aiService.subscribeConversations((convs, activeId) => {
      setConversations(convs);
      setActiveConvId(activeId);
    });
    return () => unsub();
  }, []);

  const handleNewChat = () => {
    aiService.createNewConversation();
    onSelectSection('chat');
  };

  const handleSelectConv = (id: string) => {
    aiService.switchConversation(id);
    onSelectSection('chat');
  };

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingTitle.trim()) {
      aiService.renameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    aiService.deleteConversation(id);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const workspaceTools: WorkspaceTool[] = [
    { id: 'projects', label: 'المشاريع (Projects)', icon: FolderKanban },
    { id: 'knowledge', label: 'قاعدة المعرفة (Knowledge)', icon: Brain },
    { id: 'terminal', label: 'الطرفية (Terminal)', icon: Terminal },
    { id: 'browser', label: 'المتصفح (Browser)', icon: Globe },
    { id: 'agent', label: 'وحدة الوكيل (Agent Console)', icon: Bot },
    { id: 'testing', label: 'الاختبارات (Testing)', icon: FlaskConical },
    { id: 'training', label: 'التدريب المحلي (Training)', icon: GraduationCap },
    { id: 'activity', label: 'سجل النشاط (Activity)', icon: Activity },
    { id: 'settings', label: 'الإعدادات (Settings)', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-neutral-900/95 border-r border-neutral-800/80 flex flex-col justify-between shrink-0 h-[calc(100vh-2.25rem)] select-none">
      {/* Top Section */}
      <div className="flex flex-col flex-1 overflow-hidden p-2.5 space-y-2">
        {/* App Wordmark & AI Status */}
        <div className="px-2 py-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">Personal AI</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              aiStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
            title={aiStatus === 'connected' ? 'Local Ollama Connected' : 'Local AI Disconnected'}
          />
        </div>

        {/* Primary Action: + New Chat */}
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>محادثة جديدة (New Chat)</span>
        </button>

        {/* Search Conversations Input */}
        {conversations.length > 1 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في المحادثات..."
              className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-neutral-200 placeholder:text-neutral-500 focus:outline-hidden focus:border-neutral-700 transition-colors"
            />
          </div>
        )}

        {/* Conversation List Header */}
        <div className="px-2 pt-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          <span>المحادثات ({filteredConversations.length})</span>
          {currentSection !== 'chat' && (
            <button
              onClick={() => onSelectSection('chat')}
              className="text-blue-400 hover:text-blue-300 normal-case font-normal text-[11px] transition-colors"
            >
              العودة للمحادثة
            </button>
          )}
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-6 px-3 text-xs text-neutral-500">
              {searchQuery ? 'لا توجد نتائج مطابقة' : 'لا توجد محادثات بعد'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = currentSection === 'chat' && activeConvId === conv.id;
              const isEditing = editingId === conv.id;

              if (isEditing) {
                return (
                  <form
                    key={conv.id}
                    onSubmit={(e) => handleSaveRename(conv.id, e)}
                    className="flex items-center gap-1 p-1 bg-neutral-800 rounded-lg"
                  >
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      autoFocus
                      className="flex-1 bg-neutral-900 text-xs text-white px-2 py-1 rounded focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                      title="حفظ"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelRename}
                      className="p-1 text-neutral-400 hover:text-white"
                      title="إلغاء"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                );
              }

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConv(conv.id)}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-neutral-800 text-white font-medium shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2 flex-1">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-blue-400' : 'text-neutral-500 group-hover:text-neutral-400'
                      }`}
                    />
                    <span className="truncate">{conv.title}</span>
                  </div>

                  {/* Hover Actions: Rename & Delete */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                    <button
                      onClick={(e) => handleStartRename(conv, e)}
                      className="p-1 hover:text-neutral-200 text-neutral-500 rounded transition-colors"
                      title="إعادة تسمية"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteConv(conv.id, e)}
                      className="p-1 hover:text-rose-400 text-neutral-500 rounded transition-colors"
                      title="حذف المحادثة"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Section: Workspace Tools & System Status */}
      <div className="border-t border-neutral-800/80 bg-neutral-950/40 p-2 space-y-1.5 shrink-0">
        {/* Workspace Tools Accordion */}
        <div className="rounded-lg overflow-hidden">
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-medium">الأدوات والمشاريع (Tools)</span>
            </div>
            {toolsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {toolsOpen && (
            <div className="mt-1 p-1 bg-neutral-900/80 border border-neutral-800 rounded-lg space-y-0.5 max-h-48 overflow-y-auto">
              {workspaceTools.map((tool) => {
                const Icon = tool.icon;
                const isSelected = currentSection === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onSelectSection(tool.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-right transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-300 font-medium'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* System State Row */}
        <div className="px-2 pt-1 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5 truncate">
            <Circle
              className={`w-2 h-2 fill-current shrink-0 ${
                aiStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <span className="truncate">Ollama: qwen3:14b</span>
          </div>

          {aiStatus !== 'connected' && onOpenConnectAI ? (
            <button
              onClick={onOpenConnectAI}
              className="text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2 shrink-0 cursor-pointer"
            >
              اتصال
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 font-mono">Ready</span>
          )}
        </div>
      </div>
    </aside>
  );
};

