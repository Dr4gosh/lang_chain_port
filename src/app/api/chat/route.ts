import {
  generateText,
  AIStream,
  streamText,
  streamObject,
  LangChainAdapter,
  LangChainStream,
  createStreamDataTransformer,
} from "ai";
import { ChatCompletionMessageParam } from "ai/prompts";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "@langchain/core/prompts";
import OpenAI from "openai";
import { openai } from "@ai-sdk/openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GoogleGenerativeAIStream,
  Message as VercelChatMessage,
  StreamingTextResponse,
} from "ai";
import { google } from "@ai-sdk/google";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { getVectorStore } from "@/lib/astradb";
import { Document } from "@langchain/core/documents";
import { formatDocumentsAsString } from "langchain/util/document";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { UpstashRedisCache } from "@langchain/community/caches/upstash_redis";
import { Redis } from "@upstash/redis";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages;

    const chatHistory = messages
      .slice(0, -1)
      .map((m: VercelChatMessage) =>
        m.role === "user"
          ? new HumanMessage(m.content)
          : new AIMessage(m.content),
      );

    const cache = new UpstashRedisCache({
      client: Redis.fromEnv(),
    });

    const { stream, handlers } = LangChainStream();

    const currentMessageContent = messages[messages.length - 1].content;

    const chatModel = new ChatGoogleGenerativeAI({
      modelName: "gemini-1.5-flash",
      maxOutputTokens: 500,
      streaming: true,
      verbose: true,
      callbacks: [handlers],
      streamUsage: true,
      cache,
    });

    const rephraseModel = new ChatGoogleGenerativeAI({
      modelName: "gemini-1.5-flash",
      maxOutputTokens: 500,
      verbose: true,
      cache,
    });

    const vectorStore = await getVectorStore();
    const retriever = vectorStore.asRetriever();

    const rephrasePrompt = ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
      [
        "user",
        "Given the above conversation, generate a search query to look up in order to get information relevant to the current question. " +
          "Don't leave out any relevant keywords. Only return the query and no other text.",
      ],
    ]);

    const historyAwareRetrieverChain = await createHistoryAwareRetriever({
      llm: rephraseModel,
      retriever,
      rephrasePrompt,
    } as any);

    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo-0125",
      streaming: true,
      temperature: 0.2,
      verbose: true,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are a chatbot for a personal portfolio website. You impersonate the website's owner." +
          "Answer the user's questions based on the below context. " +
          "Whenever it makes sense, provide links to pages that contain more information about the top from the given context." +
          "Format your messages in markdown format.\n\n" +
          "Context:\n{context}",
      ],
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
    ]);

    const combineDocsChain = await createStuffDocumentsChain({
      llm: chatModel,
      prompt,
      documentPrompt: PromptTemplate.fromTemplate(
        "Page URL:\n\nPage content:\n{page_content}",
      ),
      documentSeparator: "\n------\n",
    } as any);

    const retrievalChain = await createRetrievalChain({
      combineDocsChain,
      retriever: historyAwareRetrieverChain,
    });

    retrievalChain.invoke({
      input: currentMessageContent,
      chat_history: chatHistory,
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    return Response.json({
      error: `Internal server error ${error}`,
    });
  }
}
