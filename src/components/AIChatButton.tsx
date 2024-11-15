"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import AIChatBox from "./AIChatBox";
export default function AIChatButton() {
  const [chatBoxOpen, setChatBoxOpen] = useState(false);

  return (
    <>
      <button onMouseDown={() => setChatBoxOpen(!chatBoxOpen)}>
        <Bot size={24} />
      </button>
      <AIChatBox open={chatBoxOpen} onClose={() => setChatBoxOpen(false)} />
    </>
  );
}
