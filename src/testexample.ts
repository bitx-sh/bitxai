import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { ChatAnthropicMessages } from "@langchain/anthropic";
import { ChatAnthropic } from "@langchain/anthropic";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as fs from "fs";
import { formatDocumentsAsString } from "langchain/util/document";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

const text = fs.readFileSync("state_of_the_union.txt", "utf8");

const query = "What did the president say about Justice Breyer?";

// Initialize the LLM to use to answer the question.
const model = new ChatAnthropic({});

// Chunk the text into documents.
const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
const docs = await textSplitter.createDocuments([text]);

// Create a vector store from the documents.
const vectorStore = await HNSWLib.fromDocuments(docs, new AnthropicEmbeddings());
const vectorStoreRetriever = vectorStore.asRetriever();
// Create a system & human prompt for the chat model
const SYSTEM_TEMPLATE = `Use the following pieces of context to answer the users question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`;

const messages = [
  SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
  HumanMessagePromptTemplate.fromTemplate("{question}"),
];
const prompt = ChatPromptTemplate.fromMessages(messages);
const chain = RunnableSequence.from([
  {
    // Extract the "question" field from the input object and pass it to the retriever as a string
    sourceDocuments: RunnableSequence.from([
      (input) => input.question,
      vectorStoreRetriever,
    ]),
    question: (input) => input.question,
  },
  {
    // Pass the source documents through unchanged so that we can return them directly in the final result
    sourceDocuments: (previousStepResult) => previousStepResult.sourceDocuments,
    question: (previousStepResult) => previousStepResult.question,
    context: (previousStepResult) =>
      formatDocumentsAsString(previousStepResult.sourceDocuments),
  },
  {
    result: prompt.pipe(model).pipe(new StringOutputParser()),
    sourceDocuments: (previousStepResult) => previousStepResult.sourceDocuments,
  },
]);

const res = await chain.invoke({
  question: query,
});

console.log(JSON.stringify(res, null, 2));