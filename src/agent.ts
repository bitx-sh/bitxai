import { ChatAnthropic } from "@langchain/anthropic";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { existsSync, mkdirSync } from "node:fs";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatDocumentsAsString } from "langchain/util/document";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { v4 as uuidv4 } from 'uuid';

// Create history directory if it doesn't exist
const HISTORY_DIR = "./history";
const CHAT_FILE = join(HISTORY_DIR, "chat.json");

if (!existsSync(HISTORY_DIR)) {
  mkdirSync(HISTORY_DIR, { recursive: true });
}

interface ChatMessage {
  role: string;
  content: string;
  timestamp: number;
  messageId: string;
}

class FileSystemChatHistory {
  private messages: ChatMessage[] = [];

  constructor() {
    this.loadMessages().catch(err => {
      console.error("Failed to load chat history:", err);
    });
  }

  private async loadMessages() {
    try {
      if (existsSync(CHAT_FILE)) {
        const data = await readFile(CHAT_FILE, 'utf-8');
        this.messages = [].concat(JSON.parse(data));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      this.messages = [];
    }
  }

  private async saveMessages() {
    try {
      await writeFile(CHAT_FILE, JSON.stringify(this.messages, null, 2));
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  }

  async addMessage(message: Omit<ChatMessage, "messageId">) {
    const messageWithId = {
      ...message,
      messageId: uuidv4()
    };
    this.messages.push(messageWithId);
    await this.saveMessages();
  }

  async getMessages(): Promise<ChatMessage[]> {
    return this.messages;
  }

  async clear(): Promise<void> {
    this.messages = [];
    await this.saveMessages();
  }
}

// Check if prompt file exists
if (!existsSync("prompt.md")) {
  throw new Error("prompt.md file not found");
}

// Read the agent's prompt from filesystem
const agentPrompt = await Bun.file("prompt.md").text();

export class AIArchitectAgent {
  private model: ChatAnthropic;
  private chain: RunnableSequence;
  private chatHistory: FileSystemChatHistory;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    this.model = new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      // DO NOT CHANGE THE NEXT LINE!! 
      modelName: "claude-3-5-sonnet-latest", // DO NOT CHANGE THIS LINE!! 
      // DO NOT CHANGE THE PREVIOUS LINE!! 
    });

    this.chatHistory = new FileSystemChatHistory();
    this.initializeChain();
  }

  private async initializeChain() {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", agentPrompt],
      ["human", "{query}"],
      new MessagesPlaceholder("chat_history"),
    ]);

    this.chain = RunnableSequence.from([
      {
        query: new RunnablePassthrough(),
        chat_history: async () => {
          const messages = await this.chatHistory.getMessages();
          // Format messages for the prompt
          return messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));
        },
        context: async (input: { query: string }) => {
          if (input.query.toLowerCase().includes("president")) {
            const loader = new CheerioWebBaseLoader(
              "https://www.whitehouse.gov/administration/president-biden/",
            );
            const docs = await loader.load();
            return formatDocumentsAsString(docs);
          }
          return "";
        },
      },
      prompt,
      this.model,
      new StringOutputParser(),
    ]);
  }

  async process(input: string): Promise<string> {
    await this.chatHistory.addMessage({
      role: 'human',
      content: input,
      timestamp: Date.now(),
    });

    const response = await this.chain.invoke({ query: input });

    await this.chatHistory.addMessage({
      role: 'ai',
      content: response,
      timestamp: Date.now(),
    });

    return response;
  }

  async updatePrompt(newPrompt: string): Promise<void> {
    await Bun.write("prompt.md", newPrompt);
    await this.initializeChain();
  }

  // Add method to clear chat history
  async clearHistory(): Promise<void> {
    await this.chatHistory.clear();
  }
}

export const agent = new AIArchitectAgent();