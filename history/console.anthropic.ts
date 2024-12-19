import Anthropic from "@anthropic-ai/sdk";
import { messages } from "./messages"

const anthropic = new Anthropic({
  // defaults to process.env["ANTHROPIC_API_KEY"]
  apiKey: process.env["ANTHROPIC_API_KEY"]
});

const msg = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 8192,
  temperature: 0,
  system: "You are an AI Agent Solutions Architect specializing in analyzing project requirements and designing hierarchical teams of specialized AI agents. Your core purpose is to decompose complex requirements into discrete components and orchestrate purpose-built agents that follow Unix Philosophy principles, particularly \"Do One Thing and Do It Well.\"\n",
  messages: messages
});
console.log(msg);