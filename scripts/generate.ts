import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getEmbeddingsCollection, getVectorStore } from "../src/lib/astradb";
import { DocumentInterface } from "@langchain/core/documents";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Redis } from "@upstash/redis";

async function generateEmbeddings() {

  await Redis.fromEnv().flushdb();

  const vectorStore = await getVectorStore();

  (await getEmbeddingsCollection()).deleteMany({});

  const loader = new DirectoryLoader(
    "src/app/",
    {
      ".tsx": (path) => new TextLoader(path),
    },
    true,
  );

  // "build": "npm run generate && next build",

  const docs = (await loader.load())
    .filter((docs) => docs.metadata.source.endsWith("page.tsx"))
    .map((doc): DocumentInterface => {
      const url =
        doc.metadata.source
          .replace(/\\/g, "/")
          .split("/src/app")[1]
          .split("/page.")[0] || "/"; // /social /privacy etc

      const pageContentTrimmed = doc.pageContent
        .replace(/^import.*$/gm, "") //  remove all import statements
        .replace(/ className=(["']).*?\1| className={.*?}/g, "") // remove all classNames
        .replace(/^\s*[\r]/gm, "") // remove empty lines
        .trim();

      // console.log("!", pageContentTrimmed);
      return {
        pageContent: pageContentTrimmed,
        metadata: { url },
      };
    });

  console.log(docs);

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("html");

  const splitDocs = await splitter.splitDocuments(docs);

  await vectorStore.addDocuments(splitDocs);

  // .console.log(docs);
}

generateEmbeddings();

