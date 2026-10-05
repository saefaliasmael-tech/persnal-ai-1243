import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  PlusCircle,
  Cpu,
  Copy,
  Check,
  AlertCircle,
  Bot,
  User,
  Square,
  Sparkles,
  Paperclip,
  X,
  Plus,
  Mic,
  MicOff,
  FolderKanban,
  FileCode,
  Archive,
  Film,
  Image as ImageIcon,
  File,
  ChevronDown,
  Layers,
  Wrench,
  Pencil,
} from 'lucide-react';
import { aiService } from '../../services/aiService.ts';
import { agentService, AgentRunState } from '../../services/agentService.ts';
import { projectService } from '../../services/projectService.ts';
import { desktopBridge } from '../../services/desktopBridge.ts';
import { AgentProgressCard } from '../chat/AgentProgressCard.tsx';
import type {
  AIProviderConfig,
  ChatAttachment,
  ChatMessage,
  Conversation,
  ProjectMetadata,
  ServiceConnectionStatus,
} from '../../types/models.ts';

interface ChatViewProps {
  onOpenConnectAI: () => void;
  onOpenTerminalPopup?: () => void;
  onOpenBrowserPopup?: () => void;
}

type ExecutionMode = 'auto' | 'chat' | 'agent';

/**
 * Intelligent Intent Detection:
 * Determines if a user prompt is an actionable task requiring OS/project tools
 * or a conversational/conceptual query.
 */
function isAgentActionRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Explicit action indicators in Arabic
  const arabicActionPatterns = [
    /\b(ابنِ|ابني|بناء|بني)\b/,
    /\b(شغل|شغّل|تشغيل)\b/,
    /\b(افحص|فحص|تفحص|تحقق|تفقد)\b/,
    /\b(اقرأ|اقرا|قراءة|افتح الملف|أداة الملفات)\b/,
    /\b(عدل|تعديل|غير|تغيير|صلح|أصلح|صلّح|إصلاح)\b/,
    /\b(أنشئ|انشئ|إنشاء|اعمل ملف|أضف ملف)\b/,
    /\b(احذف|حذف|مسح|إزالة)\b/,
    /\b(تيرمينال|طرفية|أمر|أوامر|شيل|كونسول)\b/,
    /\b(اختبر|اختبار|افحص الاختبارات)\b/,
    /\b(ابحث في الويب|ابحث على الإنترنت|تصفح)\b/,
    /\b(مستودع|جيت|كوميت|برانش)\b/,
    /\b(تثبيت|نزل حزمة|نصب)\b/,
    /\b(نفذ|تنفيذ|مهمة|قم بـ)\b/,
    /\b(حدد ملف|محتوى ملف|ملف chat|ملف agent|ملف ollama)\b/,
  ];

  // Explicit action indicators in English
  const englishActionPatterns = [
    /\b(build|compile|bundle)\b/,
    /\b(run|execute|start process)\b/,
    /\b(inspect|analyze|check project|check files)\b/,
    /\b(read|read file|open file|cat |view file)\b/,
    /\b(fix|repair|patch|refactor|modify|edit file)\b/,
    /\b(create file|write file|new file|make file|touch)\b/,
    /\b(delete file|remove file|rm)\b/,
    /\b(terminal|command|powershell|cmd|bash|shell)\b/,
    /\b(test|run tests|unit test|jest|pytest)\b/,
    /\b(search web|search internet|google|browse)\b/,
    /\b(git status|git commit|git branch|git clone)\b/,
    /\b(npm install|pip install|gradle|cargo)\b/,
    /\b(agent|task|autonomous|do task|file tool|file_tool)\b/,
    /\b(package\.json|app\.tsx|agentservice\.ts|tsconfig\.json)\b/,
  ];

  // Explicit File Tool and Project inspection patterns
  if (
    /file_tool|file tool|أداة الملفات|أداة ملفات|اداة الملفات|افحص المشروع|فحص المشروع|اقرأ هذا الملف|افحص هذا الملف|حلل هذا الكود|عدل هذا الملف/i.test(
      lower
    )
  ) {
    return true;
  }

  // Direct path or file mention check (e.g. C:\Users\... or package.json, App.tsx, agent.ts, src)
  if (
    /[a-zA-Z]:[\\/]|package\.json|app\.tsx|agent\.ts|ollama-stream\.ts|\bsrc\b|\.(?:ts|tsx|js|jsx|json|md|bat)/i.test(
      text
    )
  ) {
    if (/اقرأ|اقرا|افحص|فحص|تحقق|حلل|عدل|عدّل|read|inspect|check|open|show|محتوى|استخدم/i.test(lower)) {
      return true;
    }
  }

  // Pure questions/explanations should NOT trigger agent unless requested to take action
  const isPureQuestion =
    /^(ما هو|ما هي|كيف|لماذا|اشرح|وضح|هل يمكنك شرح|هل|ما الفرق|what is|how does|why is|explain|tell me about)\b/i.test(lower) &&
    !/(ثم نفذ|ونفذ|واعمل|واكتب|وقم بـ|and run|and execute|and create|and build|استخدم|use)/i.test(lower);

  if (isPureQuestion) return false;

  for (const pattern of arabicActionPatterns) {
    if (pattern.test(lower)) return true;
  }
  for (const pattern of englishActionPatterns) {
    if (pattern.test(lower)) return true;
  }

  return false;
}

export const ChatView: React.FC<ChatViewProps> = ({
  onOpenConnectAI,
  onOpenTerminalPopup,
  onOpenBrowserPopup,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(aiService.getMessages());
  const [activeConv, setActiveConv] = useState<Conversation>(aiService.getActiveConversation());
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ServiceConnectionStatus>(aiService.getStatus());
  const [config, setConfig] = useState<AIProviderConfig>(aiService.getConfig());
  const [agentRunState, setAgentRunState] = useState<AgentRunState>(agentService.getRunState());
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(projectService.getActiveProject());

  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [streamingThinking, setStreamingThinking] = useState<string | null>(null);
  const [isAgentRunningThisTask, setIsAgentRunningThisTask] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Composer settings
  const [mode, setMode] = useState<ExecutionMode>('auto');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micStatusMsg, setMicStatusMsg] = useState<string | null>(null);

  // Title edit mode
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const unsubAi = aiService.subscribe((newStatus, newConfig, newMsgs) => {
      setStatus(newStatus);
      setConfig(newConfig);
      setMessages(newMsgs);
    });

    const unsubConvs = aiService.subscribeConversations((convs, activeId) => {
      const current = convs.find((c) => c.id === activeId);
      if (current) {
        setActiveConv(current);
        setMessages([...current.messages]);
      }
    });

    const unsubAgent = agentService.subscribe((state) => {
      setAgentRunState(state);
    });

    const unsubProj = projectService.subscribe((_, active) => {
      setActiveProject(active);
    });

    return () => {
      unsubAi();
      unsubConvs();
      unsubAgent();
      unsubProj();
    };
  }, []);

  // During streaming, use 'auto' scroll so UI doesn't stutter; otherwise 'smooth'
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: streamingContent !== null ? 'auto' : 'smooth' });
    }
  }, [messages, isLoading, streamingContent, isAgentRunningThisTask]);

  // Click outside menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Escape to abort active stream/task
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLoading) {
        handleStop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading]);

  const handleStop = () => {
    if (agentService.isBusy()) {
      agentService.stopTask();
    }
    if (aiService.isStreaming()) {
      aiService.abortStream();
    }
    setIsLoading(false);
    setStreamingContent(null);
    setIsAgentRunningThisTask(false);
  };

  // Speech-to-text via browser/Chromium Web Speech API
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicStatusMsg('التعرف على الصوت غير مدعوم في هذه البيئة');
      setTimeout(() => setMicStatusMsg(null), 3000);
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setMicStatusMsg('جاري الاستماع... تكلم الآن');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setMicStatusMsg('تعذر التسجيل');
        setTimeout(() => setMicStatusMsg(null), 2500);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setTimeout(() => setMicStatusMsg(null), 1500);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleSelectFiles = async (category: 'all' | 'image' | 'code' | 'zip' | 'video') => {
    setShowAttachMenu(false);
    let filters: { name: string; extensions: string[] }[] | undefined;

    if (category === 'image') {
      filters = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }];
    } else if (category === 'code') {
      filters = [{ name: 'Code & Text', extensions: ['ts', 'tsx', 'js', 'json', 'py', 'kt', 'gradle', 'md', 'txt'] }];
    } else if (category === 'zip') {
      filters = [{ name: 'Archives', extensions: ['zip', 'tar', 'gz'] }];
    } else if (category === 'video') {
      filters = [{ name: 'Videos', extensions: ['mp4', 'webm', 'mov'] }];
    }

    try {
      const selected = await desktopBridge.selectFiles({ filters });
      if (selected && selected.length > 0) {
        const newAtts: ChatAttachment[] = selected.map((filePath) => {
          const name = filePath.split(/[\\/]/).pop() || filePath;
          return { name, path: filePath, type: category };
        });
        setAttachments((prev) => [...prev, ...newAtts]);
      }
    } catch {
      // ignore
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userText = input.trim();
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);

    // 1. Add User Message
    const userMsg = await aiService.addMessage({
      role: 'user',
      content: userText,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    });

    // 2. Intelligent Decision: Agent Task vs Conversational Chat
    const shouldExecuteAsAgent =
      mode === 'agent' || (mode === 'auto' && isAgentActionRequest(userText));

    if (shouldExecuteAsAgent) {
      // ==========================================
      // EXECUTE VIA AUTONOMOUS AGENT ENGINE
      // ==========================================
      setIsLoading(true);
      setIsAgentRunningThisTask(true);

      try {
        await agentService.startTask(userText, activeProject);

        const endState = agentService.getRunState();
        if (endState.status === 'completed') {
          const finalResult =
            endState.finalResponse ||
            `تم تنفيذ المهمة بنجاح (${endState.currentStep} خطوة تنفيذية).`;
          await aiService.addMessage({
            role: 'assistant',
            content: finalResult,
            provider: 'Personal AI Agent',
            model: config.selectedModel,
            agentSummary: `تم إنجاز ${endState.currentStep} خطوة بنجاح`,
          });
        } else if (endState.status === 'stopped') {
          await aiService.addMessage({
            role: 'assistant',
            content: 'تم إيقاف المهمة استجابة لطلبك.',
            provider: 'Personal AI Agent',
            model: config.selectedModel,
          });
        } else if (endState.status === 'failed') {
          await aiService.addMessage({
            role: 'assistant',
            content: `تعذر إكمال المهمة: ${endState.errorMessage || 'حدث خطأ أثناء التنفيذ'}.`,
            provider: 'Personal AI Agent',
            model: config.selectedModel,
          });
        }
      } catch (err: any) {
        await aiService.addMessage({
          role: 'assistant',
          content: `خطأ أثناء تنفيذ المهمة: ${err.message || 'خطأ غير معروف'}`,
          provider: 'Personal AI Agent',
          model: config.selectedModel,
        });
      } finally {
        setIsAgentRunningThisTask(false);
        setIsLoading(false);
      }
    } else {
      // ==========================================
      // CHAT STREAMING VIA LOCAL OLLAMA (qwen3:14b)
      // ==========================================
      if (status !== 'connected') {
        setIsLoading(true);
        setTimeout(async () => {
          setIsLoading(false);
          await aiService.addMessage({
            role: 'assistant',
            content:
              'تعذر الاتصال بـ Ollama المحلي على http://127.0.0.1:11434.\n\nتأكد من تشغيل Ollama على جهازك (Windows 10) وتنزيل الموديل qwen3:14b:\n1. افتح نافذة الأوامر وشغّل:\n   ollama run qwen3:14b\n2. انقر على "اتصال" بالأعلى لإعادة الفحص والاتصال.\n\n(ملاحظة: هذا التطبيق لا يستخدم أي نماذج سحابية أو محاكاة وهمية؛ الاتصال محلي وخاص 100%).',
            provider: 'Ollama (Local)',
            model: 'not_connected',
          });
        }, 300);
        return;
      }

      setIsLoading(true);
      setStreamingContent('');
      setStreamingThinking(null);
      let assistantMsgContent = '';
      let assistantThinkingContent = '';

      try {
        await aiService.streamChat(
          [...messages, userMsg],
          (chunk) => {
            assistantMsgContent += chunk;
            setStreamingContent(assistantMsgContent);
          },
          config.selectedModel,
          (thinkingChunk) => {
            assistantThinkingContent += thinkingChunk;
            setStreamingThinking(assistantThinkingContent);
          }
        );

        if (assistantMsgContent.trim() || assistantThinkingContent.trim()) {
          await aiService.addMessage({
            role: 'assistant',
            content: assistantMsgContent,
            thinking: assistantThinkingContent.trim() || undefined,
            provider: 'Ollama',
            model: config.selectedModel,
          });
        }
      } catch (err: any) {
        if (assistantMsgContent.trim() || assistantThinkingContent.trim()) {
          await aiService.addMessage({
            role: 'assistant',
            content: assistantMsgContent,
            thinking: assistantThinkingContent.trim() || undefined,
            provider: 'Ollama',
            model: config.selectedModel,
          });
        } else {
          await aiService.addMessage({
            role: 'assistant',
            content: `Error from local Ollama (${config.selectedModel}): ${err.message}`,
            provider: 'Ollama',
            model: config.selectedModel,
          });
        }
      } finally {
        setStreamingContent(null);
        setStreamingThinking(null);
        setIsLoading(false);
      }
    }
  };

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSaveTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleText.trim()) {
      aiService.renameConversation(activeConv.id, titleText.trim());
    }
    setIsEditingTitle(false);
  };

  const quickPrompts = [
    {
      title: '🔍 فحص بنية المشروع',
      prompt: 'افحص بنية المشروع الحالية واكتشف أي ملفات مفقودة أو مشاكل في التبعيات',
      mode: 'agent' as ExecutionMode,
    },
    {
      title: '⚙️ بناء المشروع',
      prompt: 'ابنِ المشروع وتحقق من صحة الكود ونجاح أوامر البناء',
      mode: 'agent' as ExecutionMode,
    },
    {
      title: '🧪 اختبارات الكود',
      prompt: 'شغّل حزم الاختبارات البرمجية وافحص أي أخطاء أو إخفاقات',
      mode: 'agent' as ExecutionMode,
    },
    {
      title: '💡 استفسار وتحسين كود',
      prompt: 'كيف أنظم بنية الكود بشكل نموذجي في مشروع Windows / Electron؟',
      mode: 'chat' as ExecutionMode,
    },
  ];

  return (
    <div className="flex-1 h-full flex flex-col bg-neutral-950 text-neutral-100">
      {/* Top Bar: Conversation Title, Model & Project status */}
      <div className="px-5 py-2.5 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Editable Conversation Title */}
          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} className="flex items-center gap-1.5">
              <input
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                autoFocus
                className="bg-neutral-800 text-xs text-white px-2 py-1 rounded border border-neutral-700 focus:outline-hidden"
              />
              <button type="submit" className="p-1 text-emerald-400 hover:text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
              setTitleText(activeConv.title);
              setIsEditingTitle(true);
            }}>
              <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
              <h2 className="text-sm font-semibold text-neutral-100 truncate max-w-xs font-sans">
                {activeConv.title}
              </h2>
              <Pencil className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          <span className="text-neutral-700">·</span>

          {/* Model indicator */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>النموذج:</span>
            <span className="font-mono text-neutral-200">
              {status === 'connected' ? config.selectedModel : 'qwen3:14b'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ml-1 ${
                status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              title={status === 'connected' ? 'Ollama متصل' : 'Ollama غير متصل'}
            />
          </div>

          {/* Active project badge */}
          {activeProject && (
            <>
              <span className="text-neutral-700">·</span>
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate max-w-[140px] text-neutral-300">{activeProject.name}</span>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {status !== 'connected' && (
            <button
              onClick={onOpenConnectAI}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>اتصال بـ Ollama</span>
            </button>
          )}

          <button
            onClick={() => aiService.createNewConversation()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
            title="محادثة جديدة"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>جديدة</span>
          </button>

          <button
            onClick={() => aiService.clearMessages()}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="مسح الرسائل"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Disconnection Notice Banner */}
      {status !== 'connected' && (
        <div className="px-5 py-2 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-neutral-200">الذكاء الاصطناعي المحلي غير متصل.</strong> تأكد من تشغيل Ollama على جهازك (Windows 10) بنموذج <code className="font-mono text-blue-300">qwen3:14b</code>.
            </span>
          </div>
          <button
            onClick={onOpenConnectAI}
            className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-2 ml-4 shrink-0 cursor-pointer"
          >
            ربط Ollama
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 select-text">
        {messages.length === 0 ? (
          /* Empty State: ChatGPT / DeepSeek / Gemini Style */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-3xl mx-auto select-none">
            <div className="space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-blue-400 mx-auto shadow-md">
                <Bot className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
                Personal AI
              </h1>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto font-sans">
                مساعدك البرمجي الذكي والمحلي على Windows 10. يفهم طلبك وينفذه تلقائياً بنموذج <code className="text-blue-300 font-mono">qwen3:14b</code> وبخصوصية تامة 100%.
              </p>
            </div>

            {/* Quick Action Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-right">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(item.prompt);
                    setMode(item.mode);
                  }}
                  className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/70 text-right transition-all group cursor-pointer shadow-xs"
                >
                  <div className="text-xs font-semibold text-neutral-200 group-hover:text-blue-300 transition-colors font-sans">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1 line-clamp-2 font-sans">
                    {item.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-900 border border-neutral-800 text-blue-400'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Content Bubble */}
                <div className="space-y-1 max-w-[85%]">
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-xs'
                    }`}
                  >
                    {/* Attachments pills if any */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-blue-500/40">
                        {msg.attachments.map((att, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-700/80 text-[10px] text-white"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Thinking Process Disclosure if present */}
                    {msg.thinking && (
                      <details className="mb-3 rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-2.5 group">
                        <summary className="text-[11px] font-medium text-neutral-400 cursor-pointer select-none flex items-center gap-1.5 hover:text-blue-300 transition-colors">
                          <span className="text-xs">🧠</span>
                          <span>سلسلة التفكير ({msg.model || 'qwen3:14b'})</span>
                        </summary>
                        <div className="mt-2 pt-2 border-t border-neutral-800/50 text-[11px] font-mono text-neutral-400 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pl-1">
                          {msg.thinking}
                        </div>
                      </details>
                    )}

                    <div className="whitespace-pre-wrap font-sans text-[13px]">{msg.content}</div>

                    {!isUser && (
                      <div className="pt-2 mt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                        <span>{msg.provider || 'Personal AI'} · {msg.model || 'qwen3:14b'}</span>
                        <button
                          onClick={() => handleCopyCode(msg.content, msg.id)}
                          className="flex items-center gap-1 hover:text-neutral-300 transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-[10px] font-mono text-neutral-500 px-1 ${
                      isUser ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Live Autonomous Agent Progress Card */}
        {isAgentRunningThisTask && (
          <div className="max-w-3xl mr-auto animate-in fade-in duration-150">
            <AgentProgressCard
              runState={agentRunState}
              onOpenTerminalPopup={onOpenTerminalPopup}
              onOpenBrowserPopup={onOpenBrowserPopup}
            />
          </div>
        )}

        {/* Live Streaming Response from Ollama */}
        {streamingContent !== null && (
          <div className="flex gap-3 max-w-3xl mr-auto animate-in fade-in duration-100">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-blue-400 mt-1">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>

            <div className="space-y-1 flex-1">
              <div className="p-4 rounded-2xl text-xs leading-relaxed bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-xs">
                {/* Live Thinking stream if any */}
                {streamingThinking && (
                  <div className="mb-3 rounded-xl border border-blue-900/40 bg-blue-950/20 p-2.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-400 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span>جاري التفكير الداخلي ({config.selectedModel})...</span>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                      {streamingThinking}
                    </div>
                  </div>
                )}

                {streamingContent ? (
                  <div className="whitespace-pre-wrap font-sans text-[13px]">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-3.5 bg-blue-400 ml-1 translate-y-0.5 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    <span>
                      {streamingThinking ? `جاري صياغة الرد النهائي بعد التفكير...` : `جاري معالجة الرد من ${config.selectedModel}...`}
                    </span>
                  </div>
                )}

                <div className="pt-2 mt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                  <span>Ollama: {config.selectedModel} · 127.0.0.1:11434</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Streaming Local
                    </span>
                    <button
                      type="button"
                      onClick={handleStop}
                      className="px-2 py-0.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 flex items-center gap-1 transition-colors font-sans text-[11px] cursor-pointer"
                      title="إيقاف التوليد"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                      <span>إيقاف</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Bottom Message Composer Area */}
      <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/70 shrink-0">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Attachments preview bar */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-950/80 border border-neutral-800 rounded-xl">
              <span className="text-[11px] text-neutral-400 font-sans flex items-center gap-1 mr-1">
                <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                المرفقات:
              </span>
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-200"
                >
                  <File className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="truncate max-w-[160px] font-sans" title={att.path}>
                    {att.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="إزالة المرفق"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Microphone notification status */}
          {micStatusMsg && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 rounded-full shadow-sm animate-in fade-in duration-100">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>{micStatusMsg}</span>
            </div>
          )}

          {/* Main Input Form */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 bg-neutral-950/90 border border-neutral-700/80 hover:border-neutral-600 focus-within:border-blue-500 rounded-2xl px-3 py-2 shadow-lg transition-all"
          >
            {/* + Attachment Button & Dropdown */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={isLoading}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showAttachMenu
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
                title="إرفاق ملفات من جهازك"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Attachment Menu Popup */}
              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 w-52 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-0.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => handleSelectFiles('all')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors cursor-pointer"
                  >
                    <File className="w-4 h-4 text-blue-400" />
                    <span>📎 ملف عام</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectFiles('code')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span>📄 ملف نصي أو كود</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectFiles('image')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                    <span>🖼️ صورة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectFiles('zip')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors cursor-pointer"
                  >
                    <Archive className="w-4 h-4 text-amber-400" />
                    <span>📦 أرشيف ZIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectFiles('video')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors cursor-pointer"
                  >
                    <Film className="w-4 h-4 text-rose-400" />
                    <span>🎥 ملف فيديو</span>
                  </button>
                </div>
              )}
            </div>

            {/* Execution Mode Selector Pill */}
            <div className="relative shrink-0" ref={modeMenuRef}>
              <button
                type="button"
                onClick={() => setShowModeMenu(!showModeMenu)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-[11px] font-medium text-neutral-300 border border-neutral-700/60 transition-colors cursor-pointer"
                title="تحديد نمط المعالجة"
              >
                <span>
                  {mode === 'auto' ? '🤖 تلقائي' : mode === 'agent' ? '⚡ مهمة' : '💬 محادثة'}
                </span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {showModeMenu && (
                <div className="absolute bottom-12 left-0 w-48 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-0.5 z-30 animate-in fade-in zoom-in-95 duration-100 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('auto');
                      setShowModeMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      mode === 'auto'
                        ? 'bg-blue-600 text-white'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>🤖 تلقائي (الوكيل يقرر)</span>
                    {mode === 'auto' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('chat');
                      setShowModeMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      mode === 'chat'
                        ? 'bg-blue-600 text-white'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>💬 محادثة فقط (Streaming)</span>
                    {mode === 'chat' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('agent');
                      setShowModeMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      mode === 'agent'
                        ? 'bg-blue-600 text-white'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>⚡ مهمة مستقلة (Agent Task)</span>
                    {mode === 'agent' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder={
                isLoading
                  ? 'جاري المعالجة... (اضغط إيقاف للإلغاء)'
                  : mode === 'agent'
                  ? 'اكتب المهمة التي تريد من Personal AI تنفيذها...'
                  : 'اكتب رسالتك أو اطلب تنفيذ مهمة برمجية...'
              }
              className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden px-2 py-1.5 font-sans"
            />

            {/* Microphone Button (Speech-to-Text) */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={isRecording ? 'إيقاف الاستماع' : 'تحدث بالصوت'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send or Stop Button */}
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors shadow-md shrink-0 cursor-pointer"
                title="إيقاف (Esc)"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>إيقاف</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && attachments.length === 0}
                className="flex items-center justify-center p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white transition-colors shadow-md shrink-0 cursor-pointer"
                title="إرسال"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
