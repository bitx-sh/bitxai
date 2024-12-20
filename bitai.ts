#!/usr/bin/env bun
import { existsSync, mkdirSync } from "node:fs";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Define schema for shell commands and responses
const ShellCommandSchema = z.object({
  command: z.string(),
  explanation: z.string(),
  error: z.string().optional(),
  dataStreams: z.record(z.number(), z.string()).optional(),
});

type ShellCommand = z.infer<typeof ShellCommandSchema>;

// Create special file descriptors for SINA
const SINA_FD = {
  EXPLANATION: 8,
  COMMAND_RESULT: 9,
};

class ShellIntegratedNeuralAgent {
  private model: ChatAnthropic;
  private chain: RunnableSequence;
  private history: CommandHistory;
  private systemPrompt: string;
  private currentWorkingDirectory: string;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    this.model = new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      modelName: "claude-3-5-sonnet-20241022",
    });

    this.currentWorkingDirectory = process.cwd();
    this.history = new CommandHistory();
    this.initializeAgent();
  }

  private async initializeAgent() {
    // Create special file descriptors if they don't exist
    await this.setupFileDescriptors();

    // Initialize the prompt and chain
    await this.loadSystemPrompt();
    await this.initializeChain();
  }

  private async setupFileDescriptors() {
    // Setup special file descriptors for SINA
    const fd8 = Bun.file(8);
    const fd9 = Bun.file(9);

    // Create writers for special file descriptors
    this.explanationWriter = fd8.writer();
    this.resultWriter = fd9.writer();
  }

  private async executeShellCommand(
    command: string,
  ): Promise<{ stdout: string; stderr: string }> {
    const proc = Bun.spawn({
      cmd: ["sh", "-c", command],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, PWD: this.currentWorkingDirectory },
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { stdout, stderr };
  }

  private async writeToFileDescriptor(fd: number, content: string) {
    const writer =
      fd === SINA_FD.EXPLANATION ? this.explanationWriter : this.resultWriter;
    writer.write(content + "\n");
    await writer.flush();
  }

  async process(input: string): Promise<void> {
    try {
      // Generate command using LangChain
      const response = await this.chain.invoke({ query: input });

      // Parse the response
      const result = ShellCommandSchema.parse(JSON.parse(response));

      // Write explanation to fd 8
      await this.writeToFileDescriptor(SINA_FD.EXPLANATION, result.explanation);

      // Execute the command
      const { stdout, stderr } = await this.executeShellCommand(result.command);

      // Write command result to fd 9
      await this.writeToFileDescriptor(SINA_FD.COMMAND_RESULT, stdout);

      // If there's an error, write to stderr
      if (stderr) {
        await Bun.write(Bun.stderr, stderr);
      }

      // Save to history
      await this.history.addCommand({
        input,
        command: result.command,
        output: stdout,
        error: stderr,
        timestamp: Date.now(),
      });
    } catch (error) {
      await Bun.write(Bun.stderr, `Error: ${error.message}\n`);
    }
  }

  // ... continuing in next part
}
