import type { AgentRunState } from '../agentService.ts';

export interface FriendlyAgentStep {
  id: string;
  emoji: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  details?: string;
}

export function getFriendlyAgentStatus(state: AgentRunState): {
  headline: string;
  subtext: string;
  emoji: string;
} {
  const { status, activeTool, currentAction } = state;

  switch (status) {
    case 'idle':
      return {
        emoji: '✨',
        headline: 'جاهز للمساعدة',
        subtext: 'اكتب طلبك وسأقوم بتنفيذه تلقائياً.',
      };

    case 'thinking':
      return {
        emoji: '🧠',
        headline: 'أفكر بالمهمة...',
        subtext: currentAction || 'أحلل طلبك بدقة لتحديد الخطوات المطلوبة.',
      };

    case 'planning':
      return {
        emoji: '📋',
        headline: 'أضع خطة عمل ذكية...',
        subtext: 'تقسيم المهمة إلى خطوات تنفيذية منظمة.',
      };

    case 'selecting_skill':
    case 'selecting_tool':
      return {
        emoji: '💡',
        headline: 'أحدد الخطوة المناسبة...',
        subtext: activeTool ? `استخدام ${activeTool}` : 'تجهيز الأدوات المطلوبة.',
      };

    case 'requesting_permission':
      return {
        emoji: '🔐',
        headline: 'أحتاج إذنك لتنفيذ أمر على جهازك',
        subtext: 'اضغط على السماح في نافذة الإذن للمتابعة بأمان.',
      };

    case 'executing': {
      if (activeTool?.includes('file') || activeTool?.includes('File')) {
        return {
          emoji: '🔍',
          headline: 'أفحص وأعدل الملفات...',
          subtext: currentAction || 'التعامل مع ملفات المشروع بأمان.',
        };
      }
      if (activeTool?.includes('terminal') || activeTool?.includes('Terminal') || activeTool?.includes('build') || activeTool?.includes('Build')) {
        return {
          emoji: '⚙️',
          headline: 'أشغّل الأمر المطلوب...',
          subtext: currentAction || 'تنفيذ الأوامر في بيئة المشروع.',
        };
      }
      if (activeTool?.includes('browser') || activeTool?.includes('web') || activeTool?.includes('search')) {
        return {
          emoji: '🌐',
          headline: 'أبحث عن حل على الإنترنت...',
          subtext: currentAction || 'استعراض التوثيق الفني والحلول البرمجية.',
        };
      }
      if (activeTool?.includes('test') || activeTool?.includes('Test')) {
        return {
          emoji: '🧪',
          headline: 'أختبر النتيجة وأفحص الأخطاء...',
          subtext: currentAction || 'التحقق من صحة التنفيذ.',
        };
      }
      return {
        emoji: '🛠️',
        headline: 'أطبق التعديلات...',
        subtext: currentAction || 'تنفيذ الخطوة الحالية.',
      };
    }

    case 'observing':
      return {
        emoji: '🔍',
        headline: 'أتحقق من النتيجة...',
        subtext: 'قراءة نتائج الخطوة لاتخاذ القرار التالي.',
      };

    case 'paused':
      return {
        emoji: '⏸️',
        headline: 'المهمة متوقفة مؤقتًا',
        subtext: 'اضغط متابعة لاستكمال تنفيذ المهمة.',
      };

    case 'stopped':
      return {
        emoji: '⛔',
        headline: 'تم إيقاف المهمة',
        subtext: 'تم إيقاف العمليات استجابة لطلبك.',
      };

    case 'completed':
      return {
        emoji: '✅',
        headline: 'انتهيت من المهمة',
        subtext: 'تم إكمال جميع الخطوات المطلوبة بنجاح.',
      };

    case 'failed':
      return {
        emoji: '⚠️',
        headline: 'حدثت مشكلة أثناء التنفيذ',
        subtext: state.errorMessage || 'يمكنك مراجعة التفاصيل أو إعادة المحاولة.',
      };

    default:
      return {
        emoji: '🤖',
        headline: 'يعمل Personal AI...',
        subtext: currentAction || '',
      };
  }
}

export function getFriendlyStepsFromState(state: AgentRunState): FriendlyAgentStep[] {
  // If plan exists, map plan steps to friendly steps
  if (state.plan && state.plan.length > 0) {
    return state.plan.map((s) => {
      let emoji = '🔹';
      const descLower = s.description.toLowerCase();
      if (descLower.includes('inspect') || descLower.includes('فحص') || descLower.includes('ملف') || descLower.includes('file')) {
        emoji = '🔍';
      } else if (descLower.includes('build') || descLower.includes('بناء') || descLower.includes('أمر') || descLower.includes('command')) {
        emoji = '⚙️';
      } else if (descLower.includes('test') || descLower.includes('اختبار') || descLower.includes('check')) {
        emoji = '🧪';
      } else if (descLower.includes('search') || descLower.includes('بحث') || descLower.includes('web')) {
        emoji = '🌐';
      } else if (descLower.includes('code') || descLower.includes('كود') || descLower.includes('تعديل') || descLower.includes('fix')) {
        emoji = '🛠️';
      }

      return {
        id: s.id,
        emoji,
        text: s.description,
        status: s.status,
      };
    });
  }

  // Otherwise, synthesize from events
  return state.events.slice(0, 5).reverse().map((e) => ({
    id: e.id,
    emoji: e.status === 'completed' ? '✅' : e.status === 'failed' ? '❌' : '⏳',
    text: e.title,
    status: e.status === 'in_progress' ? 'in_progress' : e.status === 'failed' ? 'failed' : 'completed',
    details: e.details || e.description,
  }));
}
