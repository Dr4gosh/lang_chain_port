import { cn } from "@/lib/utils";
import { Message, useChat, useCompletion } from "@ai-sdk/react";
import { XCircle, Bot, Trash, Send, SendHorizonal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
interface AIChatBoxProps {
  open: boolean;
  onClose: () => void;
}

export default function AIChatBox({ open, onClose }: AIChatBoxProps) {
  const {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat();
  //         {
  //       initialMessages: [
  //         {
  //           id: "1",
  //           role: "assistant",
  //           content: "Hello, how can I help you?",
  //         },
  //         {
  //           id: "2",
  //           role: "user",
  //           content: "Hi, I'm the user!",
  //         },
  //         {
  //           id: "3",
  //           role: "assistant",
  //           content: `
  // [google](https://www.google.com)
  // List:
  // - Item 1
  // - Item 2
  // - Item 3
  //           `,
  //         },
  //       ],
  //     } // /api/chat

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const lastMessageIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <div
      className={cn(
        "bottom-0 right-0 z-50 w-full max-w-[500px] p-1 xl:right-36",
        open ? "fixed" : "hidden",
      )}
    >
      <button onMouseDown={onClose} className="mb-1 ms-auto block">
        <XCircle size={30} className="rounded-full bg-background" />
      </button>
      <div className="flex h-[600px] flex-col rounded border bg-background">
        <div className="mt-3 h-full overflow-y-auto px-3" ref={scrollRef}>
          {messages.map((message, index) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && lastMessageIsUser && (
            <ChatMessage
              message={{
                id: "loading",
                role: "assistant",
                content: "Loading...",
              }}
            ></ChatMessage>
          )}
          {error && (
            <ChatMessage
              message={{
                id: "error",
                role: "assistant",
                content: "Something went wrong, please try again later.",
              }}
            />
          )}
          {!error && messages.length === 0 && (
            <div className="mx-8 flex h-full flex-col items-center justify-center gap-3 text-center">
              <Bot size={28} />
              <p className="text-lg font-medium">
                Send a message to start the AI chat!
              </p>
              <p>
                You can ask the chatbot any question about me and it will find
                the relevent information on this website.
              </p>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="m-3 flex gap-1">
          <button
            type="button"
            className="flex w-10 flex-none items-center justify-center"
            title="Clear chat"
            onMouseDown={() => setMessages([])}
          >
            <Trash size={24}></Trash>
          </button>
          <input
            type="text"
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Say something..."
            className="grow rounded border bg-background px-3 py-2"
          />
          <button
            type="submit"
            disabled={input.length === 0}
            className="flex w-10 flex-none items-center justify-center disabled:opacity-50"
          >
            <SendHorizonal size={24} />
          </button>
        </form>
      </div>
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
}

function ChatMessage({ message: { role, content } }: ChatMessageProps) {
  const isAiMessage = role === "assistant";

  return (
    <div
      className={cn(
        "mb-3 flex items-center",
        isAiMessage ? "me-5 justify-start" : "ms-5 justify-end",
      )}
    >
      {isAiMessage && <Bot className="mr-2 flex-none" />}
      <div
        className={cn(
          "rounded-md border px-3 py-2",
          isAiMessage ? "bg-background" : "bg-foreground text-background",
        )}
      >
        <ReactMarkdown
          components={{
            a: ({ node, ref, ...props }) => (
              <Link
                {...props}
                href={props.href ?? ""}
                className="text-primary hover:underline"
              ></Link>
            ),
            p: ({ node, ...props }) => (
              <p {...props} className="mt-3 first:mt-0"></p>
            ),
            ul: ({ node, ...props }) => (
              <ul
                {...props}
                className="mt-3 list-inside list-disc first:mt-0"
              ></ul>
            ),
            li: ({ node, ...props }) => <li {...props} className="mt-1" />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
