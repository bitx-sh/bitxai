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
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";

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
  private initialized: boolean = false;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.loadMessages();
  }

  private async loadMessages() {
    try {
      if (existsSync(CHAT_FILE)) {
        const data = await readFile(CHAT_FILE, "utf-8");
        this.messages = JSON.parse(data);
      }
      this.initialized = true;
    } catch (error) {
      console.error("Error loading messages:", error);
      this.messages = [];
      this.initialized = true;
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
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
    await this.ensureInitialized();
    const messageWithId = {
      ...message,
      messageId: uuidv4(),
    };
    this.messages.push(messageWithId);
    await this.saveMessages();
  }

  async getMessages(): Promise<ChatMessage[]> {
    await this.ensureInitialized();
    return this.messages;
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.messages = [];
    await this.saveMessages();
  }
}

if (!existsSync("prompt.md")) {
  throw new Error("prompt.md file not found");
}

export class AIArchitectAgent {
  private model: ChatAnthropic;
  private chain: RunnableSequence;
  private chatHistory: FileSystemChatHistory;
  private systemPrompt: string;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    this.model = new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      maxTokensToSample: 8192,
      modelName: "claude-3-5-sonnet-20241022", // DO NOT CHANGE THIS LINE!!
      // DO NOT CHANGE THE PREVIOUS LINE!!
    });

    this.chatHistory = new FileSystemChatHistory();
    this.loadPromptAndInitialize();
  }

  private async loadPromptAndInitialize() {
    try {
      this.systemPrompt = await Bun.file("prompt.md").text();
      // Ensure chat history is loaded before initializing chain
      await this.chatHistory.getMessages();
      await this.initializeChain();
    } catch (error) {
      console.error("Error initializing agent:", error);
      throw error;
    }
  }

  private async initializeChain() {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      new MessagesPlaceholder("chat_history"),
      ["human", "{query}"],
    ]);

    this.chain = RunnableSequence.from([
      {
        query: new RunnablePassthrough(),
        chat_history: async () => {
          const messages = await this.chatHistory.getMessages();
          return messages.map((msg) => {
            if (msg.role === "human" || msg.role === "user") {
              return new HumanMessage(msg.content);
            } else if (msg.role === "assistant" || msg.role === "ai") {
              return new AIMessage(msg.content);
            }
            return new SystemMessage(msg.content);
          });
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
      role: "human",
      content: input,
      timestamp: Date.now(),
    });

    const response = await this.chain.invoke({ query: input });

    if (response) {
      await this.chatHistory.addMessage({
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      });
    }

    return response;
  }

  async updatePrompt(newPrompt: string): Promise<void> {
    await Bun.write("prompt.md", newPrompt);
    this.systemPrompt = newPrompt;
    await this.initializeChain();
  }

  async clearHistory(): Promise<void> {
    await this.chatHistory.clear();
  }
}

export const agent = new AIArchitectAgent();
