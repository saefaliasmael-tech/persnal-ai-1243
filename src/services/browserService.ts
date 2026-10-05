import type { BrowserAutomationState } from '../types/models.ts';
import type { IBrowserService } from '../types/services.ts';
import { activityService } from './activityService.ts';

class BrowserService implements IBrowserService {
  private state: BrowserAutomationState = {
    url: 'https://duckduckgo.com',
    displayUrl: 'https://duckduckgo.com',
    title: 'DuckDuckGo — Privacy, simplified.',
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    lastSearchQuery: '',
    pageContentSummary: 'Web automation engine ready for search queries and documentation scraping.',
    history: ['https://duckduckgo.com'],
    historyIndex: 0,
  };

  private subscribers: ((state: BrowserAutomationState) => void)[] = [];

  getState(): BrowserAutomationState {
    return { ...this.state };
  }

  async navigate(url: string): Promise<void> {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      if (formattedUrl.includes('.') && !formattedUrl.includes(' ')) {
        formattedUrl = `https://${formattedUrl}`;
      } else {
        // It's a search query
        return this.search(formattedUrl);
      }
    }

    this.state.isLoading = true;
    this.state.url = formattedUrl;
    this.state.displayUrl = formattedUrl;
    this.notify();

    activityService.logEvent({
      category: 'browser',
      icon: 'Globe',
      title: 'Browser Navigating',
      description: `Opening: ${formattedUrl}`,
      status: 'in_progress',
      details: formattedUrl,
    });

    // Simulate navigation settlement
    await new Promise((r) => setTimeout(r, 600));

    // Update history
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    }
    this.state.history.push(formattedUrl);
    this.state.historyIndex = this.state.history.length - 1;

    // Determine title
    let derivedTitle = formattedUrl.replace(/^https?:\/\//, '').split('/')[0];
    if (formattedUrl.includes('electronjs.org')) {
      derivedTitle = 'Electron Documentation';
    } else if (formattedUrl.includes('developer.mozilla.org')) {
      derivedTitle = 'MDN Web Docs';
    } else if (formattedUrl.includes('github.com')) {
      derivedTitle = 'GitHub Repository';
    }

    this.state.isLoading = false;
    this.state.title = derivedTitle;
    this.state.canGoBack = this.state.historyIndex > 0;
    this.state.canGoForward = this.state.historyIndex < this.state.history.length - 1;
    this.state.pageContentSummary = `Loaded page content from ${formattedUrl}. Ready for text extraction.`;

    activityService.logEvent({
      category: 'browser',
      icon: 'CheckCircle',
      title: 'Webpage Loaded',
      description: `Loaded: ${derivedTitle}`,
      status: 'completed',
      details: formattedUrl,
    });

    this.notify();
  }

  async search(query: string): Promise<void> {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://duckduckgo.com/?q=${encoded}`;

    this.state.lastSearchQuery = query;
    activityService.logEvent({
      category: 'browser',
      icon: 'Search',
      title: 'Agent Searching Web',
      description: `Search query: "${query}"`,
      status: 'in_progress',
      details: query,
    });

    await this.navigate(searchUrl);
    this.state.title = `Search: ${query} - DuckDuckGo`;
    this.state.pageContentSummary = `Search results for "${query}". Found relevant documentation pages and code examples.`;
    this.notify();
  }

  async goBack(): Promise<void> {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      const target = this.state.history[this.state.historyIndex];
      this.state.url = target;
      this.state.displayUrl = target;
      this.state.canGoBack = this.state.historyIndex > 0;
      this.state.canGoForward = true;
      this.notify();
    }
  }

  async goForward(): Promise<void> {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      const target = this.state.history[this.state.historyIndex];
      this.state.url = target;
      this.state.displayUrl = target;
      this.state.canGoBack = true;
      this.state.canGoForward = this.state.historyIndex < this.state.history.length - 1;
      this.notify();
    }
  }

  async reload(): Promise<void> {
    this.state.isLoading = true;
    this.notify();
    await new Promise((r) => setTimeout(r, 400));
    this.state.isLoading = false;
    this.notify();
  }

  async extractPageContent(): Promise<string> {
    activityService.logEvent({
      category: 'browser',
      icon: 'FileText',
      title: 'Reading Webpage Content',
      description: `Extracting DOM text and code snippets from: ${this.state.title}`,
      status: 'completed',
      details: this.state.url,
    });
    return `Extracted DOM summary from ${this.state.url}:\nTitle: ${this.state.title}\nContent snippet: ${this.state.pageContentSummary}`;
  }

  subscribe(callback: (state: BrowserAutomationState) => void): () => void {
    this.subscribers.push(callback);
    callback({ ...this.state });
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const copy = { ...this.state, history: [...this.state.history] };
    for (const sub of this.subscribers) {
      sub(copy);
    }
  }
}

export const browserService = new BrowserService();
