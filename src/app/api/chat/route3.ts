import {
  generateText,
  AIStream,
  streamText,
  streamObject,
  LangChainAdapter,
  createStreamDataTransformer,
  LangChainStream,
} from "ai";
import { ChatCompletionMessageParam } from "ai/prompts";
import {
  ChatPromptTemplate,
  PromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import OpenAI from "openai";
import { openai } from "@ai-sdk/openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenerativeAIStream, Message, StreamingTextResponse } from "ai";
import { google } from "@ai-sdk/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { getVectorStore } from "@/lib/astradb";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { HttpResponseOutputParser } from "langchain/output_parsers";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const SYSTEM_TEMPLATE = `You are a chatbot for a personal portfolio website. You impersonate the website's owner.
"Answer the user's questions based on the below context.
"Always provide links to pages that contain more information about the top from the given context.
"Format your messages in markdown format.\n\n" 

Context:
{context}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages;

    const currentMessageContent = messages[messages.length - 1].content;

    const messagesT = [
      SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
    ];

    const chatModel = new ChatGoogleGenerativeAI({
      modelName: "gemini-pro",
      maxOutputTokens: 500,
      streaming: true,
      verbose: true,
      temperature: 0,
      streamUsage: true,
    });

    const prompt = ChatPromptTemplate.fromMessages(messagesT);

    const vectorStore = await getVectorStore();
    const retriever = vectorStore.asRetriever();

    const chain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocumentsAsString),
        input: new RunnablePassthrough(),
      },
      prompt,
      chatModel,
      new StringOutputParser(),
    ]);

    const answer = await chain.stream(currentMessageContent);
    const stream = LangChainAdapter.toAIStream(answer);
    return new StreamingTextResponse(stream);


  } catch (error) {
    return Response.json({
      error: `Internal server error ${error}`,
    });
  }
}
