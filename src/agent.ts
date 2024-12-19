
#!/usr/bin/env bun

import { ChatAnthropicMessages } from "@langchain/anthropic";
import { ChatAnthropic } from "@langchain/anthropic";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { existsSync } from 'node:fs';

// Check if prompt file exists
if (!existsSync("prompt.md")) {
  throw new Error("prompt.md file not found");
}

import {
  RunnableSequence,
  RunnablePassthrough
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatDocumentsAsString } from "langchain/util/document";
import {
  ChatPromptTemplate,
  MessagesPlaceholder
} from "@langchain/core/prompts";

// Read the agent's prompt from filesystem
const agentPrompt = await Bun.file("prompt.md").text();

export class AIArchitectAgent {
  private model: ChatAnthropic;
  private chain: RunnableSequence;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    this.model = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-sonnet-20240229",
    });

    this.initializeChain();
  }

  private initializeChain() {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", agentPrompt],
      ["human", "{input}"],
      new MessagesPlaceholder("chat_history"),
    ]);

    this.chain = RunnableSequence.from([
      {
        input: new RunnablePassthrough(),
        chat_history: () => [], 
        context: async (input: { input: string }) => {
          if (input.input.includes("president")) {
            const loader = new CheerioWebBaseLoader(
              "https://www.whitehouse.gov/administration/president-biden/"
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
    return await this.chain.invoke({ input });
  }

  async updatePrompt(newPrompt: string): Promise<void> {
    await Bun.write("prompt.md", newPrompt);
    this.initializeChain();
  }
}

export const agent = new AIArchitectAgent();
