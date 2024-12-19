
import { existsSync, promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  messageId: string;
}

export interface ChatHistoryManager {
  history: ChatMessage[];
  persistencePath: string;
  save(): Promise<void>;
  load(): Promise<void>;
  addMessage(message: ChatMessage): Promise<void>;
  getHistory(): ChatMessage[];
  searchHistory(query: string): ChatMessage[];
  exportHistory(format: 'json' | 'csv'): Promise<string>;
}

export class FileSystemChatHistory implements ChatHistoryManager {
  history: ChatMessage[] = [];
  persistencePath: string;

  constructor(persistencePath: string = './.history/chat_history.json') {
    this.persistencePath = persistencePath;
    this.load().catch(console.error); // Load existing history on initialization
  }

  async save(): Promise<void> {
    try {
      const dir = this.persistencePath.split('/').slice(0, -1).join('/');
      if (dir) {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.writeFile(
        this.persistencePath,
        JSON.stringify(this.history, null, 2)
      );
    } catch (error) {
      console.error('Failed to save chat history:', error);
      throw error;
    }
  }

  async load(): Promise<void> {
    try {
      if (existsSync(this.persistencePath)) {
        const data = await fs.readFile(this.persistencePath, 'utf-8');
        this.history = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      this.history = [];
    }
  }

  async addMessage(message: ChatMessage): Promise<void> {
    this.history.push({
      ...message,
      timestamp: Date.now(),
      messageId: randomUUID()
    });
    await this.save();
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  searchHistory(query: string): ChatMessage[] {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(msg =>
      msg.content.toLowerCase().includes(lowerQuery)
    );
  }

  async exportHistory(format: 'json' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.history, null, 2);
    }
    const headers = ['messageId', 'role', 'content', 'timestamp'];
    const rows = this.history.map(msg =>
      [msg.messageId, msg.role, msg.content, msg.timestamp].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
