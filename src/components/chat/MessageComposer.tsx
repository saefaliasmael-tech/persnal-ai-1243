import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Send,
  Square,
  Mic,
  MicOff,
  File,
  Image as ImageIcon,
  FileCode,
  Archive,
  Film,
  X,
  Paperclip,
} from 'lucide-react';
import { desktopBridge } from '../../services/desktopBridge.ts';
import type { ChatAttachment } from '../../types/models.ts';

interface MessageComposerProps {
  onSend: (message: string, attachments: ChatAttachment[]) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  onStop,
  isLoading,
  disabled = false,
  placeholder = 'اكتب رسالتك أو اطلب تنفيذ مهمة...',
  initialValue = '',
}) => {
  const [text, setText] = useState(initialValue);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micStatusMsg, setMicStatusMsg] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync initialValue if provided externally (e.g. from suggestion chips)
  useEffect(() => {
    if (initialValue) {
      setText(initialValue);
    }
  }, [initialValue]);

  // Click outside attach menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

  // Handle Speech-to-Text via Web Speech API (real browser/Chromium API)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicStatusMsg('التعرف على الصوت (STT) غير مدعوم في هذه البيئة حالياً.');
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
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (err: any) => {
        setMicStatusMsg(`خطأ الميكروفون: ${err.error || 'تعذر التسجيل'}`);
        setIsRecording(false);
        setTimeout(() => setMicStatusMsg(null), 3000);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setTimeout(() => setMicStatusMsg(null), 1500);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setMicStatusMsg('تعذر تشغيل الميكروفون.');
      setIsRecording(false);
      setTimeout(() => setMicStatusMsg(null), 3000);
    }
  };

  const handleSelectFiles = async (category: 'all' | 'image' | 'code' | 'zip' | 'video') => {
    setShowAttachMenu(false);
    let filters: { name: string; extensions: string[] }[] | undefined;

    if (category === 'image') {
      filters = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }];
    } else if (category === 'code') {
      filters = [{ name: 'Code & Text', extensions: ['txt', 'md', 'json', 'ts', 'tsx', 'js', 'py', 'kt', 'xml', 'yaml', 'gradle'] }];
    } else if (category === 'zip') {
      filters = [{ name: 'Archives', extensions: ['zip', 'tar', 'gz', 'rar'] }];
    } else if (category === 'video') {
      filters = [{ name: 'Videos', extensions: ['mp4', 'mkv', 'webm', 'mov'] }];
    }

    try {
      const selected = await desktopBridge.selectFiles({
        allowMultiple: true,
        filters,
      });

      if (selected && selected.length > 0) {
        const newAttachments: ChatAttachment[] = selected.map((filePath) => {
          const name = filePath.split(/[\\/]/).pop() || filePath;
          return {
            name,
            path: filePath,
            type: category,
          };
        });
        setAttachments((prev) => [...prev, ...newAttachments]);
      }
    } catch {
      // ignore
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) {
      onStop();
      return;
    }
    if (!text.trim() && attachments.length === 0) return;

    onSend(text.trim(), attachments);
    setText('');
    setAttachments([]);
    setShowAttachMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full relative">
      {/* Microphone status toast */}
      {micStatusMsg && (
        <div className="absolute -top-9 right-4 px-3 py-1 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in duration-150 z-20">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>{micStatusMsg}</span>
        </div>
      )}

      {/* Attachments preview bar */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2 p-2 bg-neutral-900/90 border border-neutral-800 rounded-xl backdrop-blur-xs">
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
                className="hover:text-red-400 p-0.5 rounded transition-colors"
                title="إزالة المرفق"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-700/80 hover:border-neutral-600 focus-within:border-blue-500 rounded-2xl px-3 py-2 shadow-lg backdrop-blur-sm transition-all"
      >
        {/* + Attachment Button & Dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            disabled={disabled}
            className={`p-2 rounded-xl transition-colors ${
              showAttachMenu
                ? 'bg-blue-600 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="إرفاق ملفات"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Attachment Menu Popup */}
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 w-52 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-0.5 z-30 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => handleSelectFiles('all')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors"
              >
                <File className="w-4 h-4 text-blue-400" />
                <span>📎 ملف عام</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFiles('code')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors"
              >
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>📄 ملف نصي أو كود</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFiles('image')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>🖼️ صورة</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFiles('zip')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors"
              >
                <Archive className="w-4 h-4 text-amber-400" />
                <span>📦 أرشيف ZIP</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFiles('video')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white text-right transition-colors"
              >
                <Film className="w-4 h-4 text-rose-400" />
                <span>🎥 ملف فيديو</span>
              </button>
            </div>
          )}
        </div>

        {/* Text Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={isLoading ? 'جاري معالجة الطلب... اضغط إيقاف للإلغاء' : placeholder}
          className="flex-1 bg-transparent border-0 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden px-2 py-1.5 font-sans"
        />

        {/* Microphone Button (Speech-to-Text) */}
        <button
          type="button"
          onClick={toggleSpeechRecognition}
          className={`p-2 rounded-xl transition-colors shrink-0 ${
            isRecording
              ? 'bg-red-600 text-white animate-pulse'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title={isRecording ? 'إيقاف الاستماع' : 'التحدث بالصوت'}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Send or Stop Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors shadow-md shrink-0"
            title="إيقاف التوليد (Esc)"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>إيقاف</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={(!text.trim() && attachments.length === 0) || disabled}
            className="flex items-center justify-center p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white transition-colors shadow-md shrink-0"
            title="إرسال"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
};
