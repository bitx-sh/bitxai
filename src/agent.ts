import { ChatAnthropic } from "@langchain/anthropic";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { existsSync } from "node:fs";
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

import { messages } from "../history/chat.json";

// Check if prompt file exists
if (!existsSync("prompt.md")) {
  throw new Error("prompt.md file not found");
}

// Read the agent's prompt from filesystem
const agentPrompt = await Bun.file("prompt.md").text();

//Implementation of FileSystemChatHistory (Needs to be added separately)
class FileSystemChatHistory {
    async addMessage(message: { role: string; content: string; timestamp: number; messageId: string }) {
        //Implementation to save message to file system.  This is a placeholder.  Replace with actual file system writing logic.
        console.log("Message added to chat history:", message);
    }
    async getMessages() {
        //Implementation to retrieve messages from file system. This is a placeholder. Replace with actual file system reading logic.
        return [];
    }
}


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
      modelName: "claude-3-5-sonnet-latest",
    });

    this.chatHistory = new FileSystemChatHistory();
    this.initializeChain();
  }

  private async initializeChain() {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", agentPrompt],
      //...messages.map(([role, content]) => [role, content]),
      ["human", "{query}"],
      new MessagesPlaceholder("chat_history"),
    ]);

    this.chain = RunnableSequence.from([
      {
        query: new RunnablePassthrough(),
        chat_history: async () => await this.chatHistory.getMessages(), // Made async and retrieves from chatHistory
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
    await this.chatHistory.addMessage({ role: 'user', content: input, timestamp: Date.now(), messageId: '' });
    const response = await this.chain.invoke({ query: input });
    await this.chatHistory.addMessage({ role: 'assistant', content: response, timestamp: Date.now(), messageId: '' });
    return response;
  }

  async updatePrompt(newPrompt: string): Promise<void> {
    await Bun.write("prompt.md", newPrompt);
    await this.initializeChain(); 
  }
}

export const agent = new AIArchitectAgent();