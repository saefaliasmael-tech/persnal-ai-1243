import type { ActivityEvent } from '../types/models.ts';
import type { IActivityService } from '../types/services.ts';

class ActivityService implements IActivityService {
  private events: ActivityEvent[] = [];
  private subscribers: ((events: ActivityEvent[]) => void)[] = [];

  constructor() {
    this.loadInitialEvents();
  }

  private loadInitialEvents() {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    this.events = [
      {
        id: 'evt-init-1',
        timestamp: timeStr,
        date: dateStr,
        category: 'system',
        icon: 'ShieldCheck',
        title: 'Security Subsystem Initialized',
        description: 'Windows 10 security sandbox and permission policy active (Safe Mode: ON).',
        status: 'completed',
      },
      {
        id: 'evt-init-2',
        timestamp: timeStr,
        date: dateStr,
        category: 'terminal',
        icon: 'Terminal',
        title: 'Terminal Process Service Ready',
        description: 'Process execution engine ready for child process spawning.',
        status: 'completed',
      },
      {
        id: 'evt-init-3',
        timestamp: timeStr,
        date: dateStr,
        category: 'browser',
        icon: 'Globe',
        title: 'Browser Automation Service Ready',
        description: 'Web navigation and child popup window controller initialized.',
        status: 'completed',
      },
      {
        id: 'evt-init-4',
        timestamp: timeStr,
        date: dateStr,
        category: 'agent',
        icon: 'Bot',
        title: 'Agent Subsystem Standby',
        description: 'Local agent adapter initialized. Ready for task input.',
        status: 'completed',
      },
    ];
  }

  getEvents(filterCategory?: string): ActivityEvent[] {
    if (!filterCategory || filterCategory === 'all') {
      return [...this.events];
    }
    return this.events.filter((e) => e.category === filterCategory);
  }

  logEvent(eventData: Omit<ActivityEvent, 'id' | 'timestamp' | 'date'>): ActivityEvent {
    const now = new Date();
    const event: ActivityEvent = {
      ...eventData,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toTimeString().split(' ')[0],
      date: now.toISOString().split('T')[0],
    };

    // Prepend to show newest first
    this.events.unshift(event);
    if (this.events.length > 300) {
      this.events = this.events.slice(0, 300);
    }

    this.notify();
    return event;
  }

  updateEvent(id: string, updates: Partial<ActivityEvent>) {
    const index = this.events.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.events[index] = { ...this.events[index], ...updates };
      this.notify();
    }
  }

  clearEvents() {
    this.events = [];
    this.notify();
  }

  subscribe(callback: (events: ActivityEvent[]) => void): () => void {
    this.subscribers.push(callback);
    callback([...this.events]);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const copy = [...this.events];
    for (const sub of this.subscribers) {
      sub(copy);
    }
  }
}

export const activityService = new ActivityService();
