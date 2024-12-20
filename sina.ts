#!/usr/bin/env bun
// ... [previous code remains the same until ShellIntegratedNeuralAgent class] ...

class ShellIntegratedNeuralAgent {
  // ... [previous methods remain the same] ...

  // 3. Main Execution Loop and CLI Interface
  static async main() {
    const agent = new ShellIntegratedNeuralAgent();

    if (process.argv[2] === "--interactive" || process.argv[2] === "-i") {
      await agent.startInteractiveMode();
    } else {
      const command = process.argv.slice(2).join(" ");
      if (command) {
        await agent.process(command);
      } else {
        console.error("Usage: sina <command> or sina --interactive");
        process.exit(1);
      }
    }
  }

  private async startInteractiveMode() {
    const writer = Bun.file(SINA_FD.EXPLANATION).writer();
    writer.write("🧠 SINA Interactive Mode Started\n");
    writer.write("Type 'exit' to quit, 'history' to see command history\n");
    writer.flush();

    for await (const line of console) {
      if (line.toLowerCase() === "exit") {
        break;
      }
      if (line.toLowerCase() === "history") {
        const history = await this.history.getCommands();
        await this.writeToFileDescriptor(
          SINA_FD.EXPLANATION,
          history.map((h) => `${h.timestamp}: ${h.command}`).join("\n"),
        );
        continue;
      }
      await this.process(line);
    }
  }

  // 2. Chain Initialization with Full Prompt
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
          const commands = await this.history.getCommands();
          return commands.map((cmd) => ({
            role: cmd.input ? "human" : "assistant",
            content: cmd.input || cmd.command,
          }));
        },
      },
      prompt,
      this.model,
      new StringOutputParser(),
      // Post-process to ensure valid JSON
      async (response: string) => {
        try {
          // Handle potential non-JSON responses
          if (!response.startsWith("{")) {
            return JSON.stringify({
              command: response.trim(),
              explanation: "Converted plain text response to command",
            });
          }
          return response;
        } catch (error) {
          return JSON.stringify({
            command: "echo 'Error processing response'",
            explanation: `Error: ${error.message}`,
            error: error.message,
          });
        }
      },
    ]);
  }

  // 1. Command History Implementation
  private async loadSystemPrompt() {
    const defaultPrompt = `
# 🧠 SINA: Shell-Integrated Neural Agent

[SYSTEM: You are a Shell-Integrated Neural Agent (SINA) with advanced capabilities in shell operations, file system manipulation, and process control. You MUST output valid JSON in the following format:
{
  "command": "shell command to execute",
  "explanation": "explanation of what the command does",
  "error": "optional error message",
  "dataStreams": {"8": "explanation text", "9": "command result"}
}]

## Core Operating Protocols
1. ALL outputs must be valid JSON
2. ALL commands must be properly escaped
3. ALL file operations must use absolute paths
4. ALL explanations must be clear and concise
5. ALL errors must be handled gracefully

## Available Capabilities
1. Full shell command execution
2. File system operations via Bun.file
3. Process spawning via Bun.spawn
4. Pipeline and redirection operations
5. Signal handling and process control

## Special File Descriptors
- FD 8: Explanations and metadata
- FD 9: Command execution results
- stdout: Command output
- stderr: Error messages

## Security Protocols
1. Validate all file paths
2. Escape all command arguments
3. Handle sensitive data appropriately
4. Prevent command injection
5. Maintain audit trail
`;

    try {
      const customPrompt = await Bun.file("sina-prompt.md").text();
      this.systemPrompt = customPrompt;
    } catch {
      this.systemPrompt = defaultPrompt;
    }
  }
}

// Command History Implementation
interface CommandRecord {
  input: string;
  command: string;
  output: string;
  error?: string;
  timestamp: number;
}

class CommandHistory {
  private static readonly HISTORY_FILE = ".sina_history.json";
  private commands: CommandRecord[] = [];

  constructor() {
    this.loadHistory().catch(console.error);
  }

  private async loadHistory() {
    try {
      if (existsSync(CommandHistory.HISTORY_FILE)) {
        const data = await readFile(CommandHistory.HISTORY_FILE, "utf-8");
        this.commands = JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading history:", error);
      this.commands = [];
    }
  }

  private async saveHistory() {
    try {
      await writeFile(
        CommandHistory.HISTORY_FILE,
        JSON.stringify(this.commands, null, 2),
      );
    } catch (error) {
      console.error("Error saving history:", error);
    }
  }

  async addCommand(command: CommandRecord) {
    this.commands.push(command);
    await this.saveHistory();
  }

  async getCommands(): Promise<CommandRecord[]> {
    return this.commands;
  }

  async clear() {
    this.commands = [];
    await this.saveHistory();
  }
}

// Execute if running directly
if (import.meta.main) {
  ShellIntegratedNeuralAgent.main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { ShellIntegratedNeuralAgent, CommandHistory };
