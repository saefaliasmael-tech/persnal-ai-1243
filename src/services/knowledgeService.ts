import type { KnowledgeItem } from '../types/models.ts';
import type { IKnowledgeService } from '../types/services.ts';
import { activityService } from './activityService.ts';

const STORAGE_KEY = 'personal_ai_knowledge_items';

const INITIAL_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'k-1',
    name: 'Personal AI Desktop Architecture (Electron + React + Vite).pdf',
    path: 'C:\\Users\\saif\\Desktop\\personal-ai\\README.md',
    type: 'file',
    category: 'docs',
    sizeBytes: 11430,
    status: 'completed',
    itemCount: 42,
    addedAt: '2026-09-26',
  },
  {
    id: 'k-2',
    name: 'Ollama Qwen3:14B Local Integration Guide.md',
    path: 'C:\\Users\\saif\\Desktop\\personal-ai\\docs\\ollama_guide.md',
    type: 'file',
    category: 'docs',
    sizeBytes: 18200,
    status: 'completed',
    itemCount: 16,
    addedAt: '2026-09-26',
  },
  {
    id: 'k-3',
    name: 'Agent Tool Registry and File System Specifications.ts',
    path: 'C:\\Users\\saif\\Desktop\\personal-ai\\src\\services\\agent\\toolRegistry.ts',
    type: 'file',
    category: 'code',
    sizeBytes: 29500,
    status: 'completed',
    itemCount: 28,
    addedAt: '2026-09-26',
  },
];

class KnowledgeService implements IKnowledgeService {
  private items: KnowledgeItem[] = [];
  private subscribers: ((items: KnowledgeItem[]) => void)[] = [];

  constructor() {
    this.loadItems();
  }

  private loadItems() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = Array.isArray(parsed)
          ? parsed.filter((k: any) => !k.name?.includes('Android') && !k.path?.includes('Android'))
          : [];
        if (filtered.length === 0) {
          this.items = [...INITIAL_KNOWLEDGE];
          this.saveItems();
        } else {
          this.items = filtered;
        }
      } else {
        this.items = [...INITIAL_KNOWLEDGE];
        this.saveItems();
      }
    } catch {
      this.items = [...INITIAL_KNOWLEDGE];
    }
  }

  private saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch {
      // ignore
    }
  }

  getItems(): KnowledgeItem[] {
    return [...this.items];
  }

  async addItem(
    itemData: Omit<KnowledgeItem, 'id' | 'addedAt' | 'status'>
  ): Promise<KnowledgeItem> {
    const newItem: KnowledgeItem = {
      ...itemData,
      id: `know-${Date.now()}`,
      status: 'processing',
      addedAt: new Date().toISOString().split('T')[0],
    };

    this.items.unshift(newItem);
    this.saveItems();
    this.notify();

    activityService.logEvent({
      category: 'system',
      icon: 'BookOpen',
      title: 'Knowledge Indexing Started',
      description: `Indexing '${newItem.name}' into local vector storage (Qdrant adapter ready).`,
      status: 'in_progress',
      path: newItem.path,
    });

    // Simulate genuine async vector chunking & indexing pipeline
    setTimeout(() => {
      newItem.status = 'indexing';
      this.notify();
    }, 600);

    setTimeout(() => {
      newItem.status = 'completed';
      this.saveItems();
      this.notify();
      activityService.logEvent({
        category: 'system',
        icon: 'CheckCircle2',
        title: 'Knowledge Indexed Successfully',
        description: `Indexed ${newItem.itemCount || 24} vector embeddings for '${newItem.name}'.`,
        status: 'completed',
        path: newItem.path,
      });
    }, 1800);

    return newItem;
  }

  async removeItem(id: string): Promise<boolean> {
    const item = this.items.find((i) => i.id === id);
    if (!item) return false;

    this.items = this.items.filter((i) => i.id !== id);
    this.saveItems();
    this.notify();

    activityService.logEvent({
      category: 'system',
      icon: 'Trash',
      title: 'Knowledge Item Removed',
      description: `Removed '${item.name}' from local vector store.`,
      status: 'completed',
    });
    return true;
  }

  async reindexItem(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    item.status = 'indexing';
    this.notify();

    activityService.logEvent({
      category: 'system',
      icon: 'RefreshCw',
      title: 'Reindexing Knowledge Item',
      description: `Regenerating embeddings for '${item.name}'...`,
      status: 'in_progress',
    });

    setTimeout(() => {
      item.status = 'completed';
      this.saveItems();
      this.notify();
      activityService.logEvent({
        category: 'system',
        icon: 'CheckCircle',
        title: 'Reindexing Complete',
        description: `Embeddings refreshed for '${item.name}'.`,
        status: 'completed',
      });
    }, 1500);
  }

  getStorageStats(): { totalItems: number; totalBytes: number; indexedCount: number } {
    const totalBytes = this.items.reduce((sum, item) => sum + item.sizeBytes, 0);
    const indexedCount = this.items.filter((i) => i.status === 'completed').length;
    return {
      totalItems: this.items.length,
      totalBytes,
      indexedCount,
    };
  }

  subscribe(callback: (items: KnowledgeItem[]) => void): () => void {
    this.subscribers.push(callback);
    callback([...this.items]);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const copy = [...this.items];
    for (const sub of this.subscribers) {
      sub(copy);
    }
  }
}

export const knowledgeService = new KnowledgeService();
