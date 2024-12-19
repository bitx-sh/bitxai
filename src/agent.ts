import { ChatAnthropic } from "@langchain/anthropic";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { existsSync } from 'node:fs';
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

// Check if prompt file exists
if (!existsSync("prompt.md")) {
  throw new Error("prompt.md file not found");
}

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
      anthropicApiKey: process.env.ANTHROPIC_API_KEY, // Changed from apiKey to anthropicApiKey
      modelName: "claude-3-sonnet-20240229", // Updated model name
    });

    this.initializeChain();
  }

  private async initializeChain() {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", agentPrompt],
      ["human", "{query}"], // Changed from input to query to match the invoke
      new MessagesPlaceholder("chat_history"),
    ]);

    this.chain = RunnableSequence.from([
      {
        query: new RunnablePassthrough(),
        chat_history: async () => [], // Made async
        context: async (input: { query: string }) => {
          if (input.query.toLowerCase().includes("president")) {
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
    return await this.chain.invoke({ query: input }); // Changed from input to query
  }

  async updatePrompt(newPrompt: string): Promise<void> {
    await Bun.write("prompt.md", newPrompt);
    await this.initializeChain(); // Made async
  }
}

export const agent = new AIArchitectAgent();