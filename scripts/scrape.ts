import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getEmbeddingsCollection, getVectorStore } from "../src/lib/astradb";
import { DocumentInterface } from "@langchain/core/documents";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Redis } from "@upstash/redis";
import puppeteer, { Puppeteer, Browser } from "puppeteer";
async function scrapeAndEmbedd() {
  // const url =
  //   "https://www.dedeman.ro/ro/servicii-si-facilitati/acces-animale-companie";
  const url =
    "https://catalog.dedeman.ro/oferte-catalog/26/?id=26&v=catalog-iunie-2024&category=gradina";

  const browser: Browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });

  const text = await page.evaluate(() => {
    const main = document.getElementById("maincontent")?.innerHTML;
    // const button = document.getElementsByClassName("cookies_button primary");
    // .click();

    return main;
  });

  await page.click(
    "#q-app > div.cookies > div:nth-child(3) > div.cookies_buttons > button:nth-child(2)",
  );
  await page.waitForNavigation();
  // console.log(text);

  // const docs = text.map
  const docs = [text, text].map((doc): DocumentInterface => {
    const pageContent = doc
      ?.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove style tags
      .replace(/ class=(["']).*?\1| class={.*?}/g, "") // Remove classes
      .replace(/data-[^"]*="[^"]*"/g, "") //Remove data-any
      .replace(/<!--[\s\S]*?-->/g, "") // Remove all comments
      .replace(/style=(["']).*?\1|style={.*?}/g, "") // Remove styles
      .replace(/tabindex="[^"]*"/gim, "") //Remove all tabs
      .replace(/\s+>/g, ">")
      .replace(/^\s*[\r]/gm, "")
      .trim();

    // console.log(pageContent);
    return {
      pageContent: pageContent ? pageContent : "",
      metadata: {
        url: "/",
      },
    };
  });

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("html");
  const splitDocs = await splitter.splitDocuments(docs);
  // console.log(docs[0]);

  // console.log(await page.${''})

  // console.log(splitDocs);

  await page.evaluate(() => {
    window.scrollTo(0, window.document.body.scrollHeight);
  });
  // Wait for 5 seconds before continuing
  await delay(5000);
  await page.pdf({ path: "catalog10.pdf", format: "A2" });
  await browser.close();
}

// Helper function to delay execution
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

scrapeAndEmbedd();
