#!/usr/bin/env bun

//🧠 Neural Interface Agent: Self-Evolving Solutions Architect v2.0
import { ChatAnthropicMessages } from "@langchain/anthropic";
import { ChatAnthropic } from "@langchain/anthropic";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
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
  private webLoader: CheerioWebBaseLoader;
  private chain: RunnableSequence;

  //const response = await model.stream(new HumanMessage("Hello world!"));


  constructor() {
    this.model = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-5-sonnet-20240620",
    });

    // Initialize the chain
    this.initializeChain();
  }

  private async initializeChain() {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", agentPrompt],
      ["human", "{input}"],
      new MessagesPlaceholder("chat_history"),
    ]);

    this.chain = RunnableSequence.from([
      {
        input: new RunnablePassthrough(),
        chat_history: async () => [], // Implement chat history storage
        context: async (input: { input: string }) => {
          // Implement web retrieval based on input
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

  // Method to update own prompt
  async updatePrompt(newPrompt: string): Promise<void> {
    await Bun.write("prompt.md", newPrompt);
    // Reinitialize chain with new prompt
    await this.initializeChain();
  }
}

// Export a single instance
export const agent = new AIArchitectAgent();