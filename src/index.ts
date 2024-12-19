#!/usr/bin/env bun

//🧠 Neural Interface Agent: Self-Evolving Solutions Architect
import { agent } from "./agent";

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "query":
      const query = args.slice(1).join(" ");
      const response = await agent.process(query);
      console.log(response);
      break;

    case "update-prompt":
      const newPrompt = await Bun.file(args[1]).text();
      await agent.updatePrompt(newPrompt);
      console.log("Prompt updated successfully");
      break;

    default:
      console.log("Available commands: query, update-prompt");
  }
};

main().catch(console.error);